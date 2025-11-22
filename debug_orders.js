const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.development' });

async function checkOrders() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    const [rows] = await connection.execute('SELECT * FROM orders LIMIT 5');
    console.log('Orders:', rows);

    const [count] = await connection.execute('SELECT COUNT(*) as count FROM orders WHERE is_completed = 1');
    console.log('Completed orders count:', count);

    await connection.end();
}

checkOrders().catch(console.error);
