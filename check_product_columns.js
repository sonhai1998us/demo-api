require('dotenv').config({ path: '.env.development' });
const mysql = require('mysql2/promise');

async function checkProductColumns() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    const [columns] = await connection.execute('SHOW COLUMNS FROM products');
    console.log('Columns in products table:', columns.map(c => c.Field).join(', '));

    await connection.end();
}

checkProductColumns().catch(console.error);
