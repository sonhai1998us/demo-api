const http = require('http');

const options = {
    hostname: 'localhost',
    port: 8102,
    path: '/v1/revenues?startDate=2025-11-21&endDate=2025-11-21&type=day&scope=product',
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
            console.log('Product Revenue API Response:\n');

            if (json.data && json.data.data) {
                let total = 0;
                json.data.data.forEach(item => {
                    console.log(`${item.date} - ${item.product_name}`);
                    console.log(`  Toppings: ${item.toppings || 'None'}`);
                    console.log(`  Quantity: ${item.total_quantity}`);
                    console.log(`  Revenue: ${item.total_revenue}`);
                    total += parseFloat(item.total_revenue);
                });
                console.log(`\n=== TOTAL ===`);
                console.log(`Total revenue: ${total.toFixed(2)}`);
                console.log(`Number of products: ${json.data.data.length}`);
            }
        } catch (e) {
            console.log('Error:', e.message);
        }
    });
});

req.on('error', (error) => {
    console.error(error);
});

req.end();
