const http = require('http');

async function compareScopes() {
    console.log('=== COMPARING SCOPES ===\n');

    const scopes = ['revenue', 'product', 'toppings', 'discount'];
    const results = {};

    for (const scope of scopes) {
        const options = {
            hostname: 'localhost',
            port: 8102,
            path: `/v1/revenues?startDate=2025-11-21&endDate=2025-11-21&type=day&scope=${scope}`,
            method: 'GET'
        };

        await new Promise((resolve) => {
            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        if (scope === 'revenue') {
                            const total = json.data.data.reduce((sum, item) => sum + parseFloat(item.revenue || 0), 0);
                            results[scope] = total;
                            console.log(`${scope}: ${total.toFixed(2)}đ`);
                        } else if (scope === 'discount') {
                            const total = json.data.data.reduce((sum, item) => sum + parseFloat(item.total_discount || 0), 0);
                            results[scope] = total;
                            console.log(`${scope}: ${total.toFixed(2)}đ`);
                        } else {
                            const total = json.data.data.reduce((sum, item) => sum + parseFloat(item.total_revenue || 0), 0);
                            results[scope] = total;
                            console.log(`${scope}: ${total.toFixed(2)}đ (${json.data.data.length} items)`);
                        }
                    } catch (e) {
                        console.log(`Error for ${scope}:`, e.message);
                    }
                    resolve();
                });
            });
            req.on('error', (error) => { console.error(error); resolve(); });
            req.end();
        });
    }

    console.log('\n=== ANALYSIS ===');
    console.log(`Total revenue: ${results.revenue.toFixed(2)}đ`);
    console.log(`Product + Toppings - Discount: ${(results.product + results.toppings - results.discount).toFixed(2)}đ`);
    console.log(`Difference: ${(results.revenue - (results.product + results.toppings - results.discount)).toFixed(2)}đ`);
}

compareScopes().catch(console.error);
