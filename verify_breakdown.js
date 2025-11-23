require('dotenv').config({ path: '.env.development' });
const mysql = require('mysql2/promise');

async function verifyBreakdown() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    console.log('=== DETAILED BREAKDOWN VERIFICATION ===\n');

    // 1. Total from orders table
    const [orders] = await connection.execute(`
    SELECT 
      id,
      total_amount,
      discount_amount,
      (total_amount + discount_amount) as before_discount
    FROM orders
    WHERE DATE(order_time) = '2025-11-21'
      AND is_completed = 1
      AND deleted_at IS NULL
  `);

    const totalFromOrders = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);
    const totalBeforeDiscount = orders.reduce((sum, o) => sum + Number(o.before_discount), 0);
    const totalDiscount = orders.reduce((sum, o) => sum + Number(o.discount_amount), 0);

    console.log('1. FROM ORDERS TABLE:');
    console.log(`   Orders: ${orders.length}`);
    console.log(`   Before discount: ${totalBeforeDiscount.toLocaleString()}đ`);
    console.log(`   Discount: ${totalDiscount.toLocaleString()}đ`);
    console.log(`   After discount: ${totalFromOrders.toLocaleString()}đ\n`);

    // 2. Breakdown by item type
    const [breakdown] = await connection.execute(`
    SELECT 
      oi.item_type,
      SUM(oi.quantity * oi.unit_price) as subtotal,
      SUM(
        oi.quantity * oi.unit_price * (
          CASE 
            WHEN o.discount_amount > 0 AND (o.total_amount + o.discount_amount) > 0
            THEN o.total_amount / (o.total_amount + o.discount_amount)
            ELSE 1
          END
        )
      ) as total_after_discount,
      COUNT(*) as item_count
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE DATE(o.order_time) = '2025-11-21'
      AND o.is_completed = 1
      AND o.deleted_at IS NULL
    GROUP BY oi.item_type
  `);

    console.log('2. FROM ORDER_ITEMS (by type):');
    let sumBeforeDiscount = 0;
    let sumAfterDiscount = 0;
    breakdown.forEach(row => {
        console.log(`   ${row.item_type}: ${row.item_count} items`);
        console.log(`     Before discount: ${Number(row.subtotal).toLocaleString()}đ`);
        console.log(`     After discount: ${Number(row.total_after_discount).toFixed(2)}đ`);
        sumBeforeDiscount += Number(row.subtotal);
        sumAfterDiscount += Number(row.total_after_discount);
    });
    console.log(`   TOTAL items before discount: ${sumBeforeDiscount.toLocaleString()}đ`);
    console.log(`   TOTAL items after discount: ${sumAfterDiscount.toFixed(2)}đ\n`);

    // 3. Calculate attached toppings
    const [attachedToppings] = await connection.execute(`
    SELECT 
      SUM(t.price) as total_price,
      SUM(
        t.price * (
          CASE 
            WHEN o.discount_amount > 0 AND (o.total_amount + o.discount_amount) > 0
            THEN o.total_amount / (o.total_amount + o.discount_amount)
            ELSE 1
          END
        )
      ) as total_after_discount,
      COUNT(*) as count
    FROM order_item_toppings oit
    JOIN toppings t ON oit.topping_id = t.id
    JOIN order_items oi ON oit.order_item_id = oi.id
    JOIN orders o ON oi.order_id = o.id
    WHERE DATE(o.order_time) = '2025-11-21'
      AND o.is_completed = 1
      AND o.deleted_at IS NULL
  `);

    console.log('3. ATTACHED TOPPINGS (in order_item_toppings):');
    console.log(`   Count: ${attachedToppings[0].count}`);
    console.log(`   Before discount: ${Number(attachedToppings[0].total_price || 0).toLocaleString()}đ`);
    console.log(`   After discount: ${Number(attachedToppings[0].total_after_discount || 0).toFixed(2)}đ\n`);

    // 4. Calculate product scope (should include attached toppings)
    const productScopeTotal = sumAfterDiscount - Number(breakdown.find(b => b.item_type === 'TOPPING')?.total_after_discount || 0) + Number(attachedToppings[0].total_after_discount || 0);

    console.log('4. CALCULATION:');
    console.log(`   Product items after discount: ${(sumBeforeDiscount - Number(breakdown.find(b => b.item_type === 'TOPPING')?.subtotal || 0)).toLocaleString()}đ → ${(sumAfterDiscount - Number(breakdown.find(b => b.item_type === 'TOPPING')?.total_after_discount || 0)).toFixed(2)}đ`);
    console.log(`   + Attached toppings: ${Number(attachedToppings[0].total_price || 0).toLocaleString()}đ → ${Number(attachedToppings[0].total_after_discount || 0).toFixed(2)}đ`);
    console.log(`   = Product scope should be: ${productScopeTotal.toFixed(2)}đ`);
    console.log(``);
    console.log(`   Standalone toppings: ${Number(breakdown.find(b => b.item_type === 'TOPPING')?.total_after_discount || 0).toFixed(2)}đ`);
    console.log(``);
    console.log(`   TOTAL (Product + Toppings): ${(productScopeTotal + Number(breakdown.find(b => b.item_type === 'TOPPING')?.total_after_discount || 0)).toFixed(2)}đ`);
    console.log(`   Expected (from orders): ${totalFromOrders.toLocaleString()}đ`);
    console.log(`   Difference: ${(totalFromOrders - (productScopeTotal + Number(breakdown.find(b => b.item_type === 'TOPPING')?.total_after_discount || 0))).toFixed(2)}đ`);

    await connection.end();
}

verifyBreakdown().catch(console.error);
