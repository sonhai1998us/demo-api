"use strict";

/* Package System */
const fs = require('fs');
const {check} = require('express-validator');

/* Application */
const Controller = require('./Controller');
const Function = new Controller('accounts');

module.exports=method=>{
	let _validation = [];

	switch(method){
		case 'create':
			_validation = [
				check('email').not().isEmpty().withMessage('Trường email là bắt buộc')
					.isEmail().withMessage('Email invalidate')
					.custom(async(value,{req})=>await Function.checkExists(value)),
				check('password').not().isEmpty().withMessage('Trường mật khẩu là bắt buộc')
					.isLength({min:6}).withMessage('Mật khẩu của bạn phải có ít nhất 6 ký tự')
			]
			break;
		case 'update':
			_validation = [
				check('oldPassword','Trường mật khẩu cũ là bắt buộc')
					.isLength({min:6}).withMessage('Mật khẩu của bạn phải có ít nhất 6 ký tự')
					.optional()
					.custom((value,{req})=>((value==''&&req.body.oldPassword!='')?false:true)),
				check('newPassword','Trường mật khẩu mới là bắt buộc')
					.isLength({min:6}).withMessage('Mật khẩu của bạn phải có ít nhất 6 ký tự')
					.matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/).withMessage('Mật khẩu của bạn phải chứa ký tự đặc biệt')
					.optional()
					.custom((value,{req})=>((value==''&&req.body.newPassword!='')?false:true))
					.custom(async(val,{req})=>{
						await Function.checkNewPassword(val, req);
						
					}),
			]
			break;
		case 'delete':
			_validation = [
				check('id','Trường Id là bắt buộc').not().isEmpty()
			]
			break;
		case 'deleteAll':
			_validation = [
				check('ids','Trường Id là bắt buộc').not().isEmpty()
			]
			break;
		case 'updateStatus':
			_validation = [
				check('id','Trường Id là bắt buộc').not().isEmpty(),
				check('status','Trường status là bắt buộc').not().isEmpty()
			] 
			break;
		case 'login':
			_validation = [
				check('email').trim().not().isEmpty().withMessage('Trường email là bắt buộc')
					.custom(async(value,{req})=>{
						let _result = await Function.checkAccount(value, req);
						req.account = _result;
					}),
				check('password','Trường mật khẩu là bắt buộc').not().isEmpty()
			]
			break;
		case 'updateProfile':
			_validation = [
				check('oldPassword','Trường mật khẩu cũ là bắt buộc')
					.optional()
					.custom((value,{req})=>((value==''&&req.body.newPassword!='')?false:true)),
				check('newPassword','Trường mật khẩu mới là bắt buộc')
					.optional()
					.custom((value,{req})=>((value==''&&req.body.oldPassword!='')?false:true))
			]
			break;
		case 'refresh':
			_validation = [
				check('email').trim().not().isEmpty().withMessage('Trường email là bắt buộc')
					.custom(async(value,{req})=>{
						let _result = await Function.checkAccount(value, req);
						req.account = _result;
					}),
				check('refreshToken').not().isEmpty().withMessage('Trường mã làm mới là bắt buộc')
			]
			break;
	}

	return _validation;
}