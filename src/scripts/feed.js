export async function startCamera(width, height, requestDelay) {
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
    const video = document.getElementById('video');
    video.srcObject = stream;

    // Optional: Display the video stream without sending to the server
    video.play();

    // Capture frames from the video stream and send to the server
    const canvas = document.createElement('canvas');
    canvas.width = constraints.video.width;
    canvas.height = constraints.video.height;
    const ctx = canvas.getContext('2d');

    function captureFrame() {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataURL = canvas.toDataURL('image/png');

        fetch('http://localhost:3000/game/thefinals_ranked', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image: dataURL
            })
        }).then(response => response.json())
            .then(data => {
                document.getElementById('first-place').innerText = data[0].text;
                document.getElementById('second-place').innerText = data[1].text;
                document.getElementById('third-place').innerText = data[2].text;
                document.getElementById('fourth-place').innerText = data[3].text;
                document.getElementById('game-time').innerText = data[4].text;
            })
            .catch(error => console.error('Error:', error));

        setTimeout(() => {
            requestAnimationFrame(captureFrame);
        }, constraints.performance.requestDelay);
    }

    captureFrame();
}

startCamera(2560, 1440, 1500)
