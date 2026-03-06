# Civil Rights Oral History Metadata Generation System

## Overview

This system processes civil rights oral history interview transcripts and generates structured metadata:

- Hierarchical table of contents with main topics and subtopics
- Natural chapter breaks based on content analysis
- AI-generated summaries with iterative quality scoring and regeneration
- Audience engagement evaluation across four scored dimensions

The system uses a multi-stage pipeline that first understands content structure (creates the table of contents), then uses the TOC to make intelligent chapter boundaries, generates summaries with iterative quality improvement, and finally scores the interview for audience engagement.

## Pipeline Stages

**Upload & Blocking → Topic Labeling → TOC Building → Chapterization → Summarization → Tuning → Engagement Scoring**

Each stage is a discrete step with its own Flask page, and each can be individually re-run or toggled on/off from the upload page.

---

## Flask Web Interface

The system runs as a Flask web application. To start it:

```bash
cd "Metadata Generation System"
pip install -r requirements.txt
python app.py
```

Then open `http://localhost:5000` in your browser.

The UI walks through each pipeline step one at a time. Each step page shows the current output and lets you:

- **Re-run** the step (useful if you edit the prompt or want a fresh generation)
- **Edit prompts live** — system and user prompts are loaded from `processor_prompts/` but can be modified in the text areas before re-running
- **Toggle steps** on or off on the upload page (e.g. skip engagement scoring for a quick run)

Pipeline state is stored per browser session and resets on server restart. **Batch processing** is also supported: on the upload page you can upload a `.zip` of multiple `.srt` files, which are processed sequentially with a progress view.

---

## Step Registry

Steps are declared in `processor/step_registry.py`. Each `PipelineStep` defines its id, display name, order, the state keys it `requires` as inputs, the state keys it `produces`, and whether it can be disabled. The app and templates read from the registry to build navigation, enforce dependencies, and skip disabled steps.

To add a new pipeline step, create `processor/my_step.py`, add prompts to `processor_prompts/` if needed, and call `register_step()` — no modification of existing code required.

---

## Prompt Files

All LLM prompts live as plain-text files in `processor_prompts/`. Each step loads its prompts at runtime using `load_prompt(ctx, 'filename.txt')` from `shared.py`. Prompts use `{placeholder}` syntax; the step code substitutes values before sending.

| File | Used by |
|---|---|
| `label_text_blocks_for_toc_system.txt` / `_user.txt` | Labeling |
| `detect_topic_transitions_system.txt` / `_user.txt` | Chapterization |
| `generate_main_summary_system.txt` / `_user.txt` | Summarization |
| `generate_chapter_system.txt` / `_user.txt` | Summarization |
| `assign_metadata_system.txt` / `_user.txt` | Summarization (topic + event assignment) |
| `score_summary_system.txt` / `_user.txt` | Tuning |
| `score_chapter_system.txt` / `_user.txt` | Tuning |
| `regenerate_main_summary_system.txt` / `_user.txt` | Tuning |
| `regenerate_chapter_system.txt` / `_user.txt` | Tuning |
| `engagement_system.txt` | Engagement |
| `engagement_rubric.txt` | Engagement |
| `engagement_schema.txt` | Engagement (JSON output schema) |

Because prompts are separate files, they can be edited without touching Python code. The Flask UI also lets you override them inline per run.

---

## ProcessorContext

`ProcessorContext` (in `processor/shared.py`) is the shared config object passed to every module. It initialises once at upload time and holds:

- **OpenAI client** — reads `OPENAI_API_KEY` from environment or from the key entered in the UI
- **`chapter_block_size`** — number of SRT segments per text block (default: 23)
- **`min_chapter_words`** — chapters shorter than this are skipped during summarization (default: 75)
- **Rubric** — loads [`StandardizedRubric_1.md`](StandardizedRubric_1.md) into memory for use in scoring prompts
- **Historical facts** — loads `civil_rights_facts.json` (a dictionary of known events and verified summaries)
- **Standard keywords** — fetches the keyword collection from Firestore (`events_and_topics` collection) for keyword matching during chapter generation
- **`toc_model`** — OpenAI model used for labeling/TOC steps (default: `gpt-4o-mini`)

