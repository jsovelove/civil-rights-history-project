"""
Per-session structured logger for the interview processing pipeline.

One ProcessingLogger lives per processing session, attached to ProcessorContext
as ctx.logger.  Processor modules call ctx.logger.info() or ctx.logger.api()
to write structured lines.  All calls are thread-safe (Python's logging module
serialises writes internally).

Log file:  UI/logs/YYYYMMDD_<session6>.log

Line format:
    YYYY-MM-DD HH:MM:SS  [<session6>] [<filename>] [<Processor>]  <message>
"""

import logging
import os
from datetime import datetime
from typing import Any, Dict, Optional


class ProcessingLogger:
    SESSION_SUFFIX_LEN = 6
    KEY_SUFFIX_LEN = 4

    def __init__(
        self,
        logs_dir: str,
        session_id: str,
        interview_filename: str,
        api_key: str = "",
    ) -> None:
        self.session_suffix = (session_id or "??????")[-self.SESSION_SUFFIX_LEN:]
        self.interview_filename = os.path.basename(interview_filename or "unknown")
        key = api_key or ""
        self.api_key_suffix = (
            key[-self.KEY_SUFFIX_LEN:] if len(key) >= self.KEY_SUFFIX_LEN else "????"
        )

        os.makedirs(logs_dir, exist_ok=True)
        date_str = datetime.now().strftime("%Y%m%d")
        log_path = os.path.join(logs_dir, f"{date_str}_{self.session_suffix}.log")

        # Use a named logger so multiple sessions on the same process don't collide.
        logger_name = f"pipeline.{self.session_suffix}"
        self._log = logging.getLogger(logger_name)
        self._log.setLevel(logging.INFO)

        if not self._log.handlers:
            fh = logging.FileHandler(log_path, encoding="utf-8")
            fh.setFormatter(
                logging.Formatter(
                    "%(asctime)s  %(message)s", datefmt="%Y-%m-%d %H:%M:%S"
                )
            )
            self._log.addHandler(fh)
        self._log.propagate = False

        self.info("Session", f"Log opened — session={self.session_suffix}  file={self.interview_filename}")

    # ── internal helpers ──────────────────────────────────────────────────

    def _base(self, processor: str) -> str:
        return f"[{self.session_suffix}] [{self.interview_filename}] [{processor}]"

    def _api_tag(self, model: str) -> str:
        return f"[key:...{self.api_key_suffix}] [model:{model}]"

    # ── public primitives ─────────────────────────────────────────────────

    def info(self, processor: str, msg: str) -> None:
        self._log.info(f"{self._base(processor)}  {msg}")

    def api(self, processor: str, model: str, msg: str) -> None:
        """Log a line that includes API key suffix and model name."""
        self._log.info(f"{self._base(processor)}  {self._api_tag(model)}  {msg}")

    # ── Blocking ──────────────────────────────────────────────────────────

    def log_blocking(self, n_segments: int, n_blocks: int, block_size: int) -> None:
        self.info(
            "Blocking",
            f"Processed {n_segments} segments into {n_blocks} blocks (block_size={block_size})",
        )

    # ── Chapterization ────────────────────────────────────────────────────

    def log_chapterization(
        self, model: str, elapsed: float, tokens: int, n_chapters: int
    ) -> None:
        self.api(
            "Chapterization",
            model,
            f"Time: {elapsed:.1f}s | Tokens: {tokens:,} | Chapters generated: {n_chapters}",
        )

    # ── Chapter Summaries ─────────────────────────────────────────────────

    def log_chapter_summary_item(
        self, chapter_num: int, n_segments: int, n_words: int
    ) -> None:
        self.info(
            "ChapterSummaries",
            f"Chapter {chapter_num}: {n_segments} segments, {n_words} words",
        )

    def log_chapter_summaries_total(
        self, model: str, elapsed: float, tokens: int, n_chapters: int
    ) -> None:
        self.api(
            "ChapterSummaries",
            model,
            f"Complete — {n_chapters} chapters | Time: {elapsed:.1f}s | Tokens: {tokens:,}",
        )

    # ── Main Summary ──────────────────────────────────────────────────────

    def log_main_summary(self, model: str, elapsed: float, tokens: int) -> None:
        self.api(
            "MainSummary",
            model,
            f"Time: {elapsed:.1f}s | Tokens: {tokens:,}",
        )

    # ── Questions ─────────────────────────────────────────────────────────

    def log_questions_params(
        self, max_context_rows: int, before_chars: int, after_chars: int
    ) -> None:
        self.info(
            "Questions",
            f"Parameters: max_rows_with_context={max_context_rows}, "
            f"before_chars_per_row={before_chars}, after_chars_per_row={after_chars}",
        )

    def log_questions_api(self, model: str, elapsed: float, tokens: int) -> None:
        self.api("Questions", model, f"Time: {elapsed:.1f}s | Tokens: {tokens:,}")

    def log_questions_stats(self, stats: Dict[str, Any]) -> None:
        total = stats.get("total", 0)
        conf = stats.get("confidence", {})
        status = stats.get("status", {})
        self.info(
            "Questions",
            f"Stats: total={total} | "
            f"confidence — high={conf.get('high', 0)}, medium={conf.get('medium', 0)}, "
            f"low={conf.get('low', 0)} | "
            f"status — unreviewed={status.get('unreviewed', 0)}, "
            f"verified={status.get('verified', 0)}, rejected={status.get('rejected', 0)}",
        )

    # ── Tuning ────────────────────────────────────────────────────────────

    def log_tuning_settings(
        self,
        content_type: str,
        quality_threshold: int,
        accuracy_threshold: int,
        max_retries: int,
    ) -> None:
        self.info(
            "Tuning",
            f"{content_type} — Settings: quality_threshold={quality_threshold}, "
            f"accuracy_threshold={accuracy_threshold}, max_retries={max_retries}",
        )

    def log_tuning_attempt(
        self,
        content_type: str,
        attempt: int,
        max_retries: int,
        accuracy: int,
        quality: int,
        chapter_num: Optional[int] = None,
    ) -> None:
        label = f"Chapter {chapter_num}" if chapter_num is not None else content_type
        self.info(
            "Tuning",
            f"{label} attempt {attempt}/{max_retries}: "
            f"accuracy={accuracy}/100, quality={quality}/100",
        )

    def log_tuning_final(
        self,
        content_type: str,
        accuracy: int,
        quality: int,
        chapter_num: Optional[int] = None,
    ) -> None:
        label = f"Chapter {chapter_num}" if chapter_num is not None else content_type
        self.info(
            "Tuning",
            f"FINAL {label}: accuracy={accuracy}/100, quality={quality}/100",
        )

    def log_chapter_tuning_summary(self, results: list) -> None:
        """Log all chapters' final scores in order after parallel tuning completes."""
        self.info("Tuning", "Chapter final scores (all chapters):")
        for r in results:
            if not r:
                continue
            ch_num = (r.get("summary") or {}).get("chapter_number", "?")
            scores = r.get("scores", {})
            acc = scores.get("accuracy_score", "?")
            qual = scores.get("quality_score", "?")
            revised = " (revised)" if r.get("regenerated") else ""
            self.info(
                "Tuning",
                f"  Chapter {ch_num}{revised}: accuracy={acc}/100, quality={qual}/100",
            )

    def log_tuning_total(
        self, content_type: str, model: str, elapsed: float, tokens: int
    ) -> None:
        self.api(
            "Tuning",
            model,
            f"{content_type} complete — Time: {elapsed:.1f}s | Tokens: {tokens:,}",
        )

    # ── Engagement ────────────────────────────────────────────────────────

    def log_engagement(
        self, model: str, elapsed: float, tokens: int, result: Dict[str, Any]
    ) -> None:
        self.api("Engagement", model, f"Time: {elapsed:.1f}s | Tokens: {tokens:,}")
        overall = result.get("overall_score", {})
        self.info("Engagement", f"Overall score: {overall.get('total', '?')}/100")
        dims = result.get("dimension_scores", {})
        for dim_key, max_pts in [
            ("narrative_quality", 30),
            ("historical_value", 25),
            ("emotional_resonance", 25),
            ("accessibility", 20),
        ]:
            dim = dims.get(dim_key, {})
            label = dim_key.replace("_", " ").title()
            self.info("Engagement", f"  {label}: {dim.get('total', '?')}/{max_pts}")

    # ── Clips ─────────────────────────────────────────────────────────────

    def log_clips_summary(
        self, model: str, elapsed: float, tokens: int, extraction: Dict[str, Any]
    ) -> None:
        self.api("Clips", model, f"Time: {elapsed:.1f}s | Tokens: {tokens:,}")
        summary = extraction.get("extraction_summary", {})
        clips = extraction.get("clips", [])
        n_clips = summary.get("total_clips_extracted", len(clips))
        avg_score = summary.get("average_clip_score", 0)
        duration = summary.get("total_clips_duration", "?")
        self.info(
            "Clips",
            f"{n_clips} clips | avg score: {avg_score:.1f} | total duration: {duration}",
        )
        dist = summary.get("score_distribution", {})
        if dist:
            self.info(
                "Clips",
                f"Score distribution: "
                f"90-100={dist.get('90-100', 0)}, "
                f"80-89={dist.get('80-89', 0)}, "
                f"70-79={dist.get('70-79', 0)}, "
                f"60-69={dist.get('60-69', 0)}, "
                f"50-59={dist.get('50-59', 0)}",
            )

    def log_clip(self, clip: Dict[str, Any]) -> None:
        clip_id = clip.get("clip_id", "?")
        scores = clip.get("scores", {})
        total = scores.get("total_score", "?")
        tec = scores.get("topic_event_coverage", {})
        eq = scores.get("engagement_quality", {})
        tec_total = tec.get("total", "?") if isinstance(tec, dict) else "?"
        eq_total = eq.get("total", "?") if isinstance(eq, dict) else "?"
        self.info(
            "Clips",
            f"  {clip_id}: total={total}/100 | "
            f"topic_event_coverage={tec_total}/50 | "
            f"engagement_quality={eq_total}/50",
        )
