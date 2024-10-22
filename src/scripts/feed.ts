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

    for (const landmark of stateModel.gameState) {
        if (landmark.validRegex) {
            regexValidators[landmark.name] = new RegExp(landmark.validRegex);
        }
    }
    
    const stream = await navigator.mediaDevices.getDisplayMedia(constraints);
    const video = document.getElementById('video') as HTMLVideoElement;
    video.srcObject = stream;

    // Optional: Display the video stream without sending to the server
    video.play();

    // Capture frames from the video stream and send to the server
    const canvas = document.createElement('canvas');
    canvas.width = constraints.video.width as number;
    canvas.height = constraints.video.height as number;
    const ctx = canvas.getContext('2d');

    function captureFrame() {
        ctx!.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataURL = canvas.toDataURL('image/png');

        fetch(`http://localhost:3000/game/${modelName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image: dataURL
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
