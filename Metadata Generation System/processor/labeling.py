"""
Step 2 — Labeling: Assign topic categories and subtopics to each text block.
"""

import re
from typing import List, Dict, Any, Optional
from .shared import (
    ProcessorContext, MAIN_TOPICS,
    call_openai_json, load_prompt
)

# Maximum blocks per API call — keeps output JSON well within token limits
LABEL_CHUNK_SIZE = 30


def label_text_blocks(
    ctx: ProcessorContext,
    text_blocks: List[Dict[str, Any]],
    system_prompt: Optional[str] = None,
    user_prompt: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Send text blocks to GPT and get topic labels per block.

    If system_prompt / user_prompt are provided, they override the defaults.
    The user_prompt should contain {analysis_text} and the system_prompt
    should contain {topics_list} as placeholders.

    For large interviews, blocks are processed in chunks to avoid
    output token truncation.
    """
    if not text_blocks:
        return []

    topics_list = '", "'.join(MAIN_TOPICS)

    # Resolve prompt templates once (before chunking)
    if system_prompt is None:
        system_prompt = load_prompt(ctx, 'label_text_blocks_for_toc_system.txt')
    system_prompt = system_prompt.replace('{topics_list}', topics_list)

    if user_prompt is None:
        user_prompt = load_prompt(ctx, 'label_text_blocks_for_toc_user.txt')

    # ── Chunk blocks and label each chunk ──────────────────────────
    n = len(text_blocks)
    all_labeled = {}  # block_number -> labeled dict

    for chunk_start in range(0, n, LABEL_CHUNK_SIZE):
        chunk_end = min(chunk_start + LABEL_CHUNK_SIZE, n)
        chunk = text_blocks[chunk_start:chunk_end]
        chunk_size = len(chunk)

        print(f"Labeling blocks {chunk_start + 1}–{chunk_end} of {n}")

        # Build analysis text for this chunk
        analysis_text = _build_analysis_text(chunk, chunk_start)

        # Substitute into user prompt
        chunk_user_prompt = user_prompt.replace('{analysis_text}', analysis_text)

        # Token budget for this chunk
        toc_max_tokens = min(9000, 800 + 140 * chunk_size)

        resp = call_openai_json(
            ctx, system_prompt, chunk_user_prompt,
            model=ctx.toc_model, max_tokens=toc_max_tokens
        )

        if isinstance(resp, dict) and "error" in resp:
            raise RuntimeError(f"TOC labeling OpenAI error: {resp['error']}")

        # Extract labeled blocks from response
        blocks = resp.get("blocks", []) if isinstance(resp, dict) else []

        # Detect if model returned 1-indexed chunk-relative numbers instead of
        # global block numbers (common when chunks start past block 30).
        # If all returned block_numbers fit within [1..chunk_size] but the chunk
        # starts at an offset, remap them to global numbering.
        if chunk_start > 0 and blocks:
            returned_nums = []
            for item in blocks:
                bn = item.get("block_number")
                if isinstance(bn, str):
                    m = re.search(r"\d+", bn)
                    bn = int(m.group()) if m else None
                if isinstance(bn, int):
                    returned_nums.append(bn)
            if returned_nums and max(returned_nums) <= chunk_size:
                print(f"  Remapping chunk-relative block numbers (1–{chunk_size}) → global ({chunk_start + 1}–{chunk_end})")
                for item in blocks:
                    bn = item.get("block_number")
                    if isinstance(bn, str):
                        m = re.search(r"\d+", bn)
                        bn = int(m.group()) if m else None
                    if isinstance(bn, int) and 1 <= bn <= chunk_size:
                        item["block_number"] = bn + chunk_start

        for item in blocks:
            parsed = _normalize_block(item, n)
            if parsed:
                all_labeled[parsed["block_number"]] = parsed

        print(f"  Got {len(blocks)} labels, running total: {len(all_labeled)}/{n}")

    # ── Validate coverage ──────────────────────────────────────────
    if len(all_labeled) == 0:
        raise RuntimeError("TOC labeling returned 0 valid blocks (model output likely invalid).")

    missing_count = n - len(all_labeled)
    if missing_count > 0:
        missing = [i for i in range(1, n + 1) if i not in all_labeled]
        print(f"Warning: {missing_count} blocks missing labels, filling with fallback: {missing[:12]}")

    # ── Build final output, filling gaps with fallback ─────────────
    filled = []
    for i in range(1, n + 1):
        if i in all_labeled:
            filled.append(all_labeled[i])
        else:
            filled.append({
                "block_number": i,
                "main_topic_category": "Unlabeled",
                "subtopics": ["labeling failed for this block"],
                "confidence": 0.0
            })

    return filled


def _build_analysis_text(
    chunk: List[Dict[str, Any]],
    global_offset: int,
) -> str:
    """Build the trimmed analysis text for a chunk of blocks."""
    max_total_chars = 14000
    n = len(chunk)

    def _header(global_idx: int, block: Dict[str, Any]) -> str:
        return f"\n\n--- B{global_idx + 1} ({block['start_time']} - {block['end_time']}) ---\n"

    headers = [_header(global_offset + i, b) for i, b in enumerate(chunk)]
    header_total = sum(len(h) for h in headers)
    remaining = max_total_chars - header_total

    min_per_block = 80
    max_per_block = 260

    if remaining <= n * min_per_block:
        per_block = min_per_block
    else:
        per_block = min(max_per_block, remaining // n)

    def _trim_text(text: str, limit: int) -> str:
        text = (text or "").strip()
        if limit <= 0 or len(text) <= limit:
            return text
        clipped = text[:limit].rsplit(' ', 1)[0].strip()
        return (clipped or text[:limit].strip()) + " …"

    parts = []
    for i, block in enumerate(chunk):
        txt = _trim_text(block.get("text") or "", per_block)
        parts.append(headers[i] + txt)

    return "".join(parts)


def _normalize_block(item: Any, total_blocks: int) -> Optional[Dict[str, Any]]:
    """Parse and validate a single block label from the API response."""
    if not isinstance(item, dict):
        return None

    bn = item.get("block_number")
    if isinstance(bn, str):
        m = re.search(r"\d+", bn)
        bn = int(m.group()) if m else None
    if not isinstance(bn, int) or bn < 1 or bn > total_blocks:
        return None

    cat = item.get("main_topic_category", "")
    if cat not in MAIN_TOPICS:
        cat = MAIN_TOPICS[0]

    subs = item.get("subtopics", [])
    if not isinstance(subs, list):
        subs = []
    subs = [s.strip() for s in subs if isinstance(s, str) and s.strip()][:5]
    if len(subs) < 3:
        subs += ["misc"] * (3 - len(subs))

    try:
        conf = float(item.get("confidence", 0.5))
    except Exception:
        conf = 0.5
    conf = max(0.0, min(1.0, conf))

    return {
        "block_number": bn,
        "main_topic_category": cat,
        "subtopics": subs,
        "confidence": conf
    }