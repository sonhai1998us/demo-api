/* Package System */
require('module-alias/register');
const fs = require('fs');
const path = require('path');
const router = require('express').Router();

/* Package Application */
const { trimSlash } = require('@utils/Helper');
const isAccountCMSAuth = require('@middleware/auth');
const isAccountSSOAuth = require('@middleware/authSSO');
const RateLimit = require('express-rate-limit');
const updateValueBriefLimit = RateLimit({
    windowMs: 3 * 1000, // 3s
	max: 1,
	handler: (req, res)=> {
        res.status(429).json({
			status:'error',
			errors:{
				msg:"Thao tác quá nhanh. Vui lòng thử lại sau"
			}
		})
    },
	keyGenerator: (req, res) => req.user.id
});
const unVoteLimit = RateLimit({
    windowMs: 3 * 1000, // 3s
	max: 1,
	handler: (req, res)=> {
        res.status(429).json({
			status:'error',
			errors:{
				msg:"Thao tác quá nhanh. Vui lòng thử lại sau"
			}
		})
    },
	keyGenerator: (req, res) => req.user.id
});
// Set default API response
router.get('/', (req, res) => { res.status(200).json({ status: 'success', msg: 'API Admin Service v1 Its Working.' }); });

// Setup Controller
let _router = '';
const _Controller = {};
const _Validator = {};
const _Function = {};
const _ignore = [];

fs.readdirSync(path.join(__dirname, '../modules')).map((module) => {
    if (module != '.DS_Store') {
        if (module.slice(-1) == 'y') {
            _router = `${module.slice(0, module.length - 1).toLowerCase().trim()}ies`;
        } else if (module.slice(-1) == 's') {
            _router = module.toLowerCase().trim();
        } else {
            _router = `${module.toLowerCase().trim()}s`;
        }

        // Check File Validator
        if (fs.existsSync(path.join(__dirname, `../modules/${module}/Validator.js`))) _Validator[_router] = require(`@modules/${module}/Validator`);

        _Controller[_router] = require(`@modules/${module}/Controller`);
        _Function[_router] = new _Controller[_router](_router.replaceAll('-', '_'));
        // CRUD
        if (_ignore.includes(_router) == false) {
            router.route(`/${_router}`)
                .get( (req, res) => { _Function[trimSlash(req.route.path)].getAll(req, res); })
                .post((_Validator[_router] && _Validator[_router]('create') ? _Validator[_router]('create') : (req, res, next) => next()), (req, res) => { _Function[trimSlash(req.route.path)].create(req, res); })
                .put((_Validator[_router] && _Validator[_router]('updates') ? _Validator[_router]('updates') : (req, res, next) => next()), (req, res) => { _Function[trimSlash(req.route.path)].updates(req, res); })

            router.route(`/${_router}/:id`)
                .get((req, res) => { _Function[trimSlash(req.route.path)].get(req, res); })
                .put((_Validator[_router] && _Validator[_router]('update') ? _Validator[_router]('update') : (req, res, next) => next()), (req, res) => { _Function[trimSlash(req.route.path)].update(req, res); })
                .delete((_Validator[_router] && _Validator[_router]('delete') ? _Validator[_router]('delete') : (req, res, next) => next()), (req, res) => { _Function[trimSlash(req.route.path)].delete(req, res); });
        
        }
    }
});

//SYSTEM
router.route('/set-log').post((req, res) => { _Function.logs.create(req, res); });

router.route('/print-bill').post((req, res) => { _Function.cart_items.printBill(req, res); });

//CMS
router.route('/login').post(_Validator.accounts('login'), (req, res) => _Function.accounts.login(req, res));
router.route('/token').post(_Validator.accounts('refresh'), (req, res) => _Function.accounts.refreshToken(req, res));
router.route('/me').get(isAccountCMSAuth, (req, res) => _Function.accounts.getProfile(req, res)).put(isAccountCMSAuth, (req, res) => _Function.accounts.updateProfile(req, res));

module.exports = router;
