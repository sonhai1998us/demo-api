require('dotenv').config({ path: '.env.development' });
const mysql = require('mysql2/promise');

async function checkOrders233to257() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    const [orders] = await connection.execute(`
    SELECT 
      id,
      DATE(order_time) as date,
      total_amount,
      discount_amount,
      is_completed
    FROM orders
    WHERE id BETWEEN 233 AND 257
    ORDER BY id
  `);

    console.log('Orders 233-257:\n');

    let totalAll = 0;
    let totalCompleted = 0;
    let total21Nov = 0;
    let totalCompleted21Nov = 0;

    orders.forEach(o => {
        const status = o.is_completed ? '✅' : '❌';
        const is21Nov = o.date === '2025-11-21';
        console.log(`${status} Order ${o.id} (${o.date}): ${o.total_amount.toLocaleString()}đ`);

        totalAll += Number(o.total_amount);
        if (o.is_completed) {
            totalCompleted += Number(o.total_amount);
        }

        if (is21Nov) {
            total21Nov += Number(o.total_amount);
            if (o.is_completed) {
                totalCompleted21Nov += Number(o.total_amount);
            }
        }
    });

    console.log('\n=== SUMMARY ===');
    console.log(`All orders 233-257: ${totalAll.toLocaleString()}đ`);
    console.log(`Completed 233-257: ${totalCompleted.toLocaleString()}đ`);
    console.log(`\n21/11 only (all): ${total21Nov.toLocaleString()}đ`);
    console.log(`21/11 only (completed): ${totalCompleted21Nov.toLocaleString()}đ`);

    await connection.end();
}

checkOrders233to257().catch(console.error);
