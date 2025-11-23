const http = require('http');
const fs = require('fs');

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
                    date.getMonth() === 10 &&
                    date.getDate() === 21;
            }).sort((a, b) => a.id - b.id);

            let markdown = '# Orders on 21/11/2025\n\n';
            markdown += `Total: ${nov21Orders.length} orders\n\n`;
            markdown += '| Order ID | Time | Status | Before Discount | Discount | **Final Amount** |\n';
            markdown += '|----------|------|--------|----------------|----------|------------------|\n';

            let totalBeforeDiscount = 0;
            let totalDiscount = 0;
            let totalFinal = 0;
            let completedTotal = 0;
            let pendingTotal = 0;
            let completedCount = 0;
            let pendingCount = 0;

            nov21Orders.forEach(order => {
                const time = new Date(order.order_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                const status = order.is_completed ? '✅' : '❌';
                const discount = order.discount_amount || 0;
                const beforeDiscount = order.total_amount + discount;

                markdown += `| ${order.id} | ${time} | ${status} | ${beforeDiscount.toLocaleString()}đ | ${discount.toLocaleString()}đ | **${order.total_amount.toLocaleString()}đ** |\n`;

                totalBeforeDiscount += beforeDiscount;
                totalDiscount += discount;
                totalFinal += order.total_amount;

                if (order.is_completed) {
                    completedTotal += order.total_amount;
                    completedCount++;
                } else {
                    pendingTotal += order.total_amount;
                    pendingCount++;
                }
            });

            markdown += '|----------|------|--------|----------------|----------|------------------|\n';
            markdown += `| **TOTAL** | | **${completedCount}✅ ${pendingCount}❌** | **${totalBeforeDiscount.toLocaleString()}đ** | **${totalDiscount.toLocaleString()}đ** | **${totalFinal.toLocaleString()}đ** |\n\n`;

            markdown += '## Summary\n\n';
            markdown += `- **Total orders**: ${nov21Orders.length}\n`;
            markdown += `- **Completed**: ${completedCount} orders = ${completedTotal.toLocaleString()}đ\n`;
            markdown += `- **Pending**: ${pendingCount} orders = ${pendingTotal.toLocaleString()}đ\n`;
            markdown += `- **Total discount**: ${totalDiscount.toLocaleString()}đ\n`;
            markdown += `- **Grand total**: ${totalFinal.toLocaleString()}đ\n`;

            console.log(markdown);

            // Save to file
            fs.writeFileSync('C:/Users/Admin/.gemini/antigravity/brain/e9b94c3e-c346-49b0-be76-2c048915212c/orders_21nov.md', markdown);
            console.log('\n✅ Saved to orders_21nov.md');

        } catch (e) {
            console.log('Parse error:', e.message);
        }
    });
});

req.on('error', (error) => {
    console.error(error);
});

req.end();
