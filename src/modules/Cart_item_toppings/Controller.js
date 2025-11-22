"use strict";

/* Package System */
const Controller = require('@system/Controller');
const {get} = require('@utils/Helper');

module.exports = class extends Controller{

	constructor(tableName){
		super(tableName);
    }

	// async create(req, res){
	// 	try {
	// 		const {cart_item_id, topping_id, quantity} = req.body;
	// 		const data = {cart_item_id, topping_id, quantity};
	// 		console.log('data',req.body);
	// 		const _checkExist = await this.db.find({
	// 			query: {
	// 				where: {
	// 					cart_item_id: cart_item_id,
	// 					topping_id: topping_id
	// 				}
	// 			}
	// 		});
	// 		// console.log('_checkExist',_checkExist);
	// 		// if(_checkExist.data.length > 0){
	// 		// 	await this.db.update({...data, quantity: _checkExist.data[0].quantity + quantity}, {id: _checkExist.data[0].id});
	// 		// }else{
	// 		// 	await this.db.insert(data);
	// 		// }
	// 		this.response(res, 201);
	// 	} catch (e) {
	// 		console.log(e);
	// 		this.response(res, 500, "System error. Please try again!!!");
	// 	}
	// }
}