---

## Step 1 — Blocking

Interview transcripts are stored as SRT files. `srt_parser.py` parses the file into a list of `SRTSegment` objects, each with a segment index, start time, end time, and text.

**interview.srt:**
```
1
00:00:00,000 --> 00:00:08,000
From the Library of Congress and the Smithsonian National Museum of African American History and Culture.

2
00:00:08,000 --> 00:00:20,000
This is David Klein for the Smithsonian African American History and Culture Museum and the Library of Congress, Civil Rights History Project.
```

`build_text_blocks` (in `processor/blocking.py`) then groups every `chapter_block_size` segments (default: 23) into a single block dictionary:

```python
def build_text_blocks(ctx, segments, plaintext_transcript=None):
    text_blocks = []
    block_size = ctx.chapter_block_size

    for i in range(0, len(segments), block_size):
        block_segments = segments[i:i + block_size]
        block_text = ' '.join([segment.text for segment in block_segments])

        text_blocks.append({
            'start_idx': i,
            'end_idx': min(i + block_size - 1, len(segments) - 1),
            'text': block_text,
            'start_time': block_segments[0].start_time,
            'end_time': block_segments[-1].end_time
        })
    return text_blocks
```

Example output:
```python
text_blocks[0] = {
    'start_idx': 0,
    'end_idx': 22,
    'text': "From the Library of Congress and the Smithsonian National Museum...",
    'start_time': "00:00:00,000",
    'end_time': "00:03:20,000"
}
```

Blocking also computes cheap interview metadata (duration, word count, average WPM) which is stored in the session state.

---

## Step 2 — Topic Labeling

`_label_text_blocks_for_toc` (in `processor/labeling.py`) sends all text blocks to the OpenAI API in one call. Each block is assigned one of five fixed `MAIN_TOPICS` and three subtopics. The results are stored as `block_topics`.

**The five main topic categories** (defined in `shared.py`):
- Voting & Legal Rights
- Organizations & Movement Networks
- Violence, Intimidation & State Repression
- Integration, Education & Everyday Segregation
- Historical Figures & Turning Points

Example output:
```python
block_topics = [
    {
        "block_number": 1,
        "main_topic_category": "Integration, Education & Everyday Segregation",
        "subtopics": ["Introduction and setup", "Interview context", "Greeting"],
        "confidence": 0.9
    }
]
```

Prompts: `label_text_blocks_for_toc_system.txt` / `_user.txt`

---

## Step 3 — TOC Building

`_build_hierarchical_toc` (in `processor/toc.py`) takes `block_topics` and merges contiguous blocks that share the same main topic into single TOC entries. Subtopics within each merged entry are also merged when consecutive blocks share the same leading subtopic.

**Phase 1 — Merge by main topic:**
```python
# merge contiguous blocks by main topic
current = None
for bn in range(1, len(text_blocks) + 1):
    bt = topic_by_bn.get(bn)
    cat = bt["main_topic_category"]
    st, et = block_time(bn)

    if current is None or current["topic"] != cat:
        if current is not None:
            toc.append(current)
        current = {
            "topic": cat,
            "start_time": st,
            "end_time": et,
            "start_block": bn,
            "end_block": bn,
            "subtopics": []
        }
    else:
        current["end_time"] = et
        current["end_block"] = bn
```

After Phase 1, each TOC entry spans a continuous run of blocks under one topic:
```python
toc = [
    {
        "topic": "Integration, Education & Everyday Segregation",
        "start_time": "00:00:00,000",
        "end_time": "00:10:46,000",
        "start_block": 1,
        "end_block": 3,
        "subtopics": []
    }
]
```

**Phase 2 — Merge subtopics within each entry:**

For each TOC entry, the blocks it spans are looped through and subtopics are merged when consecutive blocks share the same leading subtopic label:

