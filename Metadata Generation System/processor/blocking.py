"""
Step 1 — Blocking: Parse SRT segments into text blocks.
"""

from typing import List, Dict, Any, Optional
from .shared import ProcessorContext


def build_text_blocks(
    ctx: ProcessorContext,
    segments: list,
    plaintext_transcript: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Split SRT segments into blocks of ctx.chapter_block_size segments each."""
    text_blocks = []
    block_size = ctx.chapter_block_size

    for i in range(0, len(segments), block_size):
        block_segments = segments[i:i + block_size]

        if plaintext_transcript:
            block_text = extract_plaintext_section(
                plaintext_transcript, segments, i, min(i + block_size - 1, len(segments) - 1)
            )
        else:
            block_text = ' '.join([segment.text for segment in block_segments])

        text_blocks.append({
            'start_idx': i,
            'end_idx': min(i + block_size - 1, len(segments) - 1),
            'text': block_text,
            'start_time': block_segments[0].start_time,
            'end_time': block_segments[-1].end_time
        })

    print(f"Created {len(text_blocks)} text blocks for content analysis")
    return text_blocks


def extract_plaintext_section(
    plaintext: str,
    segments: list,
    start_idx: int,
    end_idx: int
) -> str:
    """Extract a section of plaintext corresponding to segment indices."""
    if not plaintext or start_idx >= len(segments) or end_idx >= len(segments):
        return ' '.join([segments[i].text for i in range(start_idx, end_idx + 1)])

    total_words_before = 0
    section_word_count = 0

    for i in range(start_idx):
        total_words_before += len(segments[i].text.split())

    for i in range(start_idx, end_idx + 1):
        section_word_count += len(segments[i].text.split())

    plaintext_words = plaintext.split()

    if total_words_before >= len(plaintext_words):
        return ' '.join([segments[i].text for i in range(start_idx, end_idx + 1)])

    start_word_idx = total_words_before
    end_word_idx = min(total_words_before + section_word_count, len(plaintext_words))

    return ' '.join(plaintext_words[start_word_idx:end_word_idx])


def generate_metadata(segments: list, interview_name: str) -> Dict[str, Any]:
    """Compute cheap metadata: duration, word count, etc."""
    from .shared import seconds_to_time_format

    if not segments:
        return {}

    total_duration = segments[-1].get_end_seconds()
    word_count = sum(len(segment.text.split()) for segment in segments)

    return {
        'interview_name': interview_name,
        'total_duration_seconds': total_duration,
        'total_duration_formatted': seconds_to_time_format(total_duration),
        'total_segments': len(segments),
        'word_count': word_count,
        'average_words_per_minute': round((word_count / (total_duration / 60)), 1) if total_duration > 0 else 0,
        'estimated_reading_time_minutes': round(word_count / 250, 1)
    }