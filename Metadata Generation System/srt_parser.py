import re
from typing import List, Optional


class SRTSegment:
    def __init__(self, index: int, start_time: str, end_time: str, text: str):
        self.index = index
        self.start_time = start_time
        self.end_time = end_time
        self.text = text
    
    def get_start_seconds(self) -> float:
        return self._time_to_seconds(self.start_time)
    
    def get_end_seconds(self) -> float:
        return self._time_to_seconds(self.end_time)
    
    def _time_to_seconds(self, time_str: str) -> float:
        time_str = time_str.replace(',', '.')
        parts = time_str.split(':')
        if len(parts) == 3:
            hours, minutes, seconds = parts
            return float(hours) * 3600 + float(minutes) * 60 + float(seconds)
        return 0.0


def parse_srt_file(filepath: str) -> List[SRTSegment]:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Normalize line endings (CRLF -> LF, CR -> LF) and ensure trailing newline
    content = content.replace('\r\n', '\n').replace('\r', '\n')
    if not content.endswith('\n'):
        content += '\n'
    
    segments = []
    pattern = r'(\d+)\n(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})\n((?:.*\n)*?)(?:\n|$)'
    
    matches = re.finditer(pattern, content)
    
    for match in matches:
        index = int(match.group(1))
        start_time = match.group(2)
        end_time = match.group(3)
        text = match.group(4).strip()
        
        segments.append(SRTSegment(index, start_time, end_time, text))
    
    return segments


def segments_to_text_with_timestamps(segments: List[SRTSegment]) -> str:
    lines = []
    for segment in segments:
        lines.append(f"[{segment.start_time}] {segment.text}")
    return '\n'.join(lines)