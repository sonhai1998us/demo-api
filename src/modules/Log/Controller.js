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
            const items = [];
			const type = req?.query?.aggs ?? '';
			if ((type == '' && _data?.total && _data?.total > 0) || (type != '' && _data?.data?.length > 0)){
				const _items = await Promise.all(
					_data.data.map((v) => this.getDataById(v, req.access_token, type).then((resp) => resp).catch((e) => {})),
				).then((resp) => resp);
				_data.data.forEach((v, k) => { items[k] = _items[k] ?? []; });
			}
			const _result = _data?.data == null ? { data: [], total: 0 } : { data:items, total: _data?.total };
			if (_data?.nextPage) _result.next_page = _data.nextPage;
			this.response(res, 200, _result);
        } catch (e) {
            this.response(res, 500, e.message);
        }
    }

	async getDataById(_result, _access_token, _type) {
        try {
            if (_result) {
				if(_type == ''){
					if(_result.account_id){
						const accountInfo  = await get(`${process.env.BASE_URL}/v1/accounts/${_result.account_id}`,{},'Token').then(resp=>resp?.data ?? {}).catch((e) => {});
						if(accountInfo?.id && typeof accountInfo.id !== 'undefined'){
							_result.email= accountInfo.email ?? '';
						}
					}
				}else{
					if(_type == 'account_id'){
						const accountInfo  = await get(`${process.env.BASE_URL}/v1/accounts/${_result.account_id}`,{},'Token').then(resp=>resp?.data ?? {}).catch((e) => {});
						if(accountInfo?.id && typeof accountInfo.id !== 'undefined'){
							_result.title= accountInfo.email ?? '';
							_result.id = _result.key;
						}
					}else{
						if(typeof _result.key !== undefined){
							_result.title = _result.key;
							_result.id = _result.key;
						}
					}
				}
            }
            return _result;
        } catch (e) {
            return e.message;
        }
    }

}