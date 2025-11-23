require('dotenv').config({ path: '.env.development' });
const mysql = require('mysql2/promise');

async function checkUnitPriceLogic() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    console.log('Connection established\n');

    // Check items with non-zero size prices
    const [items] = await connection.execute(`
    SELECT 
      oi.id,
      oi.unit_price,
      p.name as product_name,
      p.base_price,
      s.name as size_name,
      psp.price as size_price
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    JOIN sizes s ON oi.size_id = s.id
    LEFT JOIN product_size_prices psp ON psp.product_id = p.id AND psp.size_id = s.id
    WHERE psp.price > 0 OR s.name != 'S'
    LIMIT 10
  `);

    if (items.length === 0) {
        console.log('❌ No items found with non-S sizes or with size_price > 0');
        console.log('Checking all unique sizes in order_items:');

        const [sizes] = await connection.execute(`
      SELECT DISTINCT s.name, COUNT(*) as count
      FROM order_items oi
      JOIN sizes s ON oi.size_id = s.id
      GROUP BY s.name
    `);
        console.log(JSON.stringify(sizes, null, 2));
    } else {
        console.log('Items with size prices:');
        console.log(JSON.stringify(items, null, 2));

        items.forEach(item => {
            const basePlusSize = Number(item.base_price) + (Number(item.size_price) || 0);
            console.log(`\n${item.product_name} (${item.size_name}):`);
            console.log(`  unit_price: ${item.unit_price}`);
            console.log(`  base_price: ${item.base_price}`);
            console.log(`  size_price: ${item.size_price || 0}`);
            console.log(`  base + size: ${basePlusSize}`);
            console.log(`  Match: ${item.unit_price === basePlusSize ? '✅ unit_price INCLUDES size' : '❌ unit_price = base only'}`);
        });
    }

    await connection.end();
}

checkUnitPriceLogic().catch(console.error);
