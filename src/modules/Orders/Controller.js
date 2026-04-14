"use strict";

/* Package System */
const Controller = require('@system/Controller');
const Model = require('@system/Model');
const { get } = require('@utils/Helper');
const escpos = require('escpos');
escpos.Network = require('escpos-network');
const { Jimp } = require('jimp');
const LOGO_URL = 'https://cdn.demo-online.xyz/logo2.png';
const OrderItemsController = require('../Order_items/Controller');

async function getLogoBufferFromUrl(logoUrl) {
  try {
    if (!Jimp.read) {
      throw new Error('Jimp.read không được định nghĩa. Vui lòng kiểm tra phiên bản Jimp.');
    }
    const image = await Jimp.read(logoUrl);
    if (!image) {
      throw new Error('Không thể tải ảnh từ URL');
    }
    image
      .resize(200, 200, Jimp.RESIZE_BILINEAR)
      .grayscale()
      .contrast(1)
      .threshold({ max: 128 });
    return await escpos.Image.load(image);
  } catch (error) {
    console.error('Lỗi tải hoặc xử lý logo từ CDN:', error);
    throw error;
  }
}

module.exports = class extends Controller {

  constructor(tableName) {
    super(tableName);
    this.dbOrderItems = new Model('order_items');
  }

  async getAll(req, res) {
    try {
      const _data = await this.db.find(req);
      const orders = _data?.data || [];
      if (orders.length === 0) {
        const _result = _data == null ? { items: [] } : _data;
        this.response(res, 200, _result);
        return;
      }
      // Lấy tất cả order_id
      const orderIds = orders.map(order => order.id);

      // Lấy tất cả order_items + joins trực tiếp bằng raw query để tránh bị cap limit
      const dbRaw = new Model('order_items');
      const orderIdsStr = orderIds.join(',');
      const rawResult = await dbRaw.query(`
        SELECT 
          order_items.*,
          products.name as product_name, products.base_price as product_price,
          toppings.name as topping_name, toppings.price as topping_price,
          sizes.name as size_name,
          ice_levels.label as ice_name,
          sweetness_levels.label as sweetness_name
        FROM order_items
        LEFT JOIN products ON products.id = order_items.product_id
        LEFT JOIN toppings ON toppings.id = order_items.topping_id
        LEFT JOIN sizes ON sizes.id = order_items.size_id
        LEFT JOIN ice_levels ON ice_levels.id = order_items.ice_id
        LEFT JOIN sweetness_levels ON sweetness_levels.id = order_items.sweetness_id
        WHERE order_items.order_id IN (${orderIdsStr})
          AND order_items.deleted_at IS NULL
      `);
      const orderItemsCtrl = new OrderItemsController('order_items');
      const mappedItems = rawResult?.data && rawResult.data.length > 0
        ? await orderItemsCtrl.rempDataMapping(rawResult.data, 'Token')
        : [];
      const orderItems = { data: mappedItems };

      // Tạo lookup order_items theo order_id
      const orderItemsByOrderId = {};
      (orderItems?.data || []).forEach(item => {
        if (!orderItemsByOrderId[item.order_id]) orderItemsByOrderId[item.order_id] = [];
        orderItemsByOrderId[item.order_id].push(item);
      });
      // Mapping vào từng order
      orders.forEach(order => {
        order.items = orderItemsByOrderId[order.id] || [];
      });
      const _result = _data == null ? { items: [] } : { ..._data, data: orders };
      this.response(res, 200, _result);
    } catch (e) {
      this.response(res, 500, e.message);
    }
  }

  async create(req, res) {
    try {
      const sessionToken = req.headers['x-session-token'] || req.body.session_token;
      if (sessionToken && global.shopSessions && global.shopSessions.has(sessionToken)) {
         const session = global.shopSessions.get(sessionToken);
         req.body.session_token = sessionToken;
         req.body.queue_position = session.queue_position;
         session.order_placed = true;
      }

      // Insert order manually to capture the new ID
      req.body.created_at = new Date();
      req.body.updated_at = new Date();
      const newId = await this.db.insert(req.body, 'id');

      if (!newId) {
        return this.response(res, 500, 'Could not create order');
      }

      // Fetch the newly created order to return it
      const newOrder = await this.db.get({ id: newId });

      // Notify sockets
      if (global.io) {
        if (sessionToken) {
          const session = global.shopSessions?.get(sessionToken);
          global.io.to(`session:${sessionToken}`).emit('order:created', {
            queue_position: session?.queue_position,
            order_placed: true
          });
        }
      }

      return res.status(201).json({ status: 'success', data: newOrder });
    } catch (e) {
      this.response(res, 500, e.message);
    }
  }
}