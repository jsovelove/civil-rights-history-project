"""
Civil Rights History Project - Demo UI
Flask app that breaks the interview processing pipeline into
individually controllable steps.
"""

import copy
import json
import os
import re
import shutil
import time
import traceback
import zipfile
import threading
from io import BytesIO
from threading import Lock
from uuid import uuid4

from flask import Flask, render_template, request, redirect, url_for, jsonify, send_file, session
from werkzeug.local import LocalProxy
from werkzeug.utils import secure_filename
from processor.questions import (
    compute_question_stats,
    generate_questions,
    normalize_question_rows,
)

# ── app setup ──────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(__file__)
app = Flask(__name__)
app.secret_key = os.getenv('FLASK_SECRET_KEY') or os.urandom(24)
app.config['UPLOAD_FOLDER'] = os.path.join(BASE_DIR, 'uploads')
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)


# ── engagement rubric max scores ───────────────────────────────────────
_ENGAGEMENT_MAXES: dict = {}


def _load_engagement_maxes() -> dict:
    """
    Parse processor_prompts/engagement_schema.txt and return a flat dict
    mapping each sub-dimension JSON key → max_possible value.
    Cached after first successful load so rubric changes take effect on restart.
    """
    global _ENGAGEMENT_MAXES
    if _ENGAGEMENT_MAXES:
        return _ENGAGEMENT_MAXES
    schema_path = os.path.join(BASE_DIR, 'processor_prompts', 'engagement_schema.txt')
    try:
        with open(schema_path, encoding='utf-8') as f:
            schema = json.load(f)
        for dim_val in schema.get('dimension_scores', {}).values():
            for k, v in dim_val.items():
                if isinstance(v, dict) and 'max_possible' in v:
                    _ENGAGEMENT_MAXES[k] = v['max_possible']
    except Exception as exc:
        print(f"Warning: could not load engagement maxes from schema: {exc}")
    return _ENGAGEMENT_MAXES


app.jinja_env.globals['get_engagement_maxes'] = _load_engagement_maxes


@app.template_filter('fmt_duration')
def fmt_duration_filter(seconds: float) -> str:
    """Format a float number of seconds as a human-readable duration."""
    if seconds is None:
        return '—'
    s = max(0, int(round(float(seconds))))
    if s < 60:
        return f"{s}s"
    m, rem = divmod(s, 60)
    if m < 60:
        return f"{int(m)}m {int(rem)}s"
    h, m = divmod(m, 60)
    return f"{int(h)}h {int(m)}m {int(rem)}s"


@app.template_filter('hms')
def hms_filter(time_str):
    """Strip milliseconds from an SRT-style timestamp (HH:MM:SS,mmm → HH:MM:SS).

    Accepts strings with either ',' or '.' as the ms separator. If the input is
    not a recognizable timestamp, returns it unchanged.
    """
    if not time_str:
        return time_str
    s = str(time_str)
    # Strip ms portion regardless of separator
    for sep in (',', '.'):
        if sep in s:
            head, _, _ = s.rpartition(sep)
            # Only strip if the part after sep looks like ms (3 digits)
            tail = s.rpartition(sep)[2]
            if tail.isdigit() and len(tail) <= 3:
                s = head
                break
    return s.strip()


@app.template_filter('to_seconds')
def to_seconds_filter(time_str):
    """Convert SRT timestamp (HH:MM:SS,mmm or HH:MM:SS) to integer seconds."""
    if not time_str:
        return 0
    s = str(time_str).split(',')[0].strip()
    parts = s.split(':')
    try:
        if len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
        if len(parts) == 2:
            return int(parts[0]) * 60 + int(parts[1])
    except (ValueError, IndexError):
        pass
    return 0


_OPTIONAL_STEPS = {"questions", "engagement", "clips"}

_PIPELINE_STEP_DEFS = [
    {"id": "upload", "label": "Upload", "endpoint": "upload_page", "description": "Interview source and settings"},
    {"id": "labeling", "label": "Labeling", "endpoint": "labeling_page", "description": "Topic labeling"},
    {"id": "toc", "label": "TOC", "endpoint": "toc_page", "description": "Table of contents"},
    {"id": "chapterization", "label": "Chapters", "endpoint": "chapterization_page", "description": "Topic transitions"},
    {"id": "summarization", "label": "Summary", "endpoint": "summarization_page", "description": "Interview and chapter summaries"},
    {"id": "questions", "label": "Questions", "endpoint": "questions_page", "description": "Interviewer question detection"},
    {"id": "tuning", "label": "Tuning", "endpoint": "tuning_page", "description": "Scoring and regeneration"},
    {"id": "engagement", "label": "Engagement", "endpoint": "engagement_page", "description": "Audience scoring"},
    {"id": "clips", "label": "Clips", "endpoint": "clips_page", "description": "Clip extraction"},
    {"id": "results", "label": "Results", "endpoint": "results_page", "description": "Final outputs"},
    {"id": "batch", "label": "Batch", "endpoint": "batch_page", "description": "Multi-interview processing"},
]


def _step_complete(step_id: str, state_obj: dict) -> bool:
    if step_id == "upload":
        return bool(state_obj.get("text_blocks"))
    if step_id == "labeling":
        return bool(state_obj.get("block_topics"))
    if step_id == "toc":
        return bool(state_obj.get("toc_bundle"))
    if step_id == "chapterization":
        return bool(state_obj.get("chapter_breaks_preview"))
    if step_id == "summarization":
        # Both main summary AND chapter summaries must be run to count as complete
        return bool(state_obj.get("main_summary") and state_obj.get("chapters"))
    if step_id == "questions":
        return bool(state_obj.get("questions_ran"))
    if step_id == "tuning":
        return bool(state_obj.get("tuning_results"))
    if step_id == "engagement":
        scores = state_obj.get("engagement_scores")
        return bool(isinstance(scores, dict) and scores.get("overall_score"))
    if step_id == "clips":
        clips_data = state_obj.get("clips_data")
        return bool(isinstance(clips_data, dict) and clips_data.get("clips") is not None)
    if step_id == "results":
        # Results is a destination page — only mark complete after the user has visited it
        return bool(state_obj.get("results_visited"))
    if step_id == "batch":
        # Batch is a destination page — only mark complete after a batch has actually been started
        return bool(state_obj.get("batch_started"))
    return False


def _step_enabled(step_id: str, state_obj: dict) -> bool:
    steps_enabled = state_obj.get("steps_enabled", {})
    if step_id == "upload":
        return True
    if step_id == "labeling":
        return bool(state_obj.get("text_blocks"))
    if step_id in {"toc", "chapterization"}:
        return bool(state_obj.get("block_topics"))
    if step_id == "summarization":
        return bool(state_obj.get("chapter_breaks"))
    if step_id == "questions":
        return bool(steps_enabled.get("questions") and (state_obj.get("main_summary") or state_obj.get("chapters")))
    if step_id == "tuning":
        if not state_obj.get("main_summary"):
            return False
        return not (
            steps_enabled.get("questions")
            and state_obj.get("question_placement") == "after_summary"
            and not state_obj.get("questions_ran")
        )
    if step_id == "engagement":
        return bool(state_obj.get("text_blocks") and steps_enabled.get("engagement"))
    if step_id == "clips":
        return bool(state_obj.get("text_blocks") and steps_enabled.get("clips"))
    if step_id in {"results", "batch"}:
        return bool(state_obj.get("main_summary"))
    return False


def _step_issue(step_id: str, state_obj: dict):
    if step_id == "questions" and state_obj.get("questions_error"):
        return "warning"
    if step_id == "engagement":
        scores = state_obj.get("engagement_scores")
        if isinstance(scores, dict) and scores.get("error"):
            return "danger"
    if step_id == "clips":
        clips_data = state_obj.get("clips_data")
        if isinstance(clips_data, dict) and clips_data.get("error"):
            return "danger"
    return None


def get_pipeline_steps(state_obj: dict, active_step: str = ""):
    steps_enabled = state_obj.get("steps_enabled", {})
    items = []
    for index, step_def in enumerate(_PIPELINE_STEP_DEFS, start=1):
        step_id = step_def["id"]
        is_toggled_off = step_id in _OPTIONAL_STEPS and not steps_enabled.get(step_id, True)
        issue = _step_issue(step_id, state_obj)
        is_current = active_step == step_id
        is_complete = _step_complete(step_id, state_obj)
        is_enabled = _step_enabled(step_id, state_obj) or is_current or is_complete
        if issue == "danger":
            status = "danger"
        elif issue == "warning":
            status = "warning"
        elif is_current:
            status = "current"
        elif is_complete:
            status = "success"
        elif is_toggled_off:
            status = "off"
        elif is_enabled:
            status = "info"
        else:
            status = "pending"
        items.append({
            **step_def,
            "number": index,
            "is_current": is_current,
            "is_complete": is_complete,
            "is_enabled": is_enabled,
            "is_toggled_off": is_toggled_off,
            "status": status,
        })
    return items


def get_metrics_summary(state_obj: dict):
    metrics = state_obj.get("step_metrics") or []
    if not metrics:
        return None
    final_metric = metrics[-1]
    return {
        "total_time": final_metric.get("cumulative_s"),
        "total_tokens": final_metric.get("cumulative_tokens", 0),
        "total_cost_usd": final_metric.get("cumulative_cost_usd", 0.0),
        "rows": metrics,
    }


def static_version(filename: str) -> str:
    """Return the mtime of a static file as a cache-buster query value.

    Templates use this with `url_for('static', ..., v=static_version(...))`
    so a CSS/JS edit invalidates the browser cache without manual versioning.
    Falls back to '0' if the file is missing.
    """
    try:
        path = os.path.join(app.static_folder, filename)
        return str(int(os.path.getmtime(path)))
    except OSError:
        return '0'


@app.context_processor
def inject_template_helpers():
    return {
        "get_pipeline_steps": get_pipeline_steps,
        "get_metrics_summary": get_metrics_summary,
        "dev_mode": session.get('dev_mode', False),
        "static_version": static_version,
    }

# ── YouTube helpers ────────────────────────────────────────────────────
_YT_ID_RE = re.compile(
    r'(?:youtube\.com/watch\?(?:.*&)?v=|youtu\.be/|youtube\.com/embed/)'
    r'([a-zA-Z0-9_-]{11})'
)


def extract_youtube_id(url: str):
    """Return the 11-char YouTube video ID from any recognisable URL, or None."""
    if not url:
        return None
    m = _YT_ID_RE.search(url)
    return m.group(1) if m else None


# ── pipeline state (per browser session, resets on restart) ───────────
# Each visitor gets an isolated in-memory pipeline state.
_STATE_LOCK = Lock()
_SESSION_STATES = {}


