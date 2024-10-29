import {StateModel, LandMarkOCR} from "./processGameFrame";
import {Rectangle} from "tesseract.js";

//  IMPORTANT! See /server.ts for stateModels
const handlers: { [modelName: string]: (processedGameState: StateModel) => void } = {
    "default": require("./stateHandlers/default").default,
    "thefinals_ranked": require("./stateHandlers/thefinals_ranked").default,
}

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

        // TODO debug
        // console.warn(landmark.name)

        // Collect valid regex
        try {
            const landMarkOCR = landmark as LandMarkOCR;

            if (landMarkOCR.validRegex) {
                regexValidators[landMarkOCR.name] = new RegExp(landMarkOCR.validRegex);
            }
        } catch { }


        // Collect rects
        debugRects.push(landmark.rect)
    }
    // Normalize maxX/maxY
    maxX -= minX;
    maxY -= minY;

    // TODO debug
    // console.log(`minX: ${minX} minY: ${minY} maxX: ${maxX} maxY: ${maxY}`);

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

                // Load and execute the specialized per-game script
                try {
                    handlers[modelName](processedStateModel);
                } catch (error) {
                    console.warn(`Falling back to default handler because specialized script for ${modelName} could not be loaded:`, error);
                    handlers["default"](processedStateModel);
                }
            })
            .catch(error => console.error('Error:', error));

        setTimeout(() => {
            requestAnimationFrame(captureFrame);
        }, constraints.performance.requestDelay);
    }

    captureFrame();
}
