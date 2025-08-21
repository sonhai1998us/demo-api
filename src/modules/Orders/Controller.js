"use strict";

/* Package System */
const Controller = require('@system/Controller');
const Model = require('@system/Model');
const {get} = require('@utils/Helper');
const escpos = require('escpos');
escpos.Network = require('escpos-network');
const { Jimp } = require('jimp');
const LOGO_URL = 'https://cdn.demo-online.xyz/logo2.png';

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

module.exports = class extends Controller{

	constructor(tableName){
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
            // Lấy tất cả order_items có order_id trong danh sách
            const orderItems = await get(`${process.env.BASE_URL}/v1/order_items?fqin=order_id:${orderIds.toString().replace('"','')}`, {}, 'Token').then(resp => resp).catch((e) => { });
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
}