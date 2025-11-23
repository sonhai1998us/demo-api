const http = require('http');

const options = {
    hostname: 'localhost',
    port: 8102,
    path: '/v1/revenues?startDate=2025-11-21&endDate=2025-11-21&type=day&scope=revenue',
    method: 'GET'
};

const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log('Revenue API Response:');
            console.log(JSON.stringify(json, null, 2));

            if (json.data && json.data.data && json.data.data.length > 0) {
                const revenue = json.data.data[0].revenue;
                const orderCount = json.data.data[0].order_count;
                console.log(`\n=== SUMMARY ===`);
                console.log(`Date: ${json.data.data[0].date}`);
                console.log(`Revenue: ${revenue}`);
                console.log(`Order count: ${orderCount}`);
            }
        } catch (e) {
            console.log('Error:', e.message);
            console.log('Raw:', data);
        }
    });
});

req.on('error', (error) => {
    console.error(error);
});

req.end();
