"""
Step 5 — Summarization: Generate main summary and individual chapter summaries.
"""

import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Any, Optional, Tuple
from .shared import (
    ProcessorContext, MAIN_TOPICS, CIVIL_RIGHTS_EVENTS,
    call_openai_json, load_prompt,
    get_relevant_facts, format_facts_for_prompt, format_primary_source_for_prompt,
    match_keyword_to_standard, get_keyword_context_for_ai,
    calculate_keyword_relevance
)
from .blocking import extract_plaintext_section

# Maximum parallel chapter summary API calls
CHAPTER_MAX_WORKERS = 5


def generate_main_summary(
    ctx: ProcessorContext,
    transcript: str,
    interview_name: str,
    system_prompt: Optional[str] = None,
    user_prompt: Optional[str] = None,
    primary_source_info: Optional[Dict] = None,
) -> Dict[str, Any]:
    """Generate the main interview summary. No scoring loop here — that's in tuning."""
    if system_prompt is None:
        system_prompt = load_prompt(ctx, 'generate_main_summary_system.txt')

    truncated = transcript[:12000]

    if user_prompt is None:
        user_prompt = load_prompt(ctx, 'generate_main_summary_user.txt')

    # Always substitute placeholders, whether default or user-provided
    user_prompt = user_prompt.replace('{interview_name}', interview_name)
    user_prompt = user_prompt.replace('{truncated_transcript}', truncated)

    # Append relevant facts then primary source reference info
    relevant_facts = get_relevant_facts(ctx, transcript)
    facts_text = format_facts_for_prompt(relevant_facts)
    user_prompt += facts_text
    user_prompt += format_primary_source_for_prompt(primary_source_info)

    tokens_before = ctx.total_tokens_used
    t0 = time.time()
    response = call_openai_json(ctx, system_prompt, user_prompt)
    elapsed = time.time() - t0
    if ctx.logger:
        ctx.logger.log_main_summary("gpt-4o", elapsed, ctx.total_tokens_used - tokens_before)
    return response


def generate_chapters(
    ctx: ProcessorContext,
    segments: list,
    interview_name: str,
    plaintext_transcript: Optional[str] = None,
    chapter_breaks: Optional[List[Tuple[int, int]]] = None,
    system_prompt: Optional[str] = None,
    user_prompt: Optional[str] = None,
    primary_source_info: Optional[Dict] = None,
) -> List[Dict[str, Any]]:
    """Generate summaries for all chapters in parallel."""
    if not segments or not chapter_breaks:
        return []

    print(f"Generating summaries for {len(chapter_breaks)} chapters")
    chap_tokens_before = ctx.total_tokens_used
    chap_t0 = time.time()

    # Build the work items: extract text and metadata for each chapter
    work_items = []
    for i, (start_idx, end_idx) in enumerate(chapter_breaks):
        chapter_segments = segments[start_idx:end_idx + 1]

        if plaintext_transcript:
            chapter_text = extract_plaintext_section(
                plaintext_transcript, segments, start_idx, end_idx
            )
        else:
            chapter_text = ' '.join([s.text for s in chapter_segments])

        word_count = len(chapter_text.split())
        if word_count < ctx.min_chapter_words:
            print(f"Skipping short chapter {i + 1} ({word_count} words)")
            continue

        start_time = chapter_segments[0].start_time
        end_time = chapter_segments[-1].end_time

        work_items.append({
            "index": i,
            "chapter_num": i + 1,
            "chapter_text": chapter_text,
            "start_time": start_time,
            "end_time": end_time,
            "word_count": word_count,
            "segment_count": len(chapter_segments),
        })

    if not work_items:
        return []

    # Single chapter — skip thread overhead
    if len(work_items) == 1:
        item = work_items[0]
        print(f"Processing chapter {item['chapter_num']} ({item['segment_count']} segments, {item['word_count']} words)...")
        chapter = generate_single_chapter(
            ctx, item["chapter_text"], item["chapter_num"],
            item["start_time"], item["end_time"],
            system_prompt=system_prompt, user_prompt=user_prompt,
            primary_source_info=primary_source_info,
        )
        if chapter and ctx.logger:
            ctx.logger.log_chapter_summary_item(
                item["chapter_num"], item["segment_count"], item["word_count"]
            )
        return [chapter] if chapter else []

    # Multiple chapters — process in parallel
    print(f"Processing {len(work_items)} chapters in parallel")
    workers = min(CHAPTER_MAX_WORKERS, len(work_items))
    results_by_index = {}

    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {
            pool.submit(
                _generate_chapter_worker,
                ctx, item, system_prompt, user_prompt, primary_source_info
            ): item
            for item in work_items
        }

        for future in as_completed(futures):
            item = futures[future]
            try:
                chapter = future.result()
                if chapter:
                    results_by_index[item["index"]] = chapter
                    print(f"  Chapter {item['chapter_num']} done")
            except Exception as e:
                print(f"  Chapter {item['chapter_num']} failed: {e}")

    # Reassemble in original order
    chapters = []
    for item in sorted(work_items, key=lambda x: x["index"]):
        if item["index"] in results_by_index:
            chapters.append(results_by_index[item["index"]])

    if ctx.logger:
        ctx.logger.log_chapter_summaries_total(
            "gpt-4o",
            time.time() - chap_t0,
            ctx.total_tokens_used - chap_tokens_before,
            len(chapters),
        )
    return chapters


