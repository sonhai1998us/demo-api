"use strict";

const Controller = require('@system/Controller');
const Model = require('@system/Model');

module.exports = class extends Controller {
    constructor(tableName) {
        super(tableName);
        this.dbOrders = new Model('orders');
    }

    async getAll(req, res) {
        try {
            const { startDate, endDate, type = 'day', scope = 'revenue' } = req.query;

            let groupBy = "";
            let dateFormat = "";

            if (type === 'month') {
                groupBy = "DATE_FORMAT(o.order_time, '%Y-%m')";
                dateFormat = "%Y-%m";
            } else {
                groupBy = "DATE(o.order_time)";
                dateFormat = "%Y-%m-%d";
            }

            let whereClause = "o.is_completed = 1"; // Only count completed orders

            if (startDate) {
                whereClause += ` AND o.order_time >= '${startDate} 00:00:00'`;
            }

            if (endDate) {
                whereClause += ` AND o.order_time <= '${endDate} 23:59:59'`;
            }

            let query = "";

            if (scope === 'product') {
                query = `
                    SELECT 
                        DATE_FORMAT(o.order_time, '${dateFormat}') as date,
                        p.name as product_name,
                        (SELECT GROUP_CONCAT(t.name ORDER BY t.name SEPARATOR ', ') 
                         FROM order_item_toppings oit 
                         JOIN toppings t ON oit.topping_id = t.id 
                         WHERE oit.order_item_id = oi.id) as toppings,
                        SUM(oi.quantity) as total_quantity,
                        SUM(oi.quantity * (oi.unit_price + IFNULL((SELECT SUM(t.price) FROM order_item_toppings oit JOIN toppings t ON oit.topping_id = t.id WHERE oit.order_item_id = oi.id), 0))) as total_revenue
                    FROM orders o
                    JOIN order_items oi ON o.id = oi.order_id
                    JOIN products p ON oi.product_id = p.id
                    WHERE ${whereClause}
                    GROUP BY ${groupBy}, p.id, p.name, toppings
                    ORDER BY date ASC, total_revenue DESC
                `;
            } else {
                query = `
                    SELECT 
                        DATE_FORMAT(o.order_time, '${dateFormat}') as date,
                        SUM(o.total_amount) as revenue,
                        COUNT(o.id) as order_count
                    FROM orders o
                    WHERE ${whereClause}
                    GROUP BY ${groupBy}
                    ORDER BY date ASC
                `;
            }

            const result = await this.db.query(query);

            this.response(res, 200, { data: result });
        } catch (e) {
            this.response(res, 500, e.message);
        }
    }
}
