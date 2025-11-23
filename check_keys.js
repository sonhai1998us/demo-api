require('dotenv').config({ path: '.env.development' });
const mysql = require('mysql2/promise');

async function checkKeys() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    const [rows] = await connection.execute('SELECT * FROM order_items LIMIT 1');
    console.log('Keys:', Object.keys(rows[0]));

    await connection.end();
}

checkKeys().catch(console.error);
