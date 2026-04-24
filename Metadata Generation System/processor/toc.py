"""
Step 3 — TOC: Build hierarchical table of contents from labeled blocks.
Pure logic, no API calls.
"""
from collections import defaultdict
from typing import List, Dict, Any, Tuple
from .shared import MAIN_TOPICS


def build_hierarchical_toc(
    text_blocks: List[Dict[str, Any]],
    block_topics: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Merge contiguous blocks with the same main topic into TOC entries,
    then add subtopic spans within each entry.
    """
    if not text_blocks or not block_topics:
        return {"toc": [], "topic_index": {}}

    topic_by_bn = {bt["block_number"]: bt for bt in block_topics}

    toc = []
    topic_index: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    # Seed with known topics so they always appear in the index
    for t in MAIN_TOPICS:
        topic_index[t]  # touch to create entry

    def block_time(bn: int) -> Tuple[str, str]:
        b = text_blocks[bn - 1]
        return b["start_time"], b["end_time"]

    # Merge contiguous blocks by main topic
    current = None
    for bn in range(1, len(text_blocks) + 1):
        bt = topic_by_bn.get(bn, {})
        cat = bt.get("main_topic_category", MAIN_TOPICS[0])
        st, et = block_time(bn)

        if current is None or current["topic"] != cat:
            if current is not None:
                toc.append(current)
                topic_index[current["topic"]].append({
                    "start_time": current["start_time"],
                    "end_time": current["end_time"],
                    "start_block": current["start_block"],
                    "end_block": current["end_block"],
                })

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

    if current is not None:
        toc.append(current)
        topic_index[current["topic"]].append({
            "start_time": current["start_time"],
            "end_time": current["end_time"],
            "start_block": current["start_block"],
            "end_block": current["end_block"],
        })

    # Add subtopic spans within each TOC entry
    for entry in toc:
        sb = entry["start_block"]
        eb = entry["end_block"]
        sub_spans = []
        cur_sub = None
        for bn in range(sb, eb + 1):
            subs = topic_by_bn.get(bn, {}).get("subtopics", [])
            label = subs[0] if subs else "misc"
            st, et = block_time(bn)
            if cur_sub is None or cur_sub["label"] != label:
                if cur_sub is not None:
                    sub_spans.append(cur_sub)
                cur_sub = {
                    "label": label,
                    "start_time": st,
                    "end_time": et,
                    "start_block": bn,
                    "end_block": bn
                }
            else:
                cur_sub["end_time"] = et
                cur_sub["end_block"] = bn
        if cur_sub is not None:
            sub_spans.append(cur_sub)
        entry["subtopics"] = sub_spans

    return {"toc": toc, "topic_index": dict(topic_index)}