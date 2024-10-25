import {StateModel, LandMark} from "../ocr";
import {Rectangle} from "tesseract.js";
import handleProcessedGameState from "./stateModelHandler_thefinals_ranked";

export async function startCamera(modelName: string, stateModel: StateModel): Promise<void> {
    const constraints = {
        video: {
            width: stateModel.constraints.width,
            height: stateModel.constraints.height
        },
        performance: {
            requestDelay: stateModel.constraints.refreshEvery
        }
    };

    const regexValidators: { [key: string]: RegExp } = {};
    let minX = stateModel.constraints.width;
    let minY = stateModel.constraints.height;
    let maxX = 0;
    let maxY = 0;
    let debugRects: Rectangle[] = [];

    for (const landmark of stateModel.gameState) {
        // Calculate minimum bounding box
        minX = Math.min(minX, landmark.rect.left)
        minY = Math.min(minY, landmark.rect.top)

        maxX = Math.max(maxX, landmark.rect.left + landmark.rect.width)
        maxY = Math.max(maxY, landmark.rect.top + landmark.rect.height)

        // Collect valid regex
        if (landmark.validRegex) {
            regexValidators[landmark.name] = new RegExp(landmark.validRegex);
        }

        // Collect rects
        debugRects.push(landmark.rect)
    }
    // Normalize maxX/maxY
    maxX -= minX;
    maxY -= minY;

    const stream = await navigator.mediaDevices.getDisplayMedia(constraints);
    const video = document.getElementById('video') as HTMLVideoElement;
    video.srcObject = stream;

    // Optional: Display the video stream without sending to the server
    video.play();

    // Capture frames from the video stream and send to the server
    const canvas = document.createElement('canvas');
    canvas.width = maxX;
    canvas.height = maxY;
    const ctx = canvas.getContext('2d');

    function captureFrame() {
        ctx!.drawImage(video, minX, minY, maxX, maxY, 0, 0, maxX, maxY);

        // Draw bounding boxes for each landmark TODO Debug
        // /*
        ctx!.strokeStyle = "#ff0059"
        for (const debugRect of debugRects) {
            ctx!.strokeRect(debugRect.left - minX, debugRect.top - minY, debugRect.width, debugRect.height);
        }
        // */

        const dataURL = canvas.toDataURL('image/png');

        fetch(`http://localhost:3000/game/${modelName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image: dataURL,
                minX: minX,
                minY: minY
            })
        }).then(response => response.json())
            .then(async result => {
                const processedStateModel = result as StateModel;

                /**
                 * Validate the processed stateModel that the API responds with.
                 */
                if (!processedStateModel) {
                    console.error("Failed to process state model from response.", result);
                    return;
                }

                for (const datum of processedStateModel.gameState) {
                    let potential: string | undefined = (datum.VALUE as string).trim()
                    // If there is a regex validator set up, use it
                    if (regexValidators[datum.name]) {
                        const result = regexValidators[datum.name].exec(potential);

                        if (result) {
                            potential = result[0];
                        } else {
                            potential = undefined;
                        }
                    }

                    datum.VALUE = potential;
                }

                // /// TODO From here on, the processed Game State should be used with a specialized per-game script
                // for (const landMark of processedStateModel.gameState) {
                //     document.getElementById(landMark.name)!.innerHTML = landMark.VALUE || document.getElementById(landMark.name)!.innerHTML;
                // }

                // Load and execute the specialized per-game script
                try {
                    const scriptModule = await import(`./stateModelHandler_${modelName}`);
                    if (scriptModule && typeof scriptModule.handleProcessedGameState === 'function') {
                        scriptModule.handleProcessedGameState(processedStateModel);
                    } else {
                        throw new Error(`Specialized script for ${modelName} does not have a handleGameState function.`);
                    }
                } catch (error) {
                    console.warn(`Falling back to default handler because specialized script for ${modelName} could not be loaded:`, error);
                    const defaultModule = await import('./stateModelHandler_default');
                    defaultModule.default(processedStateModel);
                }
            })
            .catch(error => console.error('Error:', error));

        setTimeout(() => {
            requestAnimationFrame(captureFrame);
        }, constraints.performance.requestDelay);
    }

    captureFrame();
}
