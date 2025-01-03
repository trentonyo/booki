# Frequently Asked Questions

## Design

### What is the relationship between the game handlers and the state models?

The path that data takes starts with the **state model**. This model is the schema that defines what kind of data to look for, where/how to look for it, and what to expect.

The **state model** is used by the core system to extract data from the images provided of the game being played. The resulting raw data is handed to the **handler**, which applies validation or transformations, turning the "raw data" into actionable "information".

This separation allows each part of the system to focus on its own role: **state models** define inputs while **handlers** act upon the processed outputs.

---

### Is the system designed to treat game handlers as black boxes?

Yes, the `handleProcessedGameState()` function is entirely a black box. This provides flexibility for developers defining game configurations. They can handle raw data any way they see fit, as long as the handler outputs a `Processed Game State` for downstream use.

---

### What is the relationship between the **core system**, the **handler**, and **inputs**?

- **Core system**: Refers to the API (Express server), image processing, and OCR engine.
- **Handler**: The functional logic that transforms OCR-processed data according to the rules defined by the state model.
- **Inputs**: May refer to screen images (provided via API) or additional runtime interactions provided by the frontend interface.

Logical flow:
1. The user selects a game model and starts the camera feed.
2. Images are sent to the API, bound to the selected configuration.
3. OCR processes images according to model-defined rules, extracting raw data.
4. The handler transforms OCR output into verified information, updates the frontend, or sends further data to the backend.
5. Optionally, the handler performs additional actions, like logging or image saving.

---

### What happens if the handler tries to add invalid data to the state model?

The returned "processed game model" from the handler is passed to APIs like `/data`. Validation layers (e.g., schemas) help ensure correctness, but this responsibility is shared between the handler developer and the system's constraints.

If the state model fails validation, downstream features expecting valid data won't function correctly.

---

## Backend

### How does the Express server handle OCR/Image processing operations?

When an image is POSTed to `/game/:model`, the server looks up the appropriate model and handler based on the provided `:model`. The image is passed to the `processGameFrame()` function, which:
1. Processes the image asynchronously.
2. Invokes the OCR engine (Tesseract.js) with constraints like mask filters or regular expressions.
3. Returns extracted data as JSON for further frontend or API use.

---

### What happens if the OCR process fails or produces noisy data?

Three layers of filtering aim to prevent invalid or noisy results:
1. **OCR mask**: Restricts which characters can be matched by Tesseract.
2. **Game state model constraints**: Optionally define patterns like regex validation.
3. **Handler logic**: Validates and refines extracted data before it’s incorporated into the processed game state.

However, errors are NOT logged, and the handler must account for possible incomplete or noisy data.

---

### Are game state models validated against a schema?

Yes, game state models are validated against TypeScript definitions and runtime checks in the server. These schemas ensure the models are correctly configured to avoid runtime failures.

---

## Configuration Handling

### Does the system auto-load new game models or handlers upon addition?

No, new game configurations require **manual registration** within the backend code. This design ensures maintainers explicitly integrate and test new models before deployment.

---

### How are valid inputs defined in configurations? What happens to unsupported types?

Input types are defined within the `type` field of each JSON-defined landmark. Unsupported types are currently skipped, though they might be logged in future iterations.

---

## Technical Workflows

### How does the build process ensure compatibility?

Use:
```shell
pnpm run build
```
This ensures backend and frontend builds execute in the proper order per `package.json` specifications.

For iterative development, separate builds are usually required:
- Run the backend (e.g., via `ts-node-dev`).
- Start the frontend using your local dev server.

> [!WARNING]
> Until this becomes the norm for developers, it can not be considered a stable workflow

---

### If adding both a frontend component and backend logic, where should a developer start?

Best practices suggest starting with the **backend** since data models and APIs define the foundations of the feature logic. Once APIs are confirmed functional, the connected frontend UI can be layered over it.

---

## TypeScript and React

### When is it acceptable to use `any` in TypeScript?

Avoid using `any` unless handling **transported data** (e.g., API responses or file reads) where type information may be unavailable. Quickly cast `any` data into a defined type for safety.

---

### Should Game State View components use functional or class components?

Functional components are preferred for consistency and compatibility with modern React hooks. The initial `GameStateView` structures (e.g., "The Finals: Ranked (elimination)") provide a good baseline.

---

## Known Limitations & Future Work

### Will a planned persistence layer (Prisma) impact how handlers operate?

Yes, Prisma will store processed game states (including raw OCR outputs). This move will allow historical analysis of game data while keeping live processing lightweight. All persistence logic will integrate seamlessly with handlers' outputs without affecting their internal processing rules.

---

### Are automated tests planned at this stage?

Yes, primarily via Jest for unit testing backend logic like OCR or handler transformations. End-to-end integration tests may follow for workflow validation. Frontend coverage will not be prioritized initially.

---

## Debugging & Error Handling

### When a game handler fails, how is feedback provided?

Currently, failures are logged to the browser console during development. Persistent error logging would be desirable for production environments, depending on future enhancements.

---

## Collaboration & Future-Proofing

### What are guidelines for maintaining compatibility during team collaboration?

Adhere to:
1. Established TypeScript types and schemas.
2. Correct handling of transport layer data as early as possible post-fetch or pre-send.
3. Design reviews for significant changes to core configurations or schemas, ensuring alignment across teams.

---

### How should developers approach adding new landmarks or input types?

Additions should be discussed and vetted with maintainers to assess impact. This cautious process ensures stable integration with existing configurations.