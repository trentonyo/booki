# Project Design Document

## Overview

This project is a TypeScript-powered web application combining modern frontend and backend frameworks alongside robust build and deployment tooling. The application leverages OCR (Optical Character Recognition) and handles intensive image processing, making it especially suited for capturing and analyzing game-related data in real time.

The project utilizes configuration-driven development, using the "Game State Models/Handlers" schema defined for any given game/gamemode.

### Goals
- **Frontend:** A modular and dynamic React-based application styled with Tailwind CSS. Configuration will largely define the appearance of the frontend.
- **Backend:** A scalable and efficient Express server that integrates OCR and game state models (configuration).
- **Future Support:** Maintain a scalable architecture to accommodate external collaborators and move towards GitHub Wiki for expanded documentation.

---

## Frameworks and Tools

### Core Technologies
- **TypeScript** (Version: 4.0.0): Provides static typing, modern JS features, and code maintainability.
- **React** (Version: 18.3.1): Used for building a modular, component-driven UI.
- **Express** (Version: 4.18.1): Backend framework handling API endpoints, OCR management, and static asset hosting.
- **Prisma** (Version: 5.21.1): An ORM for interacting with the project database in a type-safe manner. 
  > [!NOTE] 
  > There is no persistence layer yet utilized. The persistence layer will be used for training the Bayesian model. 
- **Tailwind CSS** (Version: 3.4.14): A utility-first CSS framework for rapid UI development.

### Additional Libraries
- **tesseract.js** (Version: 5.1.1): Client-side OCR library for processing image text.
- **sharp** (Version: 0.33.5): High-performance image processing for resizing and transformation.
- **Webpack** (Version: 5.95.0): For bundling both client- and server-side code.

---

## Project Structure

### Build System
1. **Frontend Build**:
    - Managed through Webpack (`webpack.config.js`).
    - React entry point: `src/index.tsx`.
    - Bundles JavaScript and CSS into distributable assets.

2. **Backend Build**:
    - Handled by Webpack (`webpack.server.config.js`).
    - Processes server code (`src/server.ts`) with optimizations for Node.js using `webpack-node-externals`.

3. **CSS Build**:
    - Processes CSS with Tailwind CLI to create the main stylesheet (`output.css`).

### File Structure
- **`src/`**:
    - Contains TypeScript and React source files.
    - Includes separate files for client-side (`index.tsx`) and server-side (`server.ts`) entry points.
- **`public/`**:
    - Stores HTML templates for different pages (e.g., `index.html`, `feed.html`).
- **`dist/`**:
    - Output directory for built assets.

### Configuration Files
- **`tsconfig.json`**: Defines TypeScript compiler options, including ES6 compatibility and React JSX support.
- **`tailwind.config.js`**: Specifies utility class generation for the project's CSS.

### Routing
- **Frontend**:
    - Managed using React Router (`react-router-dom`).
    - Available routes:
        - `/` - Home Component.
        - `/feed` - Screen/Game feed integration.
        - `/data` - Data analysis for logged games (validating data).
- **Backend**:
    - Express provides RESTful API endpoints for:
        - Retrieving game state models and data sets.
        - Posting images for OCR processing.

---

## Backend Features

1. **OCR Management**
    - Tesseract.js is integrated to handle text recognition from images of screens or game feeds.
    - Efficient processing is ensured with worker pools or background tasks to manage concurrent OCR requests.
    - Configurable thresholds or presets can be set for specific game states.

2. **Game State Models**
    - A schema-first approach, where game state models (provided as JSON files) define the expected game parameters and data fields.
    - Dynamically loads these models to:
        - Tailor OCR-based data extraction.
        - Validate incoming data against defined game rules or parameters.

3. **Debugging and Logging**
    - Raw OCR data (along with metadata such as processing time and errors) can be logged for debugging.
    - Useful for improving model definitions and OCR accuracy over time.

4. **API Endpoints**
    - Express-based APIs for:
        - Submitting game feed images for processing.
        - Fetching results for processed images.
        - Retrieving and listing defined game state models.

5. **Error and Performance Handling**
    - Graceful handling of OCR failures with appropriate error responses.
    - Efficient processing of OCR tasks to optimize server performance with background tasks or worker pools.

---

## Frontend Features

1. **Dynamic UI Configuration**
    - The user interface adapts dynamically based on the loaded game state models.
    - React components are defined per game schema.

2. **Game Feed Interface**
    - The `/feed` route provides a live camera/game feed view, allowing users to upload images directly for processing.
    - Results are displayed in real-time, using WebSocket connections for seamless updates.

3. **Data Validation**
    - The `/data` route enables users to review, manage, and validate logged game data.
    - Provides interface elements to correct errors or export data.

4. **Customization**
    - Tailwind CSS ensures rapid styling changes for UI customization.
    - React's component-based architecture allows adding new visualizations or features without major rework.

---

## Future Features and Improvements

1. **Database Integration**
    - Plan to implement persistent storage (e.g., PostgreSQL) for:
        - Dataset storage.
        - Training and updating Bayesian models.

2. **Testing**
    - Introduce both unit and integration tests:
        - Jest for backend testing.
        - React Testing Library for frontend component testing.

3. **Performance Improvements**
    - Leverage worker threads to execute CPU-heavy OCR tasks with efficient multitasking.

4. **Scalability**
    - Support distributed processing by offloading OCR tasks to cloud services or external workers.
    - Considerations for latency must be made.

5. **Enhanced Deployment**
    - Provide a Docker setup for easier deployment and consistent environments.
    - Automate builds and deployments with CI/CD pipelines.