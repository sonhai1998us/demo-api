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