def _new_state():
    return {
        # step 1 - upload / blocking
        "api_key": None,
        "using_sample": False,
        "srt_path": None,
        "block_size": 23,
        "segments": None,            # List[SRTSegment]
        "plaintext_transcript": None,
        "text_blocks": None,         # List[Dict]

        # step 2 - labeling
        "labeling_sys_prompt": "",
        "labeling_user_prompt": "",
        "block_topics": None,        # List[Dict]

        # step 3 - toc
        "toc_bundle": None,          # {"toc": [...], "topic_index": {...}}

        # step 4 - chapterization
        "chapterization_sys_prompt": "",
        "chapterization_user_prompt": "",
        "chapter_breaks": None,      # List[Tuple[int, int]]
        "chapter_breaks_preview": None,

        # step 5 - summarization
        "main_summary_sys_prompt": "",
        "main_summary_user_prompt": "",
        "chapter_sys_prompt": "",
        "chapter_user_prompt": "",
        "main_summary": None,        # Dict
        "chapters": None,            # List[Dict]

        # step 6 - questions
        "questions_sys_prompt": "",
        "questions_user_prompt": "",
        "questions_rewrite_sys_prompt": "",
        "questions_rewrite_user_prompt": "",
        "questions_context_max_rows": 14,
        "questions_context_before_chars": 220,
        "questions_context_after_chars": 140,
        "questions_rows": None,      # List[Dict]
        "questions_stats": None,     # Dict
        "questions_error": None,
        "questions_ran": False,
        "question_placement": "after_summary",

        # step 7 - tuning
        "eval_sys_prompt": "",
        "eval_user_prompt": "",
        "revision_sys_prompt": "",
        "revision_user_prompt": "",
        "quality_threshold": 80,
        "accuracy_threshold": 80,
        "max_retries": 3,
        "tuning_results": None,

        # step 7 - engagement scoring
        "engagement_sys_prompt": "",
        "engagement_rubric": "",
        "engagement_schema": "",
        "engagement_scores": None,

        # step 8 - clip extraction
        "clips_prompt_sections": {},  # dict: section_id -> content string
        "clips_token_limit": 30000,
        "clips_data": None,

        # destination-page visit flags (drive sidebar checkmarks for non-processing steps)
        "results_visited": False,
        "batch_started": False,

        # module toggles (set on upload page)
        "steps_enabled": {
            "questions": True,
            "engagement": True,
            "clips": True,
        },

        # video preview (optional)
        "youtube_url": "",
        "youtube_video_id": None,

        # processor instance
        "processor": None,

        # per-step metrics  [{step, elapsed_s, tokens, cumulative_s, cumulative_tokens}]
        "step_metrics": [],

        # live progress for the currently running form step
        "active_progress": None,
        
        # pending batch files from zip upload (list of (name, path) tuples)
        "pending_batch_files": None,

        # optional primary source metadata for the current interview
        "primary_source_info": None,
    }


def _get_session_id():
    sid = session.get('sid')
    if not sid:
        sid = uuid4().hex
        session['sid'] = sid
    return sid


def _get_state():
    sid = _get_session_id()
    with _STATE_LOCK:
        if sid not in _SESSION_STATES:
            _SESSION_STATES[sid] = _new_state()
    return _SESSION_STATES[sid]


state = LocalProxy(_get_state)


def _set_active_progress(sid: str, payload: dict):
    with _STATE_LOCK:
        state_obj = _SESSION_STATES.get(sid)
        if state_obj is None:
            return
        existing = state_obj.get("active_progress") or {}
        merged = {**existing, **payload, "updated_at": time.time()}
        state_obj["active_progress"] = merged


def _begin_active_progress(step: str, detail: str = "Starting"):
    sid = _get_session_id()
    _set_active_progress(sid, {
        "step": step,
        "detail": detail,
        "current": 0,
        "total": 0,
        "running": True,
    })


def _finish_active_progress(step: str, detail: str = "Complete"):
    sid = _get_session_id()
    current = 1
    total = 1
    progress = state.get("active_progress") or {}
    if progress.get("total"):
        current = progress.get("total", 1)
        total = progress.get("total", 1)
    _set_active_progress(sid, {
        "step": step,
        "detail": detail,
        "current": current,
        "total": total,
        "running": False,
    })


def _update_active_progress(step: str, current: int, total: int, detail: str):
    _set_active_progress(_get_session_id(), {
        "step": step,
        "detail": detail,
        "current": current,
        "total": total,
        "running": True,
    })


def current_api_key():
    return (state.get("api_key") or "").strip()


def has_api_key():
    """Return True when an API key is available for the current browser session."""
    return bool(current_api_key())


def mask_api_key(api_key):
    """Return a safe, partially masked preview of the current API key."""
    if not api_key:
        return ''
    if len(api_key) <= 8:
        return '•' * len(api_key)
    return f"{api_key[:4]}…{api_key[-4:]}"


def _session_upload_dir(reset=False):
    path = os.path.join(app.config['UPLOAD_FOLDER'], _get_session_id())
    if reset:
        shutil.rmtree(path, ignore_errors=True)
    os.makedirs(path, exist_ok=True)
    return path


def _render_upload(api_key_error=None):
    session_api_key = current_api_key()
    return render_template(
        'upload.html',
        state=state,
        api_key_present=bool(session_api_key),
        api_key_masked=mask_api_key(session_api_key),
        api_key_error=api_key_error,
    )


def _reset_downstream():
    """Reset all downstream state when a new file is uploaded or blocking re-runs."""
    state["using_sample"] = False
    state["block_topics"] = None
    state["toc_bundle"] = None
    state["chapter_breaks"] = None
    state["chapter_breaks_preview"] = None
    state["main_summary"] = None
    state["chapters"] = None
    state["questions_rows"] = None
    state["questions_stats"] = None
    state["questions_error"] = None
    state["questions_ran"] = False
    state["tuning_results"] = None
    state["engagement_scores"] = None
    state["engagement_sys_prompt"] = ""
    state["engagement_rubric"] = ""
    state["engagement_schema"] = ""
    state["clips_data"] = None
    state["clips_prompt_sections"] = {}
    state["clips_token_limit"] = 30000
    state["results_visited"] = False
    state["batch_started"] = False
    # Reset prompts so they reload from files
    state["labeling_sys_prompt"] = ""
    state["labeling_user_prompt"] = ""
    state["chapterization_sys_prompt"] = ""
    state["chapterization_user_prompt"] = ""
    state["main_summary_sys_prompt"] = ""
    state["main_summary_user_prompt"] = ""
    state["chapter_sys_prompt"] = ""
    state["chapter_user_prompt"] = ""
    state["questions_sys_prompt"] = ""
    state["questions_user_prompt"] = ""
    state["questions_rewrite_sys_prompt"] = ""
    state["questions_rewrite_user_prompt"] = ""
    state["questions_context_max_rows"] = 14
    state["questions_context_before_chars"] = 220
    state["questions_context_after_chars"] = 140
    state["eval_sys_prompt"] = ""
    state["eval_user_prompt"] = ""
    state["revision_sys_prompt"] = ""
    state["revision_user_prompt"] = ""
    # Reset processor so it reinits with the current API key and block size
    state["processor"] = None
    state["step_metrics"] = []
    state["active_progress"] = None
    state["primary_source_info"] = None


def _reset_after_summary_changes():
    """Reset dependent outputs when summary/chapter content changes."""
    state["questions_rows"] = None
    state["questions_stats"] = None
    state["questions_error"] = None
    state["questions_ran"] = False
    state["tuning_results"] = None
    state["engagement_scores"] = None


def get_ctx():
    """Lazy-init the ProcessorContext so we only create it once per browser session."""
    sid = _get_session_id()
    if state["processor"] is None:
        from processor import ProcessorContext
        from processor.logger import ProcessingLogger

        prompts_dir = _find_path('processor_prompts')
        facts_path = _find_path('civil_rights_facts.json')
        rubric_path = _find_path('StandardizedRubric_1.md')

        ctx = ProcessorContext(
            api_key=current_api_key(),
            chapter_block_size=state["block_size"],
            prompts_dir=prompts_dir or 'processor_prompts',
            facts_path=facts_path or 'civil_rights_facts.json',
            rubric_path=rubric_path or 'StandardizedRubric_1.md',
        )

        ctx.logger = ProcessingLogger(
            logs_dir=os.path.join(BASE_DIR, 'logs'),
            session_id=sid,
            interview_filename=state.get("srt_path") or "unknown.srt",
            api_key=current_api_key(),
        )

        state["processor"] = ctx
    state["processor"].progress_callback = lambda payload: _set_active_progress(sid, {**payload, "running": True})
    return state["processor"]


def _record_step_metric(step_name: str, elapsed_s: float, tokens_used: int):
    """Append a per-step timing/token record and update cumulative totals."""
    metrics = state.setdefault("step_metrics", [])
    prev_cum_s = metrics[-1]["cumulative_s"] if metrics else 0.0
    prev_cum_tok = metrics[-1]["cumulative_tokens"] if metrics else 0
    prev_cum_cost = metrics[-1].get("cumulative_cost_usd", 0.0) if metrics else 0.0
    ctx = state.get("processor")
    cumulative_cost = float(getattr(ctx, "total_cost_usd", prev_cum_cost) or 0.0)
    step_cost = max(0.0, cumulative_cost - prev_cum_cost)
    metrics.append({
        "step": step_name,
        "elapsed_s": round(elapsed_s, 2),
        "tokens": tokens_used,
        "cost_usd": round(step_cost, 6),
        "cumulative_s": round(prev_cum_s + elapsed_s, 2),
        "cumulative_tokens": prev_cum_tok + tokens_used,
        "cumulative_cost_usd": round(cumulative_cost, 6),
    })


def _find_path(name):
    """Search for a file/dir in the app dir and parent dir."""
    for base in [BASE_DIR, os.path.dirname(BASE_DIR)]:
        p = os.path.join(base, name)
        if os.path.exists(p):
            return p
    return None


def load_prompt_file(filename):
    """Load a prompt file from processor_prompts/."""
    for base in [BASE_DIR, os.path.dirname(BASE_DIR)]:
        path = os.path.join(base, 'processor_prompts', filename)
        if os.path.exists(path):
            with open(path, 'r', encoding='utf-8') as f:
                return f.read()
    return f"[prompt file not found: {filename}]"


# ── dev mode ──────────────────────────────────────────────────────────

def _is_dev_mode() -> bool:
    return bool(session.get('dev_mode', False))


def _dev_block_topics(text_blocks: list) -> list:
    """Generate mock block topics scaled to actual text_blocks count."""
    labels = [
        "early life and family", "childhood experiences",
        "civil rights movement", "community organizing",
        "voter registration", "nonviolent protest",
        "march on washington", "sit-in protests",
        "sncc and sclc", "personal sacrifice",
        "historical memory", "legacy and reflection",
    ]
    return [
        {
            "block_index": i,
            "primary_topic": labels[i % len(labels)],
            "subtopics": [],
            "topics": [labels[i % len(labels)]],
        }
        for i in range(len(text_blocks))
    ]


