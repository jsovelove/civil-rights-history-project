"""
Step 6 — Tuning: Score summaries against rubric and regenerate with feedback.
"""

import time
from typing import List, Dict, Any, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
from .shared import (
    ProcessorContext, MAIN_TOPICS, CIVIL_RIGHTS_EVENTS,
    call_openai_json, load_prompt,
    get_relevant_facts, format_facts_for_prompt, format_primary_source_for_prompt,
    report_progress
)


# ---------------------------------------------------------------------------
# Prompt pre-loading — avoids repeated disk reads across loop iterations
# and parallel workers.  Called once, results passed into the hot path.
# ---------------------------------------------------------------------------

def _preload_prompts(ctx: ProcessorContext, content_type: str) -> Dict[str, str]:
    """Load all prompt templates needed for a tuning loop, once."""
    prompts: Dict[str, str] = {}
    if content_type == "main_summary":
        prompts['eval_sys'] = load_prompt(ctx, 'score_summary_system.txt')
        prompts['eval_user'] = load_prompt(ctx, 'score_summary_user.txt')
        prompts['regen_sys'] = load_prompt(ctx, 'regenerate_main_summary_system.txt')
        prompts['regen_user'] = load_prompt(ctx, 'regenerate_main_summary_user.txt')
    else:
        prompts['eval_sys'] = load_prompt(ctx, 'score_chapter_system.txt')
        prompts['eval_user'] = load_prompt(ctx, 'score_chapter_user.txt')
        prompts['regen_sys'] = load_prompt(ctx, 'regenerate_chapter_system.txt')
        prompts['regen_user'] = load_prompt(ctx, 'regenerate_chapter_user.txt')
    return prompts


def score_summary(
    ctx: ProcessorContext,
    summary_dict: Dict[str, Any],
    transcript: str,
    system_prompt: Optional[str] = None,
    user_prompt: Optional[str] = None,
    primary_source_info: Optional[Dict] = None,
) -> Dict[str, Any]:
    """Score a main summary against the rubric."""
    if system_prompt is None:
        system_prompt = load_prompt(ctx, 'score_summary_system.txt')

    if user_prompt is None:
        user_prompt = load_prompt(ctx, 'score_summary_user.txt')

    user_prompt = user_prompt.replace('{summary}', summary_dict.get('summary', ''))
    user_prompt = user_prompt.replace('{key_themes}', ', '.join(summary_dict.get('key_themes', [])))
    user_prompt = user_prompt.replace('{historical_significance}', summary_dict.get('historical_significance', ''))
    user_prompt = user_prompt.replace('{transcript}', transcript[:12000])
    user_prompt = user_prompt.replace('{rubric}', ctx.rubric if ctx.rubric else "Use the rubric described above.")
    user_prompt += format_primary_source_for_prompt(primary_source_info)

    return call_openai_json(ctx, system_prompt, user_prompt, model="gpt-4o-mini")


