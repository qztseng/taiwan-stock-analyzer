const fetch = require('node-fetch');

async function testRevenueFetch() {
    const code = '2330';
    const year = 2024;
    const month = 1;

    console.log(`[INFO] Testing MOPS API for company ${code}, date ${year}-${month}`);

    const mopsPayload = {
        "color": "true",
        "come": "https://mops.twse.com.tw/mops/web/t05st10_ifrs",
        "co_id": code,
        "dataType": "2",
        "encodeURIComponent": "1",
        "step": "1",
        "firstin": "1",
        "off": "1",
        "keyword4": "",
        "code1": "",
        "TYPEK": "all",
        "check_k": "",
        "queryName": "co_id",
        "inpuType": "co_id",
        "isnew": "false",
        "year": String(year - 1911),
        "month": String(month).padStart(2, '0'),
    };

    console.log('[INFO] Sending request with body:', JSON.stringify(mopsPayload, null, 2));

    try {
        const response = await fetch('https://mops.twse.com.tw/mops/api/t05st10_ifrs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
            },
            body: JSON.stringify(mopsPayload)
        });

        console.log('[INFO] Received response with status:', response.status);
        const rawText = await response.text();
        console.log('[INFO] Raw response text:', rawText);

        if (rawText.trim().startsWith('<')) {
            console.error('[ERROR] Response is not JSON. It is likely an HTML error page from MOPS.');
            return;
        }

        const apiData = JSON.parse(rawText);
        console.log('[SUCCESS] Successfully parsed JSON response:');
        console.log(JSON.stringify(apiData, null, 2));

        if (apiData.data) {
            const revenueInfo = apiData.data.find(d => d.TITLE === '營業收入');
            if (revenueInfo) {
                console.log('[SUCCESS] Found revenue info:', JSON.stringify(revenueInfo, null, 2));
            } else {
                console.error('[ERROR] "營業收入" (Revenue) section not found in API data.');
            }
        } else {
            console.error('[ERROR] "data" property not found in API response.');
        }

    } catch (error) {
        console.error('[FATAL ERROR] An error occurred during the fetch operation:', error);
    }
}

testRevenueFetch();
