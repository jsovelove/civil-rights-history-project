"""
Step 7 — Engagement Scoring: Multi-dimensional evaluation of interview quality.

Scores interviews across four dimensions (100 points total):
  - Narrative Quality (30 pts)
  - Historical Value (25 pts)
  - Emotional Resonance (25 pts)
  - Accessibility (20 pts)

Adapted from standalone evaluate_interview.py to work within the pipeline.
"""

import json
import os
from typing import Dict, Any, List, Tuple, Optional
from .shared import ProcessorContext, call_openai_json, load_prompt


def run_engagement_scoring(
    ctx: ProcessorContext,
    srt_content: str,
    pipeline_data: Dict[str, Any],
    system_prompt: Optional[str] = None,
    user_prompt: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Run the full engagement evaluation on an interview.

    Args:
        ctx: ProcessorContext with API client
        srt_content: Raw SRT file content (used for segment-level detail)
        pipeline_data: Dict with keys from earlier pipeline steps:
            - chapter_breaks_preview (optional)
            - main_summary (optional)
            - segments (list of SRTSegment)
            - plaintext_transcript (str)
        system_prompt: Override for system prompt
        user_prompt: Override for user prompt template

    Returns:
        Evaluation dict with dimension_scores, overall_score, etc.
    """
    # Build metadata from pipeline state
    metadata = _extract_metadata(pipeline_data)

    # Build the evaluation prompt — uses plaintext (not raw SRT) to stay
    # within token limits. Chapter previews supply timestamp context.
    eval_prompt = _build_evaluation_prompt(srt_content, pipeline_data, metadata)

    # Load rubric and schema
    rubric = _load_engagement_rubric(ctx)
    schema_instruction = _load_engagement_schema(ctx)

    # Resolve system prompt
    if system_prompt is None:
        system_prompt = load_prompt(ctx, 'engagement_system.txt')

    # Combine system prompt with rubric and schema
    full_system = f"{system_prompt}\n\n{rubric}\n\n{schema_instruction}"

    # Resolve user prompt
    if user_prompt is None:
        final_user_prompt = eval_prompt
    else:
        final_user_prompt = user_prompt.replace('{evaluation_prompt}', eval_prompt)

    est_tokens = len(full_system + final_user_prompt) // 4
    print(f"Engagement scoring: ~{est_tokens:,} estimated input tokens")

    # Use gpt-4o-mini to stay within typical rate limits.
    # The rubric is detailed enough to guide mini well.
    result = call_openai_json(
        ctx, full_system, final_user_prompt,
        model="gpt-4o-mini",
        max_tokens=8000
    )

    if isinstance(result, dict) and "error" in result:
        print(f"Engagement scoring API error: {result['error']}")
        return result

    # Validate
    is_valid, errors = validate_evaluation(result)
    if not is_valid:
        print(f"Engagement validation warnings: {errors}")
        result["_validation_errors"] = errors

    return result


# ── Metadata extraction ────────────────────────────────────────────────

def _extract_metadata(pipeline_data: Dict[str, Any]) -> Dict[str, Any]:
    """Build metadata dict from pipeline state."""
    segments = pipeline_data.get("segments", [])
    plaintext = pipeline_data.get("plaintext_transcript", "")
    chapters = pipeline_data.get("chapter_breaks_preview", [])

    duration_formatted = "Unknown"
    duration_seconds = 0
    if segments:
        last = segments[-1]
        duration_formatted = getattr(last, 'end_time', 'Unknown')
        # Rough seconds from HH:MM:SS,mmm format
        try:
            parts = str(duration_formatted).replace(',', '.').split(':')
            duration_seconds = int(float(parts[0])) * 3600 + int(float(parts[1])) * 60 + float(parts[2])
        except (ValueError, IndexError):
            pass

    return {
        "duration_formatted": duration_formatted,
        "duration_seconds": duration_seconds,
        "total_segments": len(segments),
        "word_count": len(plaintext.split()),
        "speaking_pace_wpm": round(len(plaintext.split()) / max(duration_seconds / 60, 1)),
        "number_of_chapters": len(chapters),
    }


# ── Prompt construction ────────────────────────────────────────────────

def _build_evaluation_prompt(
    srt_content: str,
    pipeline_data: Dict[str, Any],
    metadata: Dict[str, Any],
) -> str:
    """Construct the evaluation prompt using plaintext transcript.

    Uses plaintext (not raw SRT) to keep token count manageable.
    Chapter previews supply timestamp context for the scorer.
    """
    chapters = pipeline_data.get("chapter_breaks_preview", [])
    chapter_summary = "\n".join([
        f"Chapter {ch['chapter']}: {ch['start_time']} - {ch['end_time']} ({ch['words']} words)\n"
        f"Preview: {ch.get('snippet', '')[:200]}..."
        for ch in chapters
    ]) if chapters else "No chapter data available."

    # Use plaintext transcript — much smaller than raw SRT.
    # Cap at ~40k chars (~10k tokens) to leave room for system + rubric + schema + output.
    plaintext = pipeline_data.get("plaintext_transcript", "")
    max_chars = 40000
    if len(plaintext) > max_chars:
        head = plaintext[:max_chars * 3 // 4]
        tail = plaintext[-max_chars // 4:]
        plaintext = head + "\n\n[... MIDDLE SECTION OMITTED FOR LENGTH ...]\n\n" + tail

    # Include main summary if available for extra context
    summary_context = ""
    main_summary = pipeline_data.get("main_summary")
    if main_summary and isinstance(main_summary, dict):
        summary_text = main_summary.get("summary", "")
        themes = main_summary.get("key_themes", [])
        if summary_text:
            summary_context = f"\nINTERVIEW SUMMARY (from earlier pipeline step):\n{summary_text}\n"
            if themes:
                summary_context += f"Key Themes: {', '.join(themes)}\n"

    return f"""
INTERVIEW EVALUATION TASK

METADATA:
- Duration: {metadata['duration_formatted']}
- Total segments: {metadata['total_segments']}
- Word count: {metadata['word_count']}
- Speaking pace: {metadata['speaking_pace_wpm']} words/minute
- Number of chapters: {metadata['number_of_chapters']}

CHAPTER OVERVIEW:
{chapter_summary}
{summary_context}
INSTRUCTIONS:
1. Extract from the transcript opening:
   - Interviewee full name and title
   - Interviewer full name and affiliation
   - Interview date, location, and collection name

2. Read the transcript carefully.

3. Score the interview across all four dimensions using the rubric provided.

4. For each sub-dimension:
   - Provide the numeric score
   - Cite specific evidence from the text
   - Write 2-3 sentence justification

5. Provide overall synthesis for each dimension.

6. Output your evaluation as VALID JSON following the exact structure specified.

=================================================================
TRANSCRIPT:
=================================================================

{plaintext}

=================================================================
END OF TRANSCRIPT
=================================================================

Now provide your complete evaluation in the JSON format specified.
"""


# ── Prompt file loading ────────────────────────────────────────────────

def _load_engagement_rubric(ctx: ProcessorContext) -> str:
    """Load the engagement scoring rubric."""
    try:
        return load_prompt(ctx, 'engagement_rubric.txt')
    except FileNotFoundError:
        print("Warning: engagement_rubric.txt not found, using empty rubric")
        return ""


def _load_engagement_schema(ctx: ProcessorContext) -> str:
    """Load and format the engagement output schema."""
    schema_path = os.path.join(ctx.prompts_dir, 'engagement_schema.txt')
    try:
        with open(schema_path, 'r', encoding='utf-8') as f:
            schema = json.load(f)

        instruction = "\nOUTPUT FORMAT - RESPOND WITH VALID JSON ONLY:\n\n"
        instruction += json.dumps(schema, indent=2)
        instruction += """

IMPORTANT:
- Respond ONLY with valid JSON
- No markdown formatting, no ```json blocks, just raw JSON
- Ensure all quotes are properly escaped
- All numeric fields must be numbers, not strings
"""
        return instruction
    except FileNotFoundError:
        print("Warning: engagement_schema.json not found")
        return ""


# ── Validation ─────────────────────────────────────────────────────────

def validate_evaluation(evaluation: Dict) -> Tuple[bool, List[str]]:
    """Validate the evaluation response for completeness."""
    errors = []

    if "overall_score" not in evaluation:
        errors.append("Missing overall_score")
    else:
        total = evaluation["overall_score"].get("total", 0)
        if not isinstance(total, (int, float)) or total < 0 or total > 100:
            errors.append(f"Invalid overall score: {total}")

    if "dimension_scores" not in evaluation:
        errors.append("Missing dimension_scores")
    else:
        dims = evaluation["dimension_scores"]
        expected = {
            "narrative_quality": 30,
            "historical_value": 25,
            "emotional_resonance": 25,
            "accessibility": 20
        }
        for dim_name, max_score in expected.items():
            if dim_name not in dims:
                errors.append(f"Missing dimension: {dim_name}")
                continue
            dim = dims[dim_name]
            if "total" not in dim:
                errors.append(f"Missing total for {dim_name}")
            elif dim["total"] > max_score:
                errors.append(f"Score too high for {dim_name}: {dim['total']} > {max_score}")

    if "interview_metadata" not in evaluation:
        errors.append("Missing interview_metadata")

    if "overall_assessment" not in evaluation:
        errors.append("Missing overall_assessment")

    return (len(errors) == 0, errors)