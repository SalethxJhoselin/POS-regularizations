export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const wabiUrl = process.env.WABI_SUPPORT_URL;
        if (!wabiUrl) {
            return res.status(500).json({ error: 'Falta configurar WABI_SUPPORT_URL en Vercel' });
        }

        // Recuperar el Token de Autorización que nos manda nuestra propia web
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'No se envió el token de autorización' });
        }

        const response = await fetch(wabiUrl, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': authHeader
            },
            body: JSON.stringify(req.body)
        });

        const data = await response.json();
        return res.status(response.status).json(data);
    } catch (error) {
        console.error('Support Proxy Error:', error);
        return res.status(500).json({ error: 'Error de conexión con Wabi' });
    }
}
