const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

app.post('/api/taiwan-mops', async (req, res) => {
    try {
        const payload = req.body;

        const response = await fetch('https://mops.twse.com.tw/mops/api/t05st10_ifrs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
                'Referer': 'https://mops.twse.com.tw/',
                'Origin': 'https://mops.twse.com.tw',
                'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7'
            },
            body: JSON.stringify(payload)
        });

        const rawText = await response.text();

        if (rawText.trim().startsWith('<')) {
            return res.status(403).json({
                error: 'Request blocked by MOPS firewall',
                details: 'Received HTML instead of JSON (likely CAPTCHA or rate limit)',
                sample: rawText.substring(0, 500)
            });
        }

        const data = JSON.parse(rawText);
        console.log('MOPS API Response:', JSON.stringify(data, null, 2)); // Log the response
        res.json(data);
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ error: 'Fetch failed', message: error.message });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`✅ Proxy server running at http://localhost:${PORT}`);
});