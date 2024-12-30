# Frequently Asked Questions

## Design

### What is the relationship between the game handlers and the state models?

The path that data takes starts with the **state model.** This model is the schema that defines what kind of data to look for, where/how to look for it, and what to expect.

The **state model** is what the core system uses to extract data from the images provided of the game being played. The core system then hands off that raw data to the **handler** to transform it from _data_ into _information_ by applying logic and constraints to it.

The **handler** then extends the **state model** by adding data into it that has been validated. The **state model** is also the vessel through which inputs are passed throughout the system (since the OCR/image processing, handler, and input are all very loosely coupled).

### Is the system designed to treat game handlers as black boxes?

Yes, the `handleProcessedGameState()` function is a total black box. The writer of a game configuration is free to take the raw data from the core system and apply it as they wish to pass a `Processed Game State` to the next step as they see fit.

### What happens if the handler attempts to add invalid or malformed data back into the state model?

The data that is added _back in_ to the state model (a "Processed Game Model") is an object returned by the `handleProcessedGameState()` function. That data is then passed to the `/data` endpoint of the API to be used for validating data (and the persistence layer in the future).  

### What is the relationship between the **core system**, the **handler**, and **inputs**?

**The core system**, as it is referred to, consists of the API, the image processing, and the OCR. 

**The handler**, and its associated **game state model** are often referred to as "configurations" or "games" and are the schema by which data is defined. 

**Inputs** may refer to the interactions with the **handler** afforded by the frontend interface or the screen images provided to the API.

An overview of the logical path that the user and/or their data takes can be represented as:

1. The user "starts the camera" by allowing permissions and **selects a game model**.
2. The user begins sending a feed of images to the **API** under the selected **game model**. (image data + game state model -> core system) 
3. The **API** processes the image and runs OCR based on the **game state model**, sending back data extracted from the image as defined by the **game state model**.
4. The raw data returned from the **API** is passed into the **game state HANDLER**, which may update the frontend or return some data to the **API**.
5. (optional) The **game state handler** may prompt the **API** to log some data, the image, etc.

## Backend

### How does the Express server handle OCR/Image processing operations within the API?

First, an image is POSTed to the `/game/:model` endpoint and the `:model` is looked up in the registry to select the appropriate handler. 
Then, the image is passed to the `processGameFrame()` function which handles all image processing, OCR, and other tasks asynchronously and with worker threads as necessary. The result is then returned from the API as a JSON response.

### Are there specific limitations around using external libraries or custom styles in React components, or must everything strictly comply with Tailwind for styling?

Strict Tailwind compliance is not required, sometimes the easiest option for conveying meaning comes from colors pulled from the raw data for example. The biggest caveat is that any additional libraries or inline CSS that a maintainer introduces to a game configuration is their responsibility to maintain.

### What happens if the OCR process fails or produces noisy/dirty data?

There are a few gates thorough which OCR data passes, and they are (in order of appearance):

1. The character mask passed to Tesseract.js (characters which the OCR engine will even try to recognize)
2. (optional) A regular expression that is defined at the **game state model**.
3. (optional) Logical handling within the **game state handler**.

## Configuration Handling

### Are game state models validated against a schema at runtime?

Yes, this schema is technically just a TypeScript type defined in `processGameFrame.ts`.

### What are the consequences of providing invalid or incomplete game state configurations?

> [!WARNING]
> Great question. This needs to be investigated and summarily engineered with intent. Maybe consider checking at build, throwing errors at registration?

### Does the backend automatically load and apply new game models and handlers?

No, manual registration is required. See [configurations](configurations.md).

New game configurations are not so light in design or implementation as to be thrown in on the fly. Developing a state handler can take quite a while, so it is not expected of the system to take on new configurations rapidly.

### How are valid input types defined in the JSON files? What happens if an input type is not currently supported?

Input types are explicitly defined in each landmark's `type` field. Any unsupported types are skipped (they are not currently logged anywhere).

## Technical Workflows

