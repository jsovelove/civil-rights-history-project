"""
Shared state, constants, and utilities used across all processor modules.
"""

import os
import re
import json
import time
from typing import Dict, Any, List, Optional, Tuple
from openai import OpenAI
from difflib import SequenceMatcher


# ── Constants ──────────────────────────────────────────────────────────

MAIN_TOPICS = [
    "Voting & Legal Rights",
    "Organizations & Movement Networks",
    "Violence, Intimidation & State Repression",
    "Integration, Education & Everyday Segregation",
    "Historical Figures & Turning Points"
]

CIVIL_RIGHTS_EVENTS = [
    "The Lynching of Emmett Till",
    "Montgomery Bus Boycott",
    "Integration of Little Rock",
    "SNCC and Student Organizing",
    "Freedom Riders",
    "The Murder of Medgar Evers",
    "March on Washington",
    "Freedom Summer",
    "Civil Rights Act of 1964",
    "Assassination of Malcolm X",
    "Selma to Montgomery",
    "Voting Rights Act",
    "Black Panther Party",
    "The Brown Berets",
    "The Long Hot Summer",
    "Assassination of MLK",
    "Civil Rights Act of 1968",
    "Sixth Pan-African Congress"
]

# ── Per-token pricing (USD per token) ──────────────────────────────────
# Source: https://openai.com/api/pricing/  (legacy models, still active)
# Update these when OpenAI changes rates.

MODEL_RATES = {
    "gpt-4o":      {"input": 2.50 / 1_000_000, "output": 10.00 / 1_000_000},
    "gpt-4o-mini": {"input": 0.15 / 1_000_000, "output":  0.60 / 1_000_000},
}


