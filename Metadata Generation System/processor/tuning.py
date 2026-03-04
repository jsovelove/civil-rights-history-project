"""
Step 6 — Tuning: Score summaries against rubric and regenerate with feedback.
"""

from typing import List, Dict, Any, Optional
from .shared import (
    ProcessorContext, MAIN_TOPICS, CIVIL_RIGHTS_EVENTS,
    call_openai_json, load_prompt,
    get_relevant_facts, format_facts_for_prompt
)


def score_summary(
    ctx: ProcessorContext,
    summary_dict: Dict[str, Any],
    transcript: str,
    system_prompt: Optional[str] = None,
    user_prompt: Optional[str] = None,
) -> Dict[str, Any]:
    """Score a main summary against the rubric."""
    if system_prompt is None:
        system_prompt = load_prompt(ctx, 'score_summary_system.txt')

    if user_prompt is None:
        user_prompt = load_prompt(ctx, 'score_summary_user.txt')

    # Always substitute placeholders, whether default or user-provided
    user_prompt = user_prompt.replace('{summary}', summary_dict.get('summary', ''))
    user_prompt = user_prompt.replace('{key_themes}', ', '.join(summary_dict.get('key_themes', [])))
    user_prompt = user_prompt.replace('{historical_significance}', summary_dict.get('historical_significance', ''))
    user_prompt = user_prompt.replace('{transcript}', transcript[:12000])
    user_prompt = user_prompt.replace('{rubric}', ctx.rubric if ctx.rubric else "Use the rubric described above.")

    return call_openai_json(ctx, system_prompt, user_prompt, model="gpt-4o-mini")


def score_chapter(
    ctx: ProcessorContext,
    chapter_dict: Dict[str, Any],
    chapter_text: str,
    previous_issues: Optional[List[str]] = None,
    system_prompt: Optional[str] = None,
    user_prompt: Optional[str] = None,
) -> Dict[str, Any]:
    """Score a chapter summary against the rubric."""
    if system_prompt is None:
        system_prompt = load_prompt(ctx, 'score_chapter_system.txt')

    previous_issues_text = ""
    if previous_issues:
        previous_issues_text = (
            "PREVIOUS ISSUES (check if these were fixed):\n"
            + "\n".join([f"- {issue}" for issue in previous_issues])
            + "\nFirst verify if the above issues were fixed. Only report issues that are STILL present or NEW issues."
        )

    if user_prompt is None:
        user_prompt = load_prompt(ctx, 'score_chapter_user.txt')

    # Always substitute placeholders, whether default or user-provided
    user_prompt = user_prompt.replace('{previous_issues_text}', previous_issues_text)
    user_prompt = user_prompt.replace('{title}', chapter_dict.get('title', ''))
    user_prompt = user_prompt.replace('{summary}', chapter_dict.get('summary', ''))
    user_prompt = user_prompt.replace('{keywords}', ', '.join(chapter_dict.get('keywords', [])))
    user_prompt = user_prompt.replace('{chapter_text}', chapter_text[:4000])
    user_prompt = user_prompt.replace('{rubric}', ctx.rubric if ctx.rubric else "Use the rubric described above.")

    return call_openai_json(ctx, system_prompt, user_prompt, model="gpt-4o")


