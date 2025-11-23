require('dotenv').config({ path: '.env.development' });
const mysql = require('mysql2/promise');

async function checkColumns() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    const [columns] = await connection.execute('SHOW COLUMNS FROM orders');
    console.log('Columns in orders table:', columns.map(c => c.Field).join(', '));

    // Check if there is shipping fee data for 21/11
    if (columns.find(c => c.Field === 'shipping_fee' || c.Field === 'delivery_fee')) {
        const [fees] = await connection.execute(`
      SELECT SUM(shipping_fee) as shipping, SUM(delivery_fee) as delivery 
      FROM orders 
      WHERE DATE(order_time) = '2025-11-21' AND is_completed = 1
    `);
        console.log('Fees:', fees[0]);
    }

    await connection.end();
}

checkColumns().catch(console.error);
