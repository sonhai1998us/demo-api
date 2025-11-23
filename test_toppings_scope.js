const http = require('http');

const options = {
    hostname: 'localhost',
    port: 8102,
    path: '/v1/revenues?startDate=2025-11-21&endDate=2025-11-21&type=day&scope=toppings',
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
            console.log('Topping Revenue API Response:\n');

            if (json.data && json.data.data) {
                let total = 0;
                console.log('| Date | Topping | Quantity | Revenue |');
                console.log('|------|---------|----------|---------|');
                json.data.data.forEach(item => {
                    console.log(`| ${item.date} | ${item.topping_name} | ${item.total_quantity} | ${parseFloat(item.total_revenue).toFixed(2)}đ |`);
                    total += parseFloat(item.total_revenue);
                });
                console.log('|------|---------|----------|---------|');
                console.log(`| **TOTAL** | | | **${total.toFixed(2)}đ** |`);
                console.log(`\nNumber of toppings: ${json.data.data.length}`);
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
