# 📖 **Booki - Game Analyzer Platform** 

**Modern web application for real-time 🎮 game state analysis and 🖼️ image processing.**

![TypeScript](https://img.shields.io/badge/TypeScript-4.0.0-%23007acc?style=flat-square&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-18.3.1-%2361dafb?style=flat-square&logo=react&logoColor=white)
![Tailwind](https://img.shields.io/badge/TailwindCSS-3.4.14-%2338b2ac?style=flat-square&logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/License-All%20Rights%20Reserved-red)

Booki takes periodic images from your display and runs them through high-performance OCR processors, cleaning noisy data and predicting **in-game probabilities** in real time using Bayesian and frequentist approaches. ♟️

---

## ✨ **Features**

### 🔍 **Core Functionality**
- **🚀 Real-Time OCR Image Processing**:
  - Extract and process data from game screenshots in real time using [Tesseract.js](https://github.com/naptha/tesseract.js).
  - Configurable game models using JSON schemas for maximum adaptability.
- **⚙️ Configuration-Driven Design**:
  - Modular, schema-first architecture with loosely coupled systems.
  - Define new game rules with minimal effort and maximum flexibility.
- **🎨 Tailored Frontend Integration**:
  - Highly dynamic React-based UI.
  - Effortless navigation using declarative routes powered by `react-router-dom`.

### 🖥️ **Backend Highlights**
- Scalable **Express API** for serving OCR results and game logic.
- CPU-intensive tasks are optimized with worker threads 🛠️ for better performance.
- Plug-and-play handler system for game-specific logic implementation.

### ✨ **Frontend Features**
- Real-time data visualization 🖼️ via the `/feed` endpoint.
- Fully customizable game state views styled with 🌀 **TailwindCSS**.
- Interfaces for data corrections, validation, and export options.

---

## 🛠️ **Installation Guide**

### 📋 **Prerequisites**
- 🟦 **Node.js** (16.x or later)
- 📦 **pnpm** (Install globally: `npm install -g pnpm`)

### 📥 **Steps to Install**
1. Clone the repository:
   ```bash
   git clone git@github.com:trentonyo/booki.git
   ```
2. Move into the project directory:
   ```bash
   cd booki
   ```
3. Install all dependencies:  
   ```bash
   pnpm install
   ```

4. 🖥️ **Run the Project**:
    - **Development Mode**:
      ```bash
      pnpm run dev
      ```
    - **Production**: 
      ```bash
      pnpm run build
      pnpm start
      ```

5. Open your browser and navigate to:  
   🌐 `http://localhost:3000`

---

## 🚀 **Key Commands**

| Task                  | Command                |
|-----------------------|------------------------|
| **Frontend Build**    | `pnpm run build:react` |
| **Backend Build**     | `pnpm run build:server`|
| **CSS Build**         | `pnpm run build:tailwind` |
| **Complete Build**    | `pnpm run build`       |
| **Development (React)**| `pnpm run start:react`|
| **Development (Backend)**| `pnpm run dev`      |
| **Start Production**  | `pnpm start`           |

---

## 📁 **Project Structure**

### 🗂️ **File Organization**
- 📂 `src/`: Main TypeScript/React files for both frontend and backend logic.
  - **Frontend Entry**: `src/index.tsx`
  - **Backend Entry**: `src/server.ts`
- 📂 `public/`: Static assets including game state schema JSONs.
- 📂 `dist/`: Compiled and bundled files after running `pnpm run build`.

### 🛠️ **Configuration Files**
- **`tsconfig.json`**: TypeScript compiler setup.
- **`tailwind.config.js`**: Tailwind theme and configuration.
- **Webpack**:
  - `webpack.config.js` (Frontend)
  - `webpack.server.config.js` (Backend)

---

## 🕹️ **Adding a New Game Configuration**

### 1️⃣ **Define the Game State Schema**
- Drop a JSON file into `public/stateModels` that outlines the game rules and required inputs.
- Example:
  ```json
  {
    "constraints": {
      "width": 1920,
      "height": 1080,
      "refreshInterval": 30
    },
    "gameState": [
      {"id": "score", "type": "ocr"},
      {"id": "timer", "type": "ocr"}
    ]
  }
  ```

---

### 2️⃣ **Implement Game State Handler**
- Create a new handler in `scripts/stateHandlers/` that maps raw OCR data into processed game logic.
- Example:
  ```typescript
  export default function handleProcessedGameState(processedGameState: any): any {
    // Custom logic to enhance and refine the input data
    return processedGameState;
  }
  ```

---

### 3️⃣ **Integrate Game View**
- Build a React component for visualization using **TailwindCSS** under `scripts/stateHandlers/`.
- Define its UI for showing timer, score, or predictions.

---

### 4️⃣ **Register New Schema**
- Add the schema and handler into the backend:
  - Register the schema in `server.ts`:
    ```typescript
    const gameStateModels = {
      "my_game": require("../public/stateModels/my_game.json"),
    };
    ```
  
---

## 🤔 **FAQ**

### ❓ **What happens if OCR fails or returns noisy data?**
- OCR results are cleaned through:
  1. Character masks (predefined OCR rules).
  2. Regular expressions in the **game state model**.
  3. **Custom handler logic** designed for the specific game.

### ❓ **Does the system support automated schema loading?**
- Not yet. All game schemas and handlers must be manually registered.

### ❓ **Can I use custom styles for React components?**
- TailwindCSS is recommended for consistency, but custom styles are allowed as long as they are maintained by the contributor.

For more FAQs, refer to [FAQ.md](./faq.md).

---

## 🛑 **Known Limitations**
- **OCR Performance**: CPU-intensive operations may slow down on lower spec machines. Cloud-based OCR services could mitigate this bottleneck in the future.
- **Testing**: CI/CD pipelines and Jest-based tests are not yet implemented.
- **Schema Validation**: Only enforced via TypeScript during runtime. Stronger validation tools are planned.

---

## 🌟 **Want to Contribute?**

We welcome your contributions! 🚀  
Follow our [Issue Template](./configurations.md#github-issue-template) if you'd like to submit a new game configuration.

### 📝 **How to Contribute**
1. Fork this repository.
2. Clone your forked repo:
   ```bash
   git clone git@github.com:<your-username>/booki.git
   ```
3. Create a new **feature** branch:
   ```bash
   git checkout -b my-new-feature
   ```
4. 👩‍💻 Write your code (and don't break anything... please).
5. Submit a PR with a clear explanation of your changes.

---

## 📋 **License**

_All rights reserved, Trenton Young 2024._

---

🌟 **We hope Booki helps empower your gaming experience with cutting-edge analysis tools. Let the wins come rolling in!** 🏆 🎮