```python
for entry in toc:
    sub_spans = []
    cur_sub = None
    for bn in range(entry["start_block"], entry["end_block"] + 1):
        subs = topic_by_bn.get(bn, {}).get("subtopics", [])
        label = subs[0] if subs else "misc"
        st, et = block_time(bn)
        if cur_sub is None or cur_sub["label"] != label:
            if cur_sub is not None:
                sub_spans.append(cur_sub)
            cur_sub = {"label": label, "start_time": st, "end_time": et,
                       "start_block": bn, "end_block": bn}
        else:
            cur_sub["end_time"] = et
            cur_sub["end_block"] = bn
    entry["subtopics"] = sub_spans
```

Final TOC entry:
```python
{
    "topic": "Integration, Education & Everyday Segregation",
    "start_time": "00:00:00,000",
    "end_time": "00:10:46,000",
    "start_block": 1,
    "end_block": 3,
    "subtopics": [
        {"label": "Introduction", "start_block": 1, "end_block": 1,
         "start_time": "00:00:00,000", "end_time": "00:03:20,000"},
        {"label": "Early life", "start_block": 2, "end_block": 3,
         "start_time": "00:03:20,000", "end_time": "00:10:46,000"}
    ]
}
```

The function returns `{"toc": [...], "topic_index": {...}}` where `topic_index` maps each main topic to the list of time/block ranges it covers across the interview.

---

## Step 4 — Chapterization

`_detect_topic_transitions` (in `processor/chapterization.py`) sends the text blocks and block topics to the OpenAI API and asks it to identify natural chapter break points. Passing `block_topics` into the prompt improves quality — the model can see the full range of topics from the TOC and make more coherent breaks.

If there are two or fewer blocks, all content is treated as a single chapter.

The model is asked to return a JSON list of chapters, each with `start_block`, `end_block`, and a short `topic_description`. The system maps these back to segment indices to produce `chapter_breaks` as a list of `(start_idx, end_idx)` tuples.

```python
chapter_breaks = [(0, 45), (46, 91), (92, 134), ...]
```

A `chapter_breaks_preview` is also generated — a list of chapter dicts with timestamps, word counts, and a short text snippet — used by the Engagement step and displayed in the UI.

Prompts: `detect_topic_transitions_system.txt` / `_user.txt`

---

## Step 5 — Summarization

Summarization generates both the main interview summary and individual chapter summaries. Scoring and regeneration are handled separately in the Tuning step (Step 6).

### Main Summary

`generate_main_summary` (in `processor/summarization.py`) sends the first 12,000 characters of the plaintext transcript to `gpt-4o`. The prompt instructs the model to write naturally about what the person experienced — avoiding meta-language like "in this interview" — and to return structured JSON:

```json
{
    "summary": "200-300 word narrative summary",
    "key_themes": ["Theme 1", "Theme 2", "Theme 3", "Theme 4", "Theme 5"],
    "historical_significance": "Analysis of historical importance"
}
```

Before the prompt is sent, `get_relevant_facts` scans the transcript for known event names from `civil_rights_facts.json` and appends verified factual summaries to the user prompt. This reduces hallucination by grounding the model with accurate reference material.

Prompts: `generate_main_summary_system.txt` / `_user.txt`

### Chapter Summaries

`generate_chapters` loops through each `(start_idx, end_idx)` pair in `chapter_breaks` and calls `generate_single_chapter` for each. Chapters shorter than `min_chapter_words` (default: 75) are skipped.

`generate_single_chapter` performs four sub-tasks:

**1. Generate summary + keywords** — sends up to 4,000 characters of chapter text to `gpt-4o`. Returns:
```json
{
    "title": "Chapter title",
    "summary": "Chapter summary",
    "suggested_keywords": ["keyword1", "keyword2", "...up to 10"]
}
```

**2. Assign topic category + related events** — a second call to `assign_metadata` classifies the chapter into one of the five `MAIN_TOPICS` and identifies which of the 18 named `CIVIL_RIGHTS_EVENTS` are relevant. Event validation then removes any event whose significant words don't actually appear in the chapter text.

