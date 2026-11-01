# TruthLens AI

TruthLens AI is a full-stack project scaffold for real-time interview authenticity analysis in virtual hiring. It combines a React recruiter dashboard with a FastAPI backend and a Python-based AI pipeline design for facial emotion analysis, voice stress detection, behavioral tracking, and environment monitoring.

## Problem Statement

Remote interviews make it harder for recruiters to judge authenticity, confidence, and behavioral integrity. Traditional evaluation is subjective and often misses hidden stress, gaze aversion, outside assistance, or suspicious environmental activity. TruthLens AI addresses that gap by combining face, voice, behavior, and scene signals into one live integrity workflow.

## Current Project Status

- The frontend is production-ready as a demo dashboard and session experience.
- The backend exposes a mock inference engine with the same response contract a real AI pipeline would use.
- The landing page, dashboard, and PDF report are already wired for OpenCV, DeepFace, Librosa, and YOLO style outputs.
- A new `/api/project/overview` endpoint provides the project brief, modules, and processing pipeline for the UI.

## Tech Stack

- Frontend: React.js, Vite, Chart.js, jsPDF
- Backend: FastAPI, Python
- Vision AI: OpenCV, DeepFace
- Audio AI: Librosa
- Object Detection: YOLO

## Project Structure

- `frontend/` React application for the landing page, recruiter dashboard, live session screen, and report export
- `backend/` FastAPI app with session orchestration, score generation, and project overview endpoints
- `backend/requirements-ai.txt` optional packages for future live-model integration
- `Dockerfile` single-service production build
- `render.yaml` Render deployment blueprint

## Local Development

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api/*` requests to `http://127.0.0.1:8000`.

## API Endpoints

- `GET /api/health` health check
- `GET /api/project/overview` project brief, modules, pipeline, and stack blueprint
- `GET /api/dashboard` recruiter dashboard metrics and recent sessions
- `POST /api/sessions/start` create a new interview session
- `GET /api/sessions/{session_id}/snapshot` fetch live analysis state
- `POST /api/sessions/{session_id}/environment` update detected people and phone activity
- `POST /api/sessions/{session_id}/end` close the session and generate a final report

## Replacing The Mock AI Layer

The live UI already expects structured outputs for:

- Facial metrics: confidence, stress, nervousness, dominant expression
- Voice metrics: stress level, tremor, pitch variation, speech speed
- Behavior metrics: eye contact, head turning, looking away, movement stability
- Environment metrics: people count, phone detection, suspicious objects, risk label

To connect real models, replace the mock generators in [engine.py](/Users/charanronda/Documents/New project/backend/app/engine.py) with:

- OpenCV or DeepFace for facial and expression analysis
- Librosa for audio features and stress-oriented voice signals
- YOLO for phone detection, multiple-person detection, and suspicious object monitoring

## Production Deploy

The repository is set up for a single Render web service:

1. Push the project to GitHub.
2. Create a new Render Blueprint or Docker web service.
3. Keep the root `Dockerfile`.
4. Use `/api/health` as the health check path.

Render serves the React build and the FastAPI API from the same HTTPS domain, which is important because webcam and microphone access require a secure origin.
