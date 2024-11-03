const video = document.getElementById('video');
const output = document.getElementById('output');
const startButton = document.getElementById('start');

async function setupCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
    });
    video.srcObject = stream;

    return new Promise((resolve) => {
        video.onloadedmetadata = () => {
            resolve(video);
        };
    });
}

function captureImage() {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
}

async function recognizeText(imageData) {
    const result = await Tesseract.recognize(
        imageData,
        'eng', // Cambia el idioma si es necesario
        {
            logger: info => console.log(info) // Opcional para ver progreso
        }
    );
    return result.data.text;
}

async function startRecognition() {
    output.textContent = "Reconociendo texto...";
    while (true) {
        const imageData = captureImage();
        const text = await recognizeText(imageData);
        
        output.textContent = text; // Muestra el texto reconocido

        await new Promise(resolve => setTimeout(resolve, 2000)); // Espera 2 segundos antes de la próxima captura
    }
}

startButton.addEventListener('click', startRecognition);

async function main() {
    await setupCamera();
    video.play();
}

main();
