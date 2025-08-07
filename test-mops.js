const fetch = require('node-fetch');

async function testMops() {
    const payload = {
        companyId: "6857",
        dataType: "2",
        month: "1",
        year: "113",
        subsidiaryCompanyId: ""
    };

    const response = await fetch('https://mops.twse.com.tw/mops/api/t05st10_ifrs', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: JSON.stringify(payload)
    });

    const text = await response.text();
    console.log('Status:', response.status);
    console.log('Response:', text);

    if (text.trim().startsWith('<')) {
        console.log('🔴 BLOCKED: Received HTML (firewall/CAPTCHA)');
    } else {
        console.log('🟢 Possible JSON:', text.substring(0, 200));
    }
}

testMops();