def _dev_chapter_breaks(text_blocks: list) -> list:
    """Split text_blocks into 4 roughly equal chapters, returning segment indices."""
    n = len(text_blocks)
    size = max(1, n // 4)
    breaks = []
    for i in range(4):
        start_block = i * size
        end_block = min((i + 1) * size, n) - 1
        breaks.append((
            text_blocks[start_block]["start_idx"],
            text_blocks[end_block]["end_idx"],
        ))
    return breaks


_DEV_MAIN_SUMMARY = {
    "summary": (
        "In this oral history interview, the subject recounts their personal journey through the American "
        "civil rights movement of the 1950s and 1960s. From a childhood in rural Mississippi marked by "
        "systemic inequality, they trace their path to active participation in voter registration drives, "
        "sit-ins, and the 1963 March on Washington. The interview offers firsthand testimony about the "
        "organizing strategies of SNCC and SCLC, the personal costs of activism, and the enduring "
        "significance of this period for American democracy."
    ),
    "key_themes": [
        "voter registration", "nonviolent resistance",
        "community organizing", "personal sacrifice", "historical memory",
    ],
    "historical_significance": (
        "This interview documents the lived experience of a participant in one of the most transformative "
        "social movements in American history, providing primary source testimony about events central to "
        "the passage of the Civil Rights Act of 1964 and the Voting Rights Act of 1965."
    ),
}

_DEV_CHAPTERS = [
    {
        "chapter_number": 1,
        "title": "Early Life and Family Background",
        "start_time": "00:00:00",
        "end_time": "00:12:30",
        "summary": (
            "The subject describes growing up in rural Mississippi during the Jim Crow era, recounting "
            "family experiences with segregation and economic hardship. Witnessing injustice from an "
            "early age shaped their eventual commitment to civil rights activism."
        ),
    },
    {
        "chapter_number": 2,
        "title": "Joining the Movement",
        "start_time": "00:12:30",
        "end_time": "00:28:15",
        "summary": (
            "The subject describes their introduction to civil rights organizing through a local NAACP "
            "chapter and involvement with SNCC. They detail training in nonviolent resistance, dangers "
            "faced by organizers, and the community networks that sustained the movement."
        ),
    },
    {
        "chapter_number": 3,
        "title": "The March on Washington",
        "start_time": "00:28:15",
        "end_time": "00:45:00",
        "summary": (
            "The subject provides a firsthand account of the 1963 March on Washington. They describe "
            "the atmosphere of hope and determination, proximity to the Lincoln Memorial during "
            "Dr. King's 'I Have a Dream' speech, and the march's immediate emotional impact."
        ),
    },
    {
        "chapter_number": 4,
        "title": "Legacy and Reflection",
        "start_time": "00:45:00",
        "end_time": "01:02:00",
        "summary": (
            "The subject reflects on the long-term impact of their civil rights work, progress made, "
            "challenges that remain, and hopes for future generations. They emphasize preserving this "
            "history and passing lessons of the movement to young people today."
        ),
    },
]

_DEV_QUESTIONS_ROWS = [
    {"question_id": "Q001", "question_text": "Can you tell us about where you grew up and what your early life was like?", "start_time": "00:01:15", "end_time": "00:01:45", "status": "verified"},
    {"question_id": "Q002", "question_text": "How did your family talk about race and the political situation at the time?", "start_time": "00:05:30", "end_time": "00:05:55", "status": "verified"},
    {"question_id": "Q003", "question_text": "When did you first become aware of the civil rights movement?", "start_time": "00:13:20", "end_time": "00:13:50", "status": "verified"},
    {"question_id": "Q004", "question_text": "What was it like to participate in your first sit-in?", "start_time": "00:18:45", "end_time": "00:19:10", "status": "needs_review"},
    {"question_id": "Q005", "question_text": "Can you describe the training you received in nonviolent resistance?", "start_time": "00:22:00", "end_time": "00:22:30", "status": "verified"},
    {"question_id": "Q006", "question_text": "What do you remember most vividly about the March on Washington?", "start_time": "00:29:15", "end_time": "00:29:45", "status": "verified"},
    {"question_id": "Q007", "question_text": "Where were you standing when Dr. King gave his speech?", "start_time": "00:35:00", "end_time": "00:35:20", "status": "verified"},
    {"question_id": "Q008", "question_text": "How did your activism affect your personal relationships and family life?", "start_time": "00:46:30", "end_time": "00:47:00", "status": "unreviewed"},
    {"question_id": "Q009", "question_text": "What would you want young people today to understand about this period?", "start_time": "00:54:20", "end_time": "00:54:50", "status": "verified"},
]

_DEV_ENGAGEMENT_SCORES = {
    "overall_score": {"total": 82, "category": "High Engagement"},
    "dimension_scores": {
        "narrative_quality": {"score": 18, "max_possible": 20, "notes": "Vivid personal recollections with strong narrative arc"},
        "historical_significance": {"score": 19, "max_possible": 20, "notes": "Direct witness testimony to landmark events"},
        "emotional_resonance": {"score": 16, "max_possible": 20, "notes": "Authentic emotional depth throughout"},
        "educational_value": {"score": 17, "max_possible": 20, "notes": "Rich contextual detail appropriate for educational use"},
        "archival_quality": {"score": 12, "max_possible": 20, "notes": "Good audio quality with minor transcription gaps"},
    },
}

_DEV_TOC_BUNDLE = {
    "toc": [
        {
            "topic": "Early Life and Family Background",
            "start_time": "00:00:00",
            "end_time": "00:12:30",
            "start_block": 0,
            "end_block": 4,
            "subtopics": [
                {"label": "Childhood in rural Mississippi", "start_time": "00:00:00", "end_time": "00:05:15"},
                {"label": "Family and Jim Crow", "start_time": "00:05:15", "end_time": "00:12:30"},
            ],
        },
        {
            "topic": "Joining the Civil Rights Movement",
            "start_time": "00:12:30",
            "end_time": "00:28:15",
            "start_block": 5,
            "end_block": 9,
            "subtopics": [
                {"label": "NAACP involvement", "start_time": "00:12:30", "end_time": "00:18:00"},
                {"label": "Nonviolent resistance training", "start_time": "00:18:00", "end_time": "00:28:15"},
            ],
        },
        {
            "topic": "The March on Washington",
            "start_time": "00:28:15",
            "end_time": "00:45:00",
            "start_block": 10,
            "end_block": 14,
            "subtopics": [
                {"label": "Traveling to Washington", "start_time": "00:28:15", "end_time": "00:33:00"},
                {"label": "I Have a Dream speech", "start_time": "00:33:00", "end_time": "00:45:00"},
            ],
        },
        {
            "topic": "Legacy and Reflection",
            "start_time": "00:45:00",
            "end_time": "01:02:00",
            "start_block": 15,
            "end_block": 19,
            "subtopics": [
                {"label": "Progress and remaining challenges", "start_time": "00:45:00", "end_time": "00:54:00"},
                {"label": "Message to future generations", "start_time": "00:54:00", "end_time": "01:02:00"},
            ],
        },
    ],
    "topic_index": {
        "early life and family": [0, 1, 2, 3, 4],
        "civil rights movement": [5, 6, 7, 8, 9],
        "march on washington": [10, 11, 12, 13, 14],
        "legacy and reflection": [15, 16, 17, 18, 19],
    },
}

_DEV_CLIPS_DATA = {
    "clips": [
        {
            "clip_id": "CLIP_001",
            "clip_title": "Witnessing Segregation as a Child",
            "timestamp_start": "00:03:20",
            "timestamp_end": "00:06:45",
            "duration": "3m 25s",
            "scores": {"total_score": 91},
            "thematic_tags": {
                "main_topics": ["childhood experience", "Jim Crow", "segregation"],
                "key_events": ["personal testimony"],
            },
            "content_summary": {"primary_focus": "Firsthand account of experiencing racial segregation as a child in rural Mississippi."},
        },
        {
            "clip_id": "CLIP_002",
            "clip_title": "First Arrest During a Sit-In",
            "timestamp_start": "00:19:10",
            "timestamp_end": "00:23:00",
            "duration": "3m 50s",
            "scores": {"total_score": 95},
            "thematic_tags": {
                "main_topics": ["nonviolent protest", "sit-ins", "arrest"],
                "key_events": ["civil disobedience"],
            },
            "content_summary": {"primary_focus": "Detailed recollection of the first arrest during a lunch counter sit-in protest."},
        },
        {
            "clip_id": "CLIP_003",
            "clip_title": "Standing Near the Lincoln Memorial",
            "timestamp_start": "00:33:45",
            "timestamp_end": "00:38:20",
            "duration": "4m 35s",
            "scores": {"total_score": 98},
            "thematic_tags": {
                "main_topics": ["March on Washington", "MLK speech", "historic moment"],
                "key_events": ["I Have a Dream speech"],
            },
            "content_summary": {"primary_focus": "Eyewitness account of Dr. King's 'I Have a Dream' speech at the 1963 March on Washington."},
        },
        {
            "clip_id": "CLIP_004",
            "clip_title": "Advice for Future Generations",
            "timestamp_start": "00:55:30",
            "timestamp_end": "00:59:15",
            "duration": "3m 45s",
            "scores": {"total_score": 87},
            "thematic_tags": {
                "main_topics": ["legacy", "youth", "civic engagement"],
                "key_events": ["personal reflection"],
            },
            "content_summary": {"primary_focus": "Heartfelt message about civic responsibility and the importance of historical memory."},
        },
    ],
    "extraction_summary": {
        "total_clips_extracted": 4,
        "average_clip_score": 92.75,
        "total_clips_duration": "15m 35s",
        "topic_coverage": ["childhood", "activism", "historic events", "legacy"],
    },
    "extraction_notes": {
        "interview_strengths": "Exceptional firsthand testimony with vivid narrative detail and strong emotional authenticity.",
        "coverage_gaps": "Limited discussion of post-1965 civil rights developments.",
    },
}


@app.route('/dev-mode/toggle', methods=['POST'])
def dev_mode_toggle():
    session['dev_mode'] = not session.get('dev_mode', False)
    return redirect(request.referrer or url_for('upload_page'))


# ══════════════════════════════════════════════════════════════════════
#  STEP 1 — UPLOAD / BLOCKING
# ══════════════════════════════════════════════════════════════════════

@app.route('/', methods=['GET'])
def upload_page():
    return _render_upload()


@app.route('/reset', methods=['POST'])
def reset_session():
    """Wipe all per-session pipeline state and return to upload.

    Clears uploaded transcript, all downstream outputs, prompts, processor
    context, and pending batch state — but keeps the API key so the user
    doesn't have to re-enter it. Sidebar checkmarks and per-button checks
    reset because they're driven entirely off this state.
    """
    _reset_downstream()
    state["text_blocks"] = None
    state["srt_path"] = None
    state["segments"] = None
    state["plaintext_transcript"] = None
    state["pending_batch_files"] = None
    state["youtube_url"] = ""
    state["youtube_video_id"] = None
    state["using_sample"] = False
    return redirect(url_for('upload_page'))


@app.route('/upload', methods=['POST'])
def upload_run():
    """Parse an uploaded SRT file or the bundled sample and build text blocks."""
    _begin_active_progress("Upload", "Validating upload")
    submitted_api_key = (request.form.get('api_key') or '').strip()
    if submitted_api_key and submitted_api_key != current_api_key():
        state["api_key"] = submitted_api_key
        state["processor"] = None
    elif not has_api_key():
        if _is_dev_mode():
            state["api_key"] = "dev-mode"
            state["processor"] = None
        else:
            _finish_active_progress("Upload", "API key required")
            return _render_upload('Enter an API key before running the pipeline.')

    use_sample = request.form.get('use_sample') == 'on'
    use_transcripts = request.form.get('use_transcripts') == 'on'
    uploaded_file = request.files.get('srt_file')
    if not use_sample and not use_transcripts and (not uploaded_file or not uploaded_file.filename):
        _finish_active_progress("Upload", "No file selected")
        return _render_upload('Select an .srt file or use the bundled sample interview.')
    
    block_size = int(request.form.get('block_size', 23))

    # Read module toggles (must happen before any early-return branch)
    state["steps_enabled"]["questions"] = request.form.get('enable_questions') == 'on'
    state["question_placement"] = "after_summary"
    state["steps_enabled"]["engagement"] = request.form.get('enable_engagement') == 'on'
    state["steps_enabled"]["clips"] = request.form.get('enable_clips') == 'on'

    # Optional YouTube video link
    yt_url = request.form.get('youtube_url', '').strip()
    state["youtube_url"] = yt_url
    state["youtube_video_id"] = extract_youtube_id(yt_url)

    # Optional primary source info JSON (single-interview metadata)
    primary_source_file = request.files.get('primary_source_json')
    if primary_source_file and primary_source_file.filename:
        try:
            state["primary_source_info"] = json.loads(primary_source_file.read().decode('utf-8'))
        except Exception:
            state["primary_source_info"] = None
    else:
        state["primary_source_info"] = None
    
    # Handle "Use sample batch" — bundled zip of 4 transcripts
    if use_transcripts:
        _update_active_progress("Upload", 0, 3, "Loading sample batch")
        sample_zip = os.path.join(BASE_DIR, 'sample_batch.zip')
        if not os.path.isfile(sample_zip):
            _finish_active_progress("Upload", "Sample batch missing")
            return _render_upload('Bundled sample batch zip not found on server.')

        session_dir = _session_upload_dir(reset=True)
        srt_files = []
        with zipfile.ZipFile(sample_zip, 'r') as zf:
            for member in zf.namelist():
                if member.lower().endswith('.srt') and not member.startswith('__MACOSX'):
                    basename = os.path.basename(member)
                    if not basename:
                        continue
                    dest = os.path.join(session_dir, secure_filename(basename))
                    with zf.open(member) as src, open(dest, 'wb') as dst:
                        dst.write(src.read())
                    srt_files.append((basename.replace('.srt', ''), dest))

        if not srt_files:
            _finish_active_progress("Upload", "No SRT files found")
            return _render_upload('No .srt files found in the sample batch zip.')

        srt_files.sort(key=lambda x: x[0])
        first_name, first_path = srt_files[0]
        _reset_downstream()
        state["using_sample"] = False
        state["pending_batch_files"] = srt_files[1:] if len(srt_files) > 1 else None

        from srt_parser import parse_srt_file
        _update_active_progress("Upload", 1, 3, "Parsing first transcript")
        segments = parse_srt_file(first_path)
        plaintext = ' '.join([s.text for s in segments])

        state["srt_path"] = first_path
        state["block_size"] = block_size
        state["segments"] = segments
        state["plaintext_transcript"] = plaintext

        ctx = get_ctx()
        ctx.chapter_block_size = block_size

        from processor.blocking import build_text_blocks
        _update_active_progress("Upload", 2, 3, "Building text blocks")
        text_blocks = build_text_blocks(ctx, segments, plaintext)
        state["text_blocks"] = text_blocks

        _finish_active_progress("Upload")
        return redirect(url_for('blocking_output'))

    # Handle zip upload: extract all SRTs, load first one, queue the rest
    if not use_sample and uploaded_file.filename.lower().endswith('.zip'):
        _update_active_progress("Upload", 0, 3, "Extracting uploaded zip")
        session_dir = _session_upload_dir(reset=True)
        zip_path = os.path.join(session_dir, secure_filename(uploaded_file.filename))
        uploaded_file.save(zip_path)
        
        srt_files = []
        try:
            with zipfile.ZipFile(zip_path, 'r') as zf:
                for member in zf.namelist():
                    if member.lower().endswith('.srt') and not member.startswith('__MACOSX'):
                        basename = os.path.basename(member)
                        if not basename:
                            continue
                        dest = os.path.join(session_dir, secure_filename(basename))
                        with zf.open(member) as src, open(dest, 'wb') as dst:
                            dst.write(src.read())
                        srt_files.append((basename.replace('.srt', ''), dest))
        except zipfile.BadZipFile:
            _finish_active_progress("Upload", "Invalid zip file")
            return _render_upload('Invalid zip file.')
        
        if not srt_files:
            _finish_active_progress("Upload", "No SRT files found")
            return _render_upload('No .srt files found in the zip.')
        
        srt_files.sort(key=lambda x: x[0])
        
        # Load first file into the interactive pipeline
        first_name, first_path = srt_files[0]
        state["pending_batch_files"] = srt_files[1:] if len(srt_files) > 1 else None
        
        # Continue with first file as if it was uploaded directly
        uploaded_file = None  # Clear so we use first_path below
        filepath = first_path
        _reset_downstream()
        state["using_sample"] = False
        
        from srt_parser import parse_srt_file
        _update_active_progress("Upload", 1, 3, "Parsing first transcript")
        segments = parse_srt_file(filepath)
        plaintext = ' '.join([s.text for s in segments])
        
        state["srt_path"] = filepath
        state["block_size"] = block_size
        state["segments"] = segments
        state["plaintext_transcript"] = plaintext
        
        ctx = get_ctx()
        ctx.chapter_block_size = block_size
        
        from processor.blocking import build_text_blocks
        _update_active_progress("Upload", 2, 3, "Building text blocks")
        text_blocks = build_text_blocks(ctx, segments, plaintext)
        state["text_blocks"] = text_blocks

        _finish_active_progress("Upload")
        return redirect(url_for('blocking_output'))

    if not use_sample and not uploaded_file.filename.lower().endswith('.srt'):
        _finish_active_progress("Upload", "Invalid file type")
        return _render_upload('Please upload an .srt or .zip file.')

    # Reset all downstream state from previous runs
    _reset_downstream()
    session_dir = _session_upload_dir(reset=True)

    if use_sample:
        filepath = _find_path('interview.srt')
        if not filepath:
            return _render_upload('The bundled sample interview file was not found.')
        state["using_sample"] = True
    else:
        filename = secure_filename(uploaded_file.filename)
        filepath = os.path.join(session_dir, filename)
        uploaded_file.save(filepath)
        state["using_sample"] = False

    from srt_parser import parse_srt_file
    _update_active_progress("Upload", 1, 3, "Parsing transcript")
    segments = parse_srt_file(filepath)
    plaintext = ' '.join([s.text for s in segments])

    # Update state
    state["srt_path"] = filepath
    state["block_size"] = block_size
    state["segments"] = segments
    state["plaintext_transcript"] = plaintext

    # Build text blocks
    ctx = get_ctx()
    ctx.chapter_block_size = block_size

    from processor.blocking import build_text_blocks
    _update_active_progress("Upload", 2, 3, "Building text blocks")
    text_blocks = build_text_blocks(ctx, segments, plaintext)
    state["text_blocks"] = text_blocks

    _finish_active_progress("Upload")
    return redirect(url_for('blocking_output'))


@app.route('/blocking/output', methods=['GET'])
def blocking_output():
    return render_template('blocking_output.html', state=state)


# ══════════════════════════════════════════════════════════════════════
#  STEP 2 — LABELING
# ══════════════════════════════════════════════════════════════════════

@app.route('/labeling', methods=['GET'])
def labeling_page():
    if not state["labeling_sys_prompt"]:
        state["labeling_sys_prompt"] = load_prompt_file('label_text_blocks_for_toc_system.txt')
    if not state["labeling_user_prompt"]:
        state["labeling_user_prompt"] = load_prompt_file('label_text_blocks_for_toc_user.txt')

    return render_template('labeling.html', state=state)


@app.route('/labeling/run', methods=['POST'])
def labeling_run():
    """Run labeling with user-edited prompts."""
    _begin_active_progress("Labeling", "Starting labeling")
    state["labeling_sys_prompt"] = request.form.get('sys_prompt', '')
    state["labeling_user_prompt"] = request.form.get('user_prompt', '')

    text_blocks = state["text_blocks"]
    if not text_blocks:
        _finish_active_progress("Labeling", "No transcript loaded")
        return redirect(url_for('upload_page'))

    if _is_dev_mode():
        state["block_topics"] = _dev_block_topics(text_blocks)
        _record_step_metric("Labeling", 0.1, 0)
        _finish_active_progress("Labeling")
        return render_template('labeling.html', state=state, just_ran=True)

    try:
        ctx = get_ctx()
        from processor.labeling import label_text_blocks
        _t0 = time.time()
        _tok0 = ctx.total_tokens_used
        block_topics = label_text_blocks(
            ctx, text_blocks,
            system_prompt=state["labeling_sys_prompt"],
            user_prompt=state["labeling_user_prompt"]
        )
        _record_step_metric("Labeling", time.time() - _t0, ctx.total_tokens_used - _tok0)
    except Exception as e:
        state["block_topics"] = None
        _finish_active_progress("Labeling", "Labeling failed")
        return render_template(
            'labeling.html',
            state=state,
            labeling_error=(
                "Labeling failed. This app currently uses the OpenAI API endpoint, so non-OpenAI keys "
                "from the provider links will not work here unless the backend is adapted for that provider. "
                f"Details: {e}"
            )
        )

    state["block_topics"] = block_topics
    _finish_active_progress("Labeling")
    return render_template('labeling.html', state=state, just_ran=True)


@app.route('/labeling/update_output', methods=['POST'])
def labeling_update_output():
    """User manually edited the labeling output."""
    edited = request.form.get('edited_output', '')
    try:
        state["block_topics"] = json.loads(edited)
    except json.JSONDecodeError:
        pass  # keep old state if bad JSON
    return redirect(url_for('toc_page'))


# ══════════════════════════════════════════════════════════════════════
#  STEP 3 — TOC (pure logic, no API call)
# ══════════════════════════════════════════════════════════════════════

@app.route('/toc', methods=['GET'])
def toc_page():
    if state["text_blocks"] and state["block_topics"] and not state["toc_bundle"]:
        if _is_dev_mode():
            state["toc_bundle"] = copy.deepcopy(_DEV_TOC_BUNDLE)
        else:
            from processor.toc import build_hierarchical_toc
            toc_bundle = build_hierarchical_toc(state["text_blocks"], state["block_topics"])
            state["toc_bundle"] = toc_bundle

    return render_template('toc.html', state=state)


@app.route('/toc/update_output', methods=['POST'])
def toc_update_output():
    """User manually edited the TOC output."""
    edited = request.form.get('edited_output', '')
    try:
        state["toc_bundle"] = json.loads(edited)
    except json.JSONDecodeError:
        pass
    return redirect(url_for('chapterization_page'))


# ══════════════════════════════════════════════════════════════════════
#  STEP 4 — CHAPTERIZATION
# ══════════════════════════════════════════════════════════════════════

@app.route('/chapterization', methods=['GET'])
def chapterization_page():
    if not state["chapterization_sys_prompt"]:
        state["chapterization_sys_prompt"] = load_prompt_file('detect_topic_transitions_system.txt')
    if not state["chapterization_user_prompt"]:
        state["chapterization_user_prompt"] = load_prompt_file('detect_topic_transitions_user.txt')

    return render_template('chapterization.html', state=state)


@app.route('/chapterization/run', methods=['POST'])
def chapterization_run():
    """Run chapterization with user-edited prompts."""
    _begin_active_progress("Chapterization", "Starting chapterization")
    state["chapterization_sys_prompt"] = request.form.get('sys_prompt', '')
    state["chapterization_user_prompt"] = request.form.get('user_prompt', '')

    ctx = get_ctx()
    text_blocks = state["text_blocks"]
    block_topics = state["block_topics"]

    if not text_blocks:
        _finish_active_progress("Chapterization", "No transcript loaded")
        return redirect(url_for('upload_page'))

    if _is_dev_mode():
        from processor.chapterization import build_chapter_preview
        chapter_breaks = _dev_chapter_breaks(text_blocks)
        state["chapter_breaks"] = chapter_breaks
        preview = build_chapter_preview(chapter_breaks, state["segments"], state["plaintext_transcript"])
        state["chapter_breaks_preview"] = preview
        _record_step_metric("Chapterization", 0.1, 0)
        _finish_active_progress("Chapterization")
        return render_template('chapterization.html', state=state, just_ran=True)

    from processor.chapterization import detect_topic_transitions, build_chapter_preview
    _t0 = time.time()
    _tok0 = ctx.total_tokens_used
    chapter_breaks = detect_topic_transitions(
        ctx, text_blocks, block_topics,
        system_prompt=state["chapterization_sys_prompt"],
        user_prompt=state["chapterization_user_prompt"]
    )
    _update_active_progress("Chapterization", 1, 2, "Building chapter preview")
    _record_step_metric("Chapterization", time.time() - _t0, ctx.total_tokens_used - _tok0)
    state["chapter_breaks"] = chapter_breaks

    preview = build_chapter_preview(
        chapter_breaks, state["segments"], state["plaintext_transcript"]
    )
    state["chapter_breaks_preview"] = preview

    _finish_active_progress("Chapterization")
    return render_template('chapterization.html', state=state, just_ran=True)


# ══════════════════════════════════════════════════════════════════════
#  STEP 5 — SUMMARIZATION
# ══════════════════════════════════════════════════════════════════════

@app.route('/summarization', methods=['GET'])
def summarization_page():
    if not state["main_summary_sys_prompt"]:
        state["main_summary_sys_prompt"] = load_prompt_file('generate_main_summary_system.txt')
    if not state["main_summary_user_prompt"]:
        state["main_summary_user_prompt"] = load_prompt_file('generate_main_summary_user.txt')
    if not state["chapter_sys_prompt"]:
        state["chapter_sys_prompt"] = load_prompt_file('generate_chapter_system.txt')
    if not state["chapter_user_prompt"]:
        state["chapter_user_prompt"] = load_prompt_file('generate_chapter_user.txt')

    return render_template('summarization.html', state=state)


@app.route('/summarization/run_main', methods=['POST'])
def summarization_run_main():
    """Generate main summary."""
    _begin_active_progress("Main Summary", "Starting main summary")
    state["main_summary_sys_prompt"] = request.form.get('main_sys_prompt', '')
    state["main_summary_user_prompt"] = request.form.get('main_user_prompt', '')

    ctx = get_ctx()
    transcript = state["plaintext_transcript"]
    interview_name = os.path.basename(state["srt_path"] or "unknown")

    if _is_dev_mode():
        state["main_summary"] = copy.deepcopy(_DEV_MAIN_SUMMARY)
        _reset_after_summary_changes()
        _record_step_metric("Main Summary", 0.1, 0)
        _finish_active_progress("Main Summary")
        return render_template('summarization.html', state=state, ran_main=True)

    from processor.summarization import generate_main_summary
    _t0 = time.time()
    _tok0 = ctx.total_tokens_used
    main_summary = generate_main_summary(
        ctx, transcript, interview_name,
        system_prompt=state["main_summary_sys_prompt"],
        user_prompt=state["main_summary_user_prompt"],
        primary_source_info=state.get("primary_source_info"),
    )
    _record_step_metric("Main Summary", time.time() - _t0, ctx.total_tokens_used - _tok0)
    state["main_summary"] = main_summary
    _reset_after_summary_changes()

    _finish_active_progress("Main Summary")
    return render_template('summarization.html', state=state, ran_main=True)


@app.route('/summarization/run_chapters', methods=['POST'])
def summarization_run_chapters():
    """Generate chapter summaries."""
    _begin_active_progress("Chapter Summaries", "Starting chapter summaries")
    state["chapter_sys_prompt"] = request.form.get('chapter_sys_prompt', '')
    state["chapter_user_prompt"] = request.form.get('chapter_user_prompt', '')

    ctx = get_ctx()
    segments = state["segments"]
    interview_name = os.path.basename(state["srt_path"] or "unknown")
    plaintext = state["plaintext_transcript"]
    chapter_breaks = state["chapter_breaks"]

    if _is_dev_mode():
        state["chapters"] = copy.deepcopy(_DEV_CHAPTERS)
        _reset_after_summary_changes()
        _record_step_metric("Chapter Summaries", 0.1, 0)
        _finish_active_progress("Chapter Summaries")
        return render_template('summarization.html', state=state, ran_chapters=True)

    from processor.summarization import generate_chapters
    _t0 = time.time()
    _tok0 = ctx.total_tokens_used
    chapters = generate_chapters(
        ctx, segments, interview_name, plaintext, chapter_breaks,
        system_prompt=state["chapter_sys_prompt"],
        user_prompt=state["chapter_user_prompt"],
        primary_source_info=state.get("primary_source_info"),
    )
    _record_step_metric("Chapter Summaries", time.time() - _t0, ctx.total_tokens_used - _tok0)
    state["chapters"] = chapters
    _reset_after_summary_changes()

    _finish_active_progress("Chapter Summaries")
    return render_template('summarization.html', state=state, ran_chapters=True)


# ══════════════════════════════════════════════════════════════════════
#  STEP 6 — QUESTIONS
# ══════════════════════════════════════════════════════════════════════

@app.route('/questions', methods=['GET'])
def questions_page():
    if not state["steps_enabled"].get("questions", True):
        return redirect(url_for('tuning_page'))

    if not state["main_summary"] and not state["chapters"]:
        return redirect(url_for('summarization_page'))

    if not state["questions_sys_prompt"]:
        state["questions_sys_prompt"] = load_prompt_file('generate_questions_system.txt')
    if not state["questions_user_prompt"]:
        state["questions_user_prompt"] = load_prompt_file('generate_questions_user.txt')
    if not state["questions_rewrite_sys_prompt"]:
        state["questions_rewrite_sys_prompt"] = load_prompt_file('rewrite_questions_system.txt')
    if not state["questions_rewrite_user_prompt"]:
        state["questions_rewrite_user_prompt"] = load_prompt_file('rewrite_questions_user.txt')

    state.setdefault("questions_context_max_rows", 14)
    state.setdefault("questions_context_before_chars", 220)
    state.setdefault("questions_context_after_chars", 140)

    return render_template('questions.html', state=state)


@app.route('/questions/run', methods=['POST'])
def questions_run():
    _begin_active_progress("Questions", "Starting question detection")
    if not state["steps_enabled"].get("questions", True):
        _finish_active_progress("Questions", "Questions disabled")
        return redirect(url_for('tuning_page'))

    state["questions_sys_prompt"] = request.form.get('questions_sys_prompt', '')
    state["questions_user_prompt"] = request.form.get('questions_user_prompt', '')
    state["questions_rewrite_sys_prompt"] = request.form.get('questions_rewrite_sys_prompt', '')
    state["questions_rewrite_user_prompt"] = request.form.get('questions_rewrite_user_prompt', '')

    try:
        state["questions_context_max_rows"] = max(0, min(40, int(request.form.get('questions_context_max_rows', state.get("questions_context_max_rows", 14)))))
    except (TypeError, ValueError):
        state["questions_context_max_rows"] = int(state.get("questions_context_max_rows", 14))

    try:
        state["questions_context_before_chars"] = max(0, min(600, int(request.form.get('questions_context_before_chars', state.get("questions_context_before_chars", 220)))))
    except (TypeError, ValueError):
        state["questions_context_before_chars"] = int(state.get("questions_context_before_chars", 220))

    try:
        state["questions_context_after_chars"] = max(0, min(600, int(request.form.get('questions_context_after_chars', state.get("questions_context_after_chars", 140)))))
    except (TypeError, ValueError):
        state["questions_context_after_chars"] = int(state.get("questions_context_after_chars", 140))

    segments = state.get("segments")
    if not segments:
        _finish_active_progress("Questions", "No transcript loaded")
        return redirect(url_for('upload_page'))

    if _is_dev_mode():
        rows = normalize_question_rows(copy.deepcopy(_DEV_QUESTIONS_ROWS))
        state["questions_rows"] = rows
        state["questions_stats"] = compute_question_stats(rows)
        state["questions_error"] = None
        state["questions_ran"] = True
        _record_step_metric("Questions", 0.1, 0)
        _finish_active_progress("Questions")
        return render_template('questions.html', state=state, questions_message=f"Generated {len(rows)} questions.")

    try:
        ctx = get_ctx()
        interview_name = os.path.basename(state.get("srt_path") or "unknown")
        _t0 = time.time()
        _tok0 = ctx.total_tokens_used
        _update_active_progress("Questions", 0, 1, "Detecting and rewriting interview questions")
        rows = generate_questions(
            ctx=ctx,
            segments=segments,
            plaintext_transcript=state.get("plaintext_transcript") or "",
            main_summary=state.get("main_summary") or {},
            chapters=state.get("chapters") or [],
            interview_name=interview_name,
            system_prompt=state["questions_sys_prompt"],
            user_prompt=state["questions_user_prompt"],
            rewrite_system_prompt=state["questions_rewrite_sys_prompt"],
            rewrite_user_prompt=state["questions_rewrite_user_prompt"],
            rewrite_context_max_rows=state["questions_context_max_rows"],
            rewrite_context_before_chars=state["questions_context_before_chars"],
            rewrite_context_after_chars=state["questions_context_after_chars"],
        )
        rows = normalize_question_rows(rows)
        _record_step_metric("Questions", time.time() - _t0, ctx.total_tokens_used - _tok0)
    except Exception as e:
        state["questions_error"] = f"Question detection failed: {e}"
        state["questions_rows"] = []
        state["questions_stats"] = compute_question_stats([])
        state["questions_ran"] = True
        _finish_active_progress("Questions", "Question detection failed")
        return render_template('questions.html', state=state)

    state["questions_rows"] = rows
    state["questions_stats"] = compute_question_stats(rows)
    state["questions_error"] = None
    state["questions_ran"] = True

    _finish_active_progress("Questions")
    return render_template('questions.html', state=state, questions_message=f"Generated {len(rows)} questions.")


@app.route('/questions/update', methods=['POST'])
def questions_update():
    edited = request.form.get('edited_output', '[]')
    try:
        rows = json.loads(edited)
    except json.JSONDecodeError:
        rows = []

    rows = normalize_question_rows(rows)
    state["questions_rows"] = rows
    state["questions_stats"] = compute_question_stats(rows)
    state["questions_error"] = None
    state["questions_ran"] = True

    return render_template('questions.html', state=state, questions_message="Saved question edits.")


# ══════════════════════════════════════════════════════════════════════
#  STEP 7 — TUNING (scoring / regeneration)
# ══════════════════════════════════════════════════════════════════════

@app.route('/tuning', methods=['GET'])
def tuning_page():
    if state["steps_enabled"].get("questions", True) and state.get("question_placement") == "after_summary" and not state.get("questions_ran", False):
        return redirect(url_for('questions_page'))

    if not state["eval_sys_prompt"]:
        state["eval_sys_prompt"] = load_prompt_file('score_summary_system.txt')
    if not state["eval_user_prompt"]:
        state["eval_user_prompt"] = load_prompt_file('score_summary_user.txt')
    if not state["revision_sys_prompt"]:
        state["revision_sys_prompt"] = load_prompt_file('regenerate_main_summary_system.txt')
    if not state["revision_user_prompt"]:
        state["revision_user_prompt"] = load_prompt_file('regenerate_main_summary_user.txt')

    return render_template('tuning.html', state=state)


@app.route('/tuning/run', methods=['POST'])
def tuning_run():
    """Run scoring and regeneration loop with user-set thresholds."""
    _begin_active_progress("Tuning", "Starting tuning")
    if state["steps_enabled"].get("questions", True) and state.get("question_placement") == "after_summary" and not state.get("questions_ran", False):
        _finish_active_progress("Tuning", "Questions must run first")
        return redirect(url_for('questions_page'))

    state["quality_threshold"] = int(request.form.get('quality_threshold', 80))
    state["accuracy_threshold"] = int(request.form.get('accuracy_threshold', 80))
    state["max_retries"] = int(request.form.get('max_retries', 3))
    state["eval_sys_prompt"] = request.form.get('eval_sys_prompt', '')
    state["eval_user_prompt"] = request.form.get('eval_user_prompt', '')
    state["revision_sys_prompt"] = request.form.get('revision_sys_prompt', '')
    state["revision_user_prompt"] = request.form.get('revision_user_prompt', '')

    if _is_dev_mode():
        chapters = state.get("chapters") or copy.deepcopy(_DEV_CHAPTERS)
        state["tuning_results"] = {
            "main_summary": {
                "summary": state.get("main_summary") or copy.deepcopy(_DEV_MAIN_SUMMARY),
                "scores": {"accuracy_score": 91, "quality_score": 88, "errors": []},
                "regenerated": False,
                "retries": 0,
            },
            "chapters": [
                {
                    "chapter": ch,
                    "scores": {"accuracy_score": 85 + i * 2, "quality_score": 83 + i * 3, "errors": []},
                }
                for i, ch in enumerate(chapters)
            ],
        }
        _record_step_metric("Tuning", 0.1, 0)
        _finish_active_progress("Tuning")
        return render_template('tuning.html', state=state, just_ran=True)

    ctx = get_ctx()
    transcript = state["plaintext_transcript"]

    from processor.tuning import run_tuning_loop, score_chapter, score_chapters_batch
    from processor.blocking import extract_plaintext_section

    tuning_results = {"main_summary": None, "chapters": []}
    _t0 = time.time()
    _tok0 = ctx.total_tokens_used

    # Score and regenerate main summary
    if state["main_summary"]:
        _update_active_progress("Tuning", 0, 2 if state.get("chapters") else 1, "Scoring main summary")
        result = run_tuning_loop(
            ctx,
            summary=state["main_summary"],
            transcript=transcript,
            content_type="main_summary",
            quality_threshold=state["quality_threshold"],
            accuracy_threshold=state["accuracy_threshold"],
            max_retries=state["max_retries"],
            eval_sys_prompt=state["eval_sys_prompt"],
            eval_user_prompt=state["eval_user_prompt"],
            revision_sys_prompt=state["revision_sys_prompt"],
            revision_user_prompt=state["revision_user_prompt"],
            primary_source_info=state.get("primary_source_info"),
        )
        tuning_results["main_summary"] = result
        state["main_summary"] = result["summary"]

    # Score chapters. Strategy: batch all chapters into one API call when
    # the chapter count is small enough to fit comfortably (≤15). Above
    # that, or if batching fails, fall back to parallelized per-chapter
    # scoring. Both paths produce identical output structure.
    if state["chapters"] and state["chapter_breaks"]:
        from concurrent.futures import ThreadPoolExecutor
        _update_active_progress("Tuning", 1 if state.get("main_summary") else 0, 2, "Preparing chapter scoring")

        # Pre-extract all chapter texts once so both paths can reuse them.
        chapter_texts = []
        for i, chapter in enumerate(state["chapters"]):
            if i < len(state["chapter_breaks"]):
                start_idx, end_idx = state["chapter_breaks"][i]
                ctext = extract_plaintext_section(
                    state["plaintext_transcript"],
                    state["segments"],
                    start_idx,
                    end_idx
                )
            else:
                ctext = ""
            chapter_texts.append(ctext)

        BATCH_THRESHOLD = 15
        scores_by_index = {}

        if len(state["chapters"]) <= BATCH_THRESHOLD:
            chapters_with_text = [
                {"chapter": ch, "chapter_text": txt}
                for ch, txt in zip(state["chapters"], chapter_texts)
            ]
            _update_active_progress("Tuning", 0, len(state["chapters"]), f"Batch scoring {len(state['chapters'])} chapter summaries")
            batch_results = score_chapters_batch(ctx, chapters_with_text)
            if batch_results:
                for i, scores in enumerate(batch_results):
                    scores_by_index[i] = scores
                    _update_active_progress("Tuning", i + 1, len(state["chapters"]), f"Scored {i + 1} of {len(state['chapters'])} chapter summaries")

        # Fallback: any chapters not scored by the batch call get scored
        # individually in parallel. Also handles the >BATCH_THRESHOLD case.
        unscored = [i for i in range(len(state["chapters"])) if i not in scores_by_index]
        if unscored:
            def _score_one(i):
                return i, score_chapter(ctx, state["chapters"][i], chapter_texts[i])

            with ThreadPoolExecutor(max_workers=5) as pool:
                for i, scores in pool.map(_score_one, unscored):
                    scores_by_index[i] = scores
                    _update_active_progress("Tuning", len(scores_by_index), len(state["chapters"]), f"Scored {len(scores_by_index)} of {len(state['chapters'])} chapter summaries")

        # Reassemble in chapter order.
        for i, chapter in enumerate(state["chapters"]):
            scores = scores_by_index.get(i, {})
            chapter["quality_metrics"] = scores
            tuning_results["chapters"].append({
                "chapter": chapter,
                "scores": scores
            })

    _record_step_metric("Tuning", time.time() - _t0, ctx.total_tokens_used - _tok0)

    state["tuning_results"] = tuning_results
    _finish_active_progress("Tuning")
    return render_template('tuning.html', state=state, just_ran=True)


# ══════════════════════════════════════════════════════════════════════
#  STEP 7 — ENGAGEMENT SCORING
# ══════════════════════════════════════════════════════════════════════

@app.route('/engagement', methods=['GET'])
def engagement_page():
    if not state["steps_enabled"].get("engagement", True):
        return redirect(url_for('results_page'))

    if not state["engagement_sys_prompt"]:
        state["engagement_sys_prompt"] = load_prompt_file('engagement_system.txt')
    if not state["engagement_rubric"]:
        state["engagement_rubric"] = load_prompt_file('engagement_rubric.txt')
    if not state["engagement_schema"]:
        state["engagement_schema"] = load_prompt_file('engagement_schema.txt')

    return render_template('engagement.html', state=state)


@app.route('/engagement/run', methods=['POST'])
def engagement_run():
    """Run engagement scoring on the current interview."""
    _begin_active_progress("Engagement Scoring", "Starting engagement scoring")
    state["engagement_sys_prompt"] = request.form.get('sys_prompt', '')
    state["engagement_rubric"] = request.form.get('rubric', '')
    state["engagement_schema"] = request.form.get('schema', '')

    if _is_dev_mode():
        state["engagement_scores"] = copy.deepcopy(_DEV_ENGAGEMENT_SCORES)
        _record_step_metric("Engagement Scoring", 0.1, 0)
        _finish_active_progress("Engagement Scoring")
        return render_template('engagement.html', state=state, just_ran=True)

    ctx = get_ctx()

    # Read raw SRT content for the engagement scorer
    srt_path = state["srt_path"]
    if not srt_path or not os.path.exists(srt_path):
        _finish_active_progress("Engagement Scoring", "No SRT file found")
        return render_template('engagement.html', state=state,
                               engagement_error="No SRT file found. Go back to Upload.")

    with open(srt_path, 'r', encoding='utf-8') as f:
        srt_content = f.read()

    # Gather pipeline data the engagement scorer can use
    pipeline_data = {
        "segments": state["segments"],
        "plaintext_transcript": state["plaintext_transcript"],
        "chapter_breaks_preview": state["chapter_breaks_preview"],
        "main_summary": state["main_summary"],
    }

    from processor.engagement import run_engagement_scoring
    try:
        _t0 = time.time()
        _tok0 = ctx.total_tokens_used
        _update_active_progress("Engagement Scoring", 0, 1, "Scoring engagement rubric")
        scores = run_engagement_scoring(
            ctx, srt_content, pipeline_data,
            system_prompt=state["engagement_sys_prompt"],
            rubric=state["engagement_rubric"] or None,
            schema_json_text=state["engagement_schema"] or None,
        )
        _record_step_metric("Engagement Scoring", time.time() - _t0, ctx.total_tokens_used - _tok0)
    except Exception as e:
        _finish_active_progress("Engagement Scoring", "Engagement scoring failed")
        return render_template('engagement.html', state=state,
                               engagement_error=f"Engagement scoring failed: {e}")

    if isinstance(scores, dict) and "error" in scores and len(scores) <= 2:
        _finish_active_progress("Engagement Scoring", "Engagement API error")
        return render_template('engagement.html', state=state,
                               engagement_error=f"API error: {scores['error']}")

    # Validate that the scores have the expected structure before the template tries to render them
    if not isinstance(scores, dict) or "overall_score" not in scores:
        _finish_active_progress("Engagement Scoring", "Unexpected engagement output")
        return render_template('engagement.html', state=state,
                               engagement_error="Engagement scoring returned an unexpected format. The API may have returned incomplete data.")
    os_obj = scores.get("overall_score", {})
    if not isinstance(os_obj, dict) or "total" not in os_obj:
        _finish_active_progress("Engagement Scoring", "Incomplete engagement output")
        return render_template('engagement.html', state=state,
                               engagement_error="Engagement scoring returned incomplete results (missing overall_score.total). This can happen when the API is rate-limited or returns partial data.")

    state["engagement_scores"] = scores
    _finish_active_progress("Engagement Scoring")
    return render_template('engagement.html', state=state, just_ran=True)


# ══════════════════════════════════════════════════════════════════════
#  STEP 8 — CLIP EXTRACTION
# ══════════════════════════════════════════════════════════════════════

def _load_clips_prompt_sections():
    """Load each clip prompt section file into a dict keyed by section id."""
    from processor.clips import PROMPT_SECTIONS
    sections = {}
    for section_id, label, filename in PROMPT_SECTIONS:
        try:
            sections[section_id] = load_prompt_file(filename)
        except Exception:
            sections[section_id] = ""
    return sections


def _assemble_clips_prompt(sections):
    """Join section contents in canonical order with --- separators."""
    from processor.clips import PROMPT_SECTIONS
    parts = [sections.get(sid, "").strip() for sid, _, _ in PROMPT_SECTIONS]
    return "\n\n---\n\n".join(p for p in parts if p)


@app.route('/clips', methods=['GET'])
def clips_page():
    if not state["steps_enabled"].get("clips", True):
        return redirect(url_for('results_page'))

    if not state["clips_prompt_sections"]:
        state["clips_prompt_sections"] = _load_clips_prompt_sections()

    from processor.clips import PROMPT_SECTIONS
    return render_template('clips.html', state=state, prompt_sections=PROMPT_SECTIONS)


@app.route('/clips/run', methods=['POST'])
def clips_run():
    """Run clip extraction on the current interview."""
    _begin_active_progress("Clip Extraction", "Starting clip extraction")
    from processor.clips import PROMPT_SECTIONS, run_clip_extraction
    sections = {}
    for section_id, label, filename in PROMPT_SECTIONS:
        sections[section_id] = request.form.get(f'prompt_section_{section_id}', '')
    state["clips_prompt_sections"] = sections
    state["clips_token_limit"] = int(request.form.get('token_limit', 30000))

    if _is_dev_mode():
        state["clips_data"] = copy.deepcopy(_DEV_CLIPS_DATA)
        _record_step_metric("Clip Extraction", 0.1, 0)
        _finish_active_progress("Clip Extraction")
        return render_template('clips.html', state=state, prompt_sections=PROMPT_SECTIONS, just_ran=True)

    combined_prompt = _assemble_clips_prompt(state["clips_prompt_sections"])
    ctx = get_ctx()

    srt_path = state["srt_path"]
    if not srt_path or not os.path.exists(srt_path):
        from processor.clips import PROMPT_SECTIONS as PS
        _finish_active_progress("Clip Extraction", "No SRT file found")
        return render_template('clips.html', state=state, prompt_sections=PS,
                               clips_error="No SRT file found. Go back to Upload.")

    with open(srt_path, 'r', encoding='utf-8') as f:
        srt_content = f.read()

    interview_name = os.path.basename(srt_path or "unknown").replace('.srt', '')

    pipeline_data = {
        "segments": state["segments"],
        "plaintext_transcript": state["plaintext_transcript"],
        "chapter_breaks_preview": state["chapter_breaks_preview"],
        "main_summary": state["main_summary"],
        "toc_bundle": state["toc_bundle"],
        "interview_name": interview_name,
    }

    try:
        _t0 = time.time()
        _tok0 = ctx.total_tokens_used
        _update_active_progress("Clip Extraction", 0, 1, "Extracting candidate clips")
        clips_data = run_clip_extraction(
            ctx, srt_content, pipeline_data,
            system_prompt=combined_prompt,
            token_limit=state["clips_token_limit"],
        )
        _record_step_metric("Clip Extraction", time.time() - _t0, ctx.total_tokens_used - _tok0)
    except Exception as e:
        traceback.print_exc()   # full stack trace in Flask console
        _finish_active_progress("Clip Extraction", "Clip extraction failed")
        return render_template('clips.html', state=state, prompt_sections=PROMPT_SECTIONS,
                               clips_error=f"Clip extraction failed: {e}")

    if isinstance(clips_data, dict) and "error" in clips_data and len(clips_data) <= 2:
        _finish_active_progress("Clip Extraction", "Clip extraction API error")
        return render_template('clips.html', state=state, prompt_sections=PROMPT_SECTIONS,
                               clips_error=f"API error: {clips_data['error']}")

    if not isinstance(clips_data, dict) or "clips" not in clips_data:
        _finish_active_progress("Clip Extraction", "Unexpected clip extraction output")
        return render_template('clips.html', state=state, prompt_sections=PROMPT_SECTIONS,
                               clips_error="Clip extraction returned an unexpected format.")

    state["clips_data"] = clips_data
    _finish_active_progress("Clip Extraction")
    return render_template('clips.html', state=state, prompt_sections=PROMPT_SECTIONS, just_ran=True)


# ══════════════════════════════════════════════════════════════════════
#  RESULTS — final output + download
# ══════════════════════════════════════════════════════════════════════

@app.route('/results', methods=['GET'])
def results_page():
    pending = state.get("pending_batch_files")
    state["results_visited"] = True
    return render_template('results.html', state=state, pending_batch_count=len(pending) if pending else 0)


@app.route('/results/download', methods=['GET'])
def results_download():
    """Download full results as JSON."""
    result = {
        "interview_name": os.path.basename(state["srt_path"] or "unknown"),
        "block_size": state["block_size"],
        "text_blocks": state["text_blocks"],
        "block_topics": state["block_topics"],
        "toc": state["toc_bundle"],
        "chapter_breaks": state["chapter_breaks"],
        "chapter_breaks_preview": state["chapter_breaks_preview"],
        "main_summary": state["main_summary"],
        "chapters": state["chapters"],
        "questions": state["questions_rows"],
        "questions_stats": state["questions_stats"],
        "tuning_results": state["tuning_results"],
        "engagement_scores": state["engagement_scores"],
        "clips_data": state["clips_data"],
    }

    payload = json.dumps(result, indent=2, ensure_ascii=False, default=str).encode('utf-8')
    return send_file(
        BytesIO(payload),
        mimetype='application/json',
        as_attachment=True,
        download_name='results.json',
    )


@app.route('/results/continue_batch', methods=['POST'])
def results_continue_batch():
    """Use current config to process remaining files from zip upload."""
    pending = state.get("pending_batch_files")
    if not pending:
        return redirect(url_for('results_page'))
    
    sid = _get_session_id()
    params = _capture_batch_params()
    params["video_links_map"] = {}
    
    # Include the first (already processed) interview in results
    first_result = {
        "interview_name": os.path.basename(state["srt_path"] or "unknown").replace('.srt', ''),
        "text_blocks": state["text_blocks"],
        "block_topics": state["block_topics"],
        "toc_bundle": state["toc_bundle"],
        "chapter_breaks": state["chapter_breaks"],
        "chapter_breaks_preview": state["chapter_breaks_preview"],
        "main_summary": state["main_summary"],
        "chapters": state["chapters"],
        "questions": state["questions_rows"],
        "questions_stats": state["questions_stats"],
        "tuning_results": state["tuning_results"],
        "engagement_scores": state["engagement_scores"],
        "clips_data": state["clips_data"],
        "cost_data": {
            "total_cost_usd": state["processor"].total_cost_usd if state["processor"] else 0,
            "total_prompt_tokens": state["processor"].total_prompt_tokens if state["processor"] else 0,
            "total_completion_tokens": state["processor"].total_completion_tokens if state["processor"] else 0,
            "call_count": len(state["processor"].call_log) if state["processor"] else 0,
            "call_log": list(state["processor"].call_log) if state["processor"] else [],
        },
        "error": None,
    }
    first_name = first_result["interview_name"]
    
    # Initialize job with first result already done
    with _BATCH_LOCK:
        _BATCH_JOBS[sid] = {
            "running": True,
            "progress": {"current": 0, "total": len(pending), "current_name": "", "current_step": "Starting", "completed": [first_name]},
            "results": {first_name: first_result},
            "interview_order": [first_name] + [name for name, _ in pending],
        }
    
    # Clear pending so we don't re-trigger
    state["pending_batch_files"] = None
    
    # Start background thread for remaining files
    thread = threading.Thread(target=_run_batch, args=(sid, pending, params), daemon=True)
    thread.start()
    
    return redirect(url_for('batch_progress'))


# ══════════════════════════════════════════════════════════════════════
#  API ENDPOINTS (for async JS calls if needed later)
# ══════════════════════════════════════════════════════════════════════

@app.route('/api/state', methods=['GET'])
def api_state():
    """Return current browser-session pipeline state as JSON (for debugging)."""
    safe_state = {}
    for k, v in state.items():
        if k == "processor":
            safe_state[k] = "initialized" if v else None
        elif k == "api_key":
            safe_state[k] = mask_api_key(v) if v else None
        elif k == "segments":
            safe_state[k] = len(v) if v else None
        else:
            try:
                json.dumps(v)
                safe_state[k] = v
            except (TypeError, ValueError):
                safe_state[k] = str(v)
    return jsonify(safe_state)

@app.route('/api/costs', methods=['GET'])
def api_costs():
    """Return per-call cost breakdown for the current session."""
    ctx = state.get("processor")
    if not ctx:
        return jsonify({"error": "No pipeline run yet."})
    return jsonify(ctx.get_cost_summary())


@app.route('/api/run_progress', methods=['GET'])
def run_progress():
    """Return live progress for the currently running single-interview step."""
    progress = state.get("active_progress")
    if not progress:
        return jsonify({"running": False, "progress": None})
    total = int(progress.get("total") or 0)
    current = int(progress.get("current") or 0)
    pct = int(round((current / total) * 100)) if total > 0 else None
    return jsonify({
        "running": bool(progress.get("running")),
        "progress": {
            **progress,
            "percent": max(0, min(100, pct)) if pct is not None else None,
        },
    })

# ══════════════════════════════════════════════════════════════════════
#  BATCH PROCESSING
# ══════════════════════════════════════════════════════════════════════

_BATCH_LOCK = Lock()
_BATCH_JOBS = {}   # sid -> job dict


def _capture_batch_params():
    """Snapshot all user-configured prompts and settings from the current session state."""
    return {
        "block_size":                state["block_size"],
        "labeling_sys_prompt":       state["labeling_sys_prompt"],
        "labeling_user_prompt":      state["labeling_user_prompt"],
        "chapterization_sys_prompt": state["chapterization_sys_prompt"],
        "chapterization_user_prompt":state["chapterization_user_prompt"],
        "main_summary_sys_prompt":   state["main_summary_sys_prompt"],
        "main_summary_user_prompt":  state["main_summary_user_prompt"],
        "chapter_sys_prompt":        state["chapter_sys_prompt"],
        "chapter_user_prompt":       state["chapter_user_prompt"],
        "questions_sys_prompt":      state["questions_sys_prompt"],
        "questions_user_prompt":     state["questions_user_prompt"],
        "questions_rewrite_sys_prompt": state["questions_rewrite_sys_prompt"],
        "questions_rewrite_user_prompt": state["questions_rewrite_user_prompt"],
        "questions_context_max_rows": state.get("questions_context_max_rows", 14),
        "questions_context_before_chars": state.get("questions_context_before_chars", 220),
        "questions_context_after_chars": state.get("questions_context_after_chars", 140),
        "question_placement":        state["question_placement"],
        "eval_sys_prompt":           state["eval_sys_prompt"],
        "eval_user_prompt":          state["eval_user_prompt"],
        "revision_sys_prompt":       state["revision_sys_prompt"],
        "revision_user_prompt":      state["revision_user_prompt"],
        "quality_threshold":         state["quality_threshold"],
        "accuracy_threshold":        state["accuracy_threshold"],
        "max_retries":               state["max_retries"],
        "engagement_sys_prompt":     state["engagement_sys_prompt"],
        "engagement_rubric":         state["engagement_rubric"] or None,
        "engagement_schema":         state["engagement_schema"] or None,
        "clips_combined_prompt":     _assemble_clips_prompt(state["clips_prompt_sections"]),
        "clips_token_limit":         state["clips_token_limit"],
        "steps_enabled":             dict(state["steps_enabled"]),
        "api_key":                   current_api_key(),
    }


def _process_single_interview(srt_path, interview_name, params, progress_fn, youtube_video_id=None, partial_result=None, save_partial_fn=None, primary_source_info=None):
    """
    Run the full pipeline on a single SRT file.
    Returns a dict with all pipeline outputs.
    progress_fn(step_name) is called before each step.
    """
    from processor import ProcessorContext
    from srt_parser import parse_srt_file
    from processor.blocking import build_text_blocks, extract_plaintext_section
    from processor.labeling import label_text_blocks
    from processor.toc import build_hierarchical_toc
    from processor.chapterization import detect_topic_transitions, build_chapter_preview
    from processor.summarization import generate_main_summary, generate_chapters
    from processor.tuning import run_tuning_loop, score_chapter, score_chapters_batch
    from processor.questions import compute_question_stats, generate_questions, normalize_question_rows

    # Create a fresh ProcessorContext for this interview
    ctx = ProcessorContext(
        api_key=params["api_key"],
        chapter_block_size=params["block_size"],
        prompts_dir=_find_path('processor_prompts') or 'processor_prompts',
        facts_path=_find_path('civil_rights_facts.json') or 'civil_rights_facts.json',
        rubric_path=_find_path('StandardizedRubric_1.md') or 'StandardizedRubric_1.md',
    )

    result = partial_result if partial_result else {"interview_name": interview_name, "error": None}
    result["interview_name"] = interview_name
    result["error"] = None
    result["youtube_video_id"] = youtube_video_id
    
    def _save():
        if save_partial_fn:
            save_partial_fn(result)

    # Step 1 — Parse & Block
    progress_fn("Parsing SRT")
    segments = parse_srt_file(srt_path)
    plaintext = ' '.join([s.text for s in segments])
    text_blocks = build_text_blocks(ctx, segments, plaintext)
    result["text_blocks"] = text_blocks
    _save()

    # Step 2 — Labeling
    progress_fn("Labeling")
    block_topics = label_text_blocks(
        ctx, text_blocks,
        system_prompt=params["labeling_sys_prompt"],
        user_prompt=params["labeling_user_prompt"],
    )
    result["block_topics"] = block_topics
    _save()

    # Step 3 — TOC
    progress_fn("Building TOC")
    toc_bundle = build_hierarchical_toc(text_blocks, block_topics)
    result["toc_bundle"] = toc_bundle
    _save()

    # Step 4 — Chapterization
    progress_fn("Chapterization")
    chapter_breaks = detect_topic_transitions(
        ctx, text_blocks, block_topics,
        system_prompt=params["chapterization_sys_prompt"],
        user_prompt=params["chapterization_user_prompt"],
    )
    chapter_breaks_preview = build_chapter_preview(chapter_breaks, segments, plaintext)
    result["chapter_breaks"] = chapter_breaks
    result["chapter_breaks_preview"] = chapter_breaks_preview
    _save()

    # Step 5 — Summarization
    progress_fn("Main summary")
    main_summary = generate_main_summary(
        ctx, plaintext, interview_name,
        system_prompt=params["main_summary_sys_prompt"],
        user_prompt=params["main_summary_user_prompt"],
        primary_source_info=primary_source_info,
    )
    result["main_summary"] = main_summary
    _save()

    progress_fn("Chapter summaries")
    chapters = generate_chapters(
        ctx, segments, interview_name, plaintext, chapter_breaks,
        system_prompt=params["chapter_sys_prompt"],
        user_prompt=params["chapter_user_prompt"],
        primary_source_info=primary_source_info,
    )
    result["chapters"] = chapters
    _save()

    # Step 6 — Questions (if enabled)
    if params.get("steps_enabled", {}).get("questions", True) and params.get("question_placement", "after_summary") == "after_summary":
        progress_fn("Question detection")
        try:
            question_rows = generate_questions(
                ctx=ctx,
                segments=segments,
                plaintext_transcript=plaintext,
                main_summary=result.get("main_summary") or {},
                chapters=chapters or [],
                interview_name=interview_name,
                system_prompt=params.get("questions_sys_prompt") or "",
                user_prompt=params.get("questions_user_prompt") or "",
                rewrite_system_prompt=params.get("questions_rewrite_sys_prompt") or "",
                rewrite_user_prompt=params.get("questions_rewrite_user_prompt") or "",
                rewrite_context_max_rows=int(params.get("questions_context_max_rows", 14) or 14),
                rewrite_context_before_chars=int(params.get("questions_context_before_chars", 220) or 220),
                rewrite_context_after_chars=int(params.get("questions_context_after_chars", 140) or 140),
            )
            question_rows = normalize_question_rows(question_rows)
            result["questions"] = question_rows
            result["questions_stats"] = compute_question_stats(question_rows)
        except Exception as e:
            result["questions"] = []
            result["questions_stats"] = {"error": str(e)}
        _save()
    else:
        result["questions"] = None
        result["questions_stats"] = None

    # Step 7 — Tuning
    progress_fn("Tuning main summary")
    tuning_results = {"main_summary": None, "chapters": []}
    if main_summary:
        tuning_result = run_tuning_loop(
            ctx,
            summary=main_summary,
            transcript=plaintext,
            content_type="main_summary",
            quality_threshold=params["quality_threshold"],
            accuracy_threshold=params["accuracy_threshold"],
            max_retries=params["max_retries"],
            eval_sys_prompt=params["eval_sys_prompt"],
            eval_user_prompt=params["eval_user_prompt"],
            revision_sys_prompt=params["revision_sys_prompt"],
            revision_user_prompt=params["revision_user_prompt"],
            primary_source_info=primary_source_info,
        )
        tuning_results["main_summary"] = tuning_result
        result["main_summary"] = tuning_result["summary"]

    progress_fn("Scoring chapters")
    if chapters and chapter_breaks:
        from concurrent.futures import ThreadPoolExecutor

        chapter_texts = []
        for i in range(len(chapters)):
            if i < len(chapter_breaks):
                start_idx, end_idx = chapter_breaks[i]
                ctext = extract_plaintext_section(plaintext, segments, start_idx, end_idx)
            else:
                ctext = ""
            chapter_texts.append(ctext)

        BATCH_THRESHOLD = 15
        scores_by_index = {}

        if len(chapters) <= BATCH_THRESHOLD:
            chapters_with_text = [
                {"chapter": ch, "chapter_text": txt}
                for ch, txt in zip(chapters, chapter_texts)
            ]
            batch_results = score_chapters_batch(ctx, chapters_with_text)
            if batch_results:
                for i, scores in enumerate(batch_results):
                    scores_by_index[i] = scores

        unscored = [i for i in range(len(chapters)) if i not in scores_by_index]
        if unscored:
            def _score_one(i):
                return i, score_chapter(ctx, chapters[i], chapter_texts[i])

            with ThreadPoolExecutor(max_workers=5) as pool:
                for i, scores in pool.map(_score_one, unscored):
                    scores_by_index[i] = scores

        for i, chapter in enumerate(chapters):
            scores = scores_by_index.get(i, {})
            chapter["quality_metrics"] = scores
            tuning_results["chapters"].append({"chapter": chapter, "scores": scores})

    result["tuning_results"] = tuning_results
    _save()

    # Step 8 — Engagement Scoring (if enabled)
    with open(srt_path, 'r', encoding='utf-8') as f:
        srt_content = f.read()

    if params.get("steps_enabled", {}).get("engagement", True):
        progress_fn("Engagement scoring")
        try:
            from processor.engagement import run_engagement_scoring
            pipeline_data = {
                "segments": segments,
                "plaintext_transcript": plaintext,
                "chapter_breaks_preview": result.get("chapter_breaks_preview", []),
                "main_summary": result.get("main_summary"),
            }
            engagement_scores = run_engagement_scoring(
                ctx, srt_content, pipeline_data,
                system_prompt=params.get("engagement_sys_prompt"),
                rubric=params.get("engagement_rubric"),
                schema_json_text=params.get("engagement_schema"),
            )
            result["engagement_scores"] = engagement_scores
        except Exception as e:
            print(f"Engagement scoring failed: {e}")
            result["engagement_scores"] = {"error": str(e)}
        _save()
    else:
        result["engagement_scores"] = None

    # Step 9 — Clip Extraction (if enabled)
    if params.get("steps_enabled", {}).get("clips", True):
        progress_fn("Clip extraction")
        try:
            from processor.clips import run_clip_extraction
            clips_pipeline_data = {
                "segments": segments,
                "plaintext_transcript": plaintext,
                "chapter_breaks_preview": result.get("chapter_breaks_preview", []),
                "main_summary": result.get("main_summary"),
                "toc_bundle": result.get("toc_bundle"),
                "interview_name": interview_name,
            }
            clips_data = run_clip_extraction(
                ctx, srt_content, clips_pipeline_data,
                system_prompt=params.get("clips_combined_prompt"),
                token_limit=params.get("clips_token_limit", 30000),
            )
            result["clips_data"] = clips_data
        except Exception as e:
            print(f"Clip extraction failed: {e}")
            result["clips_data"] = {"error": str(e)}
        _save()
    else:
        result["clips_data"] = None

    # Save cost/token data so batch results can display it
    result["cost_data"] = {
        "total_cost_usd": ctx.total_cost_usd,
        "total_prompt_tokens": ctx.total_prompt_tokens,
        "total_completion_tokens": ctx.total_completion_tokens,
        "call_count": len(ctx.call_log),
        "call_log": list(ctx.call_log),
    }

    return result


def _run_batch(sid, srt_files, params):
    """Background thread: process all SRT files sequentially."""
    job = _BATCH_JOBS[sid]
    total = len(srt_files)

    for i, (name, path) in enumerate(srt_files):
        # Initialize partial result for this interview
        partial_result = {"interview_name": name, "error": None, "_processing": True, "_current_step": "Starting"}
        
        with _BATCH_LOCK:
            job["results"][name] = partial_result
            job["progress"] = {
                "current": i,
                "total": total,
                "current_name": name,
                "current_step": "Starting",
                "completed": [n for n, r in job["results"].items() if not r.get("_processing")],
            }

        def update_step(step_name, _name=name):
            with _BATCH_LOCK:
                job["progress"]["current_step"] = step_name
                if _name in job["results"]:
                    job["results"][_name]["_current_step"] = step_name

        def save_partial(result_dict, _name=name):
            with _BATCH_LOCK:
                job["results"][_name] = result_dict

        try:
            srt_basename = os.path.basename(path)
            yt_id = params.get("video_links_map", {}).get(srt_basename)
            psi = params.get("primary_source_map", {}).get(srt_basename)
            result = _process_single_interview(
                path, name, params, update_step,
                youtube_video_id=yt_id,
                partial_result=partial_result,
                save_partial_fn=save_partial,
                primary_source_info=psi,
            )
            # Mark as complete
            result.pop("_processing", None)
            result.pop("_current_step", None)
            with _BATCH_LOCK:
                job["results"][name] = result
                job["progress"]["completed"] = [n for n, r in job["results"].items() if not r.get("_processing")]
        except Exception as e:
            traceback.print_exc()
            with _BATCH_LOCK:
                job["results"][name] = {"interview_name": name, "error": str(e)}
                job["progress"]["completed"] = [n for n, r in job["results"].items() if not r.get("_processing")]

    with _BATCH_LOCK:
        job["progress"]["current"] = total
        job["progress"]["current_step"] = "Done"
        job["running"] = False


@app.route('/batch', methods=['GET'])
def batch_page():
    """Show batch upload page, or redirect to progress/results if a job exists."""
    if not has_api_key():
        return redirect(url_for('upload_page'))

    # If a batch job exists for this session, send user back to it
    sid = _get_session_id()
    with _BATCH_LOCK:
        job = _BATCH_JOBS.get(sid)
    if job:
        if job.get("running"):
            return redirect(url_for('batch_progress'))
        elif job.get("results"):
            return redirect(url_for('batch_results'))

    params = _capture_batch_params()
    # Check that user has actually completed a single-interview run
    has_config = bool(params["labeling_sys_prompt"] and params["main_summary_sys_prompt"])

    return render_template('batch_upload.html', state=state, params=params, has_config=has_config)


@app.route('/batch/start', methods=['POST'])
def batch_start():
    """Receive zip of SRT files, extract, start background processing."""
    if not has_api_key():
        return redirect(url_for('upload_page'))

    sid = _get_session_id()
    upload_dir = _session_upload_dir()
    batch_dir = os.path.join(upload_dir, 'batch')
    shutil.rmtree(batch_dir, ignore_errors=True)
    os.makedirs(batch_dir, exist_ok=True)

    # Handle zip upload
    zfile = request.files.get('batch_zip')
    if not zfile or not zfile.filename:
        return redirect(url_for('batch_page'))

    zip_path = os.path.join(upload_dir, 'batch_upload.zip')
    zfile.save(zip_path)

    # Extract SRT files
    srt_files = []
    try:
        with zipfile.ZipFile(zip_path, 'r') as zf:
            for member in zf.namelist():
                if member.lower().endswith('.srt') and not member.startswith('__MACOSX'):
                    basename = os.path.basename(member)
                    if not basename:
                        continue
                    dest = os.path.join(batch_dir, secure_filename(basename))
                    with zf.open(member) as src, open(dest, 'wb') as dst:
                        dst.write(src.read())
                    srt_files.append((basename.replace('.srt', ''), dest))
    except zipfile.BadZipFile:
        return redirect(url_for('batch_page'))

    if not srt_files:
        return redirect(url_for('batch_page'))

    # Sort by name for consistent ordering
    srt_files.sort(key=lambda x: x[0])

    params = _capture_batch_params()

    # Optional: parse video links JSON and build a basename → video_id lookup
    video_links_file = request.files.get('video_links_json')
    video_links_map = {}
    if video_links_file and video_links_file.filename:
        try:
            entries = json.loads(video_links_file.read().decode('utf-8'))
            for entry in entries:
                tf = entry.get('transcript_file', '')
                url = entry.get('videoEmbedLink', '')
                if tf and url:
                    video_links_map[secure_filename(os.path.basename(tf))] = extract_youtube_id(url)
        except Exception:
            pass  # silently ignore malformed JSON
    params["video_links_map"] = video_links_map

    # Optional: parse primary source JSON (oral_histories.json format) and build
    # a basename → metadata lookup keyed by transcript_file basename.
    primary_source_file = request.files.get('primary_source_json')
    primary_source_map = {}
    if primary_source_file and primary_source_file.filename:
        try:
            data = json.loads(primary_source_file.read().decode('utf-8'))
            for entry_data in data.values():
                tf = entry_data.get('transcript_file', '')
                if tf:
                    basename = secure_filename(os.path.basename(tf))
                    primary_source_map[basename] = {
                        k: v for k, v in entry_data.items() if k != 'transcript_file'
                    }
        except Exception:
            pass  # silently ignore malformed JSON
    params["primary_source_map"] = primary_source_map

    # Initialize job
    with _BATCH_LOCK:
        _BATCH_JOBS[sid] = {
            "running": True,
            "progress": {"current": 0, "total": len(srt_files), "current_name": "", "current_step": "Starting", "completed": []},
            "results": {},
            "interview_order": [name for name, _ in srt_files],
        }

    # Start background thread
    state["batch_started"] = True
    thread = threading.Thread(target=_run_batch, args=(sid, srt_files, params), daemon=True)
    thread.start()

    return redirect(url_for('batch_progress'))


@app.route('/batch/reset', methods=['POST'])
def batch_reset():
    """Clear the current batch job so the user can start a new one."""
    sid = _get_session_id()
    with _BATCH_LOCK:
        _BATCH_JOBS.pop(sid, None)
    return redirect(url_for('batch_page'))


@app.route('/batch/progress', methods=['GET'])
def batch_progress():
    """Show progress page that polls for status."""
    return render_template('batch_progress.html', state=state)


@app.route('/batch/status', methods=['GET'])
def batch_status():
    """JSON endpoint polled by the progress page."""
    sid = _get_session_id()
    with _BATCH_LOCK:
        job = _BATCH_JOBS.get(sid)
    if not job:
        return jsonify({"running": False, "progress": None})
    with _BATCH_LOCK:
        return jsonify({
            "running": job["running"],
            "progress": job["progress"],
            "interview_order": job.get("interview_order", []),
        })


@app.route('/batch/results', methods=['GET'])
def batch_results():
    """Tabbed results page — one tab per interview."""
    sid = _get_session_id()
    with _BATCH_LOCK:
        job = _BATCH_JOBS.get(sid)
    if not job or not job["results"]:
        return redirect(url_for('batch_page'))

    order = job.get("interview_order", sorted(job["results"].keys()))
    selected = request.args.get('i', order[0] if order else None)
    selected_result = job["results"].get(selected)

    return render_template(
        'batch_results.html',
        state=state,
        interview_order=order,
        results=job["results"],
        selected=selected,
        selected_result=selected_result,
        is_running=job.get("running", False),
    )


@app.route('/batch/download', methods=['GET'])
def batch_download():
    """Download all batch results as a zip of JSON files."""
    sid = _get_session_id()
    with _BATCH_LOCK:
        job = _BATCH_JOBS.get(sid)
    if not job or not job["results"]:
        return redirect(url_for('batch_page'))

    buf = BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
        for name, result in job["results"].items():
            payload = json.dumps(result, indent=2, ensure_ascii=False, default=str)
            zf.writestr(f"{name}.json", payload)
    buf.seek(0)
    return send_file(buf, mimetype='application/zip', as_attachment=True, download_name='batch_results.zip')


# ══════════════════════════════════════════════════════════════════════
if __name__ == '__main__':
    port = int(os.getenv('PORT', '5001'))
    debug = (os.getenv('FLASK_DEBUG', '').strip().lower() in {'1', 'true', 'yes', 'on'})
    app.run(host='0.0.0.0', port=port, debug=debug)
