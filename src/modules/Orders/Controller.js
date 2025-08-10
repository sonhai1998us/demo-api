"use strict";

/* Package System */
const Controller = require('@system/Controller');
const {get} = require('@utils/Helper');

module.exports = class extends Controller{

	constructor(tableName){
		super(tableName);
    }
	
	async getAll(req, res) {
        try {
            const _data = await this.db.find(req);
			if(_data?.data && _data.data.length > 0)
                _data.data = await this.rempDataMapping(_data.data,req.access_token);
            const _result = _data == null ? { items: [] } : _data;
            this.response(res, 200, _result);
        } catch (e) {
            this.response(res, 500, e.message);
        }
    }

	async rempDataMapping(data, token){
		const milktea_and_coffees = await get(`${process.env.BASE_URL}/v1/milktea_and_coffees`,{},'Token').then(resp=>resp?.data ?? []).catch(() => []);
		const toppings = await get(`${process.env.BASE_URL}/v1/toppings`,{},'Token').then(resp=>resp?.data ?? []).catch(() => []);

		// Tạo lookup object cho milktea_and_coffees và toppings
		const milkteaLookup = {};
		milktea_and_coffees.forEach(item => { milkteaLookup[item.id] = item; });
		const toppingLookup = {};
		toppings.forEach(item => { toppingLookup[item.id] = item; });

		// Lấy tất cả cart_id từ data (orders)
		const allCartIds = data
			.map(order => order.cart_id)
			.filter(Boolean)
			.flatMap(ids => ids.split(","))
			.filter((v, i, a) => a.indexOf(v) === i); // unique
			

		// Lấy cart_items theo cart_id (giả sử có API get cart_items theo nhiều id)
		const cartItems = await get(`${process.env.BASE_URL}/v1/cart_items?fqin=id:${allCartIds.join(",")}`, {}, 'Token')
			.then(resp => resp?.data ?? [])
			.catch(() => []);
		// Tạo lookup cho cart_items
		const cartItemLookup = {};
		cartItems.forEach(item => { cartItemLookup[item.id] = item; });

		// Mapping deep: order -> cart_items -> (milkTea, toppings)
		data.forEach(order => {
			if (order.cart_id) {
				const cartIds = order.cart_id.split(",");
				order.items = cartIds.map(cid => {
					const cart = { ...cartItemLookup[cid] };
					if (cart) {
						// Gán milkTea
						if (cart.milktea_and_coffee_id && milkteaLookup[cart.milktea_and_coffee_id]) {
							cart.milkTea = milkteaLookup[cart.milktea_and_coffee_id];
						}
						// Gán toppings
						if (cart.topping_id) {
							const toppingIds = cart.topping_id.split(",");
							cart.toppings = toppingIds.map(tid => toppingLookup[tid]).filter(Boolean);
						}
					}
					return cart;
				}).filter(Boolean);
			}
		});
		return data;
	}
}