require('dotenv').config({ path: '.env.development' });
const mysql = require('mysql2/promise');

async function debugQuery() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    const query = `
    SELECT 
        DATE_FORMAT(o.order_time, '%Y-%m-%d') as date,
        p.name as product_name,
        (SELECT GROUP_CONCAT(t.name ORDER BY t.name SEPARATOR ', ') 
            FROM order_item_toppings oit 
            JOIN toppings t ON oit.topping_id = t.id 
            WHERE oit.order_item_id = oi.id) as toppings,
        SUM(oi.quantity) as total_quantity,
        SUM(
            oi.quantity * (
                oi.unit_price + 
                IFNULL((
                    SELECT psp.price 
                    FROM product_size_prices psp 
                    JOIN sizes s ON psp.size_id = s.id 
                    WHERE psp.product_id = oi.product_id AND s.name = oi.size
                ), 0) +
                IFNULL((SELECT SUM(t.price) FROM order_item_toppings oit JOIN toppings t ON oit.topping_id = t.id WHERE oit.order_item_id = oi.id), 0)
            )
        ) as total_revenue
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    JOIN products p ON oi.product_id = p.id
    WHERE o.is_completed = 1 AND o.deleted_at IS NULL AND o.order_time >= '2025-11-21 00:00:00' AND o.order_time <= '2025-11-21 23:59:59'
    GROUP BY DATE(o.order_time), p.id, p.name, toppings
    ORDER BY date ASC, total_revenue DESC
  `;

    try {
        const [rows] = await connection.execute(query);
        console.log('Rows:', rows.length);
    } catch (e) {
        console.error('SQL Error:', e.message);
    }

    await connection.end();
}

debugQuery().catch(console.error);
