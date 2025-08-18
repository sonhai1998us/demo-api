"use strict";

/* Package System */
require('dotenv').config();
require('module-alias/register');
const { v4: uuidV4 } = require('uuid');
const moment = require('moment');
const { default: axios } = require('axios');

/* Package Application */
const connectionDefault = require('./Connection')();
const TABLELOGS = 'logs';
const INSERT = 'Insert';
const UPDATE = 'Update';
const DELETE = 'Delete';
module.exports = class Builder {
  constructor(tableName, databaseName) {
    this.tb = tableName;
    if(databaseName){
      switch(databaseName){
          default:
            this.connection =  connectionDefault;
            break;
      }
    }
  }

  async insert({ data, returnField = '', shouldInsertId = true }) {
    try {
      const [result] =  await this.connection.promise().query(`INSERT INTO ${this.tb} SET ?`, data);
      if([result.insertId] && this.tb !== TABLELOGS) await this.setlog(INSERT, this.tb, [result.insertId]);
      if(returnField != ''){
        // const [[insertedID]]= await this.connection.promise().query('SELECT LAST_INSERT_ID()')
        const [[insertedData]] = await this.connection.promise().query(`SELECT ${returnField} FROM ${this.tb} WHERE id=?`, [result.insertId]);
        return insertedData[returnField]
      } else {
        return true;
      }
    } catch (e) {
      console.log(`Error while inserting data to table ${this.tb} - Error: ${JSON.stringify(e)}`);
      throw new Error(e.message);
    }
  }

  async update({ conditions, data, setlog=true }) {
    try {
      if (!data || !Object.keys(data)) {
        return true;
      }

      let conditionQuery = '';

      if (conditions['id'] !== undefined) {
        data.id = conditions.id;

        conditionQuery = `id = '${conditions.id}'`;
      } else {
        for(let i = 0; i < Object.keys(conditions).length;i++){
          const key =Object.keys(conditions)[i];
          conditionQuery += i>0 ? ' AND ' : '';
          conditionQuery += `${key} = '${conditions[key]}'`;
        }
      }

      let updateValueQuery = '';

      for (const key in data) {
        updateValueQuery = updateValueQuery ? `${updateValueQuery}, ${key}=?` : `${key}=?`;
      }

      const rawUpdateQuery = `
        UPDATE ${this.tb}
        SET ${updateValueQuery}
        WHERE ${conditionQuery};
      `;
      // console.log("rawUpdateQuery",rawUpdateQuery)
      if(this.tb !== TABLELOGS && setlog) await this.setlog(UPDATE, this.tb, data.id,{...data}).catch(e=>'');
      await this.connection.promise().query(rawUpdateQuery, Object.values(data));
      return true;
    } catch (e) {
      throw new Error(e.message);
    }
  }

  async delete({ conditions, purge }) {
    try {
      let id = '';

      if (conditions['id'] !== undefined) {
        id = conditions['id'];
      }

      const rawQuery = `
        DELETE FROM ${this.tb} WHERE id='${id}';
      `;
      if (purge == true) {
        await this.connection.promise().query(rawQuery);
      } else {
        await this.update({ conditions, data: { deleted_at: new Date() },setlog:false });
      }
      if(this.tb !== TABLELOGS) await this.setlog(DELETE, this.tb, id);
      return true;
    } catch (e) {
      throw new Error(e.message);
    }
  }

  async get({ conditions }) {
    try {
      let id = '';
      if (conditions['id'] !== undefined) {
        // console.log("có id get")
        id = conditions['id'];
        // console.log("id: " + id)
        const rawQuery = `SELECT * FROM ${this.tb} WHERE id=?;`;
        let [[data = null]] = await this.connection.promise().query(rawQuery, [id]);
        // console.log('data get từ id ra',data)
        return data;
      }
      else {
        const { data = [] } = await this.find({
          conditions: { query: { ...conditions, limit: 1 } },
        });
        // console.log('data get từ find ra',data)
        return data.length ? data[0] : null;
      }
      
    } catch (e) {
      throw new Error(e.message);
    }
  }

  async find({ conditions }) {
    try {
      let whereQuery = ''
      let rawQuery = `SELECT DISTINCT ${this.tb}.* FROM ${this.tb} `;
      const params = [];
      let _where = conditions?.query?.fq ?? '';
      let _findInSet = conditions?.query?.fis ?? ''; // 'parent_ids:1,2|parent_ids:3,4' <=> find_in_set(1,parent_ids) and find_in_set(2,parent_ids) or 
      let _whereIn = conditions?.query?.fqin ?? '';
      let _whereNotIn = conditions?.query?.fqnotin ?? '';
      let _whereRange = conditions?.query?.fqrange ?? '';
      let _whereRangeTime = conditions?.query?.fqrangetime ?? '';
      let _search = conditions?.query?.s ?? '';
      let _whereNot = conditions?.query?.fqnot ?? '';
      let _whereNull = conditions?.query?.fqnull ?? '';
      let _limit = conditions?.query?.limit ?? 10; if (_limit > 1000) _limit = 1000;
      let _offset = conditions?.query?.offset ?? 0;
      let _sort = conditions?.query?.sort ?? '';
      let joinQueries = conditions?.query?.joinQueries ?? '';
      let mergeField = `${this.tb}.*`
      let _whereOr = conditions?.query?.fqor ?? '';
      let _notLike = conditions?.query?.snot ?? '';
      if(conditions?.query?.fields){
        mergeField = conditions.query.fields.split(',').map(field=>`${this.tb}.${field}`).join(',');
      }
      if(joinQueries && joinQueries.length > 0){
        for (const joinQuery of joinQueries) {
          if(joinQuery?.fieldTarget && joinQuery?.table && joinQuery?.fieldJoin){
            let fieldJoins = joinQuery?.fieldJoin.split(',');
            let fieldTargets = joinQuery?.fieldTarget.split(',');
            if(fieldJoins.length == 1 && fieldTargets.length == 1){
              rawQuery += joinQuery?.funcCompare ? `LEFT JOIN ${joinQuery.table} ON ${joinQuery.funcCompare.replace(joinQuery.fieldJoin,`${joinQuery?.orginTable ?? this.tb}.${joinQuery.fieldJoin}`).replace(joinQuery.fieldTarget,`${joinQuery.table}.${joinQuery.fieldTarget}`)} ` : `LEFT JOIN ${joinQuery.table} ON ${joinQuery.table}.${joinQuery.fieldTarget} = ${joinQuery?.orginTable ?? this.tb}.${joinQuery.fieldJoin} `;
            }else if(fieldJoins.length == fieldTargets.length){
              rawQuery += `LEFT JOIN ${joinQuery.table} ON `;
              for (const _index in fieldJoins) {
                rawQuery += _index == 0 ? `${joinQuery.table}.${fieldTargets[_index]} = ${this.tb}.${fieldJoins[_index]}`:  `AND ${joinQuery.table}.${fieldTargets[_index]} = ${this.tb}.${fieldJoins[_index]} `;
              }
            }
          }

          if(joinQuery?.filter){
            rawQuery += `AND ${joinQuery.filter} `
          }
          if(joinQuery?.mergeField)
            mergeField += ','+joinQuery?.mergeField
        }
      }
      let countQuery = rawQuery.replace(`DISTINCT ${this.tb}.*`, `COUNT(DISTINCT ${conditions?.query?.fields ? conditions.query.fields.split(',').map(field=>`${this.tb}.${field}`).join(',') :this.tb+".id"}) AS total`);
      
      if(mergeField){
        rawQuery =rawQuery.replace(`${this.tb}.*`, mergeField);
      }

      if (_where != '') {
        let whereByKeyQuery = `WHERE `;

        for (const val of _where.split(",")) {
          let _fq = val.split(":").map(v => v);

          if (_fq.length == 2) {
            const field = _fq[0].indexOf('.') == -1 ? `${this.tb}.`+_fq[0] : _fq[0]
            whereByKeyQuery = whereByKeyQuery.length > 6 ? `${whereByKeyQuery} AND ${field} = ?` : `${whereByKeyQuery} ${field} = ?`
            params.push(_fq[1]);
          }
        }

        whereQuery += whereByKeyQuery;
      }
      if (_findInSet != '') {
        whereQuery += whereQuery ? ` AND ` : ` WHERE `;
        _findInSet = _findInSet.split(";");
        // 'parent_ids:1,2;parent_ids:3|4'
        if (_findInSet.length > 0) {
          const query = _findInSet.map(where=>{
            const [key,values] = where.split(':');
            let _strQuery = '';
            if(!values) return _strQuery;
            const separator = values.indexOf('|') > -1 ? '|': ','
            for (const v of values.split(separator)) {
              _strQuery += _strQuery ? ((separator == ',' ? 'AND' : 'OR')+ ` FIND_IN_SET(?,${key}) `) : ` FIND_IN_SET(?,${key}) `;
              params.push(v)
            };
            return "("+_strQuery + ")"
          });
          whereQuery += query?.length == 1 ? query :`(${query?.filter(v=>v)?.join(' AND ')})`;
        }
      }

      if (_whereOr != '') {
        let whereOr = whereQuery ? ` AND ` : ` WHERE `;
        let _fqor = _whereOr.split("|").map(v => v);
        if (_fqor.length == 2) {
          whereOr = whereOr + `(${_fqor[1].replace(/,/g, ' = ? OR ')} = ? )`
          for (const val of _fqor[1].split(",")) {
            params.push(...[_fqor[0]])
          }
        }
        whereQuery += whereOr;
      }

      if (_whereIn != '') {
        let whereIn = whereQuery ? ` AND ` : ` WHERE `;
        let _fq = _whereIn.split(":").map(v => v);

        if (_fq.length == 2) {
          const field = _fq[0].indexOf('.') == -1 ? `${this.tb}.`+_fq[0] : _fq[0]
          whereIn = whereIn + field + ` IN (?)`;
          params.push(_fq[1].split(','));
        }

        whereQuery += whereIn;
      }
      if (_whereNotIn != '') {
        let whereIn = whereQuery ? ` AND ` : ` WHERE `;
        let _fq = _whereNotIn.split(":").map(v => v);

        if (_fq.length == 2) {
          const field = _fq[0].indexOf('.') == -1 ? `${this.tb}.`+_fq[0] : _fq[0]
          whereIn = whereIn + field + ` NOT IN (?)`;
          params.push(_fq[1].split(','));
        }
        whereQuery += whereIn;
      }
      if (_whereRange != '') {
				_whereRange.split(',').map((val) => {
					const _fq = val.split(':').map(v => v);
          const field = _fq[0].indexOf('.') == -1 ? `${this.tb}.`+_fq[0] : _fq[0]
					if (_fq.length == 2) {
						const _parse = _fq[1].match(/^(gte|gt|lte|lt)/gi);
						if (_parse != null) {
							const _prefix = whereQuery == '' ? 'WHERE ' : ' AND ';
							whereQuery += _prefix + field + ` ${_parse[0] == 'gte' ? '>=' : '<='} ` + `'${_fq[1].replace(_parse[0], '')} ${_parse[0] == 'gte' ? '00:00:00' : '23:59:59'}'`;
						}
					}
				});
			}

      if (_whereRangeTime != '') {
				_whereRangeTime.split(',').map((val) => {
					const _fq = val.replace(':','&').split('&').map(v => v);
          const field = _fq[0].indexOf('.') == -1 ? `${this.tb}.`+_fq[0] : _fq[0]
					if (_fq.length == 2) {
						const _parse = _fq[1].match(/^(gte|gt|lte|lt)/gi);
						if (_parse != null) {
							const _prefix = whereQuery == '' ? 'WHERE ' : ' AND ';
							whereQuery += _prefix + field + ` ${_parse[0] == 'gte' ? '>=' : '<='} ` + `'${_fq[1].replace(_parse[0], '')}'`;
						}
					}
				});
			}

      if (_search != '') {
        if( Array.isArray(_search) == false ) {
          let _parser = _search.split("|");
          if(_parser[1].indexOf('.') == -1)
            _parser[1] = this.tb +'.'+_parser[1];
          let searchQuery = `${whereQuery ? '' : `WHERE (`} ${_parser[1].replace(/,/g, ' LIKE ? OR ')} LIKE ? )`;
          
          whereQuery = whereQuery ? `${whereQuery} AND ( ${searchQuery}` : `${whereQuery} ${searchQuery}`;
          for (const val of _parser[1].split(",")) {
            params.push(...[`%${_parser[0]}%`/*, `%${_parser[0]}%`*/])
          }
        } else {
            for (const value of _search) {
              let _parser = value.split("|");
              if(_parser[1].indexOf('.') == -1)
                _parser[1] = this.tb +'.'+_parser[1];
              let searchQuery = `${whereQuery ? '' : `WHERE (`} ${_parser[1].replace(/,/g, ' LIKE ? OR ')} LIKE ? )`;
              
              whereQuery = whereQuery ? `${whereQuery} AND ( ${searchQuery}` : `${whereQuery} ${searchQuery}`;
              for (const val of _parser[1].split(",")) {
                params.push(...[`%${_parser[0]}%`/*, `%${_parser[0]}%`*/])
              }
            }
        }
      }

      if (_notLike != '') {
        if( Array.isArray(_notLike) == false ) {
          let _parser = _notLike.split("|");
          if(_parser[1].indexOf('.') == -1)
            _parser[1] = this.tb +'.'+_parser[1];
          console.log(_parser)
          let notlikeQuery = `${whereQuery ? '' : `WHERE ( `}${_parser[1]} IS NULL OR ${_parser[1].replace(/,/g, ' NOT LIKE ? OR ')} NOT LIKE ? )`;
          console.log(notlikeQuery)
          whereQuery = whereQuery ? `${whereQuery} AND ( ${notlikeQuery}` : `${whereQuery} ${notlikeQuery}`;
          for (const val of _parser[1].split(",")) {
            params.push(...[`%${_parser[0]}%`/*, `%${_parser[0]}%`*/])
          }
        }
      }

      if (_whereNot !== '') {
        let _parser
        if (Array.isArray(_whereNot)){
          _parser = _whereNot.map(value => {
              if(value.indexOf('.') == -1)
              value = this.tb + '.' + value;
              return value
            }).join(',')
          
        } else {
           _parser = _whereNot
        }
        let whereNot = `${whereQuery ? ` AND ` : ` WHERE `} ${_parser?.replace(/,/g, ' IS NOT NULL AND ')} IS NOT NULL`;
        whereQuery += whereNot;
      }

      if (_whereNull !== '') {
        if(_whereNull.indexOf('.') == -1)
          _whereNull = this.tb + '.' + _whereNull;
        let whereNull = `${whereQuery ? ` AND ` : ` WHERE `} ${_whereNull?.replace(/,/g, ' IS NULL AND ')} IS NULL`;
        whereQuery += whereNull;
      }

      let sortQuery = ` ORDER BY ${this.tb}.created_at DESC`;

      if (_sort != '') {
        sortQuery = ``;

        _sort.split(",").map(val => {
          const value = val.indexOf('.') > -1 ? val.replace(/^-/, '').trim() :`${this.tb}.`+val.replace(/^-/, '').trim();

          if (new RegExp('^-').test(val) == true) {
            sortQuery = sortQuery ? `${sortQuery}, ${value} DESC` : ` ORDER BY ${value} DESC`;
          } else {
            sortQuery = sortQuery ? `${sortQuery}, ${value} ASC` : ` ORDER BY ${value} ASC`;
          }
        })
      }

      const [res1, res2] = await Promise.allSettled([
        this.connection.promise().query(
          rawQuery + whereQuery + sortQuery + ` LIMIT ? OFFSET ?`, 
          [...params, Number(_limit), Number(_offset)]
        ),
        this.connection.promise().query(
          countQuery + whereQuery, 
          params
        )
      ]);
      
      let data = null;
      let count = 0;
      
      // Lấy data nếu query 1 thành công
      if (res1.status === "fulfilled") {
        [data] = res1.value; // query trả về [rows, fields]
      }
      
      // Lấy count nếu query 2 thành công
      if (res2.status === "fulfilled") {
        [[{ total: count }]] = res2.value; // query trả về [[{ total: số }], fields]
      }
      
      return {
        data: data || null,
        total: count ?? 0,
      };
    } catch (e) {
      console.log('e', e);
      throw new Error(e.message);
    }
  }

  async groupBy({ conditions }) {
    try {
      //console.log('groupBy', conditions.query?.groupBy)
      let whereQuery = ''
      let rawQuery = `SELECT DISTINCT ${this.tb}.* FROM ${this.tb} `;
      const params = [];
      let _where = conditions?.query?.fq ?? '';
      let _whereIn = conditions?.query?.fqin ?? '';
      let _whereRange = conditions?.query?.fqrange ?? '';
      let _whereRangeTime = conditions?.query?.fqrangetime ?? '';
      let _search = conditions?.query?.s ?? '';
      let _whereNot = conditions?.query?.fqnot ?? '';
      let _whereNull = conditions?.query?.fqnull ?? '';
      let _limit = conditions?.query?.limit ?? 10; if (_limit > 100) _limit = 100;
      let _offset = conditions?.query?.offset ?? 0;
      let _sort = conditions?.query?.sort ?? '';
      let joinQueries = conditions?.query?.joinQueries ?? '';
      let _whereNotIn = conditions?.query?.fqnotin ?? '';
      let mergeField = ''
      let _groupBy = conditions?.query?.groupBy ?? '';
      if(conditions?.query?.fields){
        mergeField = conditions.query.fields.split(',').map(field=>`${this.tb}.${field}`).join(',');
      }
      if(joinQueries && joinQueries.length > 0){
        for (const joinQuery of joinQueries) {
          if(joinQuery?.fieldTarget && joinQuery?.table && joinQuery?.fieldJoin){
            rawQuery += `LEFT JOIN ${joinQuery.rawTable ?? joinQuery.table} ON ${joinQuery.table}.${joinQuery.fieldTarget} = ${joinQuery?.orginTable??this.tb}.${joinQuery.fieldJoin} `;
          }
          if(joinQuery?.filter){
            rawQuery += `AND ${joinQuery.filter} `
          }
          if(joinQuery?.mergeField)
          if (mergeField != '') {
            mergeField += ','+joinQuery?.mergeField
          } else {
            mergeField += ''+joinQuery?.mergeField
          }
        }
      }
      
      if(mergeField){
        rawQuery =rawQuery.replace(`${this.tb}.*`, ` `+mergeField);
      }

      if (_where != '') {
        let whereByKeyQuery = `WHERE `;

        for (const val of _where.split(",")) {
          let _fq = val.split(":").map(v => v);

          if (_fq.length == 2) {
            const field = _fq[0].indexOf('.') == -1 ? `${this.tb}.`+_fq[0] : _fq[0]
            whereByKeyQuery = whereByKeyQuery.length > 6 ? `${whereByKeyQuery} AND ${field} = ?` : `${whereByKeyQuery} ${field} = ?`
            params.push(_fq[1]);
          }
        }

        whereQuery += whereByKeyQuery;
      }

      if (_whereIn != '') {
        let whereIn = whereQuery ? ` AND ` : ` WHERE `;
        let _fq = _whereIn.split(":").map(v => v);

        if (_fq.length == 2) {
          const field = _fq[0].indexOf('.') == -1 ? `${this.tb}.`+_fq[0] : _fq[0]
          whereIn = whereIn + field + ` IN (?)`;
          params.push(_fq[1].split(','));
        }

        whereQuery += whereIn;
      }
      if (_whereRange != '') {
				_whereRange.split(',').map((val) => {
					const _fq = val.split(':').map(v => v);
          const field = _fq[0].indexOf('.') == -1 ? `${this.tb}.`+_fq[0] : _fq[0]
					if (_fq.length == 2) {
            console.log(_fq)
						const _parse = _fq[1].match(/^(gte|gt|lte|lt)/gi);
						if (_parse != null) {
							const _prefix = whereQuery == '' ? 'WHERE ' : ' AND ';
							whereQuery += _prefix + field + ` ${_parse[0] == 'gte' ? '>=' : '<='} ` + `'${_fq[1].replace(_parse[0], '')} ${_parse[0] == 'gte' ? '00:00:00' : '23:59:59'}'`;
						}
					}
				});
			}
      if (_whereRangeTime != '') {
				_whereRangeTime.split(',').map((val) => {
					const _fq = val.replace(':','&').split('&').map(v => v);
          const field = _fq[0].indexOf('.') == -1 ? `${this.tb}.`+_fq[0] : _fq[0]
					if (_fq.length == 2) {
						const _parse = _fq[1].match(/^(gte|gt|lte|lt)/gi);
						if (_parse != null) {
							const _prefix = whereQuery == '' ? 'WHERE ' : ' AND ';
							whereQuery += _prefix + field + ` ${_parse[0] == 'gte' ? '>=' : '<='} ` + `'${_fq[1].replace(_parse[0], '')}'`;
						}
					}
				});
			}

      if (_search != '') {
        
        let _parser = _search.split("|");
        if(_parser[0].indexOf('.') == -1)
          _parser[1] = this.tb +'.'+_parser[1];
        let searchQuery = `${whereQuery ? '' : `WHERE `} ${_parser[1].replace(/,/g, ' LIKE ? OR ')} LIKE ?`;
        
        whereQuery = whereQuery ? `${whereQuery} AND ${searchQuery}` : `${whereQuery} ${searchQuery}`;
        for (const val of _parser[1].split(",")) {
          params.push(...[`%${_parser[0]}%`/*, `%${_parser[0]}%`*/])
        }        
      }

      if (_whereNot !== '') {
        let _parser
        if (Array.isArray(_whereNot)){
          _parser = _whereNot.map(value => {
              if(value.indexOf('.') == -1)
              value = this.tb + '.' + value;
              return value
            }).join(',')
          
        } else {
           _parser = _whereNot
        }
        let whereNot = `${whereQuery ? ` AND ` : ` WHERE `} ${_parser?.replace(/,/g, ' IS NOT NULL AND ')} IS NOT NULL`;
        whereQuery += whereNot;
      }

      if (_whereNull !== '') {
        if(_whereNull.indexOf('.') == -1)
          _whereNull = this.tb + '.' + _whereNull;
        let whereNull = `${whereQuery ? ` AND ` : ` WHERE `} ${_whereNull?.replace(/,/g, ' IS NULL AND ')} IS NULL`;
        whereQuery += whereNull;
      }

      if (_whereNotIn != '') {
        let whereIn = whereQuery ? ` AND ` : ` WHERE `;
        let _fq = _whereNotIn.split(":").map(v => v);

        if (_fq.length == 2) {
          const field = _fq[0].indexOf('.') == -1 ? `${this.tb}.`+_fq[0] : _fq[0]
          whereIn = whereIn + field + ` NOT IN (?)`;
          params.push(_fq[1].split(','));
        }
        whereQuery += whereIn;
      }

      if (_groupBy != '') {
        let groupQuery = ` GROUP BY ${_groupBy}`;
        whereQuery += groupQuery;
      }

      let sortQuery = ` `;

      if (_sort != '') {
        sortQuery = ``;

        _sort.split(",").map(val => {
          const value = val.replace(/^-/, '').trim();

          if (new RegExp('^-').test(val) == true) {
            sortQuery = sortQuery ? `${sortQuery}, ${value} DESC` : ` ORDER BY ${value} DESC`;
          } else {
            sortQuery = sortQuery ? `${sortQuery}, ${value} ASC` : ` ORDER BY ${value} ASC`;
          }
        })
      }
      let countQuery = "SELECT COUNT(*) AS total FROM (" + rawQuery;
      // console.log(rawQuery + whereQuery + sortQuery + ` LIMIT ? OFFSET ?`, [...params, Number(_limit), Number(_offset)] )
      // console.log(countQuery + whereQuery, params)
      const [
        [data],
        [[count]]
      ] = await Promise.all([
        this.connection.promise().query(rawQuery + whereQuery + sortQuery + ` LIMIT ? OFFSET ?`, [...params, Number(_limit), Number(_offset)]),
        this.connection.promise().query(countQuery + whereQuery + ") as A", params)
      ])
      return {
        data: data || null,
        total: count?.total ?? 0,
      };
    } catch (e) {
      throw new Error(e.message);
    }
  }

  async setlog(_type, _module, _itemId, _dataUdt) {
    try{
      var _userInfo = global.userInfo;
      let _account_id	= _userInfo?.account?.id ?? '';
      if(_account_id != '') {
        /*Save detail Update*/
        let _dataSetLog = {};
        if(_type == UPDATE && typeof _dataUdt !== 'undefined'){
          let _dataOld = await this.get({conditions:{id:_itemId}}).then(result=>result).catch(e=>{});
          if(_dataOld) {
            delete _dataUdt['id'];
            delete _dataUdt['updated_at'];
            delete _dataUdt['created_at'];
            if(_module == 'accounts') delete _dataUdt['token_expires'];
            for (var k in _dataUdt){
              if (_dataUdt.hasOwnProperty(k) && _dataOld.hasOwnProperty(k) && _dataUdt[k] != _dataOld[k]) {
                _dataSetLog[k] = {old: _dataOld[k], upt: _dataUdt[k]};
                /** Remove field Datetime */
                if(_dataUdt[k] && (new Date(_dataOld[k])).getTime() > 0 && (moment(_dataOld[k]).unix() * 1000) ==  _dataUdt[k]){
                  delete _dataSetLog[k];
                }
                /** Check Array/Object */
                if(JSON.stringify(_dataUdt[k]) == JSON.stringify(_dataOld[k])){
                  delete _dataSetLog[k];
                }
                /** Check null */
                if(_dataUdt[k] == '' && _dataOld[k] == null){
                  delete _dataSetLog[k];
                }
              }
            }
          }
        }
        if(_type == UPDATE && Object.entries(_dataSetLog).length === 0 ) return true;
        const _data = {
          account_id : _account_id,
          type : _type,
          module : _module,
          item_id : _itemId,
          detail : Object.entries(_dataSetLog).length === 0 ? '':JSON.stringify(_dataSetLog)
        };
        await axios.post(`${process.env.BASE_URL}/v1/set-log`, _data).catch((e) => {});
      }
      return true;
    }catch(e){
      console.log(e);
      throw new Error(e.message);
    }
  }

  async query({ conditions }) {
    try {
      const escapedPattern = conditions.replace(/\\/g, '\\\\');
      const [data] = await this.connection.promise().query(escapedPattern)
      return {
        data: data || null,
      };
      
    } catch (e) {
      throw new Error(e.message);
    }
  }

  async insertBatch({ fields, data, returnId }) {
    try {
      const _sql = `INSERT INTO ${this.tb} (`+fields+`) VALUES ?`;
      const [rows] = await this.connection.promise().query(_sql,[data])

			if (!rows) return false;
			if (returnId) return rows;
			return true;
    } catch (e) {
      throw new Error(e.message);
    }
  }

}
