"use strict";

/* Package System */
const jwt = require('jsonwebtoken');
const { get,compareTokenShare } = require('@utils/Helper');
const Model = require('@system/Model');
module.exports = async (req, res, next) => {
	try {
		let _authorization = req.headers.authorization;
		if (!_authorization) return res.status(401).json({ status: 'error', errors: { msg: 'Authorization required' } });

		let [_authType, _token] = _authorization.trim().split(' ');
		if (_authType !== 'Bearer') return res.status(401).json({ status: 'error', errors: { msg: 'Incorrect Authorization' } });
		if (_authType == 'Bearer') {
			if(/^[0-9]{13}_.*/.test(_token) && req.method == 'GET' && req.route.path != '/get-briefs'){
				if (compareTokenShare(_token) == false) return res.status(400).json({ status: 'error', errors: { msg: 'Invalid token' } });
				req.access_token = _token;
				return next();
			}
			const profile = await get(`${process.env.SSO_URL}/v1/me`,{},_token,{headers:{'x-app-id':req.headers['x-app-id']}}).then(res=>res?.result).catch(e=>{});
			if(!profile){
				return res.status(400).json({ status: 'error', errors: { msg: 'Invalid token' } });
			}
			if(profile.app_id != req.headers['x-app-id']){
				return res.status(400).json({ status: 'error', errors: { msg: 'Tài khoản chưa đăng ký' } });
			}
			req.access_token = _token;
			if(req?.route?.path != '/brief-step/:id/:step_id')
            	req.body.user_id = profile?.id;
			req.user = profile;
        }
		next();
	} catch (error) {
		console.log(error)
		if (error.name == 'TokenExpiredError') return res.status(401).json({ status: 'error', code: error.name, errors: { msg: error.message } });
		else return res.status(400).json({ status: 'error', errors: { msg: 'Invalid token' } });
	}
}