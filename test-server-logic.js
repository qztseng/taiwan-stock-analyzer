
const fetch = require('node-fetch');
const assert = require('assert');

async function testServerEndpoint() {
    console.log('[INFO] Testing server /api/revenue endpoint...');
    
    const payload = {
        companyCodes: ['2330'],
        startDate: '2024-01'
    };

    try {
        const response = await fetch('http://localhost:3002/api/revenue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        assert.strictEqual(response.ok, true, `Server responded with status ${response.status}`);
        
        const data = await response.json();
        console.log('[INFO] Received data from server:', JSON.stringify(data, null, 2));

        assert.strictEqual(Array.isArray(data), true, 'Response should be an array.');
        assert.strictEqual(data.length > 0, true, 'Response array should not be empty.');
        assert.strictEqual(data[0].code, '2330', 'Company code should be 2330.');
        assert.strictEqual(Array.isArray(data[0].data), true, 'Inner data should be an array.');
        assert.strictEqual(data[0].data.length > 0, true, 'Inner data array should not be empty.');
        assert.strictEqual(data[0].data[0].revenue > 0, true, 'Revenue should be a positive number.');

        console.log('[SUCCESS] Server endpoint test passed!');
    } catch (error) {
        console.error('[ERROR] Server endpoint test failed:', error);
    } finally {
        // Stop the server
        const res = await fetch('http://localhost:3002/api/shutdown', { method: 'POST' }).catch(() => {});
    }
}

testServerEndpoint();
