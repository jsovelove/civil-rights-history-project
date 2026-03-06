# Civil Rights History Project

A React-based web application for exploring and creating playlists from civil rights oral history interviews sourced from the [Library of Congress Civil Rights History Project](https://www.loc.gov/collections/civil-rights-history-project). The platform uses AI-generated metadata and vector embeddings to power search, playlist creation, and interactive visualizations.

**Live site:** https://www.civil-rights-history.org/



---

## Repository Structure

```
/
├── src/                          # React frontend application
│   ├── pages/                    # Application pages / routes
│   ├── components/               # Reusable UI components
│   │   ├── auth/                 # Authentication components
│   │   ├── common/               # Layout, Header, Sidebar, Footer
│   │   ├── connectors/           # Animated timeline event connectors
│   │   └── visualization/        # Chart, map, and globe components
│   ├── contexts/                 # React Context providers
│   ├── hooks/                    # Custom React hooks
│   ├── services/                 # Firebase, OpenAI, and playlist services
│   ├── utils/                    # Utility functions
│   ├── App.jsx                   # Route definitions
│   └── main.jsx                  # Entry point
├── functions/                    # Firebase Cloud Functions (Node.js)
├── Metadata Generation System/   # Standalone Python/Flask pipeline tool
│   ├── app.py                    # Flask app
│   ├── processor/                # Pipeline step modules
│   ├── processor_prompts/        # LLM prompt templates
│   ├── templates/                # Flask HTML templates
│   └── Metadata Generation Documentation.md  # Pipeline documentation
├── scripts/
│   ├── firebase/                 # Firestore data management scripts
│   ├── media/                    # Video/GIF processing scripts
│   └── vectorization/            # Batch embedding generation scripts
└── dist/                         # Production build output
```

---

## Metadata Generation System

A standalone **Python/Flask** tool (`Metadata Generation System/`) that processes raw `.srt` interview transcripts through a configurable 7-step pipeline to produce structured metadata for Firestore.

### Pipeline Steps

| Step | Module | Description |
|---|---|---|
| 1 | `blocking.py` | Parse SRT file and group lines into fixed-size text blocks |
| 2 | `labeling.py` | Assign topic labels to each text block via LLM |
| 3 | `toc.py` | Generate a table of contents from labeled blocks |
| 4 | `chapterization.py` | Detect topic transitions and define chapter boundaries |
| 5 | `summarization.py` | Generate a main interview summary and per-chapter summaries |
| 6 | `tuning.py` | Evaluate summary quality and iteratively revise until thresholds are met |
| 7 | `engagement.py` | Score each chapter for audience engagement |

Each step uses editable LLM prompts (stored in `processor_prompts/`) and can be individually re-run. The tool supports single-file and batch processing, and exports results as JSON ready for Firestore upload.

For a detailed walkthrough of each pipeline stage, see [`Metadata Generation System/Metadata Generation Documentation.md`](Metadata%20Generation%20System/Metadata%20Generation%20Documentation.md).

### Running the Metadata Tool

```bash
cd "Metadata Generation System"
pip install -r requirements.txt
python app.py
```

Then open `http://localhost:5000` in your browser and follow the step-by-step UI.

---

## Frontend Pages

### Home (`/`)
A custom-built, scroll-driven civil rights history timeline spanning the 1950s through the late 1960s. Each major event — from the murder of Emmett Till through the Civil Rights Act of 1968 — is presented with historical photographs, looping archival video clips (served from Cloudinary), quotes, and decade headers. Animated line connectors drawn in SVG thread the events together visually as the user scrolls. The page also embeds topic-linked text passages. A welcome disclaimer modal is shown on first visit.

### Interview Index (`/interview-index`)
A card grid of every interview in the collection, showing each interviewee's name, thumbnail, and duration. Supports name-based keyword search and semantic vector search (toggled via a switch), as well as sorting by name or duration. Each card links through to the Interview Player.

### Playlist Builder (`/playlist-builder`)
The primary exploration tool. Given a keyword, it assembles a sequential playlist of relevant interview segments drawn from across the collection, using progressive loading so the first clip begins playing immediately while the rest load in the background. Features a related-terms panel, shuffle playback, and inline user feedback.

### Topic Glossary (`/topic-glossary`)
A card-based directory of AI-curated civil rights topics drawn from the `events_and_topics` Firestore collection. Topics are categorized as concepts, places, people, events, organizations, or legal terms, and can be filtered by category, sorted by importance or usage count, and searched by keyword or semantic vector search. Clicking a topic launches its clips directly in the Playlist Builder. Also includes a force-directed topic relationship graph.

### Semantic Search (`/vector-search`)
A natural language search interface powered by OpenAI vector embeddings. Users enter a free-text query and the app converts it to an embedding, then performs cosine similarity search against all stored clip embeddings to return the top 20 most conceptually relevant segments. Results are displayed as cards showing the clip thumbnail, interviewee name, summary, topic keywords, and a percentage similarity score. Clicking a result navigates to the Clip Player.

---

## Acknowledgments

- [Library of Congress Civil Rights History Project](https://www.loc.gov/collections/civil-rights-history-project) for the original interview content