def _generate_chapter_worker(
    ctx: ProcessorContext,
    item: Dict[str, Any],
    system_prompt: Optional[str],
    user_prompt: Optional[str],
    primary_source_info: Optional[Dict] = None,
) -> Optional[Dict[str, Any]]:
    """Worker function for parallel chapter generation."""
    print(f"Processing chapter {item['chapter_num']} ({item['segment_count']} segments, {item['word_count']} words)...")
    chapter = generate_single_chapter(
        ctx, item["chapter_text"], item["chapter_num"],
        item["start_time"], item["end_time"],
        system_prompt=system_prompt, user_prompt=user_prompt,
        primary_source_info=primary_source_info,
    )
    if chapter and ctx.logger:
        ctx.logger.log_chapter_summary_item(
            item["chapter_num"], item["segment_count"], item["word_count"]
        )
    return chapter


def generate_single_chapter(
    ctx: ProcessorContext,
    chapter_text: str,
    chapter_num: int,
    start_time: str,
    end_time: str,
    system_prompt: Optional[str] = None,
    user_prompt: Optional[str] = None,
    primary_source_info: Optional[Dict] = None,
) -> Dict[str, Any]:
    """Generate summary + metadata for a single chapter."""
    topics_list = '", "'.join(MAIN_TOPICS)
    events_list = '", "'.join(CIVIL_RIGHTS_EVENTS)

    # Build keyword instructions
    keyword_context = get_keyword_context_for_ai(ctx)
    if ctx.use_keyword_collection and ctx.standard_keywords:
        keyword_instructions = f"""
For suggested_keywords, provide 8-10 SPECIFIC, relevant terms ranked by importance.
The system will automatically match them to our standardized keyword collection and select the TOP 3.

{keyword_context}

Prioritize SPECIFIC terms: people, places, organizations, events, themes.
AVOID broad terms like "civil rights", "activism", "movement".
Order by importance — only top 3 will be used."""
    else:
        keyword_instructions = """
For suggested_keywords, provide 8-10 specific, relevant keywords that capture the key
people, places, events, themes, and concepts discussed in this chapter."""

    # Resolve prompts
    if system_prompt is None:
        system_prompt = load_prompt(ctx, 'generate_chapter_system.txt')

    # Always substitute placeholders, whether default or user-provided
    system_prompt = system_prompt.replace('{topics_list}', topics_list)
    system_prompt = system_prompt.replace('{events_list}', events_list)
    system_prompt = system_prompt.replace('{keyword_instructions}', keyword_instructions)

    truncated = chapter_text[:4000]

    if user_prompt is None:
        user_prompt = load_prompt(ctx, 'generate_chapter_user.txt')

    # Always substitute placeholders, whether default or user-provided
    user_prompt = user_prompt.replace('{chapter_num}', str(chapter_num))
    user_prompt = user_prompt.replace('{start_time}', start_time)
    user_prompt = user_prompt.replace('{end_time}', end_time)
    user_prompt = user_prompt.replace('{main_topics}', chr(10).join([f"- {t}" for t in MAIN_TOPICS]))
    user_prompt = user_prompt.replace('{civil_rights_events}', chr(10).join([f"- {e}" for e in CIVIL_RIGHTS_EVENTS]))
    user_prompt = user_prompt.replace('{truncated_text}', truncated)

    # Append facts then primary source reference info
    relevant_facts = get_relevant_facts(ctx, chapter_text)
    facts_text = format_facts_for_prompt(relevant_facts)
    user_prompt += facts_text
    user_prompt += format_primary_source_for_prompt(primary_source_info)

    response = call_openai_json(ctx, system_prompt, user_prompt)

    if not response or "error" in response:
        return response

    response['chapter_number'] = chapter_num
    response['start_time'] = start_time
    response['end_time'] = end_time


    # ── Assign metadata (topic category + events) ──────────────────
    metadata = assign_metadata(ctx, chapter_text)
    response['main_topic_category'] = metadata.get('main_topic_category', MAIN_TOPICS[0])
    response['related_events'] = metadata.get('related_events', [])

    if response.get('main_topic_category') not in MAIN_TOPICS:
        response['main_topic_category'] = MAIN_TOPICS[0]

    # ── Validate events against chapter text ───────────────────────
    _validate_events(response, chapter_text, chapter_num)

    # ── Match keywords to standard collection ──────────────────────
    _process_keywords(ctx, response, chapter_num)

    return response


