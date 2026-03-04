"""
Step Registry — Open/Closed pipeline extensibility.

New pipeline steps register themselves here. Each step declares its
dependencies, outputs, and toggle behavior. The app and templates
read from the registry to build nav, enforce dependencies, and skip
disabled steps — no modification of existing code required.

To add a new step:
    1. Create processor/my_step.py with a run function
    2. Add prompts to processor_prompts/ if needed
    3. Call register_step() at module level or in __init__.py

Example:
    register_step(PipelineStep(
        id="question_detection",
        display_name="Question Detection",
        order=75,                         # between tuning (70) and results (80)
        requires=["segments", "plaintext_transcript"],
        produces=["detected_questions"],
        default_enabled=True,
        disable_warning="No clip-worthy questions will be identified",
        route_name="question_detection_page",
        nav_done_key="detected_questions",   # state key to check for 'done' badge
    ))
"""

from dataclasses import dataclass, field
from typing import Optional, List, Dict


@dataclass
class PipelineStep:
    """Declaration of a single pipeline step."""
    id: str                               # unique key, e.g. "labeling"
    display_name: str                     # shown in nav and UI
    order: int                            # sort position (10, 20, 30...)
    requires: List[str] = field(default_factory=list)     # state keys that must be non-None
    produces: List[str] = field(default_factory=list)     # state keys this step writes
    default_enabled: bool = True
    disable_warning: Optional[str] = None  # shown when user disables this step
    route_name: Optional[str] = None       # Flask route name for the step page
    nav_done_key: Optional[str] = None     # state key to check for green 'done' badge
    nav_ready_key: Optional[str] = None    # state key required for nav link to be active


# ── Global registry ────────────────────────────────────────────────────

_REGISTRY: Dict[str, PipelineStep] = {}


def register_step(step: PipelineStep):
    """Register a pipeline step. Overwrites if id already exists."""
    _REGISTRY[step.id] = step


def get_step(step_id: str) -> Optional[PipelineStep]:
    """Look up a step by id."""
    return _REGISTRY.get(step_id)


def get_all_steps() -> List[PipelineStep]:
    """Return all registered steps sorted by order."""
    return sorted(_REGISTRY.values(), key=lambda s: s.order)


def get_toggleable_steps() -> List[PipelineStep]:
    """Return steps that can be enabled/disabled (excludes upload and results)."""
    return [s for s in get_all_steps() if s.disable_warning is not None or s.id not in ("upload", "results")]


def get_optional_steps() -> List[PipelineStep]:
    """Return steps the user can toggle on/off on the upload page."""
    # Steps that have a disable_warning or are explicitly toggleable
    NON_TOGGLEABLE = {"upload", "results"}
    return [s for s in get_all_steps() if s.id not in NON_TOGGLEABLE]


def default_steps_enabled() -> Dict[str, bool]:
    """Return default enabled state for all optional steps."""
    return {s.id: s.default_enabled for s in get_optional_steps()}


# ── Register core pipeline steps ───────────────────────────────────────

register_step(PipelineStep(
    id="upload",
    display_name="Upload",
    order=10,
    requires=[],
    produces=["segments", "plaintext_transcript", "text_blocks"],
    default_enabled=True,
    route_name="upload_page",
    nav_done_key="segments",
))

register_step(PipelineStep(
    id="labeling",
    display_name="Labeling",
    order=20,
    requires=["text_blocks"],
    produces=["block_topics"],
    default_enabled=True,
    disable_warning="No topic labels or TOC. Chapter breaks will be less accurate.",
    route_name="labeling_page",
    nav_done_key="block_topics",
    nav_ready_key="text_blocks",
))

register_step(PipelineStep(
    id="toc",
    display_name="TOC",
    order=30,
    requires=["text_blocks", "block_topics"],
    produces=["toc_bundle"],
    default_enabled=True,
    disable_warning=None,
    route_name="toc_page",
    nav_done_key="toc_bundle",
    nav_ready_key="block_topics",
))

register_step(PipelineStep(
    id="chapterization",
    display_name="Chapters",
    order=40,
    requires=["text_blocks"],
    produces=["chapter_breaks", "chapter_breaks_preview"],
    default_enabled=True,
    disable_warning="No chapter breaks or chapter summaries",
    route_name="chapterization_page",
    nav_done_key="chapter_breaks",
    nav_ready_key="block_topics",
))

register_step(PipelineStep(
    id="summarization",
    display_name="Summary",
    order=50,
    requires=["plaintext_transcript"],
    produces=["main_summary", "chapters"],
    default_enabled=True,
    disable_warning=None,
    route_name="summarization_page",
    nav_done_key="chapters",
    nav_ready_key="chapter_breaks",
))

register_step(PipelineStep(
    id="tuning",
    display_name="Tuning",
    order=60,
    requires=["main_summary"],
    produces=["tuning_results"],
    default_enabled=True,
    disable_warning="Summaries will not be scored or refined",
    route_name="tuning_page",
    nav_done_key="tuning_results",
    nav_ready_key="main_summary",
))

register_step(PipelineStep(
    id="engagement",
    display_name="Engagement",
    order=70,
    requires=["segments", "plaintext_transcript"],
    produces=["engagement_scores"],
    default_enabled=True,
    disable_warning=None,
    route_name="engagement_page",
    nav_done_key="engagement_scores",
    nav_ready_key="text_blocks",
))

register_step(PipelineStep(
    id="results",
    display_name="Results",
    order=100,
    requires=[],
    produces=[],
    default_enabled=True,
    route_name="results_page",
    nav_ready_key="main_summary",
))