require('dotenv').config({ path: '.env.development' });
const mysql = require('mysql2/promise');

async function debugProductRevenue() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    console.log('=== DEBUGGING PRODUCT REVENUE ===\n');

    // 1. Total from orders
    const [ordersTotal] = await connection.execute(`
    SELECT SUM(total_amount) as total, COUNT(*) as count
    FROM orders
    WHERE DATE(order_time) = '2025-11-21'
      AND is_completed = 1
      AND deleted_at IS NULL
  `);
    console.log('Total from orders table:');
    console.log(`  Amount: ${ordersTotal[0].total}`);
    console.log(`  Count: ${ordersTotal[0].count}\n`);

    // 2. Total from order_items (without JOIN)
    const [itemsTotal] = await connection.execute(`
    SELECT 
      SUM(oi.quantity * oi.unit_price) as subtotal,
      COUNT(DISTINCT oi.order_id) as order_count,
      COUNT(*) as item_count
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE DATE(o.order_time) = '2025-11-21'
      AND o.is_completed = 1
      AND o.deleted_at IS NULL
  `);
    console.log('Total from order_items (no product join):');
    console.log(`  Subtotal: ${itemsTotal[0].subtotal}`);
    console.log(`  Orders: ${itemsTotal[0].order_count}`);
    console.log(`  Items: ${itemsTotal[0].item_count}\n`);

    // 3. Total from order_items WITH product JOIN
    const [itemsWithProduct] = await connection.execute(`
    SELECT 
      SUM(oi.quantity * oi.unit_price) as subtotal,
      COUNT(*) as item_count
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    JOIN products p ON oi.product_id = p.id
    WHERE DATE(o.order_time) = '2025-11-21'
      AND o.is_completed = 1
      AND o.deleted_at IS NULL
  `);
    console.log('Total from order_items WITH products JOIN:');
    console.log(`  Subtotal: ${itemsWithProduct[0].subtotal}`);
    console.log(`  Items: ${itemsWithProduct[0].item_count}\n`);

    // 4. Check items with NULL product_id
    const [nullProducts] = await connection.execute(`
    SELECT COUNT(*) as count, SUM(oi.quantity * oi.unit_price) as total
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE DATE(o.order_time) = '2025-11-21'
      AND o.is_completed = 1
      AND o.deleted_at IS NULL
      AND oi.product_id IS NULL
  `);
    console.log('Items with NULL product_id:');
    console.log(`  Count: ${nullProducts[0].count}`);
    console.log(`  Total: ${nullProducts[0].total}\n`);

    // 5. Check item_type distribution
    const [itemTypes] = await connection.execute(`
    SELECT 
      oi.item_type,
      COUNT(*) as count,
      SUM(oi.quantity * oi.unit_price) as total
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE DATE(o.order_time) = '2025-11-21'
      AND o.is_completed = 1
      AND o.deleted_at IS NULL
    GROUP BY oi.item_type
  `);
    console.log('Items by type:');
    itemTypes.forEach(row => {
        console.log(`  ${row.item_type || 'NULL'}: ${row.count} items, ${row.total} total`);
    });

    await connection.end();
}

debugProductRevenue().catch(console.error);
