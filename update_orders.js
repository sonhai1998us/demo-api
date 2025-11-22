const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.development' });

async function updateOrders() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    // Update the first 3 orders to be completed
    const [result] = await connection.execute('UPDATE orders SET is_completed = 1 LIMIT 3');
    console.log('Updated rows:', result.affectedRows);

    const [rows] = await connection.execute('SELECT * FROM orders WHERE is_completed = 1 LIMIT 5');
    console.log('Completed Orders:', rows);

    await connection.end();
}

updateOrders().catch(console.error);
