require('dotenv').config({ path: '.env.development' });
const mysql = require('mysql2/promise');

async function checkTables() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    const [tables] = await connection.execute('SHOW TABLES');
    console.log('Tables:', tables.map(t => Object.values(t)[0]));

    if (tables.find(t => Object.values(t)[0] === 'sizes')) {
        const [rows] = await connection.execute('SELECT * FROM sizes');
        console.log('Sizes table content:', rows);
    }

    await connection.end();
}

checkTables().catch(console.error);
