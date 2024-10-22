export async function startCamera(modelName: string, width: number, height: number, requestDelay: number): Promise<void> {
    const constraints = {
        video: {
            width: width,
            height: height
        },
        performance: {
            requestDelay: requestDelay
        }
    };

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
                (document.getElementById('first-place') as HTMLElement).innerText = data[0].text;
                (document.getElementById('second-place') as HTMLElement).innerText = data[1].text;
                (document.getElementById('third-place') as HTMLElement).innerText = data[2].text;
                (document.getElementById('fourth-place') as HTMLElement).innerText = data[3].text;
                (document.getElementById('game-time') as HTMLElement).innerText = data[4].text;
            })
            .catch(error => console.error('Error:', error));

        setTimeout(() => {
            requestAnimationFrame(captureFrame);
        }, constraints.performance.requestDelay);
    }

    captureFrame();
}

// startCamera(2560, 1440, 1500)