### How does the build process ensure compatibility between server-side code and client-side React components?

The recommendation for a successful build is to use 

```shell
pnpm run build
```

which is maintained to perform the build steps in the appropriate order. See [package.json](package.json) for the latest build order.

### If a new feature involves adding both a React component and backend logic, where should a new developer start?

This is generally a matter of philosophy in this project, but the original author has had success in starting with the backend and moving to the frontend.

## Running Locally

### During development, do the frontend and backend environments need to be built separately and run parallel, or is there a recommended "watch mode" to simplify iterative code changes?

> [!WARNING]
> Another great question. _Help wanted._ We desperately need a watch mode, as I've come around to learn that TypeScript is a bit of a bear for iterative monitoring without using a higher level framework. Since this project relies so much on microservices and webpack, it has presented a challenge in such a "watch mode" that is sorely needed.

## TypeScript and React

### In what cases is it acceptable to ignore TypeScript type definitions (e.g. using `any`)?

ONLY in situations whereby data is passed between transport layers, e.g. to/from the API, reading a file, or any other medium other than memory. 

In addition, it is best practice to coerce this into a type as soon as possible with robust error handling as these are major points of failure.

### Should all Game State View components be written as functional components, or are there cases where class components are preferred?

> [!WARNING]
> Yet another great question. If anyone well-versed in React has a better answer than this, please feel free to contribute.

`GameStateView` components should follow the form defined by the first configuration for "The Finals: Ranked (elimination rounds)" for consistency.

## Known Limitations/Future Work

### How will the planned persistence layer (Prisma) affect the way game state models and handlers operate?

The persistence layer is planned to be _mostly_ implemented downstream of the state handler in that the processed game data will be what is persisted, as it includes the raw data as well. The aggregation of this data is not necessarily intended to be pinged for live data, but it is technically possible considering the handler is a black box written in TypeScript.

### Are there plans to introduce unit/integration tests?

Yes, likely will be limited to Jest testing of the core system. Front end testing is not planned.

Cron end-to-end testing also planned as the system is technically indeterminate so observed accuracy will be desirable.

### How are developers currently expected to test changes manually in the absence of automated testing?

> [!WARNING]
> Well... mostly by faith, trust, and pixie dust.

### Should game state handlers be tested?

Yes, and similar to other questions related to the game state handlers, it is ultimately that configuration's maintainer's responsibility.

## Performance Concerns

### The OCR processing with Tesseract.js is said to be CPU-intensive, are there plans to offload this for better performance?

Yes, this is one of the major points of the core system that will need to be addressed. At present, no work has been done on this; but, the loosely-coupled nature of the core system will allow for this improvement at any point in development.

## Debugging and Error Handling

### When a game state handler fails, how is feedback provided to developers?

Currently, feedback is all limited to the browser console as the game state handler is run locally. Persistent logging would be desirable, but as with all things regarding the game state handler it is ultimately up to the maintainer.

### Are there specific tools or libraries integrated into the project to aid in debugging?

> [!WARNING]
> See "Running Locally > During development..."

## Collaboration and Future-Proofing

### The documentation mentions "configuration-driven development" as a core design principle. Are there any specific guidelines for maintaining compatibility when collaborating as part of a larger team or with external contributors?

See "TypeScript and React > In what case is it..." for the best answer to this question. As long as the system can consistently handle existing game state models (pending automated testing) and all failure points (edges between microservices) are well-tested and robust, we should be fine!

### What steps are recommended for reviewing and maintaining documentation in the wiki?

Always refer to the style of other documents and do your best to ask questions. Though, the original author is of the persuasion that a higher level of coverage by mediocre documentation is better than missing important coverage pending gorgeous docs.

### When adding new features outside of the scope of the current configuration system (i.e. new landmark types), how should developers plan and structure their changes?

In an open room with a quorum. New landmarks should only be added when designed and fully vetted by all maintainers. This is because the loose coupling between the core system and the game state handlers necessitates thoroughly investigating any changes to the schema.
