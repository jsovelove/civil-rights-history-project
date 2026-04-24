import bisect
import hashlib
import json
import os
import re
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from processor.shared import ProcessorContext, call_openai_json, load_prompt

LOW_THRESHOLD = 0.65
HIGH_THRESHOLD = 0.80
VALID_STATUSES = {"unreviewed", "verified", "rejected", "needs_review"}

QUESTION_WORD_START_RE = re.compile(
    r"^(who|what|when|where|why|how|which|whom)\b",
    re.IGNORECASE,
)
AUX_START_RE = re.compile(
    r"^(can|could|would|will|did|do|does|is|are|was|were|have|has|had|should|may|might)\b",
    re.IGNORECASE,
)
PROMPT_PATTERN_RE = re.compile(
    r"\b(could you|can you|would you|tell us|talk about|how did|what was|what were|why did)\b",
    re.IGNORECASE,
)

MAX_REWRITE_CONTEXT_ROWS = 14
CONTEXT_BEFORE_CHAR_BUDGET = 220
CONTEXT_AFTER_CHAR_BUDGET = 140
CONTEXT_WORTHY_PRONOUN_RE = re.compile(
    r"\b(this|that|it|they|them|those|these|there|then|here|he|she|we)\b",
    re.IGNORECASE,
)
CONTEXT_WORTHY_START_RE = re.compile(
    r"^(and|so|then|but|also|well)\b",
    re.IGNORECASE,
)


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def parse_time_to_seconds(value: str) -> Optional[float]:
    if not value:
        return None
    cleaned = value.strip().replace(",", ".")
    if " --> " in cleaned:
        cleaned = cleaned.split(" --> ")[0].strip()
    parts = cleaned.split(":")
    if len(parts) != 3:
        return None
    try:
        hours = int(parts[0])
        minutes = int(parts[1])
        seconds = float(parts[2])
    except ValueError:
        return None
    return hours * 3600 + minutes * 60 + seconds


