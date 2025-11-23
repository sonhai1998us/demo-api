const http = require('http');

const options = {
    hostname: 'localhost',
    port: 8102,
    path: '/v1/revenues?startDate=2023-01-01&endDate=2025-12-31&type=day&scope=product',
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
            if (json.data && json.data.length > 0) {
                console.log("\nFirst 3 products:");
                json.data.slice(0, 3).forEach(item => {
                    console.log(`\n${item.date} - ${item.product_name}`);
                    console.log(`  Toppings: ${item.toppings || 'None'}`);
                    console.log(`  Quantity: ${item.total_quantity}`);
                    console.log(`  Revenue: ${item.total_revenue}`);
                });
            } else {
                console.log("No data found");
            }
        } catch (e) {
            console.log("Error:", e.message);
            console.log("Raw:", data.substring(0, 200));
        }
    });
});

req.on('error', (error) => {
    console.error(error);
});

req.end();
