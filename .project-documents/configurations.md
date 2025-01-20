### GitHub Issue Template

```markdown

### Add New Game Configuration: [Game Name]

#### Tasks

- [ ] **Create a New Game State JSON Configuration**
    - [ ] Define the game rules, allowed inputs, and constraints.
    - [ ] Save the file under `public/stateModels`.

- [ ] **Implement the Game-Specific State Handler**
    - [ ] Create a new handler in the `scripts/stateHandlers` folder. 
      ```typescript 
      export default function handleProcessedGameState(processedGameState: StateModel): HandledGameState
      ```
    - [ ] Ensure the handler processes game state data properly.

- [ ] **Build the Game State View**
    - [ ] Create a React component for the new game under `scripts/stateHandlers`.
      ```typescript 
      export default function GameStateView(dataFeed: any)
      ```
    - [ ] Design UI components to display real-time data for the new game.
    - [ ] Style the UI using TailwindCSS (or conventional CSS, ONLY as-needed).

- [ ] **Register the Game State Handler**
    - [ ] Update the `scripts/feed.ts` file to include the new handler.
    - [ ] Map the new handler to the game state model.

- [ ] **Integrate with Server Logic**
    - [ ] Add the new game to `gameStateModels` in `server.ts`.
    - [ ] Ensure the backend routes are functional for the new game.

- [ ] **Adjust the Client-Side Feed**
    - [ ] Update `feedClientComponent.tsx` to map the model to the new handler dynamically.
    - [ ] Test the feed initialization with the game's configuration.

- [ ] **Debug and Test Integration**
    - [ ] Test with real-time data and ensure state updates work properly.
    - [ ] Adjust hardcoded values specific to the game (e.g., teams, rules).

```

---

### **Step-by-Step Guide**

#### 1. **Create a New Game State JSON Configuration**
- Define a new JSON file representing the game state and mechanics in `public/stateModels`.
- Example file structure:
  ```json
  {
    "constraints": {
      "width": 1920,
      "height": 1080,
      "refreshInterval": 30,
      "displayName": "The Finals: Ranked"
    },
    "gameState": [
      {"id": "cash_counter", "type": "ocr"},
      {"id": "timer", "type": "ocr"},
      {"id": "team_1", "type": "color"}
    ],
    "inputs": [
      {"id": "team_cash_input", "type": "number", "description": "Cash updates per team"}
    ]
  }
  ```

#### 2. **Implement the Game-Specific State Handler**
- Add a new state handler file in the `scripts/stateHandlers` directory, named after your game (e.g., `thefinals_ranked.ts`).
- Ensure the following:
    - Functions to process game state based on inputs (e.g., OCR data, color data).
    - Export `handleProcessedGameState` as the **default export**, allowing core systems to invoke your handler.
      ```typescript 
      export default function handleProcessedGameState(processedGameState: StateModel): HandledGameState
      ```
    - Include necessary custom logic for game rules. This part is completely up to the developer of this configuration, the system treats this function as a black box. Some tools are provided in `stateHandlerUtil.ts` to assist in handling live data. 

#### 3. **Build the Game State View**
- Create a new React component file for the game in the same folder as the handler, named as `<game_name>_view.tsx` (e.g., `thefinals_ranked_view.tsx`).
- Export your function as `GameStateView`
- Design the UI for interacting with the game's state. For a few suggestions:
    - Use dynamic components like text boxes, sliders, or color-coded displays for team information.
    - Use TailwindCSS for styling consistent with other components.
- Example component structure:
  ```tsx
  import React from "react";
      export default function GameStateView(dataFeed: any)
      return (
          <div className="game-state-view">
              {/* Example: Timer Display */}
              <h1 className="text-xl">Game Timer: {gameState.timer || "N/A"}</h1>
              {/* Example: Team Slots */}
              <div className="team-slots">
                  {gameState.teams.map((team) => (
                      <div key={team.name} className={`team-slot ${team.color}`}>
                          <p>{team.name}: ${team.cash}</p>
                      </div>
                  ))}
              </div>
          </div>
      );
  }
  ```

#### 4. **Register the Game State Handler**
- Open `scripts/feed.ts` and register the new game handler:
  ```typescript
  import theFinalsRankedHandler from "./stateHandlers/thefinals_ranked";
  const handlers = {
      "thefinals_ranked": theFinalsRankedHandler,
  };
  ```

#### 5. **Integrate with Server Logic**
- In `server.ts`, add the new game model to the `gameStateModels` map:
  ```typescript
  const gameStateModels = {
      "thefinals_ranked": require("../public/stateModels/thefinals_ranked.json"),
  };
  ```
- Optionally, enhance any helper methods (e.g., adjusting landmark checks or pre-processing inputs).

#### 6. **Adjust the Client-Side Feed**
- Open `feedClientComponent.tsx` and map your game model to the correct handler:
  ```typescript
  import TheFinalsRankedView from "./stateHandlers/thefinals_ranked_view";

  const handlers = {
      "thefinals_ranked": TheFinalsRankedView,
  };
  ```

#### 7. **Debug and Test Integration**
- Test with live game inputs, validating the following:
    - Correct team names, cash updates, and penalty applications.
    - Timer synchronization.
    - Deposit mechanics and user input updates.

---

With these steps, you should be able to successfully implement and integrate a new game configuration.
