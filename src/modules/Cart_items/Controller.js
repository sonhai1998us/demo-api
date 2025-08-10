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
		const milktea_and_coffees = await get(`${process.env.BASE_URL}/v1/milktea_and_coffees`,{},'Token').then(resp=>resp?.data ?? {}).catch((e) => {});
		const toppings = await get(`${process.env.BASE_URL}/v1/toppings`,{},'Token').then(resp=>resp?.data ?? {}).catch((e) => {});

		// Tạo lookup object cho milktea_and_coffees và toppings
		const milkteaLookup = {};
		if (Array.isArray(milktea_and_coffees)) {
			milktea_and_coffees.forEach(item => {
				milkteaLookup[item.id] = item;
			});
		}
		const toppingLookup = {};
		if (Array.isArray(toppings)) {
			toppings.forEach(item => {
				toppingLookup[item.id] = item;
			});
		}

		data.forEach((cart) => {
			// Gán milkTea nhanh bằng lookup
			if (cart.milktea_and_coffee_id && milkteaLookup[cart.milktea_and_coffee_id]) {
				cart.milkTea = milkteaLookup[cart.milktea_and_coffee_id];
			}

			// Xử lý topping
			if (cart.topping_id != null && cart.topping_id.length > 0) {
				let topping_data = [];
				const cartToppingIds = cart.topping_id.split(",");
				cartToppingIds.forEach(cart_topping => {
					if (toppingLookup[cart_topping]) {
						topping_data.push(toppingLookup[cart_topping]);
					}
				});
				cart.toppings = topping_data;
			}
		});
		return data;
	}
}