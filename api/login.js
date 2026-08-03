export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const wabiUrl = process.env.WABI_LOGIN_URL;
        if (!wabiUrl) {
            return res.status(500).json({ error: 'Falta configurar WABI_LOGIN_URL en Vercel' });
        }

        const response = await fetch(wabiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });

        const data = await response.json();
        return res.status(response.status).json(data);
    } catch (error) {
        console.error('Login Proxy Error:', error);
        return res.status(500).json({ error: 'Error de conexión con Wabi' });
    }
}
