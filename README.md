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
│   └── templates/                # Flask HTML templates
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

### Running the Metadata Tool

```bash
cd "Metadata Generation System"
pip install -r requirements.txt
python app.py
```

Then open `http://localhost:5000` in your browser and follow the step-by-step UI.

---

## Features

### Browsing & Playback
- **Interview Index** — Browse the full collection of oral history interviews
- **Interview Player** — Watch full interviews with AI-generated chapter navigation and metadata panels
- **Clip Player** — Watch individual interview segments with related clips and topics
- **Content Directory** — Browse the collection by keywords, clips, or interviewees

### Search
- **Keyword Search** — Find interview segments by topic keyword
- **Semantic / Vector Search** — Search by meaning using OpenAI vector embeddings; results ranked by cosine similarity

### Playlists
- **Playlist Builder** — Automatically assemble a playlist of interview segments around a chosen keyword, with related term suggestions and shuffle support
- **Playlist Editor** — Manually curate and reorder playlist segments

### Visualizations (`/visualizations`)
- **Timeline** — Interactive civil rights history timeline powered by Knight Lab TimelineJS, with animated connectors between events
- **Keyword Bubbles** — Force-directed bubble chart of topics across the collection
- **Geographic Map** — Leaflet map placing interviews and events geographically

### Topic Glossary
- Browse and explore standardized topic terms used to index the collection, with linked interview segments

### Feedback System
- Inline selection feedback and modal feedback for user-contributed corrections and suggestions

---

## Technology Stack

### Frontend
| Category | Libraries |
|---|---|
| UI Framework | React 18, React Router v7 |
| Styling | Tailwind CSS v4, MUI (Material UI), Framer Motion |
| Icons | Lucide React, React Icons |
| Build | Vite 5 |
| Deployment | GitHub Pages (`gh-pages`) |

### Data Visualization
| Library | Usage |
|---|---|
| d3.js / Visx | Force-directed graphs, hierarchy, zoom |
| Recharts | Charting components |
| React Leaflet | Geographic map |
| react-globe.gl / Three.js | 3D globe visualization |
| Knight Lab TimelineJS | Civil rights history timeline |
| ReactFlow | Node/edge flow diagrams |

### Backend & Data
| Service | Usage |
|---|---|
| Firebase Firestore | Primary database |
| Firebase Authentication | User login / protected routes |
| Firebase Cloud Functions | Server-side OpenAI API calls |
| OpenAI Embeddings API | Vector embeddings for semantic search |
| OpenAI GPT-4o-mini | Transcript summarization (via Cloud Functions) |

### Media
| Library | Usage |
|---|---|
| react-youtube | YouTube IFrame player |
| wavesurfer.js | Audio waveform display |

---

## Acknowledgments

- [Library of Congress Civil Rights History Project](https://www.loc.gov/collections/civil-rights-history-project) for the original interview content
