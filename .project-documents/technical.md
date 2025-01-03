# Technical Notes

The technical section provides insight into both the development workflows and the strengths/limitations of the technology choices currently in use.

---

## Frontend

### Frontend Routing (Via React Router)
To enable seamless navigation between multiple views, React Router is utilized for client-side routing. Routes for the application are managed in `App.tsx`. Available paths include:
- `/` (Home)
- `/feed` (Game Feed)
- `/data` (Configuration-Based Data Display)

---

## Backend

### API Overview

The Express server serves as the central backend, supporting the following key functions:
1. **OCR Processing:**
  - The `/game/:model` API endpoint accepts game frame data (in the form of images) and invokes the Tesseract.js library for optical character recognition.
  - Game state models define "rules" that customize OCR handling and other "landmarks" (significant regions in the image) for each supported game.

2. **Game State Models:**
  - Predefined configurations stored in JSON are exposed via the `/api/game-state-models` endpoint. These serve as:
    - The schema for OCR expectations (e.g., text sections, color regions).
    - Definitions for configurable inputs during live gameplay (e.g., player actions).

### Dev Notes
1. Workflows should use modular Express routes for scalability.
2. Routes should return appropriate HTTP status codes for both client-side compatibility and server-side tests.