const http = require('http');

const options = {
    hostname: 'localhost',
    port: 8102,
    path: '/v1/orders',
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
            console.log("Status:", json.status);
            const items = json.items || json.data;
            if (items && items.length > 0) {
                console.log("First Order Items:", JSON.stringify(items[0].items, null, 2));
            } else {
                console.log("No items found");
            }
        } catch (e) {
            console.log("Error parsing JSON:", e);
            console.log("Raw data:", data);
        }
    });
});

req.on('error', (error) => {
    console.error(error);
});

req.end();