**3. Keyword matching** — AI-suggested keywords are matched to the standardized Firestore keyword collection using a three-tier fallback:
- Exact match
- Substring match (shortest matching standard keyword wins)
- Fuzzy match using `SequenceMatcher` (threshold: 0.6 similarity)

Each match is scored by combining position weight (earlier = higher), match quality, specificity, and a penalty for overly generic terms (e.g. "civil rights", "activism"). The top 3 keywords by relevance score are kept.

**4. Historical facts grounding** — `civil_rights_facts.json` facts relevant to the chapter text are appended to the prompt, same as for the main summary.

Prompts: `generate_chapter_system.txt` / `_user.txt`, `assign_metadata_system.txt` / `_user.txt`

---

## Step 6 — Tuning

Tuning (`processor/tuning.py`) is a separate step that runs after Summarization. It scores the main summary and each chapter summary against a standardized rubric, then iteratively regenerates any that fall below threshold — up to 3 attempts each.

### Scoring

`score_summary` and `score_chapter` each send the draft summary alongside the source transcript to the OpenAI API. The rubric (loaded from [`StandardizedRubric_1.md`](StandardizedRubric_1.md)) is injected into the prompt. The model returns:

```json
{
    "accuracy_score": 75,
    "quality_score": 80,
    "errors": [
        "REPLACE: 'Reverend Brann' → 'Reverend Dr. Amos Sebrown'",
        "ADD: Dr. Arinia Mallory persuaded Edinor to surrender"
    ],
    "improvements": [
        "Could add more specific date"
    ]
}
```

**Accuracy (0–100):**
- Component A (0–40): Concrete details — names, dates, locations, pronouns
- Component B (0–30): Causal/interpretive accuracy — who did what, why, relationships
- Component C (0–30): Quotations/paraphrasing — preserves meaning and emphasis

**Quality / Completeness (0–100):**
- Component A (0–40): Coverage of major themes (target: 70–80%+ of content)
- Component B (0–25): Emphasis and proportion
- Component C (0–20): Specificity and examples
- Component D (0–15): Organization and clarity

`score_summary` uses `gpt-4o-mini`. `score_chapter` uses `gpt-4o` (stricter evaluation).

### Regeneration Loop

`run_tuning_loop` runs the score → regenerate cycle:

```python
for attempt in range(max_retries):          # default: 3
    scores = score_fn(ctx, summary, transcript)
    acc = scores.get('accuracy_score', 0)
    qual = scores.get('quality_score', 0)

    if acc >= accuracy_threshold and qual >= quality_threshold:   # default: both 80
        break                               # passed — stop retrying

    issues = scores.get('errors', [])
    summary = regenerate_with_feedback(ctx, summary, issues, content_type, transcript)

return best_scoring_attempt
```

`regenerate_with_feedback` sends the original draft, the scored error list, and the transcript back to the model and asks it to fix the specific issues. Relevant facts from `civil_rights_facts.json` are appended to every regeneration prompt. The best-scoring attempt is always kept even if the threshold is never reached.

Thresholds and max retries are configurable from the Tuning step page in the UI.

Prompts: `score_summary_system.txt` / `_user.txt`, `score_chapter_system.txt` / `_user.txt`, `regenerate_main_summary_system.txt` / `_user.txt`, `regenerate_chapter_system.txt` / `_user.txt`

---

## Step 7 — Engagement Scoring

`run_engagement_scoring` (in `processor/engagement.py`) evaluates the interview as a whole for audience engagement across four dimensions, producing a single structured JSON report. It uses `gpt-4o-mini` and takes the plaintext transcript, chapter previews, and main summary as input.

### Scoring Dimensions (100 points total)

