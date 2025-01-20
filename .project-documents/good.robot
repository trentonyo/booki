# Project Overview and Key Details

## PURPOSE
This project is a TypeScript-based web application that employs OCR (Optical Character Recognition) to extract meaningful data from game screens. It dynamically adapts to game-specific JSON configuration files, allowing for flexible integration of new games and features.

---

## TECHNOLOGY STACK
- **Language**: TypeScript
- **Frontend Framework**: React (Client-side routing via React Router)
- **Styling**: Tailwind CSS
- **Backend Framework**: Express (REST API with modular routes)
- **Libraries**:
  - OCR: Tesseract.js
  - Image Processing: Sharp
  - ORM (Planned): Prisma

---

## ARCHITECTURE BASICS
1. **Frontend**:
   - Renders real-time game data using React and Tailwind CSS.
   - Routes:
     - `/`: Home Page
     - `/feed`: Displays live game data collected and processed by OCR backend.
     - `/data`: Displays configuration-based processed data for analysis.

2. **Backend**:
   - RESTful APIs using Express:
     - `/api/game-state-models`: Fetch configured game logic/info.
     - `/game/:model`: Endpoint for posting game feed data (OCR processing).
   - Handles OCR/image processing via:
     - `processGameFrame()`: Processes images, applies OCR, and runs optional validation via game state models.

3. **Configuration-Driven Development**:
   - Game state JSON files define specific "rules" for OCR (e.g., score elements, HUD layout).
   - Handlers transform raw extracted data into actionable "game state" data.

---

## WORKFLOWS & USAGE
### Game Feed Data Pipeline
1. **Image Capture**: Users send game frames (images) to `/game/:model`.
2. **OCR Parsing**:
   - Filters images using game-specific rules.
   - Extracts data (e.g., score, team names, animations).
3. **Transformation**:
   - Handlers take the raw OCR output, validate it, and convert it into a processed state.
4. **Result Display**: Processed game state is passed back to update the frontend dynamically.

---

## CONFIGURATION SYSTEM
1. **State Models**:
   - JSON schema files defining:
     - OCR expectations (e.g., regions of interest, data types).
     - Input methods for interactivity.
   - Saved in `public/stateModels` (example: `thefinals_ranked.json`).

2. **State Handlers**:
   - Logic to process OCR raw data into validated game states.
   - Implemented as TypeScript modules under `scripts/stateHandlers`.

3. **Game-Specific Views**:
   - Each game has a React-based view to display real-time stats/state updates.

---

## FAQ SNAPSHOT
### Key Design Details
- **State Models vs Handlers**: Models define OCR rules, handlers transform raw results into actionable states.
- **Handler Flexibility**: Handlers operate as black boxes, allowing developers to customize processing at will.

### Technical Insights
- **Validation**: OCR output passes through mask filters, regex patterns, and handler custom logic for accuracy.
- **Manual Registration**: New game configurations and handlers must be explicitly integrated and tested before use.

---

## BUILD & DEVELOPMENT
1. Use `pnpm run build` to compile both client and server.
2. For iterative changes:
   - Run backend via `ts-node-dev`.
   - Use webpack-dev-server for live frontend dev.

---

## LIMITATIONS & FUTURE WORK
1. **OCR Bottlenecks**:
   - Tesseract.js can be CPU-intensive. Future improvements could involve threading or offloading.
2. **Testing**:
   - Planned Jest coverage for backend workflows. Frontend tests to be determined.
3. **Database Integration (Planned)**:
   - Prisma ORM for persistence of processed game states for later review.
4. **Configurations**:
   - Support for more complex inputs or interactions is in progress.

---

## QUICK REFERENCES
1. **Game State Models**: Stored in `public/stateModels`.
2. **Handlers**: Written in `scripts/stateHandlers`.
3. **Game Views**: React components styled with Tailwind CSS.
4. **FAQs**: Extensive answers on game management, handler specifics, and more—see `faq.md`.