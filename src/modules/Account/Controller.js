/* eslint-disable no-underscore-dangle */
/* Package System */
require("module-alias/register");
const { fetchApi, genToken, changeToSlug } = require("@utils/Helper");
const Controller = require("@system/Controller");
const axios = require('axios');
const Model = require('@system/Model');
const _ = require('lodash');
/* Package Application */
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { nanoid } = require("nanoid");
const { formatEmail, extractBase64 } = require("@utils/Helper");

module.exports = class extends Controller {
  constructor(tableName) {
    super(tableName);
    this.db = new Model('accounts')
    this.dbLog = new Model('logs');
  }

  // ---------- GENERAL ----------//
  async checkExists(email) {
    return new Promise((resolve, reject) => {
      this.db.find({query:{fq:`email:${formatEmail(email)}`,limit:1,fqnull:'deleted_at'}}).then((result) => {
          if (result?.data?.[0]?.id) {
            reject("Email đã được đăng ký");
          } else {
            resolve(false);
          }
        })
        .catch((e) => {
          reject("Server Error, Please try again later");
        });
    });
  }

  async checkAccount(email, req) {
    return new Promise((resolve, reject) => {
      const _conditions = {};
      email = req.body.email;
      _conditions.fq = `email:${formatEmail(req.body.email)}`;
      
      this.db
        .get(_conditions, true)
        .then((data) => {
          if (data) {
            // console.log('_account',result)
            if (data.status == 2) {
              reject("Tài khoản của bạn đã bị khóa");
            } else if (data.status == 1) {
              resolve(data);
            } else {
              reject("Server Error, Please try again later");
            }
          } else {
            reject("Email chưa được đăng ký");
          }
        })
        .catch((e) => {
          console.log(e);
          reject("Server Error, Please try again later");
        });
    });
  }
  async checkNewPassword(val, req) {
    return new Promise((resolve, reject) => {
      const _conditions = {};
      // email = req.body.email;
      _conditions.fq = `id:${req.params.id}`;
      // console.log(req.body.email)
      this.db
        .get(_conditions, true)
        .then((result) => {
          if (result) {
            if (req.body.oldPassword == val) {
              reject("Mật khẩu mới không được trùng với mật khẩu cũ");
            } else {
              resolve(result);
            }
          }
        })
        .catch((e) => {
          console.log(e);
          reject("Server Error, Please try again later");
        });
    });
  }
  // ---------- END GENERAL ----------//

  async create(req, res) {
    try {
      // Validate
      const _check = await this.validate(req, res);

      if (_check == false) {
        const _data = {};
        const {
          email,
          password,
          status,
          role_id
        } = req.body;

        _data.id = nanoid()
        _data.email = email;
        _data.password = bcrypt.hashSync(password, bcrypt.genSaltSync(12));
        _data.status = status;
        _data.role_id = role_id;
        _data.created_at = new Date();
        _data.updated_at = new Date();
        await this.db.insert(_data);
        this.response(res, 201);
      }
    } catch (e) {
      console.log(e);
      this.response(res, 500, "System error. Please try again!!!");
    }
  }

  async update(req, res) {
    try {
        // Validate
        const _check = await this.validate(req, res);

        if (_check == false) {
            let _data = {};
            _data = req.body;
            _data.updated_at = new Date();
            if (_data.password && _data.password != '') _data.password = bcrypt.hashSync(_data.password, bcrypt.genSaltSync(12));
            if(_data.password=='') delete _data.password;

            this.db.update({ id: req.params.id }, _data);
            this.response(res, 200);
        }
    } catch (e) {
        this.response(res, 500, e.message);
    }
}

  async login(req, res) {
    try {
      // Validate
      const _check = await this.validate(req, res);

      if (_check == false && req.account) {
        const { email, password, remember } = req.body;

        if (
          bcrypt.compareSync(password, req.account.password) &&
          email === req.account.email
        ) {
          const _account = req.account;
          const _refresh_token = nanoid();
          const _expires =
            remember && remember == true
              ? Date.now() + 30 * 86400 * 1000
              : Date.now() + 86400 * 1000;

          _account.access_token = jwt.sign(
            { id: _account.id, role_id: _account?.role_id ?? "" },
            process.env.SECRET_KEY,
            { expiresIn: 30 * 60 }
          );
          _account.refresh_token = req.account?.refresh_token
            ? req.account?.refresh_token
            : _refresh_token;
          _account.expires = _expires;
          _account.token_type = "Bearer";
          delete _account.password;
          delete _account.is_deleted;
          delete _account.updated_at;
          delete _account.status;

          // Update RefreshToken
          this.db.update(
            { id: _account.id },
            { refresh_token: _account.refresh_token, token_expires: _expires }
          );
          _account.permissions = await this.getPermissions(_account.id,_account.role_id,0);
          _account.is_admin = _account.id == process.env.ADMIN_ID ? true : false;
          // Add login log
          this.dbLog.insert({
            account_id: _account.id,
            type: 'Login',
            module: 'accounts',
            item_id: _account.id,
            is_deleted: false,
            created_at: new Date(),
            updated_at: new Date()
          });
          this.response(res, 200, { result: _account });
        } else {
          this.response(res, 400, "Thông tin tài khoản không đúng");
        }
      }
    } catch (e) {
      console.log(e);
      this.response(res, 500);
    }
  }

  async refreshToken(req, res) {
    try {
      // Validate
      const _check = await this.validate(req, res);
      if (_check == false) {
        if (req.body.refreshToken != req.account.refresh_token)
          return this.response(res, 400, "Mã làm mới không đúng");
        if (Date.now() >= new Date(req.account.token_expires).getTime())
          return this.response(res, 400, "Mã làm mới hết hiệu lực");

        const _access_token = jwt.sign(
          { id: req.account.id, role_id: req.account?.role_id ?? "" },
          process.env.SECRET_KEY,
          { expiresIn: 30 * 60 }
        );

        const _time = 86400000 - (new Date(req.account.token_expires * 1000).getTime() - Date.now());
        const _expires = new Date(req.account.token_expires * 1000).getTime() + _time;

        const _dataUpdate = {
          token_expires: _expires,
          updated_at: new Date(),
        };
        this.db.update({ id: req.account.id }, _dataUpdate);

        this.response(res, 200, {
          access_token: _access_token,
          refresh_token: req.account.refresh_token,
          expires: _expires,
          token_type: "Bearer",
        });
      }
    } catch (e) {
      console.log(e);
      this.response(res, 500);
    }
  }

  async getProfile(req, res) {
    try {
      // Validate
      const _check = await this.validate(req, res);
      if (_check == false && req.account) {
        
        let _conditions = {};
        _conditions.fq = `id:${req.account.id}`;
        const _account = await this.db.get(_conditions, true);
        _account.permissions = await this.getPermissions(_account.id,_account.role_id,0);
        _account.is_admin = _account.id == process.env.ADMIN_ID ? true : false;
        delete _account.password;
        delete _account.refresh_token;
        delete _account.is_deleted;
        delete _account.updated_at;
        delete _account.status;
        this.response(res, 200, { result: _account });
      }
    } catch (e) {
      console.log(e);
      this.response(res, 500);
    }
  }

  async updateProfile(req, res) {
    try {
        // Validate
        const _check = await this.validate(req, res);

        if (_check == false && req.account) {
            let _data = {};
            _data = req.body;
            const _account = await this.db.get({ id: req.account.id });
            if (_data?.newPassword) {
                if (!bcrypt.compareSync(_data.oldPassword, _account.password)) return this.response(res, 400, 'Mật khẩu cũ của bạn không đúng');
                _data.password = bcrypt.hashSync(_data.newPassword, bcrypt.genSaltSync(12));
            }
            if (_data?.avatar) {
                try {
                    const _year = this.moment().format('YYYY');
                    const _month = this.moment().format('MM');
                    const _parse = extractBase64(_data.avatar.file);
                    const _name = `avatars/${_year}/${_month}/${nanoid()}.${_parse.ext}`;
                    const _type = `${_parse.type}/${_parse.ext}`;
                    const _upload = await this.uploadFile(_name, _data.avatar.file, _type);
                    if (_upload == true) _data.avatar = _name;
                } catch (e) {
                    console.log(e);
                    return this.response(res, 500, 'Upload failure, please try again');
                }
            }

            this.db.update({ id: req.account.id }, _data);
            this.response(res, 200);
        }
    } catch (e) {
        console.log(e);
        this.response(res, 500);
    }
  }

  async getAll(req, res) {
      try {
          if(!req.query?.fqnull) req.query.fqnull = "deleted_at"
          req.query.joinQueries = [{
              fieldJoin: 'role_id',
              fieldTarget: 'id',
              table: 'roles',
              mergeField: 'roles.name as role_name',
          }];
          const _data = await this.db.find(req);
          let _items = _data.data.filter((v) => (v.id !== process.env.ADMIN_ID));
          this.response(res, 200, ( _data == null ? [] : {data:_items,total:_data.total}));
      } catch (e) {
          this.response(res, 500, e.message);
      }
  }

  async checkRole(req,role_id=''){
    return new Promise(async(resolve, reject) => {
      if(req.account.id == process.env.ADMIN_ID) resolve(false);
      if(role_id != ''){
          const result = await axios.get(`${process.env.BASE_URL}/v1/roles/${role_id}`, { headers: { Authorization: `Token ${genToken()}` } }).then((resp) => resp?.data?.data ?? '{}' ).catch((e) => {});
          if (result) {
              let _module = req?.headers['x-aio-module']??'';
              const dependencyModule = req?.headers['x-dependency-module']??'';
              let _permission = JSON.parse(result?.permissions);
              if(req.account.id == process.env.MANAGER_ID && _module == 'modules'){
                const showModules = Object.entries(_permission).filter(([key, value]) => value.read == true).map(([key, value]) => key);
                req.query.fqin = `module:${showModules.toString(',')}`;
                _permission = _.set(_permission,_module,{read:true});
              }
              if(_module){
                  switch(req.method){
                      case 'GET':
                          if(_permission[_module]){
                              if(_permission[_module].read==true) resolve(false);
                          }
                          if(dependencyModule && _permission[dependencyModule]?.dependency_modules && _permission[dependencyModule].dependency_modules.split(',').includes(_module)){
                            if(_permission[dependencyModule]?.read==true) resolve(false);
                          }
                          break;
                      case 'POST':
                        if(_permission[_module]){
                          if(_permission[_module].create==true) resolve(false);
                        }
                        break;
                      case 'PUT':
                          if(_permission[_module]){
                              if(_permission[_module].write==true) resolve(false);
                          }
                          break;
                      case 'DELETE':
                          if(_permission[_module]){
                              if(_permission[_module].delete==true) resolve(false);
                          }
                          break;
                      default:
                          resolve(true);
                  }
              }
              resolve(true);
          } else {
              resolve(true);
          }
        }
    });
  }

  async checkDBFilter(req,role_id=''){
    let _r = {};
    try{
      if(req.account.id == process.env.ADMIN_ID) return _r;
      if(role_id != ''){
          const result = await axios.get(`${process.env.BASE_URL}/v1/roles/${role_id}`, { headers: { Authorization: `Token ${genToken()}` } }).then((resp) => resp?.data?.data ?? '{}' ).catch((e) => {});
          if (result) {
              let _module = req?.headers['x-aio-module']??'';
              let _dbFilters = JSON.parse(result?.db_filters);
              if(typeof(_dbFilters[_module])!=='undefined' && req.method!=='DELETE'){
                _r = _dbFilters[_module];
              }
          }
          return _r;
      }
    } catch (e) {
      return _r;
    }
  }

  async getPermissions(_id, _role_id, _type){
    try {
        const _modules = await axios.get(`${process.env.BASE_URL}/v1/modules?limit=1000&sort=-name`, { headers: { Authorization: `Token ${genToken()}` } }).then((resp) => resp.data).catch((e) => {});
       console.log(`${process.env.BASE_URL}/v1/modules?limit=1000&sort=-name`,_modules);
        let _permissions = {};

        if(_id !== process.env.ADMIN_ID){
          const _role = await axios.get(`${process.env.BASE_URL}/v1/roles/${_role_id}`, { headers: { Authorization: `Token ${genToken()}` } }).then((resp) => resp.data.data).catch((e) => {});
          _permissions = JSON.parse(_role.permissions);
        }
        const r = {};

        await _modules.data.forEach(async(v) => {
          if((_id !== process.env.ADMIN_ID && (v?.module in _permissions) && _permissions[v?.module].read == true && v?.status && v.status && v?.module && v?.name) || (_id == process.env.ADMIN_ID && v?.status && v.status && v?.module && v?.name)){
            let n = v.name.split(' - ');
            let n0 = typeof n[0] !== 'undefined' ? changeToSlug(n[0]) : '';
            let n1 = typeof n[1] !== 'undefined' ? changeToSlug(n[1]) : '';
            let n2 = typeof n[2] !== 'undefined' ? changeToSlug(n[2]) : '';
            let _mainIcon = '';
            let _subIcon = '';
            if(v.icon?.split(',').length > 1){
              _mainIcon = v.icon.split(',')[0];
              _subIcon = v.icon?.split(',')[1];
            }else if(v.icon?.split(',').length == 1){
              _subIcon = v.icon?.split(',')[0];
            }
            if (n0 !== '' && !(n0 in r)) {
                r[n0] = r[n0] ?? {'lv' : 0,'title' : n[0], 'items' : {}, 'sort_order':0, 'is_function':v.is_function, icon: _mainIcon};
            }
            if ((n0 in r) && n1 !== '' && !(n1 in r[n0].items)) {
                r[n0].items[n1] = r[n0].items[n1] ?? ((n2 !== '') ? {'lv' : 1,'title' : n[1], 'items' : {},'is_function': v.is_function, v: v.name, icon: _subIcon} : {'lv' : 1,'title' : n[1], 'module' : v.module, 'sort_order' : v.sort_order, 'is_function': v.is_function, v: v.name, icon: _subIcon}) ;
            }
            if ((n0 in r) && (n1 in r[n0].items) && n2 !== '' && !(n2 in r[n0].items[n1])) {
                r[n0].items[n1].items[n2] = r[n0].items[n1].items[n2] ?? {'lv' : 2,'title' : n[2], 'module' : v.module, 'sort_order' : v.sort_order, 'is_function': v.is_function};
                r[n0].items[n1].modules = r[n0]?.items[n1]?.modules ? r[n0]?.items[n1]?.modules+','+v.module : v.module;
            }
            r[n0].sort_order = v.sort_order > r[n0].sort_order ? v.sort_order : r[n0].sort_order;
            if(r[n0].items?.[n1]){
              r[n0].items[n1].sort_order = v.sort_order > (r[n0].items[n1].sort_order ?? 0) ? v.sort_order : r[n0].items[n1].sort_order;
            }
          }
        });
        const _r = _.orderBy(r, [(item) => {return item.sort_order;}], ['asc']);
        return JSON.stringify(_r);
    } catch (e) {return []}
  }
};
