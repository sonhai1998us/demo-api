require('dotenv').config({ path: '.env.development' });
const mysql = require('mysql2/promise');

async function compareOrdersRevenue() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    console.log('Analyzing orders for 2025-11-21\n');

    // Get all orders on that date
    const [allOrders] = await connection.execute(`
    SELECT 
      id,
      order_time,
      total_amount,
      discount_amount,
      is_completed,
      (total_amount + discount_amount) as amount_before_discount
    FROM orders
    WHERE DATE(order_time) = '2025-11-21'
    ORDER BY order_time
  `);

    console.log('=== ALL ORDERS ===');
    console.log(`Total orders: ${allOrders.length}`);

    let totalAll = 0;
    let totalCompleted = 0;
    let totalNotCompleted = 0;

    allOrders.forEach(order => {
        const status = order.is_completed ? '✅' : '❌';
        console.log(`${status} Order #${order.id}: ${order.total_amount.toLocaleString()}đ (discount: ${order.discount_amount || 0})`);
        totalAll += Number(order.total_amount);
        if (order.is_completed) {
            totalCompleted += Number(order.total_amount);
        } else {
            totalNotCompleted += Number(order.total_amount);
        }
    });

    console.log('\n=== SUMMARY ===');
    console.log(`Total ALL orders: ${totalAll.toLocaleString()}đ`);
    console.log(`Total COMPLETED: ${totalCompleted.toLocaleString()}đ (is_completed = 1)`);
    console.log(`Total NOT completed: ${totalNotCompleted.toLocaleString()}đ (is_completed = 0)`);

    console.log('\n=== REVENUE API LOGIC ===');
    console.log(`Revenue API only counts: is_completed = 1`);
    console.log(`Expected revenue: ${totalCompleted.toLocaleString()}đ`);

    console.log('\n=== COMPARISON ===');
    console.log(`Orders UI shows: 835,000đ`);
    console.log(`Revenue API shows: 806,600đ`);
    console.log(`Difference: ${(835000 - 806600).toLocaleString()}đ`);
    console.log(`\nPossible causes:`);
    console.log(`1. Orders UI includes is_completed = 0 orders`);
    console.log(`2. Orders UI doesn't filter by is_completed`);

    await connection.end();
}

compareOrdersRevenue().catch(console.error);
