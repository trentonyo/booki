# Technical Notes

This file contains important technical details for the development workflow, key commands, known limitations, and best practices for the project.

---

## Key Workflows

### Adding a New Script

When adding a new script, ensure the following steps are followed:
1. **Update `webpack.config.js`:**
    - Add a new entry point for your script, for example:
      ```javascript
      entry: {
        newScript: './src/newScript.ts',
      },
      ```
    - Ensure proper output configuration in `output` to generate a distributable bundle.
2. **Install Dependencies (if needed):**
    - Use `pnpm` to add any required libraries:
      ```bash
      pnpm install <dependency-name>
      ```
3. **Update `package.json`:**
    - Register a new script in the `"scripts"` section to build or run the script:
      ```json
      "build:newScript": "webpack --config webpack.config.js",
      ```

### Building and Starting the Server

1. **Build Order**:
    - Ensure all components are built in the following order:
        1. **Tailwind CSS**:
           ```bash
           pnpm run build:tailwind
           ```
        2. **Frontend:**
           ```bash
           pnpm run build:react
           ```
        3. **Backend**:
           ```bash
           pnpm run build:server
           ```
2. **Start the Server**:
    - Use the following command to start the backend server after all builds are complete:
      ```bash
      pnpm start
      ```
    - Alternatively, during development, you can run the server in watch mode:
      ```bash
      pnpm run dev
      ```

   **Note:** The frontend and backend servers must be run in parallel during development.

---

## TypeScript Compiler Considerations

1. **Module Export Modes**:
    - The project currently supports `ES6` modules. Avoid using legacy module systems like `CommonJS` to maintain compatibility with the rest of the application.
    - Ensure `tsconfig.json` is set:
      ```json
      {
        "compilerOptions": {
          "module": "ESNext",
          "target": "ES6"
        }
      }
      ```

2. **Strict Typing**:
    - This project enforces strict TypeScript options. Avoid unchecked `any` types or implicit `any`.
    - Use `@ts-ignore` only when absolutely necessary, ensuring there's a related comment explaining its use.

3. **React Considerations**:
    - Always use TypeScript types for `props` and `state` in React components:
      ```typescript
      interface MyComponentProps {
        title: string;
      }
 
      const MyComponent: React.FC<MyComponentProps> = ({ title }) => {
        return <h1>{title}</h1>;
      };
      ```
    - Use `React.forwardRef` and `React.memo` where applicable for optimizing performance.

---

## Known Limitations

1. **Pending Implementation:**
    - **Database Persistence Layer**: Currently, no database is used. Models are loaded dynamically from the schema JSON files. A future version will integrate a database.
    - **Testing Framework**: No automated unit or integration tests exist as of now.

2. **Browser Compatibility**:
    - The project is tested in modern browsers (Chromium-based and Firefox). Older browsers like Internet Explorer are unsupported.

3. **Performance of OCR**:
    - Tesseract.js is CPU intensive and may lag with large or complex images. Consider offloading processing to a worker thread in high concurrency scenarios.

---

## Key Commands (Summary)

### Build Commands
- **Frontend React Build**: `pnpm run build:react`
- **Backend Server Build**: `pnpm run build:server`
- **CSS Build**: `pnpm run build:tailwind`
- **Full Build (All)**: `pnpm run build`

### Development Commands
- **Frontend Dev Server**: `pnpm run start:react`
- **Backend Dev Server**: `pnpm run dev`

### Starting the Application
- **Production Mode**: `pnpm start`

---

## Best Practices

1. **Configuration-driven Development**:
    - Ensure any changes to the schema are validated and compatible with existing interfaces.
    - Test new schema files thoroughly in both frontend and backend.

2. **Code Splitting**:
    - Use Webpack's `optimization.splitChunks` feature to improve frontend performance and reduce initial load times.

3. **Environment Variables**:
    - Use a `.env` file to manage credentials or secrets. Never hardcode these values in the source code:
      ```
      API_KEY=<your-api-key>
      ```

---

## Future Improvements

- Document additional steps once the database persistence layer and testing framework are implemented.
- Consider adding Docker support to streamline deployment and environment consistency.