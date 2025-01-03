# Project Design Document

## Overview

This project is a TypeScript-powered web application combining modern frontend and backend frameworks alongside robust build and deployment tooling. The application leverages OCR (Optical Character Recognition) and handles intensive processing of image data, making it especially suited for capturing and analyzing game-related data in real time.

The architecture is largely designed to be configuration-driven, where features such as **game state models** and **data feeds** dynamically adapt to game-specific JSON configuration files.

### Goals
- **Frontend:** A modular and dynamic React-based application styled with Tailwind CSS and powered by client-side routing via `react-router-dom`.
- **Backend:** A scalable Express-based server that integrates high-performance OCR with API-first design principles.
- **Future Flexibility:** A tech stack designed to scale and easily enable features like database integration and additional processing pipelines.

---

## Frameworks and Tools

### Core Technologies
- **TypeScript**: Enforces strong typing for maintainable code on both frontend and backend.
- **React**: Utilized for building dynamic UIs with client-side rendering, routing, and state management.
- **Express**: Lightweight and efficient backend framework for serving APIs, OCR integrations, and static assets.

### Additional Libraries
- **react-router-dom**: Provides declarative, client-side routing capabilities.
- **Tesseract.js**: A JS-based OCR engine for real-time image text extraction.
- **Sharp**: High-performance image processing for resizing and transformation.
- **Tailwind CSS**: Enables utility-first styling for rapid and consistent UI development.
- **Prisma**: (Planned) A type-safe ORM to support future additions when database integration becomes necessary.

---

## Project Structure

### Anatomy of the Application

- **Game State Models**: Configure game-specific logic in JSON schema files under `public/stateModels`. These describe how the OCR engine and backend should process a particular game's feed.
- **Frontend Routing**: All client-side page transitions and navigations are accomplished using React Router, defined in `App.tsx`.
- **Backend RESTful API**: Focuses on receiving game feed data from the frontend (image data); leverages OCR processing and additional logic to return meaningful insights.

---

## Game Feed and Processing Pipeline

The **game feed interface** dynamically updates based on game state models and user-configured settings. The pipeline is broadly broken into:
1. **Game Feed Capture:** Extracts text or image-based data from a frame and posts it to the server.
2. **OCR Processing:** The server processes a raw or filtered game frame using Tesseract OCR to extract relevant details (e.g., scoreboard, character HUD).
3. **State Handling:** The extracted game data is further refined using game-specific logic (implemented as "game handlers").
4. **UI Update:** The frontend updates dynamically to display data feeds in real time.

### Routing Details

#### Frontend Routes (React Router)
```plaintext
1. `/` - Home page
2. `/feed` - Display live-screen feed updates
3. `/data` - View processed configuration data
```

#### Backend Routes (Express)
```plaintext
- `/api/game-state-models`: Fetch game state configurations.
- `/api/data-sets`: Retrieve processed datasets for analysis.
- `/game/:model`: Process and respond to OCR-derived details for the selected game model.
```