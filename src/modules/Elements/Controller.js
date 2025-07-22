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
                _data.data = await this.rempDataTemplates(_data.data,req.access_token);
            const _result = _data == null ? { items: [] } : _data;
            this.response(res, 200, _result);
        } catch (e) {
            this.response(res, 500, e.message);
        }
    }

	async rempDataTemplates(data, access_token){
        return new Promise(async (resolve)=>{
            for (const item of data) {
                item.templates = await get(`${process.env.BASE_URL}/v1/templates/${item.id}`,{},access_token).then(res=>res?.data ?? []).catch(e=> console.log('e',e));
            }
            resolve(data)
        })
    }

}