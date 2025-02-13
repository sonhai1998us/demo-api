"use strict";

class Middleware {
	validateContentType = (req, res, next) => {
		return (req, res, next) => {
			if (req.method == 'POST' || req.method == 'PUT' || req.method == 'PATCH') {
				if(req.is('application/json') || req.is('multipart/form-data')){
					next();
				} else {
					res.status(406).json({
						status: 'error',
						errors: { msg: 'Content Type specified is not supported' }
					});
				}
			} else {
				next();
			}
		}
	}
}

module.exports = new Middleware;