def assign_metadata(ctx: ProcessorContext, chapter_text: str) -> Dict[str, Any]:
    """Assign main_topic_category and related_events to a chapter."""
    topics_list = '", "'.join(MAIN_TOPICS)
    events_list = '", "'.join(CIVIL_RIGHTS_EVENTS)

    system_prompt = load_prompt(ctx, 'assign_metadata_system.txt')
    system_prompt = system_prompt.replace('{topics_list}', topics_list)
    system_prompt = system_prompt.replace('{events_list}', events_list)

    user_prompt = load_prompt(ctx, 'assign_metadata_user.txt')
    user_prompt = user_prompt.replace('{chapter_text}', chapter_text[:4000])

    return call_openai_json(ctx, system_prompt, user_prompt)


def _validate_events(response: Dict, chapter_text: str, chapter_num: int):
    """Remove events not actually mentioned in chapter text."""
    ai_events = response.get('related_events', [])
    if not isinstance(ai_events, list):
        response['related_events'] = []
        return

    validated = []
    text_lower = chapter_text.lower()

    for event in ai_events:
        if not isinstance(event, str) or not event.strip():
            continue
        event = event.strip()

        # Validate against allowed list
        if event not in CIVIL_RIGHTS_EVENTS:
            matched = False
            for valid in CIVIL_RIGHTS_EVENTS:
                if event.lower() == valid.lower():
                    event = valid
                    matched = True
                    break
            if not matched:
                print(f"Chapter {chapter_num}: Skipping invalid event '{event}'")
                continue

        # Check event words appear in text
        words = event.lower().replace("the ", "").replace("of ", "").split()
        significant = [w for w in words if len(w) > 4]
        if any(w in text_lower for w in significant):
            validated.append(event)
        else:
            print(f"Chapter {chapter_num}: Removing event '{event}' - not in text")

    response['related_events'] = validated


def _process_keywords(ctx: ProcessorContext, response: Dict, chapter_num: int):
    """Match AI-suggested keywords to standard collection, pick top 3."""
    if 'suggested_keywords' in response and ctx.use_keyword_collection:
        ai_keywords = response['suggested_keywords']
        if isinstance(ai_keywords, list):
            keyword_matches = []
            print(f"Processing {len(ai_keywords)} AI keywords for Chapter {chapter_num}")

            for i, kw in enumerate(ai_keywords):
                if isinstance(kw, str) and kw.strip():
                    standard = match_keyword_to_standard(ctx, kw.strip())
                    relevance = calculate_keyword_relevance(kw, standard, i)
                    keyword_matches.append({
                        'keyword': standard,
                        'original': kw,
                        'relevance': relevance
                    })

            # Deduplicate, keep highest relevance
            unique = {}
            for m in keyword_matches:
                k = m['keyword']
                if k not in unique or m['relevance'] > unique[k]['relevance']:
                    unique[k] = m

            sorted_matches = sorted(unique.values(), key=lambda x: x['relevance'], reverse=True)
            top = [m['keyword'] for m in sorted_matches[:3]]

            response['keywords'] = top
            response['keyword_matching_info'] = {
                'original_ai_keywords': ai_keywords,
                'standardized_keywords': top,
                'all_matched_keywords': [m['keyword'] for m in sorted_matches],
                'relevance_scores': {m['keyword']: m['relevance'] for m in sorted_matches[:3]},
                'used_standard_collection': True,
                'collection_size': len(ctx.standard_keywords),
                'selected_top': 3
            }
            print(f"Selected top 3 keywords: {top}")
        else:
            response['keywords'] = []
    else:
        response['keywords'] = response.get('suggested_keywords', []) if not ctx.use_keyword_collection else []

    # Clean up
    if 'suggested_keywords' in response:
        del response['suggested_keywords']