import {StateModel} from "../ocr";

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
            .then(data => {
                for (const datum of data) {
                    let potential: string = (datum.text as string).trim()
                    // If there is a regex validator set up, use it
                    if (regexValidators[datum.name]) {
                        const result = regexValidators[datum.name].exec(potential);

                        if (result) {
                            potential = result[0]
                        }
                        else {
                            potential = document.getElementById(datum.name)!.innerHTML
                        }
                    }

                    document.getElementById(datum.name)!.innerHTML = potential;
                }
            })
            .catch(error => console.error('Error:', error));

        setTimeout(() => {
            requestAnimationFrame(captureFrame);
        }, constraints.performance.requestDelay);
    }

    captureFrame();
}
