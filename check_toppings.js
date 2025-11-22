const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.development' });

async function checkToppingsPrice() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    const query = `
        SELECT 
            oi.id as item_id, 
            oi.unit_price, 
            p.name as product_name,
            p.base_price, 
            t.name as topping_name,
            t.price as topping_price
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        LEFT JOIN order_item_toppings oit ON oi.id = oit.order_item_id
        LEFT JOIN toppings t ON oit.topping_id = t.id
        LIMIT 10
    `;

    const [rows] = await connection.execute(query);
    console.log(JSON.stringify(rows, null, 2));

    await connection.end();
}

checkToppingsPrice().catch(console.error);
