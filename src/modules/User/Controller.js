/* eslint-disable no-underscore-dangle */
/* Package System */
require("module-alias/register");
const { get } = require("@utils/Helper");

const Controller = require("@system/Controller");

/* Package Application */
module.exports = class extends Controller {
  constructor(tableName) {
    super(tableName);
  }

  // ---------- GENERAL ----------//

  async getAll(req, res) {
    try {
      const _options = {
        headers: { 'x-app-id': process.env.x_app_id }
      };
      req.query.fq = `app_id:${process.env.x_app_id}`;
      const result = await get(process.env.SSO_URL+'/admin/user_applications',req.query,req.access_token, _options);
      if(result?.status == 'success'){
        this.response(res, 200, result);
      }
    } catch (e) {
      this.response(res, 500, e.message);
    }
  }

  async getUser(req, res) {
    try {
      const _options = {
        headers: { 'x-app-id': req.headers?.['x-app-id'] ?? process.env.x_app_id }
      };
      const result = await get(process.env.SSO_URL+`/v1/get-user/${req.params.id}`,{},'', _options);
      if(result?.status == 'success'){
        this.response(res, 200, result);
      }
    } catch (e) {
      this.response(res, 500, e.message);
    }
  }
};
