const Model = require('@system/Model');
const _ = require('lodash');
class CheckModel {
    constructor(tableName) {
        this.db = new Model(tableName);
    }

    async checkExists(key, value, current_id = null) {
        return new Promise((resolve, reject) => {
            const query = {
                fq: `${key}:${value}`,
                limit: 1,
                fqnull: 'deleted_at'
            };
            if (current_id) {
                query.fqnotin = `id: ${current_id}`;
            }
            this.db.find({ query: query }).then((result) => {
                if (result?.data?.[0]?.id) {
                    reject(`${key}: ${value} đã tồn tại`);
                } else {
                    resolve(false);
                }
            })
                .catch((e) => {
                    reject("Server Error, Please try again later");
                });
        });
    }

    async checkValid(key, value, current_id = null) {
        return new Promise((resolve, reject) => {
            const query = {
                fq: `${key}:${value}`,
                limit: 1,
                fqnull: 'deleted_at'
            };
            if (current_id) {
                query.fqnotin = `id: ${current_id}`;
            }
            this.db.find({ query: query }).then((result) => {
                if (result?.data?.[0]?.id) {
                    resolve(false);
                    
                } else {
                    reject(`${key}: ${value} không tồn tại`);
                }
            })
                .catch((e) => {
                    reject("Server Error, Please try again later");
                });
        });
    }

    async checkValidArray(key, value, current_id = null) {
        return new Promise((resolve, reject) => {
            const query = {
                fqin: `${key}:${value}`,
                limit: 1,
                fqnull: 'deleted_at'
            };
            if (current_id) {
                query.fqnotin = `id: ${current_id}`;
            }
            this.db.find({ query: query }).then((result) => {
                if (result?.data?.[0]?.id && (result?.total == _.split(value,',').length)) {
                    resolve(false);
                    
                } else {
                    reject(`${key}: ${value} không tồn tại`);
                }
            })
                .catch((e) => {
                    console.log(e.message);
                    reject("Server Error, Please try again later");
                });
        });
    }
}

module.exports = CheckModel;