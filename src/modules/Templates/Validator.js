"use strict";

/* Package System */
const fs = require('fs');
const {check} = require('express-validator');

/* Application */
const Controller = require('./Controller');
const Function = new Controller('modules');

module.exports=method=>{
	let _validation = [];

	switch(method){
		case 'create':
			break;
		case 'update':
			_validation = [
				check('id','Trường Id là bắt buộc').not().isEmpty(),
				check('dependency_modules').optional().customSanitizer(value=>value.toString())
			]
			break;
		case 'delete':
			break;
		case 'deleteAll':
			break;
		case 'updateStatus':
			break;
	}

	return _validation;
}