def score_chapter(
    ctx: ProcessorContext,
    chapter_dict: Dict[str, Any],
    chapter_text: str,
    previous_issues: Optional[List[str]] = None,
    system_prompt: Optional[str] = None,
    user_prompt: Optional[str] = None,
    primary_source_info: Optional[Dict] = None,
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

    user_prompt = user_prompt.replace('{previous_issues_text}', previous_issues_text)
    user_prompt = user_prompt.replace('{title}', chapter_dict.get('title', ''))
    user_prompt = user_prompt.replace('{summary}', chapter_dict.get('summary', ''))
    user_prompt = user_prompt.replace('{keywords}', ', '.join(chapter_dict.get('keywords', [])))
    user_prompt = user_prompt.replace('{chapter_text}', chapter_text[:4000])
    user_prompt = user_prompt.replace('{rubric}', ctx.rubric if ctx.rubric else "Use the rubric described above.")
    user_prompt += format_primary_source_for_prompt(primary_source_info)

    return call_openai_json(ctx, system_prompt, user_prompt, model="gpt-4o")


def score_chapters_batch(
    ctx: ProcessorContext,
    chapters_with_text: List[Dict[str, Any]],
    chapter_text_max_chars: int = 2000,
) -> List[Dict[str, Any]]:
    """
    Score multiple chapters in a single API call.

    chapters_with_text: list of {"chapter": <chapter dict>, "chapter_text": <str>}.
    Returns a list of score dicts in the same order as input. If the model
    returns the wrong number of items or the call fails, returns an empty
    list so the caller can fall back to per-chapter scoring.

    Why batch: the rubric + system instructions are ~600 tokens that we
    were sending once per chapter. Batching sends them once for the whole
    set, cutting per-chapter input tokens dramatically.
    """
    if not chapters_with_text:
        return []

    system_prompt = load_prompt(ctx, 'score_chapter_system.txt')
    rubric = ctx.rubric if ctx.rubric else "Use the rubric described above."

    parts = [
        "Score EACH of the following chapter summaries against its chapter text.",
        "",
        "Return a JSON object with this exact shape:",
        '{ "results": [ <score object>, <score object>, ... ] }',
        "",
        "The results array MUST contain exactly one score object per chapter,",
        "in the SAME ORDER as the chapters below. Each score object must use",
        "the schema from the system prompt (accuracy_score, quality_score,",
        "component scores, errors, improvements).",
        "",
        f"RUBRIC TO USE:\n{rubric}",
        "",
        "═══ CHAPTERS TO SCORE ═══",
    ]

    for idx, item in enumerate(chapters_with_text):
        chapter = item["chapter"]
        chapter_text = item.get("chapter_text", "") or ""
        parts.append(f"\n--- CHAPTER {idx + 1} ---")
        parts.append(f"Title: {chapter.get('title', '')}")
        parts.append(f"Summary: {chapter.get('summary', '')}")
        parts.append(f"Keywords: {', '.join(chapter.get('keywords', []))}")
        parts.append(f"Chapter text (first {chapter_text_max_chars} chars):")
        parts.append(chapter_text[:chapter_text_max_chars])

    user_prompt = "\n".join(parts)
    max_tokens = max(1500, 300 * len(chapters_with_text))

    response = call_openai_json(
        ctx, system_prompt, user_prompt,
        model="gpt-4o", max_tokens=max_tokens
    )

    if not response or "error" in response:
        print(f"Batch scoring failed: {response.get('error') if response else 'no response'}")
        return []

    results = response.get("results")
    if not isinstance(results, list) or len(results) != len(chapters_with_text):
        print(
            f"Batch scoring returned {len(results) if isinstance(results, list) else 'non-list'}"
            f" results for {len(chapters_with_text)} chapters. Falling back."
        )
        return []

    return results


def regenerate_with_feedback(
    ctx: ProcessorContext,
    original_content: Dict[str, Any],
    issues: List[str],
    content_type: str,
    transcript_text: str,
    system_prompt: Optional[str] = None,
    user_prompt: Optional[str] = None,
    _precomputed_facts: Optional[str] = None,
    primary_source_info: Optional[Dict] = None,
) -> Dict[str, Any]:
    """Regenerate a summary using scored issues as feedback.

    _precomputed_facts: if provided, skip get_relevant_facts/format_facts_for_prompt
    and append this string directly.  Avoids redundant recomputation when the
    same transcript is regenerated across multiple retry iterations.
    """
    issues_text = chr(10).join([f"- {issue}" for issue in issues])

    if content_type == "main_summary":
        if system_prompt is None:
            system_prompt = load_prompt(ctx, 'regenerate_main_summary_system.txt')

        if user_prompt is None:
            user_prompt = load_prompt(ctx, 'regenerate_main_summary_user.txt')

        user_prompt = user_prompt.replace('{issues}', issues_text)
        user_prompt = user_prompt.replace('{original_summary}', original_content.get('summary', ''))
        user_prompt = user_prompt.replace('{original_key_themes}', ', '.join(original_content.get('key_themes', [])))
        user_prompt = user_prompt.replace('{original_historical_significance}', original_content.get('historical_significance', ''))
        user_prompt = user_prompt.replace('{transcript_text}', transcript_text[:12000])
    else:
        if system_prompt is None:
            system_prompt = load_prompt(ctx, 'regenerate_chapter_system.txt')

        topics_list = '", "'.join(MAIN_TOPICS)
        events_list = '", "'.join(CIVIL_RIGHTS_EVENTS)

        current_category = original_content.get('main_topic_category', '')
        current_events = original_content.get('related_events', [])
        current_keywords = original_content.get('keywords', original_content.get('suggested_keywords', []))

        if user_prompt is None:
            user_prompt = load_prompt(ctx, 'regenerate_chapter_user.txt')

        user_prompt = user_prompt.replace('{issues}', issues_text)
        user_prompt = user_prompt.replace('{original_title}', original_content.get('title', ''))
        user_prompt = user_prompt.replace('{original_summary}', original_content.get('summary', ''))
        user_prompt = user_prompt.replace('{current_category}', current_category)
        user_prompt = user_prompt.replace('{current_events}', ', '.join(current_events) if current_events else 'None')
        user_prompt = user_prompt.replace('{current_keywords}', ', '.join(current_keywords) if current_keywords else 'None')
        user_prompt = user_prompt.replace('{transcript_text}', transcript_text[:4000])
        user_prompt = user_prompt.replace('{topics_list}', topics_list)
        user_prompt = user_prompt.replace('{events_list}', events_list)

    if _precomputed_facts is not None:
        user_prompt += _precomputed_facts
    else:
        relevant_facts = get_relevant_facts(ctx, transcript_text)
        facts_text = format_facts_for_prompt(relevant_facts)
        user_prompt += facts_text
    user_prompt += format_primary_source_for_prompt(primary_source_info)

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
    near_threshold_tolerance: int = 3,
    min_improvement: int = 3,
    _precomputed_facts: Optional[str] = None,
    primary_source_info: Optional[Dict] = None,
) -> Dict[str, Any]:
    """
    Full scoring + regeneration loop.
    Returns dict with final summary, scores, and retry count.

    Early-exit behavior (saves API calls without sacrificing quality):
      - near_threshold_tolerance: if both scores are within this many points of
        their threshold, accept as "close enough". A 79/95 is not meaningfully
        worse than an 80/80, and regenerating rarely nudges a single point
        reliably — it's churn.
      - min_improvement: if a regeneration fails to improve the total score by
        at least this many points over the previous attempt, stop retrying.
        Signals the model has plateaued and more calls won't help.
    """
    score_fn = score_summary if content_type == "main_summary" else score_chapter

    # Chapter number for log labelling (present on chapter summaries, absent on main)
    chapter_num = summary.get('chapter_number') if content_type != "main_summary" else None

    if ctx.logger:
        ctx.logger.log_tuning_settings(
            content_type, quality_threshold, accuracy_threshold, max_retries
        )

    best = summary.copy()
    best_total = 0
    prev_total = None
    final_acc = 0
    final_qual = 0

    for attempt in range(max_retries):
        print(f"Scoring {content_type} (attempt {attempt + 1}/{max_retries})...")
        label = "main summary" if content_type == "main_summary" else f"chapter {chapter_num or ''}".strip()
        report_progress(ctx, "Tuning", attempt, max_retries, f"Scoring {label}, attempt {attempt + 1} of {max_retries}")

        scores = score_fn(ctx, summary, transcript,
                          system_prompt=eval_sys_prompt,
                          user_prompt=eval_user_prompt,
                          primary_source_info=primary_source_info)

        acc = scores.get('accuracy_score', 0)
        qual = scores.get('quality_score', 0)
        total = acc + qual
        final_acc, final_qual = acc, qual
        print(f"  Accuracy: {acc}/100, Quality: {qual}/100")
        if ctx.logger:
            ctx.logger.log_tuning_attempt(
                content_type, attempt + 1, max_retries, acc, qual, chapter_num
            )

        if total > best_total:
            best_total = total
            best = summary.copy()
            best['quality_metrics'] = scores

        if acc >= accuracy_threshold and qual >= quality_threshold:
            print("  ✓ Passed threshold")
            report_progress(ctx, "Tuning", max_retries, max_retries, f"{label.title()} passed thresholds")
            summary['quality_metrics'] = scores
            if ctx.logger:
                ctx.logger.log_tuning_final(content_type, acc, qual, chapter_num)
            return {
                "summary": summary,
                "scores": scores,
                "regenerated": attempt > 0,
                "retries": attempt
            }

        if attempt > 0 and (
            acc >= accuracy_threshold - near_threshold_tolerance
            and qual >= quality_threshold - near_threshold_tolerance
        ):
            print(f"  ✓ Near-threshold (within {near_threshold_tolerance} pts). Accepting.")
            report_progress(ctx, "Tuning", max_retries, max_retries, f"{label.title()} accepted near threshold")
            summary['quality_metrics'] = scores
            if ctx.logger:
                ctx.logger.log_tuning_final(content_type, acc, qual, chapter_num)
            return {
                "summary": summary,
                "scores": scores,
                "regenerated": True,
                "retries": attempt,
                "early_exit_reason": "near_threshold"
            }

        if prev_total is not None and total < prev_total + min_improvement:
            print(f"  ✗ No meaningful improvement ({prev_total} → {total}). Stopping.")
            report_progress(ctx, "Tuning", max_retries, max_retries, f"{label.title()} tuning stopped after plateau")
            best_scores = best.get('quality_metrics', {})
            if ctx.logger:
                ctx.logger.log_tuning_final(
                    content_type,
                    best_scores.get('accuracy_score', final_acc),
                    best_scores.get('quality_score', final_qual),
                    chapter_num,
                )
            return {
                "summary": best,
                "scores": best_scores,
                "regenerated": True,
                "retries": attempt,
                "early_exit_reason": "plateau"
            }

        prev_total = total

        if attempt < max_retries - 1:
            issues = scores.get('errors', [])
            print(f"  ✗ Below threshold. Regenerating with {len(issues)} issues...")
            report_progress(ctx, "Tuning", attempt + 1, max_retries, f"Regenerating {label} from {len(issues)} issue{'s' if len(issues) != 1 else ''}")
            summary = regenerate_with_feedback(
                ctx, summary, issues, content_type, transcript,
                system_prompt=revision_sys_prompt,
                user_prompt=revision_user_prompt,
                _precomputed_facts=_precomputed_facts,
                primary_source_info=primary_source_info,
            )
        else:
            print(f"  ✗ Max retries reached. Keeping best attempt.")

    best_scores = best.get('quality_metrics', {})
    if ctx.logger:
        ctx.logger.log_tuning_final(
            content_type,
            best_scores.get('accuracy_score', final_acc),
            best_scores.get('quality_score', final_qual),
            chapter_num,
        )
    return {
        "summary": best,
        "scores": best_scores,
        "regenerated": True,
        "retries": max_retries
    }


