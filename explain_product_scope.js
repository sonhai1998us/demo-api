require('dotenv').config({ path: '.env.development' });
const mysql = require('mysql2/promise');

async function explainProductScope() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    console.log('=== SCOPE=PRODUCT BREAKDOWN ===\n');

    // Run the actual query from Revenues API
    const [productRevenue] = await connection.execute(`
    SELECT 
      p.name as product_name,
      (SELECT GROUP_CONCAT(t.name ORDER BY t.name SEPARATOR ', ') 
       FROM order_item_toppings oit 
       JOIN toppings t ON oit.topping_id = t.id 
       WHERE oit.order_item_id = oi.id) as toppings,
      oi.quantity,
      oi.unit_price,
      (SELECT SUM(t.price) FROM order_item_toppings oit JOIN toppings t ON oit.topping_id = t.id WHERE oit.order_item_id = oi.id) as topping_price,
      o.discount_amount,
      o.total_amount,
      (o.total_amount / (o.total_amount + o.discount_amount)) as discount_ratio,
      oi.quantity * (
        oi.unit_price + 
        IFNULL((SELECT SUM(t.price) FROM order_item_toppings oit JOIN toppings t ON oit.topping_id = t.id WHERE oit.order_item_id = oi.id), 0)
      ) as revenue_before_discount,
      oi.quantity * (
        oi.unit_price + 
        IFNULL((SELECT SUM(t.price) FROM order_item_toppings oit JOIN toppings t ON oit.topping_id = t.id WHERE oit.order_item_id = oi.id), 0)
      ) * (
        CASE 
          WHEN o.discount_amount > 0 AND (o.total_amount + o.discount_amount) > 0
          THEN o.total_amount / (o.total_amount + o.discount_amount)
          ELSE 1
        END
      ) as revenue_after_discount
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    JOIN products p ON oi.product_id = p.id
    WHERE DATE(o.order_time) = '2025-11-21'
      AND o.is_completed = 1
      AND o.deleted_at IS NULL
    LIMIT 5
  `);

    console.log('Sample items from scope=product:\n');
    productRevenue.forEach((item, idx) => {
        console.log(`Item ${idx + 1}:`);
        console.log(`  Product: ${item.product_name}`);
        console.log(`  Quantity: ${item.quantity}`);
        console.log(`  Unit price: ${item.unit_price}đ (includes size)`);
        console.log(`  Toppings: ${item.toppings || 'None'}`);
        console.log(`  Topping price: ${item.topping_price || 0}đ`);
        console.log(`  Before discount: ${item.revenue_before_discount}đ`);
        console.log(`  After discount: ${parseFloat(item.revenue_after_discount).toFixed(2)}đ`);
        console.log('');
    });

    console.log('\n=== WHAT IS INCLUDED? ===\n');
    console.log('✅ Products (order_items with product_id)');
    console.log('✅ Product unit_price (base + size)');
    console.log('✅ Toppings ATTACHED to products (via order_item_toppings)');
    console.log('✅ Discount applied proportionally');
    console.log('❌ Standalone topping items (item_type="TOPPING")');

    // Check standalone toppings
    const [standaloneToppings] = await connection.execute(`
    SELECT 
      oi.id,
      oi.item_type,
      oi.quantity,
      oi.unit_price,
      t.name as topping_name
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    LEFT JOIN toppings t ON oi.topping_id = t.id
    WHERE DATE(o.order_time) = '2025-11-21'
      AND o.is_completed = 1
      AND o.deleted_at IS NULL
      AND oi.item_type = 'TOPPING'
  `);

    console.log(`\n=== STANDALONE TOPPINGS (NOT INCLUDED) ===`);
    console.log(`Count: ${standaloneToppings.length}`);
    if (standaloneToppings.length > 0) {
        let total = 0;
        standaloneToppings.forEach(item => {
            const itemTotal = item.quantity * item.unit_price;
            console.log(`  ${item.topping_name}: ${item.quantity}x${item.unit_price} = ${itemTotal}đ`);
            total += itemTotal;
        });
        console.log(`  Total: ${total}đ`);
    }

    await connection.end();
}

explainProductScope().catch(console.error);
