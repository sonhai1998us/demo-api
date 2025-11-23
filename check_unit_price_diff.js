require('dotenv').config({ path: '.env.development' });
const mysql = require('mysql2/promise');

async function checkUnitPrice() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    const [rows] = await connection.execute(`
    SELECT 
      oi.id, 
      oi.product_id, 
      p.name, 
      p.base_price, 
      oi.unit_price, 
      (oi.unit_price - p.base_price) as diff
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    LIMIT 10
  `);

    console.log('Comparison:', rows);
    await connection.end();
}

checkUnitPrice().catch(console.error);
