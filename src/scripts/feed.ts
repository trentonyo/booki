import {LandMarkOCR, StateModel, HandledGameState} from "./processGameFrame";
import {Rectangle} from "tesseract.js";

//  IMPORTANT! See /server.ts for stateModels
const handlers: { [modelName: string]: (processedGameState: StateModel) => HandledGameState } = {
    "default": require("./stateHandlers/default").default,
    "thefinals_ranked": require("./stateHandlers/thefinals_ranked").default,
}

function isLandmarkWithValidRegex(landmark: any): landmark is LandMarkOCR {
    return landmark.hasOwnProperty('validRegex');
}

export async function startCamera(modelName: string, stateModel: StateModel, drawLandmarkBounds = false): Promise<void> {
    let handledGameState: HandledGameState = null;

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
        if (isLandmarkWithValidRegex(landmark) && landmark.validRegex !== "") {
            regexValidators[landmark.name] = new RegExp(landmark.validRegex!);
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

    function captureFrameAndRunHandler() {
        ctx!.drawImage(video, minX, minY, maxX, maxY, 0, 0, maxX, maxY);

        // Draw bounding boxes for each landmark
        if (drawLandmarkBounds) {
            ctx!.strokeStyle = "#ff0059"
            for (const debugRect of debugRects) {
                ctx!.strokeRect(debugRect.left - minX, debugRect.top - minY, debugRect.width, debugRect.height);
            }
        }

        const dataURL = canvas.toDataURL('image/png');

        fetch(`http://localhost:3000/game/${modelName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image: dataURL,
                minX: minX,
                minY: minY,
                captureFrame: handledGameState,
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
                    let potential: string | undefined
                    try {
                        potential = (datum.VALUE as string).trim()
                    } catch (e) {
                        console.warn("Still waiting for data, approximately 30s...")
                        return;
                    }
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

                // Collect controls
                const controls = document.querySelector("#controls") as HTMLFormElement;
                if (controls && processedStateModel.inputs) {
                    for (const key in processedStateModel.inputs) {
                        const input = controls.elements.namedItem(key) as HTMLInputElement;
                        if (input) {
                            processedStateModel.inputs[key] = input.type === "checkbox" ? input.checked : input.value;
                        }
                    }
                }

                // Load and execute the specialized per-game script
                try {
                    handledGameState = handlers[modelName](processedStateModel);
                } catch (error) {
                    console.warn(`Falling back to default handler because specialized script for ${modelName} could not be run:`, error);
                    handledGameState = handlers["default"](processedStateModel);
                }

                if (handledGameState) {
                    fetch(`http://localhost:3000/api/data/${modelName}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            image: dataURL,
                            handledGameState: handledGameState
                        })
                    })
                        .catch(error => console.error('Error logging data:', error));
                }
            })
            .catch(error => console.error('Error:', error));

        setTimeout(() => {
            requestAnimationFrame(captureFrameAndRunHandler);
        }, constraints.performance.requestDelay);
    }

    captureFrameAndRunHandler();
}
