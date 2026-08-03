export default async function handler(req, res) {
    // Solo permitir POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { base64Image } = req.body;

        if (!base64Image) {
            return res.status(400).json({ error: 'Falta la imagen' });
        }

        // Preparamos los datos para enviar a OCR.Space (ocultando la clave al usuario)
        const params = new URLSearchParams();
        params.append('base64Image', base64Image);
        params.append('language', 'spa');
        params.append('isOverlayRequired', 'false');
        params.append('OCREngine', '2'); // Engine 2 es excelente para números
        params.append('scale', 'true');

        // Usamos la variable de entorno, si no existe usamos helloworld
        const apiKey = process.env.OCR_API_KEY || 'helloworld';

        const response = await fetch('https://api.ocr.space/parse/image', {
            method: 'POST',
            headers: {
                'apikey': apiKey,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params
        });

        const data = await response.json();
        
        // Devolvemos la respuesta al Frontend
        return res.status(200).json(data);

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: 'Error interno del servidor al procesar el OCR' });
    }
}
