"""
Civil Rights History Project — Processor

Split from openai_processor.py into step-based modules.
Each module corresponds to one step of the pipeline.

Usage:
    from processor import ProcessorContext
    from processor.blocking import build_text_blocks
    from processor.labeling import label_text_blocks
    from processor.toc import build_hierarchical_toc
    from processor.chapterization import detect_topic_transitions
    from processor.summarization import generate_main_summary, generate_chapters
    from processor.tuning import score_summary, score_chapter, run_tuning_loop
    from processor.engagement import run_engagement_scoring

Step Registry (for extensibility):
    from processor.step_registry import register_step, get_all_steps, PipelineStep
"""

from .shared import ProcessorContext, MAIN_TOPICS, CIVIL_RIGHTS_EVENTS

__all__ = [
    "ProcessorContext",
    "MAIN_TOPICS",
    "CIVIL_RIGHTS_EVENTS",
]