require('dotenv').config({ path: '.env.development' });
const mysql = require('mysql2/promise');

async function checkOrderItemsColumns() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    const [columns] = await connection.execute('SHOW COLUMNS FROM order_items');
    console.log('Columns in order_items table:', columns.map(c => c.Field).join(', '));

    // Check if there is a size column and what values it has
    if (columns.find(c => c.Field === 'size')) {
        const [rows] = await connection.execute('SELECT size, count(*) as count FROM order_items GROUP BY size');
        console.log('Size values:', rows);
    }

    await connection.end();
}

checkOrderItemsColumns().catch(console.error);
