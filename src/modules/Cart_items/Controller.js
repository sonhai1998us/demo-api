"use strict";

/* Package System */
const Controller = require('@system/Controller');
const Model = require('@system/Model');
const { get } = require('@utils/Helper');

const escpos = require('escpos');
// const Network = require('escpos-network');
escpos.Network = require('escpos-network');

const PRINTER_IP = '192.168.2.40';
const PRINTER_PORT = 9100;

module.exports = class extends Controller {

	constructor(tableName) {
		super(tableName);
		this.dbCartItemTopping = new Model('cart_item_toppings');
	}

	async getAll(req, res) {
		try {
			if(!req.query?.fqnull) req.query.fqnull = "deleted_at"
			req.query.joinQueries = [{
				fieldJoin: 'product_id',
				fieldTarget: 'id',
				table: 'products',
				mergeField: 'products.name as product_name, products.base_price as product_price',
			},{
				fieldJoin: 'size_id',
				fieldTarget: 'id',
				table: 'sizes',
				mergeField: 'sizes.name as size_name',
			},
			{
				fieldJoin: 'ice_id',
				fieldTarget: 'id',
				table: 'ice_levels',
				mergeField: 'ice_levels.label as ice_name',
			},
			{
				fieldJoin: 'sweetness_id',
				fieldTarget: 'id',
				table: 'sweetness_levels',
				mergeField: 'sweetness_levels.label as sweetness_name',
			},
		];
			const _data = await this.db.find(req);
			if (_data?.data && _data.data.length > 0)
				_data.data = await this.rempDataMapping(_data.data, req.access_token);
			const _result = _data == null ? { items: [] } : _data;
			this.response(res, 200, _result);
		} catch (e) {
			this.response(res, 500, e.message);
		}
	}
	
	async rempDataMapping(data, token) {
		// const toppingData = await get(`${process.env.BASE_URL}/v1/toppings`, {}, 'Token').then(resp => resp?.data ?? {}).catch((e) => { });
		const cart_item_topping_data = await this.dbCartItemTopping.find({query:{joinQueries:[
			{
				fieldJoin: 'topping_id',
				fieldTarget: 'id',
				table: 'toppings',
				mergeField: 'toppings.id as id, toppings.name as name, toppings.price as price',
			}
		]}});
		
		const cartWithToppings = await Promise.all(
			data.map(async (item) => {
				const toppings = cart_item_topping_data?.data.filter(tr => tr.cart_item_id === item.id).map(tr => {return {id: tr.id, name: tr.name, price: tr.price}});
				const sizePriceData = await get(`${process.env.BASE_URL}/v1/product_size_prices?fq=product_id:${item.product_id},size_id:${item.size_id}`, {}, 'Token').then(resp => resp?.data ?? {}).catch((e) => { });
			  return { ...item, size_price: sizePriceData?.[0]?.price, toppings };
			})
		  );
		  
		return cartWithToppings;
	}

	async test(req, res) {
		const device = new escpos.Network(PRINTER_IP, PRINTER_PORT);
		const options = { encoding: 'CP437' }; // thử CP437/CP1258 nếu cần
		const printer = new escpos.Printer(device,options);
		device.open((err) => {
			if (err) {
			  console.error('Lỗi kết nối máy in:', err);
			  return;
			}
		  
			// Thiết lập định dạng in
			printer
			  .font('A') // Chọn font
			  .align('CT') // Căn giữa
			  .style('B') // In đậm
			  .size(1, 1) // Kích thước chữ
			  .text('HOA DON BAN HANG')
			  .text('-----------------------------')
			  .align('LT') // Căn trái
			  .text('Cua hang: Ten cua hang XYZ')
			  .text('Dia chi: 123 Duong ABC, Quan 1')
			  .text('SDT: 0123 456 789')
			  .text('Ngay: ' + new Date().toLocaleString())
			  .text('-----------------------------');
		  
			// In danh sách sản phẩm
			printer
    .align('ct').style('b').size(1, 1).text('1996 Coffee & Milk Tea')
    .style('normal').align('lt')
    .text('Hoa don #A10023')
    .text('------------------------------')
    .tableCustom([
      { text: 'Tra sua TC', align: 'LEFT', width: 0.6 },
      { text: 'x1',         align: 'CENTER', width: 0.2 },
      { text: '20,000',     align: 'RIGHT',  width: 0.2 },
    ])
    .text('------------------------------')
    .align('rt').text('Tong: 20,000đ')
    .align('ct').text('Cam on quy khach!')
	.text('------------------------------')
	.text('------------------------------')
    .cut()
    .close();
		  })
		console.log(333);
	}
}