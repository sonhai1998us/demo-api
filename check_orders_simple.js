require('dotenv').config({ path: '.env.development' });
const mysql = require('mysql2/promise');

async function checkOrders() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    const [orders] = await connection.execute(`
    SELECT 
      id,
      total_amount,
      discount_amount,
      is_completed
    FROM orders
    WHERE DATE(order_time) = '2025-11-21'
  `);

    let completed = 0, notCompleted = 0;

    orders.forEach(o => {
        if (o.is_completed) {
            completed += Number(o.total_amount);
            console.log(`Order ${o.id}: ${o.total_amount} (completed)`);
        } else {
            notCompleted += Number(o.total_amount);
            console.log(`Order ${o.id}: ${o.total_amount} (NOT completed)`);
        }
    });

    console.log(`\nCompleted: ${completed}`);
    console.log(`Not completed: ${notCompleted}`);
    console.log(`Total: ${completed + notCompleted}`);

    await connection.end();
}

checkOrders().catch(console.error);
