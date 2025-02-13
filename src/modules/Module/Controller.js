"use strict";

/* Package System */
const Controller = require('@system/Controller');
const {get} = require('@utils/Helper');

module.exports = class extends Controller{

	constructor(tableName){
		super(tableName);
    }

	async getTarget(req, res) {
        try {
			let _result = {};
            const module = await this.db.find({query:{fq:`module:${req.params.module}`,limit:1}}).then(resp=>resp?.data?.[0]??{}).catch(e=>{});
			if(module?.id){
				const initkeyTarget = ['id','name','slug','title','app_id'];
				let dataTarget = await get(`${process.env.BASE_URL}/v1/${module.module}?fqnull=deleted_at&limit=1000`,{},'Token').then(resp=>resp?.data ??[]).catch(e=>[]);
				let _revarm = [];
				let _keyTarget = [];
				dataTarget?.forEach((data,ind)=>{
					const _temp = {}
					if(ind == 0){
						initkeyTarget.forEach(key=>{
							if(typeof data?.[key] != 'undefined'){
								_temp[key] = data[key];
								_keyTarget.push(key)
							}
						});
					} else _keyTarget.forEach(key=>{
						if(typeof data?.[key] != 'undefined'){
							_temp[key] = data[key];
						}
					});
					_revarm.push(_temp)
				})
				_result={keyTarget:_keyTarget,dataTarget:_revarm}
			}
            this.response(res, 200,_result);
        } catch (e) {
            this.response(res, 500, e.message);
        }
    }

	async get(req, res) {
        try {
            const _conditions = {};
            _conditions.id = req.params.id;
            const _result = await this.db.get(_conditions, true);
			if(_result?.dependency_modules)_result.dependency_modules = _result.dependency_modules.split(',');
            this.response(res, 200, { data: _result });
        } catch (e) {
            this.response(res, 500, e.message);
        }
    }
}