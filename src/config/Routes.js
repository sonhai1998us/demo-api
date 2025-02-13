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
                .get(isAccountCMSAuth, (req, res) => { _Function[trimSlash(req.route.path)].getAll(req, res); })
                .post(isAccountCMSAuth, (_Validator[_router] && _Validator[_router]('create') ? _Validator[_router]('create') : (req, res, next) => next()), (req, res) => { _Function[trimSlash(req.route.path)].create(req, res); })
                .put(isAccountCMSAuth, (_Validator[_router] && _Validator[_router]('updates') ? _Validator[_router]('updates') : (req, res, next) => next()), (req, res) => { _Function[trimSlash(req.route.path)].updates(req, res); })

            router.route(`/${_router}/:id`)
                .get(isAccountCMSAuth, (req, res) => { _Function[trimSlash(req.route.path)].get(req, res); })
                .put(isAccountCMSAuth, (_Validator[_router] && _Validator[_router]('update') ? _Validator[_router]('update') : (req, res, next) => next()), (req, res) => { _Function[trimSlash(req.route.path)].update(req, res); })
                .delete(isAccountCMSAuth, (_Validator[_router] && _Validator[_router]('delete') ? _Validator[_router]('delete') : (req, res, next) => next()), (req, res) => { _Function[trimSlash(req.route.path)].delete(req, res); });
        
        // CUSTOM
        if (_router == 'variants') {
            router.route(`/variants/createOrUpdates`)
                .post(isAccountCMSAuth,_Validator.variants('createOrUpdate'), (req, res) => { _Function.variants.createOrUpdate(req, res); });
            }    
        }
    }
});

//SYSTEM
router.route('/set-log').post((req, res) => { _Function.logs.create(req, res); });

//CMS
router.route('/login').post(_Validator.accounts('login'), (req, res) => _Function.accounts.login(req, res));
router.route('/token').post(_Validator.accounts('refresh'), (req, res) => _Function.accounts.refreshToken(req, res));
router.route('/me').get(isAccountCMSAuth, (req, res) => _Function.accounts.getProfile(req, res)).put(isAccountCMSAuth, (req, res) => _Function.accounts.updateProfile(req, res));
router.route('/briefs/:id/share')
.get(isAccountCMSAuth,(_Validator.briefs && _Validator.briefs('share') ? _Validator.briefs('share') : (req, res, next) => next()), (req, res) => { _Function.briefs.share(req, res); })
router.route('/briefs/clone')
.post(isAccountSSOAuth,(_Validator.briefs && _Validator.briefs('clone') ? _Validator.briefs('clone') : (req, res, next) => next()), (req, res) => { _Function.briefs.clone(req, res); })

//FE
router.route('/get-briefs').get(isAccountSSOAuth,(req, res) => _Function.briefs.getAll(req, res));
router.route('/get-briefs/:id')
.get(isAccountSSOAuth,(req, res) => _Function.briefs.get(req, res))
.put(isAccountSSOAuth,(_Validator.briefs && _Validator.briefs('update') ? _Validator.briefs('update') : (req, res, next) => next()), (req, res) => _Function.briefs.update(req, res))
.delete(isAccountSSOAuth,(req, res) => _Function.briefs.delete(req, res));

router.route('/create-briefs')
.post(isAccountSSOAuth,(_Validator.briefs && _Validator.briefs('create') ? _Validator.briefs('create') : (req, res, next) => next()), (req, res) => _Function.briefs.create(req, res));
router.route('/get-steps').get(isAccountSSOAuth,(req, res) => _Function.steps.getAll(req, res));
router.route('/get-attributeitem-options').get(isAccountSSOAuth,(req, res) => _Function.attributeitemoptions.getAll(req, res));
router.route('/get-attributeitems').get(isAccountSSOAuth,(req, res) => _Function.attributeitems.getAll(req, res));
router.route('/get-brief-targets').get(isAccountSSOAuth,(req, res) => _Function.brieftargets.getAll(req, res));
router.route('/create-brief-step').post(isAccountSSOAuth, (req, res) => _Function.briefsteps.create(req, res));

router.route('/get-brief-variants').get(isAccountSSOAuth,(_Validator.briefs && _Validator.briefs('get-data') ? _Validator.briefs('get-data') : (req, res, next) => next()),(req, res) => _Function.briefs.getDataBrief(req, res));

router.route('/get-category-attributes/:product_category_type_id').get(isAccountSSOAuth,(req, res) => _Function.productcategoryattributes.getByProductCategory(req, res));

router.route('/get-stepfields').get(isAccountSSOAuth,(req, res) => _Function.stepfields.getAll(req, res));

router.route('/brief-step/:id/:step_id')
.get(isAccountSSOAuth,(_Validator.briefs && _Validator.briefs('get-value-brief') ? _Validator.briefs('get-value-brief') : (req, res, next) => next()),(req, res) => _Function.briefs.getValueBrief(req, res)) 
.put(isAccountSSOAuth,updateValueBriefLimit,(_Validator.briefs && _Validator.briefs('update-value-brief') ? _Validator.briefs('update-value-brief') : (req, res, next) => next()),(req, res) => _Function.briefs.createOrUpdateValueBrief(req, res));

router.route('/brief-steps')
.get(isAccountSSOAuth, (req, res) => { _Function.briefsteps.getAll(req, res); })
.post(isAccountSSOAuth, (req, res) => { _Function.briefsteps.create(req, res); })
.put(isAccountSSOAuth, (req, res) => { _Function.briefsteps.update(req, res); });
router.route('/brief-steps/:id')
.get(isAccountSSOAuth, (req, res) => { _Function.briefsteps.get(req, res); })
.put(isAccountSSOAuth,(_Validator.briefsteps && _Validator.briefsteps('update') ? _Validator.briefsteps('update') : (req, res, next) => next()),(req, res) => { _Function.briefsteps.update(req, res); })
module.exports = router;
