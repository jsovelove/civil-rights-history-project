"""
Step 8 — Clip Extraction: Identify all viable clips from the interview
for thematic playlists and educational databases.

Uses chapter-based batching to stay within output token limits, then
merges batch results into a single combined output.  Batch sizes are
determined by greedily packing chapters whose estimated output token cost
(derived from each chapter's actual word count) fits within token_limit.
This accounts for chapters that are much larger or smaller than average.

Clips are scored on two dimensions (100 points total):
  - Topic/Event Coverage (0-50 pts): topic relevance + event specificity
  - Engagement Quality (0-50 pts): narrative power + emotional resonance + accessibility
"""

import json
import os
from collections import Counter
from typing import Dict, Any, List, Optional, Tuple

from .shared import ProcessorContext, call_openai_json, load_prompt

# Estimated INPUT tokens per word of transcript in SRT format.
# SRT adds index numbers and timestamps (~40 chars/segment overhead), so the
# effective ratio is higher than plain text (1.33). Empirically ~1.6 for typical
# oral history transcripts (validated against actual 429 error data).
_INPUT_TOKENS_PER_WORD = 1.6

# Minimum per-chapter input token cost even for very short chapters.
_MIN_TOKENS_PER_CHAPTER = 500

# Rough overhead for request metadata per batch (chapter list, topic index, headers).
_METADATA_OVERHEAD = 1500

# Maximum output tokens reserved per batch call.
# Clip JSON is verbose but bounded; 8 000 covers ~8-12 clips comfortably.
_MAX_OUTPUT_TOKENS = 8000

DEFAULT_TOKEN_LIMIT = 30000

# Ordered section definitions: (id, display_label, filename)
# Used by both the processor (to load/assemble the prompt) and the UI (to render tabs).
PROMPT_SECTIONS = [
    ("intro",         "Intro & System",          "clips_01_intro.txt"),
    ("taxonomy",      "Taxonomy",                "clips_02_taxonomy.txt"),
    ("scoring",       "Scoring System",          "clips_03_scoring.txt"),
    ("criteria",      "Identification Criteria", "clips_04_criteria.txt"),
    ("process",       "Extraction Process",      "clips_05_process.txt"),
    ("output_format", "Output Format",           "clips_06_output_format.txt"),
    ("outro",         "Example & Outro",         "clips_07_outro.txt"),
]