def format_seconds(value: float) -> str:
    safe = max(0.0, float(value))
    hours = int(safe // 3600)
    minutes = int((safe % 3600) // 60)
    seconds = int(safe % 60)
    millis = int(round((safe - int(safe)) * 1000))
    if millis == 1000:
        millis = 0
        seconds += 1
    return f"{hours:02d}:{minutes:02d}:{seconds:02d},{millis:03d}"


def normalize_timestamp(value: str, fallback_seconds: Optional[float] = None) -> str:
    seconds = parse_time_to_seconds(value or "")
    if seconds is None:
        seconds = fallback_seconds if fallback_seconds is not None else 0.0
    return format_seconds(seconds)


def confidence_band(confidence: float) -> str:
    if confidence >= HIGH_THRESHOLD:
        return "high"
    if confidence >= LOW_THRESHOLD:
        return "medium"
    return "low"


def stable_question_id(interview_name: str, start_time: str, question_text: str) -> str:
    material = f"{interview_name}|{start_time}|{(question_text or '').strip().lower()}"
    return hashlib.sha1(material.encode("utf-8")).hexdigest()[:16]


def compute_question_stats(rows: Optional[List[Dict[str, Any]]]) -> Dict[str, Any]:
    rows = rows or []
    by_status = {"unreviewed": 0, "verified": 0, "rejected": 0, "needs_review": 0}
    by_band = {"high": 0, "medium": 0, "low": 0}

    for row in rows:
        status = row.get("status", "unreviewed")
        band = row.get("confidence_band", "low")
        if status in by_status:
            by_status[status] += 1
        if band in by_band:
            by_band[band] += 1

    return {
        "total": len(rows),
        "status": by_status,
        "confidence": by_band,
        "low_confidence_count": by_band["low"],
        "updated_at": utc_now_iso(),
    }


def normalize_question_rows(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    normalized: List[Dict[str, Any]] = []
    for row in rows:
        if not isinstance(row, dict):
            continue

        text = str(row.get("question_text") or "").strip()
        if not text:
            continue

        try:
            confidence = float(row.get("confidence", 0.0))
        except (TypeError, ValueError):
            confidence = 0.0
        confidence = max(0.0, min(1.0, confidence))

        status = str(row.get("status") or "unreviewed").strip().lower()
        if status not in VALID_STATUSES:
            status = "unreviewed"

        start_time = normalize_timestamp(str(row.get("start_time") or "00:00:00,000"))
        end_time = normalize_timestamp(str(row.get("end_time") or start_time), parse_time_to_seconds(start_time) or 0.0)
        qid = str(row.get("id") or "").strip()

        flags = row.get("flags") if isinstance(row.get("flags"), list) else []
        original_question_text = str(row.get("original_question_text") or "").strip()
        rewrite_notes = str(row.get("rewrite_notes") or "").strip()
        rewrite_model = str(row.get("rewrite_model") or "").strip()
        rewrite_applied = bool(row.get("rewrite_applied"))

        raw_segment_idx = row.get("segment_idx")
        try:
            segment_idx = int(raw_segment_idx) if raw_segment_idx is not None else None
        except (TypeError, ValueError):
            segment_idx = None

        context_before = re.sub(r"\s+", " ", str(row.get("context_before") or "")).strip()
        context_after = re.sub(r"\s+", " ", str(row.get("context_after") or "")).strip()
        context_chapter_title = re.sub(r"\s+", " ", str(row.get("context_chapter_title") or "")).strip()

        item = {
            "id": qid,
            "question_text": text,
            "start_time": start_time,
            "end_time": end_time,
            "confidence": round(confidence, 3),
            "confidence_band": confidence_band(confidence),
            "status": status,
            "is_low_confidence": confidence_band(confidence) == "low",
            "flags": flags,
            "notes": str(row.get("notes") or ""),
            "source": str(row.get("source") or "question_detection_v2"),
            "verification": row.get("verification") if isinstance(row.get("verification"), dict) else {
                "last_method": "generator",
                "last_model": row.get("model") or os.getenv("QUESTION_DETECT_MODEL", "gpt-4o-mini"),
                "last_prompt_version": row.get("prompt_version") or "question_detect_v2",
                "last_checked_at": utc_now_iso(),
                "reason_code": row.get("reason_code") or "generated",
            },
        }
        if original_question_text:
            item["original_question_text"] = original_question_text
        if rewrite_applied:
            item["rewrite_applied"] = True
        if rewrite_notes:
            item["rewrite_notes"] = rewrite_notes
        if rewrite_model:
            item["rewrite_model"] = rewrite_model
        if segment_idx is not None and segment_idx >= 0:
            item["segment_idx"] = segment_idx
        if context_before:
            item["context_before"] = context_before
        if context_after:
            item["context_after"] = context_after
        if context_chapter_title:
            item["context_chapter_title"] = context_chapter_title
        normalized.append(item)

    seen = set()
    deduped: List[Dict[str, Any]] = []
    for row in sorted(normalized, key=lambda r: parse_time_to_seconds(r["start_time"]) or 0.0):
        key = (row["start_time"], row["question_text"].lower())
        if key in seen:
            continue
        seen.add(key)
        deduped.append(row)

    return deduped


def _split_sentences(text: str) -> List[str]:
    if not text:
        return []
    normalized = re.sub(r"\s+", " ", text).strip()
    if not normalized:
        return []
    parts = re.split(r"(?<=[\?\.!])\s+", normalized)
    out: List[str] = []
    for part in parts:
        p = part.strip(" \t\n\r\"'“”")
        if p:
            out.append(p)
    return out


def _looks_like_question(text: str) -> bool:
    if not text:
        return False
    stripped = text.strip()
    if "?" in stripped:
        return True
    if QUESTION_WORD_START_RE.search(stripped):
        return True
    if AUX_START_RE.search(stripped):
        return True
    if PROMPT_PATTERN_RE.search(stripped):
        return True
    return False


def _candidate_confidence(text: str) -> float:
    score = 0.35
    if "?" in text:
        score += 0.30
    if QUESTION_WORD_START_RE.search(text):
        score += 0.20
    if AUX_START_RE.search(text):
        score += 0.10
    if PROMPT_PATTERN_RE.search(text):
        score += 0.10
    return max(0.0, min(0.95, score))


def _candidate_flags(text: str) -> List[str]:
    flags: List[str] = []
    if "?" in text:
        flags.append("question_mark")
    if QUESTION_WORD_START_RE.search(text):
        flags.append("wh_start")
    if AUX_START_RE.search(text):
        flags.append("aux_start")
    if PROMPT_PATTERN_RE.search(text):
        flags.append("prompt_pattern")
    return flags


def _build_candidates(segments: List[Any], max_candidates: int = 260) -> List[Dict[str, Any]]:
    candidates: List[Dict[str, Any]] = []
    for seg_idx, seg in enumerate(segments):
        start_time = getattr(seg, "start_time", "")
        end_time = getattr(seg, "end_time", start_time)
        text = (getattr(seg, "text", "") or "").strip()
        if not text:
            continue

        for sentence in _split_sentences(text):
            if not _looks_like_question(sentence):
                continue

            candidates.append({
                "text": sentence,
                "start_time": normalize_timestamp(start_time),
                "end_time": normalize_timestamp(end_time, parse_time_to_seconds(start_time) or 0.0),
                "segment_idx": seg_idx,
                "base_confidence": round(_candidate_confidence(sentence), 3),
                "flags": _candidate_flags(sentence),
            })

    if not candidates:
        return []

    # Dedupe before limiting.
    seen = set()
    deduped: List[Dict[str, Any]] = []
    for c in sorted(candidates, key=lambda item: parse_time_to_seconds(item["start_time"]) or 0.0):
        key = (c["start_time"], c["text"].lower())
        if key in seen:
            continue
        seen.add(key)
        deduped.append(c)

    ranked = sorted(
        deduped,
        key=lambda item: (-(item.get("base_confidence") or 0.0), parse_time_to_seconds(item["start_time"]) or 0.0),
    )
    limited = ranked[:max_candidates]
    limited.sort(key=lambda item: parse_time_to_seconds(item["start_time"]) or 0.0)

    with_ids: List[Dict[str, Any]] = []
    for idx, c in enumerate(limited, start=1):
        item = dict(c)
        item["candidate_id"] = idx
        with_ids.append(item)
    return with_ids


def _render_prompt(template: str, values: Dict[str, str]) -> str:
    rendered = template or ""
    for key, value in values.items():
        rendered = rendered.replace("{" + key + "}", value)
    return rendered


def _chapter_outline(chapters: List[Dict[str, Any]]) -> str:
    if not chapters:
        return "No chapter summaries available."
    lines: List[str] = []
    for ch in chapters[:12]:
        title = str(ch.get("title") or "Untitled Chapter")
        st = str(ch.get("start_time") or "")
        et = str(ch.get("end_time") or "")
        summary = str(ch.get("summary") or "").strip()
        if len(summary) > 220:
            summary = summary[:217] + "..."
        lines.append(f"- {title} ({st} -> {et}): {summary}")
    return "\n".join(lines)


def _normalize_snippet(text: str, char_budget: int) -> str:
    cleaned = re.sub(r"\s+", " ", (text or "")).strip()
    if not cleaned:
        return ""
    if len(cleaned) > char_budget:
        return cleaned[: max(0, char_budget - 3)].rstrip() + "..."
    return cleaned


def _row_context_priority(row: Dict[str, Any]) -> int:
    text = str(row.get("question_text") or "").strip()
    if not text:
        return 0

    score = 0
    band = str(row.get("confidence_band") or "")
    if band == "low":
        score += 3
    elif band == "medium":
        score += 2

    if CONTEXT_WORTHY_START_RE.search(text):
        score += 2
    if CONTEXT_WORTHY_PRONOUN_RE.search(text):
        score += 2
    if len(text.split()) >= 20:
        score += 1

    return score


def _build_segment_time_index(segments: List[Any]) -> List[tuple]:
    """Pre-compute sorted (start_seconds, index) pairs for binary search."""
    index = []
    for i, seg in enumerate(segments):
        t = parse_time_to_seconds(str(getattr(seg, "start_time", "") or ""))
        if t is not None:
            index.append((t, i))
    index.sort()
    return index


def _segment_index_for_row(
    row: Dict[str, Any],
    segments: List[Any],
    _time_index: Optional[List[tuple]] = None,
) -> Optional[int]:
    raw = row.get("segment_idx")
    try:
        idx = int(raw) if raw is not None else None
    except (TypeError, ValueError):
        idx = None

    if idx is not None and 0 <= idx < len(segments):
        return idx

    target_seconds = parse_time_to_seconds(str(row.get("start_time") or ""))
    if target_seconds is None or not segments:
        return None

    # Use pre-built index with bisect for O(log n) lookup.
    if _time_index:
        pos = bisect.bisect_left(_time_index, (target_seconds,))
        best_idx = None
        best_dist = float("inf")
        for p in range(max(0, pos - 1), min(len(_time_index), pos + 2)):
            t, seg_i = _time_index[p]
            d = abs(t - target_seconds)
            if d < best_dist:
                best_dist = d
                best_idx = seg_i
        return best_idx

    # Fallback: linear scan.
    best_idx = None
    best_distance = float("inf")
    for i, seg in enumerate(segments):
        seg_start = parse_time_to_seconds(str(getattr(seg, "start_time", "") or ""))
        seg_end = parse_time_to_seconds(str(getattr(seg, "end_time", "") or ""))
        if seg_start is None:
            continue
        if seg_end is not None and seg_start <= target_seconds <= seg_end:
            return i
        distance = abs(seg_start - target_seconds)
        if distance < best_distance:
            best_distance = distance
            best_idx = i

    return best_idx


def _chapter_title_for_time(start_time: str, chapters: List[Dict[str, Any]]) -> str:
    question_seconds = parse_time_to_seconds(start_time or "")
    if question_seconds is None:
        return ""

    for ch in chapters or []:
        ch_start = parse_time_to_seconds(str(ch.get("start_time") or ""))
        ch_end = parse_time_to_seconds(str(ch.get("end_time") or ""))
        if ch_start is None:
            continue
        if ch_end is None:
            ch_end = ch_start + 1.0
        if ch_start <= question_seconds <= ch_end:
            return str(ch.get("title") or "").strip()
    return ""


def _collect_neighbor_text(
    segments: List[Any],
    anchor_idx: int,
    direction: int,
    char_budget: int,
    max_segments: int = 3,
) -> str:
    snippets: List[str] = []
    used = 0
    idx = anchor_idx + direction
    count = 0

    while 0 <= idx < len(segments) and count < max_segments and used < char_budget:
        raw_text = str(getattr(segments[idx], "text", "") or "")
        remaining = max(0, char_budget - used)
        if remaining <= 0:
            break
        snippet = _normalize_snippet(raw_text, remaining)
        if snippet:
            if direction < 0:
                snippets.insert(0, snippet)
            else:
                snippets.append(snippet)
            used += len(snippet) + 1
            count += 1
        idx += direction

    return " ".join(snippets)


def _build_rewrite_context_map(
    rows: List[Dict[str, Any]],
    segments: List[Any],
    chapters: List[Dict[str, Any]],
    max_context_rows: int = MAX_REWRITE_CONTEXT_ROWS,
    before_char_budget: int = CONTEXT_BEFORE_CHAR_BUDGET,
    after_char_budget: int = CONTEXT_AFTER_CHAR_BUDGET,
) -> Dict[str, Dict[str, Any]]:
    if not rows or not segments or max_context_rows <= 0:
        return {}

    prioritized: List[tuple] = []
    for row in rows:
        qid = str(row.get("id") or "").strip()
        if not qid:
            continue
        priority = _row_context_priority(row)
        if priority <= 0:
            continue
        prioritized.append((priority, parse_time_to_seconds(str(row.get("start_time") or "")) or 0.0, row))

    if not prioritized:
        return {}

    prioritized.sort(key=lambda item: (-item[0], item[1]))
    selected_rows = [item[2] for item in prioritized[:max_context_rows]]

    time_index = _build_segment_time_index(segments)

    context_map: Dict[str, Dict[str, Any]] = {}
    for row in selected_rows:
        qid = str(row.get("id") or "").strip()
        idx = _segment_index_for_row(row, segments, _time_index=time_index)
        if idx is None:
            continue

        before = _collect_neighbor_text(segments, idx, direction=-1, char_budget=before_char_budget)
        after = _collect_neighbor_text(segments, idx, direction=1, char_budget=after_char_budget)
        chapter_title = _chapter_title_for_time(str(row.get("start_time") or ""), chapters)

        context_payload: Dict[str, Any] = {"segment_idx": idx}
        if before:
            context_payload["context_before"] = before
        if after:
            context_payload["context_after"] = after
        if chapter_title:
            context_payload["context_chapter_title"] = chapter_title

        if len(context_payload) > 1:
            context_map[qid] = context_payload

    return context_map


def _extract_questions(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    if not isinstance(payload, dict):
        return []
    raw = payload.get("questions")
    if isinstance(raw, list):
        return [item for item in raw if isinstance(item, dict)]
    return []


def _extract_rewrites(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    if not isinstance(payload, dict):
        return []
    raw = payload.get("rewrites")
    if isinstance(raw, list):
        return [item for item in raw if isinstance(item, dict)]
    return []


def _rewrite_for_readability(
    ctx: ProcessorContext,
    rows: List[Dict[str, Any]],
    segments: List[Any],
    interview_name: str,
    main_summary: Dict[str, Any],
    chapters: List[Dict[str, Any]],
    system_prompt: Optional[str] = None,
    user_prompt: Optional[str] = None,
    max_context_rows: int = MAX_REWRITE_CONTEXT_ROWS,
    before_char_budget: int = CONTEXT_BEFORE_CHAR_BUDGET,
    after_char_budget: int = CONTEXT_AFTER_CHAR_BUDGET,
) -> List[Dict[str, Any]]:
    if not rows:
        return rows

    if not system_prompt:
        system_prompt = load_prompt(ctx, "rewrite_questions_system.txt")
    if not user_prompt:
        user_prompt = load_prompt(ctx, "rewrite_questions_user.txt")

    summary_text = ""
    if isinstance(main_summary, dict):
        summary_text = str(main_summary.get("summary") or "")
    if len(summary_text) > 1200:
        summary_text = summary_text[:1197] + "..."

    context_map = _build_rewrite_context_map(
        rows=rows,
        segments=segments,
        chapters=chapters,
        max_context_rows=max_context_rows,
        before_char_budget=before_char_budget,
        after_char_budget=after_char_budget,
    )

    rewrite_input: List[Dict[str, Any]] = []
    for row in rows:
        qid = str(row.get("id") or "").strip()
        item: Dict[str, Any] = {
            "id": qid,
            "question_text": str(row.get("question_text") or "").strip(),
            "start_time": row.get("start_time"),
            "end_time": row.get("end_time"),
        }
        context_payload = context_map.get(qid)
        if context_payload:
            if context_payload.get("context_before"):
                item["context_before"] = context_payload["context_before"]
            if context_payload.get("context_after"):
                item["context_after"] = context_payload["context_after"]
            if context_payload.get("context_chapter_title"):
                item["context_chapter_title"] = context_payload["context_chapter_title"]
        rewrite_input.append(item)

    values = {
        "interview_name": interview_name,
        "main_summary": summary_text or "No main summary available.",
        "chapter_outline": _chapter_outline(chapters),
        "question_json": json.dumps(rewrite_input, ensure_ascii=False, indent=2),
    }

    system_text = _render_prompt(system_prompt, values)
    user_text = _render_prompt(user_prompt, values)

    model = os.getenv("QUESTION_REWRITE_MODEL", "gpt-4o-mini")
    try:
        payload = call_openai_json(
            ctx,
            system_prompt=system_text,
            user_prompt=user_text,
            model=model,
            max_tokens=2200,
        )
    except Exception:
        return rows

    rewrite_items = _extract_rewrites(payload)
    rewrite_by_id: Dict[str, Dict[str, Any]] = {}
    for item in rewrite_items:
        qid = str(item.get("id") or "").strip()
        rewritten = str(item.get("rewritten_question_text") or "").strip()
        if not qid or not rewritten:
            continue
        rewrite_by_id[qid] = item

    if not rewrite_by_id:
        if not context_map:
            return rows
        rows_with_context: List[Dict[str, Any]] = []
        for row in rows:
            updated = dict(row)
            qid = str(row.get("id") or "").strip()
            context_payload = context_map.get(qid)
            if context_payload:
                updated["segment_idx"] = context_payload.get("segment_idx")
                if context_payload.get("context_before"):
                    updated["context_before"] = context_payload["context_before"]
                if context_payload.get("context_after"):
                    updated["context_after"] = context_payload["context_after"]
                if context_payload.get("context_chapter_title"):
                    updated["context_chapter_title"] = context_payload["context_chapter_title"]
            rows_with_context.append(updated)
        return rows_with_context

    rewritten_rows: List[Dict[str, Any]] = []
    for row in rows:
        updated = dict(row)
        qid = str(row.get("id") or "").strip()

        context_payload = context_map.get(qid)
        if context_payload:
            updated["segment_idx"] = context_payload.get("segment_idx")
            if context_payload.get("context_before"):
                updated["context_before"] = context_payload["context_before"]
            if context_payload.get("context_after"):
                updated["context_after"] = context_payload["context_after"]
            if context_payload.get("context_chapter_title"):
                updated["context_chapter_title"] = context_payload["context_chapter_title"]

        incoming = rewrite_by_id.get(qid)
        if not incoming:
            rewritten_rows.append(updated)
            continue

        rewritten_text = re.sub(r"\s+", " ", str(incoming.get("rewritten_question_text") or "")).strip()
        current_text = str(row.get("question_text") or "").strip()
        if not rewritten_text or not current_text:
            rewritten_rows.append(updated)
            continue

        if rewritten_text.lower() != current_text.lower():
            updated["original_question_text"] = str(row.get("original_question_text") or current_text)
            updated["question_text"] = rewritten_text
            updated["rewrite_applied"] = True
            updated["rewrite_notes"] = str(incoming.get("notes") or "")
            updated["rewrite_model"] = model

        rewritten_rows.append(updated)

    return rewritten_rows


def generate_questions(
    ctx: ProcessorContext,
    segments: List[Any],
    plaintext_transcript: str,
    main_summary: Dict[str, Any],
    chapters: List[Dict[str, Any]],
    interview_name: str,
    system_prompt: Optional[str] = None,
    user_prompt: Optional[str] = None,
    rewrite_system_prompt: Optional[str] = None,
    rewrite_user_prompt: Optional[str] = None,
    rewrite_context_max_rows: int = MAX_REWRITE_CONTEXT_ROWS,
    rewrite_context_before_chars: int = CONTEXT_BEFORE_CHAR_BUDGET,
    rewrite_context_after_chars: int = CONTEXT_AFTER_CHAR_BUDGET,
    max_questions: int = 30,
) -> List[Dict[str, Any]]:
    candidates = _build_candidates(segments)
    if not candidates:
        return []

    # Clamp context parameters (mirrors the clamping done before _rewrite_for_readability)
    try:
        _log_max_ctx = max(0, min(40, int(rewrite_context_max_rows)))
    except (TypeError, ValueError):
        _log_max_ctx = MAX_REWRITE_CONTEXT_ROWS
    try:
        _log_before = max(0, min(600, int(rewrite_context_before_chars)))
    except (TypeError, ValueError):
        _log_before = CONTEXT_BEFORE_CHAR_BUDGET
    try:
        _log_after = max(0, min(600, int(rewrite_context_after_chars)))
    except (TypeError, ValueError):
        _log_after = CONTEXT_AFTER_CHAR_BUDGET

    if ctx.logger:
        ctx.logger.log_questions_params(_log_max_ctx, _log_before, _log_after)

    _q_tokens_before = ctx.total_tokens_used
    _q_t0 = time.time()

    candidate_map = {int(c["candidate_id"]): c for c in candidates}

    if not system_prompt:
        system_prompt = load_prompt(ctx, "generate_questions_system.txt")
    if not user_prompt:
        user_prompt = load_prompt(ctx, "generate_questions_user.txt")

    summary_text = ""
    if isinstance(main_summary, dict):
        summary_text = str(main_summary.get("summary") or "")
    if len(summary_text) > 1800:
        summary_text = summary_text[:1800] + "..."

    values = {
        "interview_name": interview_name,
        "max_questions": str(max_questions),
        "main_summary": summary_text or "No main summary available.",
        "chapter_outline": _chapter_outline(chapters),
        "candidate_json": json.dumps(candidates, ensure_ascii=False, indent=2),
    }

    system_text = _render_prompt(system_prompt, values)
    user_text = _render_prompt(user_prompt, values)

    model = os.getenv("QUESTION_DETECT_MODEL", "gpt-4o-mini")
    payload = call_openai_json(
        ctx,
        system_prompt=system_text,
        user_prompt=user_text,
        model=model,
        max_tokens=2200,
    )

    question_items = _extract_questions(payload)

    generated_rows: List[Dict[str, Any]] = []
    for item in question_items:
        candidate_id = item.get("candidate_id")
        try:
            candidate_id = int(candidate_id) if candidate_id is not None else None
        except (TypeError, ValueError):
            candidate_id = None

        candidate = candidate_map.get(candidate_id) if candidate_id else None

        qtext = str(item.get("question_text") or item.get("questionText") or item.get("text") or "").strip()
        if not qtext and candidate:
            qtext = candidate.get("text", "").strip()
        if not qtext:
            continue

        start_time = str(item.get("start_time") or item.get("startTime") or "").strip()
        end_time = str(item.get("end_time") or item.get("endTime") or "").strip()
        if not start_time and candidate:
            start_time = candidate.get("start_time", "")
        if not end_time and candidate:
            end_time = candidate.get("end_time", start_time)

        try:
            confidence = float(item.get("confidence", candidate.get("base_confidence") if candidate else 0.5))
        except (TypeError, ValueError):
            confidence = candidate.get("base_confidence", 0.5) if candidate else 0.5
        confidence = max(0.0, min(1.0, confidence))

        status = str(item.get("status") or "unreviewed").strip().lower()
        if status not in VALID_STATUSES:
            status = "unreviewed"

        flags = item.get("flags") if isinstance(item.get("flags"), list) else (candidate.get("flags") if candidate else [])

        row = {
            "id": stable_question_id(interview_name, normalize_timestamp(start_time), qtext),
            "question_text": qtext,
            "start_time": normalize_timestamp(start_time),
            "end_time": normalize_timestamp(end_time, parse_time_to_seconds(start_time) or 0.0),
            "segment_idx": candidate.get("segment_idx") if candidate else None,
            "confidence": round(confidence, 3),
            "status": status,
            "flags": flags or [],
            "notes": str(item.get("notes") or ""),
            "source": "question_detection_v2",
            "model": model,
            "prompt_version": "question_detect_v2",
            "reason_code": str(item.get("reason_code") or "generated"),
        }
        generated_rows.append(row)

    normalized = normalize_question_rows(generated_rows)

    # Fallback: if model returns no valid rows, keep top heuristic candidates.
    if not normalized:
        fallback_rows: List[Dict[str, Any]] = []
        for c in candidates[:max_questions]:
            fallback_rows.append({
                "id": stable_question_id(interview_name, c["start_time"], c["text"]),
                "question_text": c["text"],
                "start_time": c["start_time"],
                "end_time": c["end_time"],
                "segment_idx": c.get("segment_idx"),
                "confidence": c["base_confidence"],
                "status": "unreviewed",
                "flags": c.get("flags") or [],
                "notes": "",
                "source": "question_detection_fallback",
                "model": model,
                "prompt_version": "question_detect_v2",
                "reason_code": "fallback_rules",
            })
        normalized = normalize_question_rows(fallback_rows)

    if len(normalized) > max_questions:
        normalized = normalized[:max_questions]

    try:
        max_context_rows = max(0, min(40, int(rewrite_context_max_rows)))
    except (TypeError, ValueError):
        max_context_rows = MAX_REWRITE_CONTEXT_ROWS

    try:
        before_char_budget = max(0, min(600, int(rewrite_context_before_chars)))
    except (TypeError, ValueError):
        before_char_budget = CONTEXT_BEFORE_CHAR_BUDGET

    try:
        after_char_budget = max(0, min(600, int(rewrite_context_after_chars)))
    except (TypeError, ValueError):
        after_char_budget = CONTEXT_AFTER_CHAR_BUDGET

    rewritten_rows = _rewrite_for_readability(
        ctx=ctx,
        rows=normalized,
        segments=segments,
        interview_name=interview_name,
        main_summary=main_summary,
        chapters=chapters,
        system_prompt=rewrite_system_prompt,
        user_prompt=rewrite_user_prompt,
        max_context_rows=max_context_rows,
        before_char_budget=before_char_budget,
        after_char_budget=after_char_budget,
    )
    final_rows = normalize_question_rows(rewritten_rows)

    if ctx.logger:
        stats = compute_question_stats(final_rows)
        ctx.logger.log_questions_api(
            model, time.time() - _q_t0, ctx.total_tokens_used - _q_tokens_before
        )
        ctx.logger.log_questions_stats(stats)

    return final_rows
