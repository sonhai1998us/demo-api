"use strict";

const { check } = require('express-validator');

module.exports = (type) => {
    switch (type) {
        case 'getAll': {
            return [
                check('startDate').optional().isDate().withMessage('Start date must be a valid date (YYYY-MM-DD)'),
                check('endDate').optional().isDate().withMessage('End date must be a valid date (YYYY-MM-DD)'),
                check('type').optional().isIn(['day', 'month']).withMessage('Type must be either "day" or "month"'),
                check('scope').optional().isIn(['revenue', 'product']).withMessage('Scope must be either "revenue" or "product"')
            ];
        }
        default:
            return false;
    }
};