def run_clip_extraction(
    ctx: ProcessorContext,
    srt_content: str,
    pipeline_data: Dict[str, Any],
    system_prompt: Optional[str] = None,
    token_limit: int = DEFAULT_TOKEN_LIMIT,
) -> Dict[str, Any]:
    """
    Extract all viable clips from an oral history interview.

    Splits chapters into batches whose size is derived from token_limit,
    runs one API call per batch (each focused on its chapter range), then
    merges results.

    Args:
        ctx: ProcessorContext with API client
        srt_content: Raw SRT file content
        pipeline_data: Dict with keys from earlier pipeline steps:
            - segments (list of SRTSegment)
            - plaintext_transcript (str)
            - chapter_breaks_preview (list of chapter dicts, optional)
            - main_summary (optional)
            - toc_bundle (optional, contains topic_index)
            - interview_name (str)
        token_limit: Total TPM budget (input + output) for each batch call (default 30000).
            The system prompt and metadata overhead are subtracted first; the remainder
            is split between transcript input and output tokens.

    Returns:
        Dict with interview_metadata, extraction_summary, clips, extraction_notes
    """
    if system_prompt is None:
        system_prompt = _load_clips_prompt(ctx)

    chapters = pipeline_data.get("chapter_breaks_preview") or []

    # --- Token budget breakdown -------------------------------------------
    # token_limit = total TPM budget (input + output combined).
    # Subtract the fixed overhead (system prompt + request metadata) to find
    # how many tokens are available for transcript + output per batch.
    sys_prompt_tokens = len(system_prompt) // 4
    fixed_overhead = sys_prompt_tokens + _METADATA_OVERHEAD
    available = max(2000, token_limit - fixed_overhead)
    # Reserve output budget: cap at _MAX_OUTPUT_TOKENS, take at most half available.
    output_budget = min(_MAX_OUTPUT_TOKENS, available // 2)
    transcript_budget = available - output_budget

    print(
        f"Clip extraction: {len(chapters)} chapters, token_limit={token_limit:,} "
        f"sys_prompt={sys_prompt_tokens:,} overhead={fixed_overhead:,} "
        f"transcript_budget={transcript_budget:,} output_budget={output_budget:,}"
    )

    if chapters:
        batches = _make_batch_ranges_by_words(chapters, transcript_budget)
    else:
        batches = [(None, None)]  # single call, no chapter scoping

    print(f"  → {len(batches)} batch(es)")

    batch_results = []
    for start_ch, end_ch in batches:
        chapter_range = (start_ch, end_ch) if start_ch is not None else None
        request = _build_extraction_request(srt_content, pipeline_data, chapter_range)

        est_input = len(system_prompt + request) // 4
        label = f"ch {start_ch}-{end_ch}" if chapter_range else "all chapters"
        print(f"  Batch [{label}]: ~{est_input:,} input tokens, {output_budget:,} max output tokens "
              f"(total ~{est_input + output_budget:,} / {token_limit:,})")

        result = call_openai_json(
            ctx, system_prompt, request,
            model="gpt-4o",
            max_tokens=output_budget,
        )

        if isinstance(result, dict) and "error" in result and len(result) <= 2:
            print(f"  Batch [{label}] API error: {result['error']}")
            continue

        # Unwrap single-key envelope if the model added one
        if "clips" not in result and len(result) == 1:
            inner = next(iter(result.values()))
            if isinstance(inner, dict) and "clips" in inner:
                result = inner

        # Ensure every clip has a total_score even if the model omitted it.
        # Guard against the model occasionally returning clip entries as strings.
        for clip in result.get("clips", []):
            if isinstance(clip, dict):
                _ensure_total_score(clip)

        batch_results.append(result)

    if not batch_results:
        return {"error": "All extraction batches failed", "clips": []}

    combined = batch_results[0] if len(batch_results) == 1 else _merge_batches(batch_results)

    is_valid, errors = validate_extraction(combined)
    if not is_valid:
        print(f"Clip extraction validation warnings: {errors}")
        combined["_validation_errors"] = errors

    return combined


# ── Batching ───────────────────────────────────────────────────────────

def _make_batch_ranges_by_words(
    chapters: List[Dict], token_limit: int
) -> List[Tuple[int, int]]:
    """
    Greedily pack chapters into batches based on each chapter's actual word count.

    Each chapter's estimated output token cost is derived from its 'words' field,
    so large chapters are correctly isolated rather than grouped with others.
    A single chapter that exceeds token_limit gets its own batch (with a warning).
    """
    batches: List[Tuple[int, int]] = []
    batch_start: Optional[int] = None
    batch_tokens = 0

    for ch in chapters:
        ch_num = ch.get("chapter", len(batches) + 1)
        ch_words = ch.get("words", 0)
        ch_cost = max(_MIN_TOKENS_PER_CHAPTER, int(ch_words * _INPUT_TOKENS_PER_WORD))

        if batch_start is None:
            batch_start = ch_num
            batch_tokens = ch_cost
        elif batch_tokens + ch_cost > token_limit:
            # Flush current batch before adding this chapter
            batches.append((batch_start, ch_num - 1))
            if ch_cost > token_limit:
                print(
                    f"  Warning: chapter {ch_num} estimated at {ch_cost:,} tokens "
                    f"(>{token_limit:,} limit); processing alone"
                )
            batch_start = ch_num
            batch_tokens = ch_cost
        else:
            batch_tokens += ch_cost

    if batch_start is not None:
        last_ch_num = chapters[-1].get("chapter", len(chapters))
        batches.append((batch_start, last_ch_num))

    return batches


def _ensure_total_score(clip: Dict) -> None:
    """Add total_score to clip['scores'] if the model omitted it."""
    scores = clip.get("scores")
    if not isinstance(scores, dict):
        clip["scores"] = {"total_score": 0}
        return
    if "total_score" not in scores:
        tec = scores.get("topic_event_coverage") or {}
        eq = scores.get("engagement_quality") or {}
        tec_total = tec.get("total", 0) if isinstance(tec, dict) else 0
        eq_total = eq.get("total", 0) if isinstance(eq, dict) else 0
        scores["total_score"] = tec_total + eq_total


def _merge_batches(batch_results: List[Dict]) -> Dict:
    """Combine multiple batch results into one output, recomputing summary stats."""
    all_clips = []
    interview_metadata = batch_results[0].get("interview_metadata", {})
    # Take extraction_notes from the last batch (most complete chapter coverage)
    extraction_notes = {}
    for b in batch_results:
        if b.get("extraction_notes"):
            extraction_notes = b["extraction_notes"]

    for batch in batch_results:
        all_clips.extend(batch.get("clips", []))

    topic_counter: Counter = Counter()
    event_counter: Counter = Counter()
    score_dist = {"90-100": 0, "80-89": 0, "70-79": 0, "60-69": 0, "50-59": 0}
    total_duration_seconds = 0

    for clip in all_clips:
        tags = clip.get("thematic_tags") or {}
        for topic in tags.get("main_topics", []):
            topic_counter[topic] += 1
        for event in tags.get("key_events", []):
            event_counter[event] += 1

        score = (clip.get("scores") or {}).get("total_score", 0)
        if score >= 90:
            score_dist["90-100"] += 1
        elif score >= 80:
            score_dist["80-89"] += 1
        elif score >= 70:
            score_dist["70-79"] += 1
        elif score >= 60:
            score_dist["60-69"] += 1
        else:
            score_dist["50-59"] += 1

        duration = clip.get("duration", "00:00")
        try:
            parts = duration.split(":")
            total_duration_seconds += int(parts[0]) * 60 + int(parts[1])
        except (IndexError, ValueError):
            pass

    avg_score = (
        sum((c.get("scores") or {}).get("total_score", 0) for c in all_clips) / len(all_clips)
        if all_clips else 0
    )
    dur_fmt = f"{total_duration_seconds // 60}:{total_duration_seconds % 60:02d}"

    return {
        "interview_metadata": interview_metadata,
        "extraction_summary": {
            "total_clips_extracted": len(all_clips),
            "total_clips_duration": dur_fmt,
            "average_clip_score": avg_score,
            "score_distribution": score_dist,
            "topic_coverage": dict(topic_counter),
            "event_coverage": dict(event_counter),
        },
        "clips": all_clips,
        "extraction_notes": extraction_notes,
    }


# ── Prompt loading ─────────────────────────────────────────────────────

def _load_clips_prompt(ctx: ProcessorContext) -> str:
    """Load and assemble the full system prompt from section files."""
    parts = []
    for section_id, label, filename in PROMPT_SECTIONS:
        try:
            parts.append(load_prompt(ctx, filename).strip())
        except FileNotFoundError:
            print(f"Warning: {filename} not found, skipping section '{label}'")
    if parts:
        return "\n\n---\n\n".join(parts)
    print("Warning: no clip prompt section files found, using minimal prompt")
    return (
        "You are an expert curator of Civil Rights oral history content. "
        "Extract all viable clips from the interview transcript and return as JSON."
    )


# ── Request construction ───────────────────────────────────────────────

def _build_extraction_request(
    srt_content: str,
    pipeline_data: Dict[str, Any],
    chapter_range: Optional[Tuple[int, int]] = None,
) -> str:
    """Build the per-batch extraction request from pipeline state."""
    segments = pipeline_data.get("segments", [])
    chapters = pipeline_data.get("chapter_breaks_preview", [])
    toc_bundle = pipeline_data.get("toc_bundle") or {}
    interview_name = pipeline_data.get("interview_name", "Unknown")
    plaintext = pipeline_data.get("plaintext_transcript", "")

    total_segments = len(segments)
    word_count = len(plaintext.split())

    duration_formatted = "Unknown"
    if segments:
        last = segments[-1]
        duration_formatted = getattr(last, 'end_time', 'Unknown')

    request = f"""
Extract all viable clips from this Civil Rights oral history interview.

## INTERVIEW METADATA

Interviewee: {interview_name}
Duration: {duration_formatted}
Total Segments: {total_segments}
Word Count: {word_count}

"""

    if chapter_range:
        start_ch, end_ch = chapter_range
        request += f"""## EXTRACTION SCOPE

**IMPORTANT: Only extract clips from CHAPTERS {start_ch} through {end_ch}.**

Do not extract clips from other chapters. This is batch {start_ch}-{end_ch} of a multi-batch extraction process.

"""

    request += "## CHAPTER STRUCTURE\n\n"

    if chapters:
        for ch in chapters:
            ch_num = ch.get('chapter')
            if chapter_range:
                start_ch, end_ch = chapter_range
                marker = " >>> EXTRACT FROM THIS CHAPTER <<<" if start_ch <= ch_num <= end_ch else " (skip - different batch)"
            else:
                marker = ""
            request += (
                f"Chapter {ch_num}: "
                f"{ch.get('start_time')} - {ch.get('end_time')} "
                f"({ch.get('words')} words){marker}\n"
                f"  Preview: {ch.get('snippet', '')[:150]}...\n\n"
            )
    else:
        request += "No chapter data available.\n\n"

    topic_index = toc_bundle.get("topic_index", {})
    if topic_index:
        request += "\n## TOPIC INDEX\n\n"
        for topic, segs in topic_index.items():
            count = len(segs) if isinstance(segs, list) else 1
            request += f"{topic}: {count} section(s)\n"

    # Only include the transcript segments that belong to this batch's chapters.
    # This keeps each API call well within the input token budget.
    if chapter_range and chapters and segments:
        start_ch, end_ch = chapter_range
        batch_chs = [ch for ch in chapters if start_ch <= ch.get("chapter", 0) <= end_ch]
        if batch_chs:
            seg_start = batch_chs[0].get("start_idx", 0)
            seg_end = batch_chs[-1].get("end_idx", len(segments) - 1)
            filtered_segments = segments[seg_start : seg_end + 1]
            transcript_text = "\n\n".join(
                f"{s.index}\n{s.start_time} --> {s.end_time}\n{s.text}"
                for s in filtered_segments
            )
            est_words = sum(len(s.text.split()) for s in filtered_segments)
            print(f"    Transcript slice: segments {seg_start}-{seg_end} "
                  f"({len(filtered_segments)} segs, ~{est_words} words)")
        else:
            transcript_text = srt_content
    else:
        transcript_text = srt_content

    if chapter_range:
        transcript_heading = f"TRANSCRIPT (chapters {chapter_range[0]}-{chapter_range[1]} only)"
    else:
        transcript_heading = "FULL TRANSCRIPT"

    request += f"""

## {transcript_heading}

{transcript_text}

## EXTRACTION TASK

"""

    if chapter_range:
        start_ch, end_ch = chapter_range
        request += f"Extract ALL viable clips from CHAPTERS {start_ch}-{end_ch} only.\n\n"
    else:
        request += "Extract ALL viable clips from this interview.\n\n"

    request += """For each clip provide:
- Unique clip_id (format: INTERVIEW_XXX where XXX is clip number)
- Complete scores (0-100 total)
- Accurate thematic tags (exact Main Topic and Key Event names)
- Transcript excerpts with exact timestamps
- All required metadata

Return results as valid JSON matching the specified schema.
"""
    return request


# ── Validation ─────────────────────────────────────────────────────────

def validate_extraction(extraction: Dict) -> Tuple[bool, List[str]]:
    """Validate extracted clips data. Returns (is_valid, errors)."""
    errors = []

    for field in ['interview_metadata', 'extraction_summary', 'clips']:
        if field not in extraction:
            errors.append(f"Missing required field: {field}")

    if 'clips' in extraction:
        clips = extraction['clips']
        if not isinstance(clips, list):
            errors.append("'clips' must be a list")
        elif len(clips) == 0:
            errors.append("No clips extracted")
        else:
            for i, clip in enumerate(clips):
                if 'clip_id' not in clip:
                    errors.append(f"Clip {i + 1}: Missing clip_id")
                if 'scores' not in clip or 'total_score' not in clip.get('scores', {}):
                    errors.append(f"Clip {i + 1}: Missing total_score")
                if 'thematic_tags' not in clip:
                    errors.append(f"Clip {i + 1}: Missing thematic_tags")

    return (len(errors) == 0, errors)
