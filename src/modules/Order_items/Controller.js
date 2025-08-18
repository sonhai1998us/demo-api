"use strict";

/* Package System */
const Controller = require('@system/Controller');
const Model = require('@system/Model');
const {get} = require('@utils/Helper');

module.exports = class extends Controller{

	constructor(tableName){
		super(tableName);
		this.dbOrderItemTopping = new Model('order_item_toppings');
		this.dbOrderItem = new Model('order_items');
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
		const order_item_topping_data = await this.dbOrderItemTopping.find({query:{joinQueries:[
			{
				fieldJoin: 'topping_id',
				fieldTarget: 'id',
				table: 'toppings',
				mergeField: 'toppings.id as id, toppings.name as name, toppings.price as price',
			}
		]}});
		
		const cartWithToppings = await Promise.all(
			data.map(async (item) => {
				const toppings = order_item_topping_data?.data.filter(tr => tr.order_item_id === item.id).map(tr => {return {id: tr.id, name: tr.name, price: tr.price}});
				const sizePriceData = await get(`${process.env.BASE_URL}/v1/product_size_prices?fq=product_id:${item.product_id},size_id:${item.size_id}`, {}, 'Token').then(resp => resp?.data ?? {}).catch((e) => { });
			  return { ...item, size_price: sizePriceData?.[0]?.price, toppings };
			})
		  );
		  
		return cartWithToppings;
	}

	async create(req, res){
		try {
		// Validate
		const _check = await this.validate(req, res);
  
		if (_check == false) {
		  const _data = {};
		  const {
			order_id,
			product_id,
			size_id,
			sweetness_id,
			ice_id,
			quantity,
			unit_price,
			toppings,
			notes
		  } = req.body;
  
		//   _data.id = nanoid()
		  _data.order_id = order_id;
		  _data.product_id = product_id;
		  _data.size_id = size_id;
		  _data.sweetness_id = sweetness_id;
		  _data.ice_id = ice_id;
		  _data.quantity = quantity;
		  _data.unit_price = unit_price;
		  _data.notes = notes;
		  _data.created_at = new Date();
		  _data.updated_at = new Date();
		  await this.db.insert(_data,'id')
		  	.then(async (resp) => {
				if(toppings.length > 0){
					for (const topping of toppings) {
						await this.dbOrderItemTopping.insert({
							order_item_id: resp,
							topping_id: topping.id
						})
					}
				}
			});
		  this.response(res, 201);
		}
	  } catch (e) {
		console.log(e);
		this.response(res, 500, "System error. Please try again!!!");
	  }
	}
}