# ---------------------------------------------------------------------------
# Parallel chapter tuning — the main speedup.
#
# Each chapter still gets its OWN dedicated score and regenerate calls,
# identical to calling run_tuning_loop sequentially.  No batching of
# scores inside the tuning loop (that dilutes per-chapter attention and
# risks degraded scoring accuracy).  The only change is wall-clock
# concurrency: chapters whose API calls are independent run at the same
# time instead of waiting for each other.
#
# For 8 chapters at ~3s per API call, worst-case 2 calls/iteration × 3
# iterations = 6 serial calls per chapter:
#   Sequential:              8 × 6 × 3s ≈ 144s
#   Parallel (4 workers):    2 × 6 × 3s ≈  36s
# ---------------------------------------------------------------------------

def run_chapter_tuning_parallel(
    ctx: ProcessorContext,
    chapters_with_text: List[Dict[str, Any]],
    quality_threshold: int = 80,
    accuracy_threshold: int = 80,
    max_retries: int = 3,
    near_threshold_tolerance: int = 3,
    min_improvement: int = 3,
    eval_sys_prompt: Optional[str] = None,
    eval_user_prompt: Optional[str] = None,
    revision_sys_prompt: Optional[str] = None,
    revision_user_prompt: Optional[str] = None,
    max_workers: int = 4,
) -> List[Dict[str, Any]]:
    """
    Run tuning loops for multiple chapters in parallel.

    Each chapter gets its own independent tuning loop — identical quality
    to calling run_tuning_loop sequentially.  The only optimization is
    wall-clock concurrency.

    chapters_with_text: list of {"chapter": <chapter dict>, "chapter_text": <str>}.
    Returns list of result dicts in the same order as input.
    """
    if not chapters_with_text:
        return []

    n = len(chapters_with_text)
    report_progress(ctx, "Tuning", 0, n, f"Tuning {n} chapter summaries")

    # Pre-load prompt templates once instead of each worker hitting disk
    # on every loop iteration.
    prompts = _preload_prompts(ctx, "chapter")
    _eval_sys = eval_sys_prompt or prompts['eval_sys']
    _eval_user = eval_user_prompt or prompts['eval_user']
    _regen_sys = revision_sys_prompt or prompts['regen_sys']
    _regen_user = revision_user_prompt or prompts['regen_user']

    # Pre-compute facts for each chapter's transcript text once.
    # regenerate_with_feedback recomputes this on every call otherwise.
    precomputed_facts: List[str] = []
    for item in chapters_with_text:
        chapter_text = item.get("chapter_text", "") or ""
        relevant_facts = get_relevant_facts(ctx, chapter_text)
        precomputed_facts.append(format_facts_for_prompt(relevant_facts))

    results: List[Optional[Dict[str, Any]]] = [None] * n
    _tuning_tokens_before = ctx.total_tokens_used
    _tuning_t0 = time.time()

    def _tune_one(idx: int) -> tuple:
        item = chapters_with_text[idx]
        chapter = item["chapter"]
        chapter_text = item.get("chapter_text", "") or ""
        result = run_tuning_loop(
            ctx,
            summary=chapter,
            transcript=chapter_text,
            content_type="chapter",
            quality_threshold=quality_threshold,
            accuracy_threshold=accuracy_threshold,
            max_retries=max_retries,
            eval_sys_prompt=_eval_sys,
            eval_user_prompt=_eval_user,
            revision_sys_prompt=_regen_sys,
            revision_user_prompt=_regen_user,
            near_threshold_tolerance=near_threshold_tolerance,
            min_improvement=min_improvement,
            _precomputed_facts=precomputed_facts[idx],
        )
        return idx, result

    # Single chapter — skip thread pool overhead.
    if n == 1:
        _, result = _tune_one(0)
        report_progress(ctx, "Tuning", 1, 1, "Finished tuning chapter summary")
        if ctx.logger:
            ctx.logger.log_chapter_tuning_summary([result])
            ctx.logger.log_tuning_total(
                "chapter", "gpt-4o",
                time.time() - _tuning_t0,
                ctx.total_tokens_used - _tuning_tokens_before,
            )
        return [result]

    with ThreadPoolExecutor(max_workers=min(max_workers, n)) as executor:
        futures = {executor.submit(_tune_one, i): i for i in range(n)}
        for future in as_completed(futures):
            idx, result = future.result()
            results[idx] = result
            finished = sum(1 for item in results if item is not None)
            report_progress(ctx, "Tuning", finished, n, f"Finished tuning {finished} of {n} chapter summaries")

    if ctx.logger:
        ctx.logger.log_chapter_tuning_summary(results)
        ctx.logger.log_tuning_total(
            "chapters", "gpt-4o",
            time.time() - _tuning_t0,
            ctx.total_tokens_used - _tuning_tokens_before,
        )
    return results