def regenerate_with_feedback(
    ctx: ProcessorContext,
    original_content: Dict[str, Any],
    issues: List[str],
    content_type: str,
    transcript_text: str,
    system_prompt: Optional[str] = None,
    user_prompt: Optional[str] = None,
) -> Dict[str, Any]:
    """Regenerate a summary using scored issues as feedback."""
    issues_text = chr(10).join([f"- {issue}" for issue in issues])

    if content_type == "main_summary":
        if system_prompt is None:
            system_prompt = load_prompt(ctx, 'regenerate_main_summary_system.txt')

        if user_prompt is None:
            user_prompt = load_prompt(ctx, 'regenerate_main_summary_user.txt')

        # Always substitute placeholders, whether default or user-provided
        user_prompt = user_prompt.replace('{issues}', issues_text)
        user_prompt = user_prompt.replace('{original_summary}', original_content.get('summary', ''))
        user_prompt = user_prompt.replace('{original_key_themes}', ', '.join(original_content.get('key_themes', [])))
        user_prompt = user_prompt.replace('{original_historical_significance}', original_content.get('historical_significance', ''))
        user_prompt = user_prompt.replace('{transcript_text}', transcript_text[:12000])
    else:
        # Chapter
        if system_prompt is None:
            system_prompt = load_prompt(ctx, 'regenerate_chapter_system.txt')

        topics_list = '", "'.join(MAIN_TOPICS)
        events_list = '", "'.join(CIVIL_RIGHTS_EVENTS)

        current_category = original_content.get('main_topic_category', '')
        current_events = original_content.get('related_events', [])
        current_keywords = original_content.get('keywords', original_content.get('suggested_keywords', []))

        if user_prompt is None:
            user_prompt = load_prompt(ctx, 'regenerate_chapter_user.txt')

        # Always substitute placeholders, whether default or user-provided
        user_prompt = user_prompt.replace('{issues}', issues_text)
        user_prompt = user_prompt.replace('{original_title}', original_content.get('title', ''))
        user_prompt = user_prompt.replace('{original_summary}', original_content.get('summary', ''))
        user_prompt = user_prompt.replace('{current_category}', current_category)
        user_prompt = user_prompt.replace('{current_events}', ', '.join(current_events) if current_events else 'None')
        user_prompt = user_prompt.replace('{current_keywords}', ', '.join(current_keywords) if current_keywords else 'None')
        user_prompt = user_prompt.replace('{transcript_text}', transcript_text[:4000])
        user_prompt = user_prompt.replace('{topics_list}', topics_list)
        user_prompt = user_prompt.replace('{events_list}', events_list)

    # Append facts
    relevant_facts = get_relevant_facts(ctx, transcript_text)
    facts_text = format_facts_for_prompt(relevant_facts)
    user_prompt += facts_text

    return call_openai_json(ctx, system_prompt, user_prompt)


def run_tuning_loop(
    ctx: ProcessorContext,
    summary: Dict[str, Any],
    transcript: str,
    content_type: str = "main_summary",
    quality_threshold: int = 80,
    accuracy_threshold: int = 80,
    max_retries: int = 3,
    eval_sys_prompt: Optional[str] = None,
    eval_user_prompt: Optional[str] = None,
    revision_sys_prompt: Optional[str] = None,
    revision_user_prompt: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Full scoring + regeneration loop.
    Returns dict with final summary, scores, and retry count.
    """
    score_fn = score_summary if content_type == "main_summary" else score_chapter

    best = summary.copy()
    best_total = 0

    for attempt in range(max_retries):
        print(f"Scoring {content_type} (attempt {attempt + 1}/{max_retries})...")

        scores = score_fn(ctx, summary, transcript,
                          system_prompt=eval_sys_prompt,
                          user_prompt=eval_user_prompt)

        acc = scores.get('accuracy_score', 0)
        qual = scores.get('quality_score', 0)
        total = acc + qual
        print(f"  Accuracy: {acc}/100, Quality: {qual}/100")

        if total > best_total:
            best_total = total
            best = summary.copy()
            best['quality_metrics'] = scores

        if acc >= accuracy_threshold and qual >= quality_threshold:
            print("  ✓ Passed threshold")
            summary['quality_metrics'] = scores
            return {
                "summary": summary,
                "scores": scores,
                "regenerated": attempt > 0,
                "retries": attempt
            }

        if attempt < max_retries - 1:
            issues = scores.get('errors', [])
            print(f"  ✗ Below threshold. Regenerating with {len(issues)} issues...")
            summary = regenerate_with_feedback(
                ctx, summary, issues, content_type, transcript,
                system_prompt=revision_sys_prompt,
                user_prompt=revision_user_prompt
            )
        else:
            print(f"  ✗ Max retries reached. Keeping best attempt.")

    return {
        "summary": best,
        "scores": best.get('quality_metrics', {}),
        "regenerated": True,
        "retries": max_retries
    }