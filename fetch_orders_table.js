const http = require('http');

const options = {
    hostname: 'localhost',
    port: 8102,
    path: '/v1/orders?fqnull=deleted_at',
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

            if (json.status !== 'success' || !json.data) {
                console.log('Error:', json);
                return;
            }

            const orders = json.data;

            // Filter orders for Nov 21, 2025
            const nov21Orders = orders.filter(o => {
                const date = new Date(o.order_time);
                return date.getFullYear() === 2025 &&
                    date.getMonth() === 10 && // Nov = 10 (0-indexed)
                    date.getDate() === 21;
            });

            console.log(`Total orders on 21/11/2025: ${nov21Orders.length}\n`);

            // Create markdown table
            console.log('| Order ID | Time | Status | Total Amount | Discount | Final Amount |');
            console.log('|----------|------|--------|--------------|----------|--------------|');

            let totalAll = 0;
            let totalCompleted = 0;
            let totalDiscount = 0;

            nov21Orders.forEach(order => {
                const time = new Date(order.order_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                const status = order.is_completed ? '✅ Completed' : '❌ Pending';
                const discount = order.discount_amount || 0;

                console.log(`| ${order.id} | ${time} | ${status} | ${order.total_amount + discount} | ${discount} | ${order.total_amount} |`);

                totalAll += order.total_amount;
                totalDiscount += discount;
                if (order.is_completed) {
                    totalCompleted += order.total_amount;
                }
            });

            console.log('|----------|------|--------|--------------|----------|--------------|');
            console.log(`| **TOTAL** | | | ${totalAll + totalDiscount} | ${totalDiscount} | **${totalAll}** |`);
            console.log(`| **Completed only** | | | | | **${totalCompleted}** |`);

        } catch (e) {
            console.log('Parse error:', e.message);
        }
    });
});

req.on('error', (error) => {
    console.error(error);
});

req.end();
