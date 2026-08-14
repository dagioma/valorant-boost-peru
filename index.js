const functions = require('firebase-functions');
const axios = require('axios');
const crypto = require('crypto');

// TUS CLAVES DE ZADARMA
const ZADARMA_KEY = '3697eed869b645cf491c';
const ZADARMA_SECRET = 'ccbdd6b04447a2ad673a';

exports.getZadarmaWebRTCKey = functions.https.onCall(async (data, context) => {
    // 1. Verificamos que el usuario haya iniciado sesión en el CRM
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Debes iniciar sesión para hacer llamadas.');
    }

    // 2. Obtenemos la extensión que solicita el HTML
    const sipId = data.sipId; 
    if (!sipId) {
        throw new functions.https.HttpsError('invalid-argument', 'Se requiere el sipId.');
    }

    const methodUrl = '/v1/webrtc/get_key/';
    const params = { sip: sipId }; 
    const paramsStr = new URLSearchParams(params).toString();

    // 3. Generamos la firma de seguridad (Algoritmo requerido por Zadarma)
    const md5Str = crypto.createHash('md5').update(paramsStr).digest('hex');
    const dataToSign = methodUrl + paramsStr + md5Str;
    const signature = crypto.createHmac('sha1', ZADARMA_SECRET).update(dataToSign).digest('base64');

    // 4. Pedimos la llave a Zadarma
    try {
        const response = await axios.get(`https://api.zadarma.com${methodUrl}?${paramsStr}`, {
            headers: {
                'Authorization': `${ZADARMA_KEY}:${signature}`
            }
        });

        if (response.data && response.data.status === 'success') {
            return {
                status: 'success',
                key: response.data.key
            };
        } else {
            console.error("Zadarma API Error:", response.data);
            throw new functions.https.HttpsError('internal', 'Zadarma devolvió un error.', response.data);
        }

    } catch (error) {
        console.error("Network/Axios Error:", error.message);
        throw new functions.https.HttpsError('internal', 'Error al conectar con Zadarma.');
    }
});
