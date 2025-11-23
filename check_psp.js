require('dotenv').config({ path: '.env.development' });
const mysql = require('mysql2/promise');

async function checkPSP() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        const [rows] = await connection.execute('SELECT * FROM product_size_prices LIMIT 5');
        console.log('PSP data:', rows);
    } catch (e) {
        console.error('Error:', e.message);
    }

    await connection.end();
}

checkPSP().catch(console.error);