def _cost_for_call(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    """Compute USD cost for a single API call."""
    rates = MODEL_RATES.get(model)
    if not rates:
        # Unknown model — fall back to gpt-4o rates as conservative estimate
        rates = MODEL_RATES["gpt-4o"]
    return (prompt_tokens * rates["input"]) + (completion_tokens * rates["output"])


# ── Processor Context ──────────────────────────────────────────────────
# Lightweight object that holds all shared state. Passed to every module.

class ProcessorContext:
    """Holds OpenAI client, facts, rubric, keywords, and config."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        chapter_block_size: int = 23,
        min_chapter_words: int = 75,
        max_chapter_length_ratio: float = 2.0,
        use_keyword_collection: bool = True,
        rubric_path: str = 'StandardizedRubric_1.md',
        toc_model: str = "gpt-4o-mini",
        prompts_dir: str = 'processor_prompts',
        facts_path: str = 'civil_rights_facts.json',
    ):
        self.api_key = api_key or os.getenv('OPENAI_API_KEY')
        if not self.api_key:
            raise ValueError("OpenAI API key required. Set OPENAI_API_KEY or pass api_key.")

        self.client = OpenAI(api_key=self.api_key)
        self.toc_model = toc_model
        self.chapter_block_size = chapter_block_size
        self.min_chapter_words = min_chapter_words
        self.max_chapter_length_ratio = max_chapter_length_ratio
        self.use_keyword_collection = use_keyword_collection
        self.prompts_dir = prompts_dir

        # Facts
        self.facts: Dict[str, Any] = {}
        self._load_facts(facts_path)

        # Rubric
        self.rubric = ""
        if rubric_path and os.path.exists(rubric_path):
            try:
                with open(rubric_path, 'r', encoding='utf-8') as f:
                    self.rubric = f.read()
                print(f"Loaded rubric from {rubric_path}")
            except Exception as e:
                print(f"Could not load rubric: {e}")

        # Token usage counter (accumulated across all API calls)
        self.total_tokens_used: int = 0

        # ── Cost tracking ──────────────────────────────────────────
        # Each API call appends a record here.
        self.call_log: List[Dict[str, Any]] = []
        self.total_prompt_tokens: int = 0
        self.total_completion_tokens: int = 0
        self.total_cost_usd: float = 0.0

        # Keywords
        self.standard_keywords: List[str] = []
        self.keyword_definitions: Dict[str, str] = {}
        if use_keyword_collection:
            self._load_keyword_collection()

        # Attached by app.py after context creation (optional)
        self.logger = None

    def _load_facts(self, facts_path: str):
        try:
            with open(facts_path, 'r') as f:
                self.facts = json.load(f)
            print(f"Loaded {len(self.facts)} historical facts")
        except FileNotFoundError:
            print("No facts file found")
            self.facts = {}

    def _load_keyword_collection(self):
        try:
            from firebase_config import get_firebase_config, get_service_account_path, setup_firebase_environment
            from firebase_data_manager import FirebaseDataManager

            print("Loading standardized keywords from Firestore...")
            setup_firebase_environment()

            firebase_config = get_firebase_config()
            service_account_path = get_service_account_path()

            data_manager = FirebaseDataManager(
                firebase_config=firebase_config,
                service_account_path=service_account_path
            )

            if not data_manager.db:
                print("Could not connect to Firebase, using fallback keywords")
                self.use_keyword_collection = False
                return

            for collection_name in ['events_and_topics', 'keywords_cleaned', 'keywords']:
                try:
                    keywords_ref = data_manager.db.collection(collection_name)
                    docs = keywords_ref.stream()
                    keywords_data = []
                    for doc in docs:
                        doc_data = doc.to_dict()
                        keyword = doc_data.get('keyword', doc.id)
                        definition = doc_data.get('definition', '')
                        keywords_data.append(keyword)
                        self.keyword_definitions[keyword] = definition

                    if keywords_data:
                        self.standard_keywords = sorted(keywords_data)
                        print(f"Loaded {len(self.standard_keywords)} keywords from '{collection_name}'")
                        return
                except Exception as e:
                    print(f"Could not load from '{collection_name}': {e}")
                    continue

            print("Could not load keywords from any collection, using fallback")
            self.use_keyword_collection = False

        except Exception as e:
            print(f"Error loading keyword collection: {e}")
            self.use_keyword_collection = False

    def get_cost_summary(self) -> Dict[str, Any]:
        """Return a summary of all API costs so far."""
        return {
            "total_calls": len(self.call_log),
            "total_prompt_tokens": self.total_prompt_tokens,
            "total_completion_tokens": self.total_completion_tokens,
            "total_tokens": self.total_tokens_used,
            "total_cost_usd": round(self.total_cost_usd, 6),
            "calls": self.call_log,
        }


# ── OpenAI call ────────────────────────────────────────────────────────

def call_openai_json(
    ctx: ProcessorContext,
    system_prompt: str,
    user_prompt: str,
    model: str = "gpt-4o",
    max_tokens: int = 1500
) -> Dict[str, Any]:
    """Send system+user prompt to OpenAI, return parsed JSON dict."""
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = ctx.client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=max_tokens,
                temperature=0.2,
                response_format={"type": "json_object"}
            )

            content = response.choices[0].message.content
            if hasattr(response, 'usage') and response.usage:
                prompt_tok = response.usage.prompt_tokens or 0
                completion_tok = response.usage.completion_tokens or 0
                total_tok = response.usage.total_tokens or 0

                call_cost = _cost_for_call(model, prompt_tok, completion_tok)

                # Accumulate totals
                ctx.total_tokens_used += total_tok
                ctx.total_prompt_tokens += prompt_tok
                ctx.total_completion_tokens += completion_tok
                ctx.total_cost_usd += call_cost

                # Log this call
                ctx.call_log.append({
                    "model": model,
                    "prompt_tokens": prompt_tok,
                    "completion_tokens": completion_tok,
                    "total_tokens": total_tok,
                    "cost_usd": round(call_cost, 6),
                })

            try:
                parsed = json.loads(content)
                return clean_markdown_from_dict(parsed)
            except json.JSONDecodeError as e:
                print(f"Error parsing JSON response: {e}")
                print(f"Raw response: {content}")
                return {"error": f"Failed to parse JSON: {str(e)}"}

        except Exception as e:
            error_str = str(e)
            if "429" in error_str and attempt < max_retries - 1:
                wait = 2 ** attempt
                print(f"Rate limited (429). Waiting {wait}s before retry {attempt + 2}/{max_retries}...")
                time.sleep(wait)
                continue
            print(f"Error calling OpenAI API: {e}")
            return {"error": f"API call failed: {error_str}"}


# ── Prompt loading ─────────────────────────────────────────────────────

def load_prompt(ctx: ProcessorContext, filename: str) -> str:
    """Load a prompt file from the prompts directory."""
    path = os.path.join(ctx.prompts_dir, filename)
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()


# ── Facts helpers ──────────────────────────────────────────────────────

def get_relevant_facts(ctx: ProcessorContext, text: str) -> List[Dict[str, str]]:
    """Scan text for known events, return matching facts."""
    relevant = []
    text_lower = text.lower()
    for event_name, fact_data in ctx.facts.items():
        if event_name.lower() in text_lower:
            relevant.append({
                "event": event_name,
                "summary": fact_data.get("summary", "")
            })
    return relevant


def format_facts_for_prompt(facts: List[Dict[str, str]]) -> str:
    """Format facts list into text appendable to a prompt."""
    if not facts:
        return ""
    lines = ["\n\nVERIFIED HISTORICAL FACTS (use for accuracy, do not penalize summary for missing facts not in transcript):"]
    for fact in facts:
        lines.append(f"- {fact['event']}: {fact['summary']}")
    return "\n".join(lines)


def format_primary_source_for_prompt(info: Optional[Dict[str, Any]]) -> str:
    """Format interviewee primary source metadata as a prompt block."""
    if not info:
        return ""
    field_labels = [
        ("birth_date", "Birth date"),
        ("birth_place", "Birth place"),
        ("death_date", "Death date"),
        ("interviewer", "Interviewer"),
        ("interview_location", "Interview location"),
        ("interview_date", "Interview date"),
        ("biographical_history", "Biographical history"),
        ("summary", "Reference summary"),
    ]
    lines = ["\n\nINTERVIEWEE REFERENCE INFORMATION (authoritative source — use for correct spellings, dates, and facts):"]
    for key, label in field_labels:
        val = info.get(key)
        if val:
            lines.append(f"{label}: {val}")
    if len(lines) == 1:
        return ""
    return "\n".join(lines)


# ── Keyword helpers ────────────────────────────────────────────────────

def match_keyword_to_standard(ctx: ProcessorContext, ai_keyword: str) -> str:
    if not ctx.use_keyword_collection or not ctx.standard_keywords:
        return ai_keyword

    ai_lower = ai_keyword.lower().strip()

    # Exact match
    for sk in ctx.standard_keywords:
        if sk.lower() == ai_lower:
            return sk

    # Substring match
    substring_matches = []
    for sk in ctx.standard_keywords:
        if ai_lower in sk.lower():
            substring_matches.append((sk, len(sk)))
    if substring_matches:
        return min(substring_matches, key=lambda x: x[1])[0]

    # Fuzzy match
    best_match = None
    best_sim = 0.0
    for sk in ctx.standard_keywords:
        sim = SequenceMatcher(None, ai_lower, sk.lower()).ratio()
        if sim > best_sim and sim >= 0.6:
            best_sim = sim
            best_match = sk

    if best_match:
        print(f"Matched '{ai_keyword}' -> '{best_match}' (similarity: {best_sim:.2f})")
        return best_match

    print(f"No standard keyword match found for '{ai_keyword}' - using original")
    return ai_keyword


def get_keyword_context_for_ai(ctx: ProcessorContext) -> str:
    if not ctx.use_keyword_collection or not ctx.standard_keywords:
        return ""
    sample = ctx.standard_keywords[:50]
    context = "Available standardized keywords:\n" + ", ".join(sample)
    if len(ctx.standard_keywords) > 50:
        context += f"\n... and {len(ctx.standard_keywords) - 50} more keywords available."
    return context


def calculate_keyword_relevance(ai_keyword: str, matched_keyword: str, ai_position: int) -> float:
    position_score = 1.0 - (ai_position * 0.1)
    similarity = SequenceMatcher(None, ai_keyword.lower(), matched_keyword.lower()).ratio()

    if ai_keyword.lower() == matched_keyword.lower():
        match_quality = 1.0
    elif ai_keyword.lower() in matched_keyword.lower() or matched_keyword.lower() in ai_keyword.lower():
        match_quality = 0.9
    else:
        match_quality = similarity

    length_bonus = min(0.2, len(matched_keyword.split()) * 0.05)
    specificity_penalty = _calculate_specificity_penalty(matched_keyword)

    relevance = (position_score * 0.4) + (match_quality * 0.5) + length_bonus - specificity_penalty
    return round(max(0.1, relevance), 3)


def _calculate_specificity_penalty(keyword: str) -> float:
    kw = keyword.lower().strip()

    highly_generic = {
        'civil rights': 0.4, 'activism': 0.3, 'movement': 0.3,
        'politics': 0.4, 'history': 0.4, 'society': 0.4,
        'community': 0.2, 'education': 0.2, 'organizing': 0.1
    }
    moderately_generic = {
        'protest': 0.2, 'demonstration': 0.2, 'resistance': 0.2,
        'leadership': 0.2, 'rights': 0.3, 'equality': 0.2,
        'justice': 0.2, 'freedom': 0.2
    }

    if kw in highly_generic:
        return highly_generic[kw]
    if kw in moderately_generic:
        return moderately_generic[kw]
    for broad in ['rights', 'movement', 'activism']:
        if broad in kw and len(kw.split()) == 1:
            return 0.1
    return 0.0


# ── Text utilities ─────────────────────────────────────────────────────

def clean_markdown_from_dict(data: Dict[str, Any]) -> Dict[str, Any]:
    cleaned = {}
    for key, value in data.items():
        if isinstance(value, str):
            v = re.sub(r'[#*_`]', '', value)
            v = re.sub(r'\s+', ' ', v).strip()
            cleaned[key] = v
        elif isinstance(value, list):
            cleaned_list = []
            for item in value:
                if isinstance(item, str):
                    item = re.sub(r'[#*_`]', '', item)
                    item = re.sub(r'\s+', ' ', item).strip()
                cleaned_list.append(item)
            cleaned[key] = cleaned_list
        else:
            cleaned[key] = value
    return cleaned


def seconds_to_time_format(seconds: float) -> str:
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}"


def get_current_timestamp() -> str:
    from datetime import datetime
    return datetime.now().isoformat()