| Dimension | Max Points | Sub-dimensions |
|---|---|---|
| Narrative Quality | 30 | Story structure & coherence (10), Vivid details & examples (10), Emotional authenticity (10) |
| Historical Value | 25 | Unique firsthand perspective (10), Specificity of details (8), Fills historical gaps (7) |
| Emotional Resonance | 25 | Transformation & growth arc (10), Tension, conflict & triumph (8), Relatable experiences (7) |
| Accessibility | 20 | Language clarity (7), Narrative flow (7), Broader themes connection (6) |

For each sub-dimension the model provides a numeric score, specific evidence quotes with segment numbers and timestamps, and a 2–3 sentence justification.

### Prompt Construction

The evaluation prompt includes:
- Interview metadata (duration, word count, speaking pace, number of chapters)
- Chapter overview (timestamps, word counts, snippet preview for each chapter)
- Main summary and key themes (from Step 5, if available)
- Full plaintext transcript (capped at ~40,000 characters; head + tail preserved if truncated)

The rubric (`engagement_rubric.txt`) and output schema (`engagement_schema.txt`) are loaded and appended to the system prompt.

### Output Structure

```json
{
    "interview_metadata": {
        "interviewee_name": "Reverend Dr. Amos Sebrown",
        "interview_date": "2013-03-02",
        "interview_location": "San Francisco, CA",
        "duration_formatted": "00:25:05",
        "word_count": 2754
    },
    "overall_score": {
        "total": 82,
        "max_possible": 100,
        "category": "Excellent"
    },
    "dimension_scores": {
        "narrative_quality": {
            "total": 26,
            "max_possible": 30,
            "story_structure_coherence": {
                "score": 9,
                "evidence": ["...quote (Segment 14, 00:03:22,000)"],
                "justification": "..."
            },
            "overall_assessment": "..."
        },
        "historical_value": { "total": 22, "max_possible": 25, "..." : "..." },
        "emotional_resonance": { "total": 20, "max_possible": 25, "..." : "..." },
        "accessibility": { "total": 14, "max_possible": 20, "..." : "..." }
    },
    "overall_assessment": "4-6 sentence synthesis",
    "key_strengths": ["Strength 1", "Strength 2", "Strength 3"],
    "key_limitations": ["Limitation 1", "Limitation 2"]
}
```

The engagement scores are stored under the `engagement_scores` key in the session state and included in the final results export.

---

## Final Output Structure

After the complete pipeline runs, the Results page assembles all session state into a single JSON export:

```json
{
    "interview_name": "Reverend Dr. Amos Sebrown Interview",
    "metadata": {
        "total_duration_formatted": "00:25:05",
        "total_segments": 176,
        "word_count": 2754
    },
    "main_summary": {
        "summary": "Reverend Dr. Amos Sebrown was born...",
        "key_themes": ["Racial violence", "Civil rights activism"],
        "historical_significance": "...",
        "quality_metrics": {
            "accuracy_score": 85,
            "quality_score": 82
        }
    },
    "chapters": [
        {
            "chapter_number": 1,
            "title": "Mississippi Roots and Legacy of Resistance",
            "summary": "Reverend Sebrown shares his deep Mississippi roots...",
            "main_topic_category": "Violence, Intimidation & State Repression",
            "related_events": ["The Lynching of Emmett Till"],
            "keywords": ["Mississippi", "segregation", "Emmett Till"],
            "start_time": "00:00:00,000",
            "end_time": "00:07:14,000",
            "quality_metrics": {
                "accuracy_score": 88,
                "quality_score": 84
            }
        }
    ],
    "chapter_breaks": [[0, 45], [46, 91]],
    "hierarchical_toc": [
        {
            "topic": "Integration, Education & Everyday Segregation",
            "start_time": "00:00:00,000",
            "end_time": "00:10:46,000",
            "subtopics": [...]
        }
    ],
    "engagement_scores": {
        "overall_score": { "total": 82, "category": "Excellent" },
        "dimension_scores": { "..." : "..." },
        "key_strengths": ["..."],
        "key_limitations": ["..."]
    },
    "processing_info": {
        "mode": "complete",
        "steps_run": ["blocking", "labeling", "toc", "chapterization", "summarization", "tuning", "engagement"]
    }
}
```
