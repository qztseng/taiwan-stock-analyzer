
const fetch = require('node-fetch');

async function testNewMopsPayload() {
    const code = '2330';
    const year = 2024;
    const month = 1;

    console.log(`[INFO] Testing MOPS API with new payload for company ${code}, date ${year}-${month}`);

    const mopsPayload = {
        companyId: code,
        dataType: '2',
        month: String(month),
        year: String(year - 1911),
        subsidiaryCompanyId: ''
    };

    console.log('[INFO] Sending request with body:', JSON.stringify(mopsPayload, null, 2));

    try {
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
            body: JSON.stringify(mopsPayload)
        });

        console.log('[INFO] Received response with status:', response.status);
        const rawText = await response.text();
        console.log('[INFO] Raw response text:', rawText);

        const apiData = JSON.parse(rawText);
        console.log('[SUCCESS] Successfully parsed JSON response:');
        console.log(JSON.stringify(apiData, null, 2));

    } catch (error) {
        console.error('[FATAL ERROR] An error occurred during the fetch operation:', error);
    }
}

testNewMopsPayload();
