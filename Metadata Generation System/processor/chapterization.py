"""
Step 4 — Chapterization: Detect topic transitions to determine chapter break indices.
"""

import time
from typing import List, Dict, Any, Tuple, Optional
from .shared import ProcessorContext, call_openai_json, load_prompt, report_progress


def detect_topic_transitions(
    ctx: ProcessorContext,
    text_blocks: List[Dict[str, Any]],
    block_topics: Optional[List[Dict[str, Any]]] = None,
    system_prompt: Optional[str] = None,
    user_prompt: Optional[str] = None,
) -> List[Tuple[int, int]]:
    """
    Send blocks + topic labels to GPT, return chapter break indices
    as list of (start_segment_idx, end_segment_idx) tuples.
    """
    if len(text_blocks) <= 2:
        report_progress(ctx, "Chapterization", 1, 1, "Short transcript; using single chapter")
        return [(text_blocks[0]["start_idx"], text_blocks[-1]["end_idx"])]

    # ── Build analysis text ────────────────────────────────────────
    max_total_chars = 15000
    n = len(text_blocks)

    def _header(i: int, block: Dict) -> str:
        return f"\n\n--- B{i + 1} ({block['start_time']} - {block['end_time']}) ---\n"

    headers = [_header(i, b) for i, b in enumerate(text_blocks)]
    header_total = sum(len(h) for h in headers)
    remaining = max_total_chars - header_total

    min_per_block = 80
    max_per_block = 320

    if remaining <= n * min_per_block:
        per_block = min_per_block
    else:
        per_block = min(max_per_block, remaining // n)

    print(f"breaks prompt budget: max_total_chars={max_total_chars}, blocks={n}, per_block={per_block}")
    report_progress(ctx, "Chapterization", 0, 2, f"Prepared {n} blocks for transition detection")

    analysis_parts = []
    for i, block in enumerate(text_blocks):
        txt = (block.get("text") or "").strip()
        analysis_parts.append(headers[i] + txt)

    analysis_text = "".join(analysis_parts)
    if len(analysis_text) > max_total_chars:
        overflow = len(analysis_text) - max_total_chars
        cut_each = (overflow // n) + 1
        new_parts = []
        for i, part in enumerate(analysis_parts):
            h = headers[i]
            body = part[len(h):]
            if len(body) > min_per_block:
                body = body[:-min(cut_each, max(0, len(body) - min_per_block))]
            new_parts.append(h + body)
        analysis_text = "".join(new_parts)

    # ── Topic context ──────────────────────────────────────────────
    topic_context = ""
    if block_topics:
        lines = ["\n\nPRE-CLASSIFIED TOPIC LABELS PER BLOCK:"]
        for bt in block_topics:
            bn = bt["block_number"]
            cat = bt["main_topic_category"]
            subs = ", ".join(bt.get("subtopics", [])[:3])
            lines.append(f"  B{bn}: {cat} — {subs}")
        topic_context = "\n".join(lines)

    # ── Resolve prompts ────────────────────────────────────────────
    if system_prompt is None:
        system_prompt = load_prompt(ctx, 'detect_topic_transitions_system.txt')

    if user_prompt is None:
        user_prompt = load_prompt(ctx, 'detect_topic_transitions_user.txt')
    user_prompt = user_prompt.replace('{analysis_text}', analysis_text)
    user_prompt = user_prompt.replace('{topic_context}', topic_context)

    # ── Call OpenAI ────────────────────────────────────────────────
    tokens_before = ctx.total_tokens_used
    t0 = time.time()
    try:
        report_progress(ctx, "Chapterization", 1, 2, "Detecting topic transitions")
        response = call_openai_json(ctx, system_prompt, user_prompt, model=ctx.toc_model)
        elapsed = time.time() - t0
        tokens_used = ctx.total_tokens_used - tokens_before

        if response and "chapter_breaks" in response:
            breaks = []
            for chapter in response["chapter_breaks"]:
                start_block_idx = chapter.get("start_block", 1) - 1
                end_block_idx = chapter.get("end_block", 1) - 1

                start_block_idx = max(0, min(start_block_idx, len(text_blocks) - 1))
                end_block_idx = max(start_block_idx, min(end_block_idx, len(text_blocks) - 1))

                start_segment_idx = text_blocks[start_block_idx]["start_idx"]
                end_segment_idx = text_blocks[end_block_idx]["end_idx"]
                breaks.append((start_segment_idx, end_segment_idx))

            print("RAW OPENAI BREAKS (segment idx):", breaks)
            if ctx.logger:
                ctx.logger.log_chapterization(ctx.toc_model, elapsed, tokens_used, len(breaks))
            report_progress(ctx, "Chapterization", 2, 2, f"Detected {len(breaks)} chapters")
            return breaks

    except Exception as e:
        elapsed = time.time() - t0
        print(f"Error detecting topic transitions: {e}")

    breaks = create_fallback_chapters(text_blocks)
    report_progress(ctx, "Chapterization", 2, 2, f"Used fallback to create {len(breaks)} chapters")
    return breaks


def create_fallback_chapters(text_blocks: List[Dict]) -> List[Tuple[int, int]]:
    """Evenly split blocks into chapters when GPT fails."""
    if len(text_blocks) <= 2:
        return [(text_blocks[0]['start_idx'], text_blocks[-1]['end_idx'])]

    total_segments = text_blocks[-1]['end_idx'] - text_blocks[0]['start_idx'] + 1
    target_length = 75
    num_chapters = max(3, min(12, total_segments // target_length))

    print(f"Fallback chapters: {total_segments} segments -> {num_chapters} chapters")

    chapters = []
    segs_per = total_segments // num_chapters
    current_start = text_blocks[0]['start_idx']

    for i in range(num_chapters):
        if i == num_chapters - 1:
            chapter_end = text_blocks[-1]['end_idx']
        else:
            chapter_end = min(current_start + segs_per - 1, text_blocks[-1]['end_idx'])

        chapters.append((current_start, chapter_end))
        current_start = chapter_end + 1

        if current_start > text_blocks[-1]['end_idx']:
            break

    # Validate — split any that are too long
    max_allowed = segs_per * 1.5
    validated = []
    for start_idx, end_idx in chapters:
        length = end_idx - start_idx + 1
        if length > max_allowed:
            chunk_start = start_idx
            while chunk_start <= end_idx:
                chunk_end = min(chunk_start + segs_per - 1, end_idx)
                validated.append((chunk_start, chunk_end))
                chunk_start = chunk_end + 1
        else:
            validated.append((start_idx, end_idx))

    print(f"Fallback created {len(validated)} chapters")
    return validated


def build_chapter_preview(
    chapter_breaks: List[Tuple[int, int]],
    segments: list,
    plaintext_transcript: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Build a human-readable preview of chapter breaks."""
    from .blocking import extract_plaintext_section

    preview = []
    for i, (start_idx, end_idx) in enumerate(chapter_breaks, 1):
        start_idx = max(0, min(start_idx, len(segments) - 1))
        end_idx = max(start_idx, min(end_idx, len(segments) - 1))
        ch_segments = segments[start_idx:end_idx + 1]

        if plaintext_transcript:
            ch_text = extract_plaintext_section(plaintext_transcript, segments, start_idx, end_idx)
        else:
            ch_text = " ".join(s.text for s in ch_segments)

        preview.append({
            "chapter": i,
            "start_idx": start_idx,
            "end_idx": end_idx,
            "start_time": ch_segments[0].start_time,
            "end_time": ch_segments[-1].end_time,
            "segments": len(ch_segments),
            "words": len(ch_text.split()),
            "snippet": ch_text[:200]
        })

    return preview
