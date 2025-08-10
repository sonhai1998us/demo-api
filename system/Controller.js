/* Package Application */
const fs = require('fs');
const moment = require('moment');
const { validationResult } = require('express-validator');
const { extractBase64, changeToSlug } = require('@utils/Helper');
const AWS = require('aws-sdk');
const { nanoid } = require('nanoid');
const bcrypt = require('bcryptjs');
const Model = require('./Model');
const _ = require('lodash');
const s3 = new AWS.S3({
    ACL: 'public-read',
    accessKeyId: process.env.AWS_ACCESS_KEY_CMC,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_CMC,
    region: process.env.AWS_REGION_CMC,
    params: { Bucket: process.env.AWS_BUCKET_CMC },
});

module.exports = class Controller {
    constructor(tableName) {
        this.db = new Model(tableName);
        this.moment = moment;
        this.s3 = s3;
        this.transform = [];
    }

    /* -------------- COMMON --------------*/
    async validate(req, res) {
        try {
            const _errors = validationResult(req).array({ onlyFirstError: true });
            if (_errors.length > 0) throw _errors;

            return false;
        } catch (e) {
            const _infoErr = [];

            e.map((item) => {
                if(typeof item.msg == 'object'){
                    _infoErr.push({ key: item.msg?.key ?? item.param, msg: item.msg?.msg ?? item.msg });
                } else _infoErr.push({ key: item.param, msg: item.msg });
            });

            return res.status(400).json({
                status: 'error',
                errors: _infoErr,
            });
        }
    }
    
    async uploadFile(fileName, base64Data, type, oldFile = '', imgPath = '') {
        return new Promise(async (resolve, reject) => {
            try {
                let _buf = {}
                if(imgPath != ''){
                    _buf = await this.addWaterMark(base64Data, imgPath)
                }else{
                    _buf = Buffer.from(base64Data.replace(/^data:(.*?)\/\w+;base64,/, ''), 'base64');
                }
                const _data = {
                    ACL: 'public-read',
                    Key: fileName,
                    Body: _buf,
                    ContentEncoding: 'base64',
                    ContentType: type,
                };
                s3.upload(_data, async (err, data) => {
                    if (err) {
                        console.log(err);
                        reject(err);
                    } else {
                        //don't delete default image
                        if (oldFile != '' && oldFile.indexOf('demo/default')==-1) await s3.deleteObject({ Key: oldFile }).promise();
                        resolve(true);
                    }
                });
            } catch (e) {
                console.log(e);
                reject(e);
            }
        });
    }
    async uploadPDF(fileName, body, oldFile = '') {
        return new Promise(async (resolve, reject) => {
            try {
                const _data = {
                    ACL: 'public-read',
                    Key: fileName,
                    Body: body,
                    ContentDisposition:'inline',
                    ContentType:'application/pdf'
                };
                s3.upload(_data, async (err, data) => {
                    if (err) {
                        console.log(err);
                        reject(err);
                    } else {
                        if (oldFile != '') await s3.deleteObject({ Key: oldFile });
                        resolve(true);
                    }
                });
            } catch (e) {
                console.log(e);
                reject(e);
            }
        });
    }

    async response(res, status, data = null) {
        if (((status == 201 && data == null) || status == 204)&&!data) return res.status(status).end();

        let _obj = {};

        switch (status) {
            case 400:
                _obj.status = 'error';
                _obj.errors = {};
                _obj.errors.msg = data;
                break;
            case 500:
                _obj.status = 'error';
                _obj.errors = {};
                _obj.errors.msg = process.env.NODE_ENV == 'production' ? 'Server Error, Please try again later.' : data;
                break;
            default:
                _obj.status = 'success';
                if (data != null) {
                    if (this.transform) {
                        _.forEach(this.transform, (transform_type) => {
                            if (Array.isArray(data.data)) {
                                _.forEach(data.data, (item) => {
                                    if (item[transform_type]) {
                                        const convert_type = item[transform_type].split(',');
                                        item[transform_type] = convert_type.length == 1 ? item[transform_type] : item[transform_type].split(',');
                                    }
                                    return item;
                                });
                                if (data.data[transform_type]) {
                                    const convert_type = data.data[transform_type].split(',');
                                    data.data[transform_type] = convert_type == 1 ? data.data[transform_type] : data.data[transform_type].split(',');
                                }
                                return data.data;    
                            }
                            if (data[transform_type]) {
                                const convert_type = data[transform_type].split(',');
                                data[transform_type] = convert_type.length == 1 ? data[transform_type] : data[transform_type].split(',');
                            }


                        });  
                    }

                    if (data.total) _obj.total = data.total;
                    if (data.nextPage) _obj.next_page = data.nextPage;
                    if (data.length > 0) _obj.items = data;
                    if (data.total_insert) _obj.total_insert = data.total_insert;
                    else _obj = { ..._obj, ...data };
                }
                break;
        }

        return res.status(status).json(_obj);
    }

    /* ------------ END COMMON ------------*/

    /* ------------- API CRUD -------------*/
    async getAll(req, res) {
        try {
            const _data = await this.db.find(req);
            const _result = _data == null ? { items: [] } : _data;

            this.response(res, 200, _result);
        } catch (e) {
            this.response(res, 500, e.message);
        }
    }

    async get(req, res) {
        try {
            const _conditions = {};
            _conditions.id = req.params.id;
            const _result = await this.db.get(_conditions, true);

            this.response(res, 200, { data: _result });
        } catch (e) {
            this.response(res, 500, e.message);
        }
    }

    async create(req, res) {
        try {
            // Validate
            const _check = await this.validate(req, res);

            if (_check == false) {
                let _data = {};
                _data = req.body;
                _data.created_at = new Date();
                _data.updated_at = new Date();
                if (_data?.image  || _data?.images || _data?.thumb || _data?.thumbnail_ticket || _data?.trailer) {
                    try {
                        const _year = this.moment().format('YYYY');
                        const _month = this.moment().format('MM');
                        let _parse; let _name; let _type; let _upload;
                        if (_data?.image) {
                            _parse = extractBase64(_data.image.file);
                            _name = `${req.url.split('/')[1]}/${_year}/${_month}/${nanoid()}.${_parse.ext}`;
                            _type = `${_parse.type}/${_parse.ext}`;
                            _upload = await this.uploadFile(_name, _data.image.file, _type);
                            if (_upload == true) _data.image = _name;
                        }

                        if (_data?.images) {
                            _parse = extractBase64(_data.images.file);
                            _name = `${req.url.split('/')[1]}/${_year}/${_month}/${nanoid()}.${_parse.ext}`;
                            _type = `${_parse.type}/${_parse.ext}`;
                            _upload = await this.uploadFile(_name, _data.images.file, _type);
                            if (_upload == true) _data.images = _name;
                        }

                        if (_data?.thumb) {
                            _parse = extractBase64(_data.thumb.file);
                            _name = `${req.url.split('/')[1]}/${_year}/${_month}/${nanoid()}.${_parse.ext}`;
                            _type = `${_parse.type}/${_parse.ext}`;
                            _upload = await this.uploadFile(_name, _data.thumb.file, _type);
                            if (_upload == true) _data.thumb = _name;
                        }
                        if (_data?.thumbnail_ticket) {
                            _parse = extractBase64(_data.thumbnail_ticket.file);
                            _name = `${req.url.split('/')[1]}/${_year}/${_month}/${nanoid()}.${_parse.ext}`;
                            _type = `${_parse.type}/${_parse.ext}`;
                            _upload = await this.uploadFile(_name, _data.thumbnail_ticket.file, _type);
                            if (_upload == true) _data.thumbnail_ticket = _name;
                        }
                        if (_data?.trailer) {
                            _parse = extractBase64(_data.trailer.file);
                            _name = `${req.url.split('/')[1]}/${_year}/${_month}/${nanoid()}.${_parse.ext}`;
                            _type = `${_parse.type}/${_parse.ext}`;
                            _upload = await this.uploadFile(_name, _data.trailer.file, _type);
                            if (_upload == true) _data.trailer = _name;
                        }
                    } catch (e) {
                        console.log(e);
                        return this.response(res, 500, 'Upload failure, please try again');
                    }
                }

                this.db.insert(_data);
                this.response(res, 201, {status: "success"});
            }
        } catch (e) {
            this.response(res, 500, e.message);
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
                if (_data.password) _data.password = bcrypt.hashSync(_data.password, bcrypt.genSaltSync(12));
                if ((_data?.image && typeof _data.image == 'object') || (_data?.images && typeof _data.images == 'object') || _data?.thumb || _data?.avatar) {
                    try {
                        let _infoFile;
                        if (_data.image) _infoFile = _data.image;
                        if (_data.images) _infoFile = _data.images;
                        if (_data.thumb) _infoFile = _data.thumb;
                        if (_data.avatar) _infoFile = _data.avatar;
                        const _year = this.moment().format('YYYY');
                        const _month = this.moment().format('MM');
                        const _parse = extractBase64(_infoFile.file);
                        const _name = `${req.url.split('/')[1]}/${_year}/${_month}/${nanoid()}.${_parse.ext}`;
                        const _type = `${_parse.type}/${_parse.ext}`;
                        const _upload = await this.uploadFile(_name, _infoFile.file, _type, _infoFile.oldFile);
                        if (_upload == true) {
                            if ((_data?.image ?? '') != '') _data.image = _name;
                            if ((_data?.images ?? '') != '') _data.images = _name;
                            if ((_data?.thumb ?? '') != '') _data.thumb = _name;
                            if ((_data?.avatar ?? '') != '') _data.avatar = _name;
                        }
                    } catch (e) {
                        console.log(e);
                        return this.response(res, 500, 'Upload failure, please try again');
                    }
                }
                if(_data?.ended_at)
                    _data.ended_at = new Date(_data.ended_at);
                this.db.update({ id: req.params.id }, _data);
                this.response(res, 200);
            }
        } catch (e) {
            this.response(res, 500, e.message);
        }
    }

    async updates(req, res) {
        try {
            const _check = await this.validate(req, res);
            if (_check == false) {
                let _data = {};
                _data = req.body;
                let returnData = {};
                if(_data?.items && _data.items.length>0){
                    const _inserts = [];
                    const _updates = [];
                    const _deletes = [];
                    let ignoreKey = ['created_at','deleted_at','updated_at','id','status','creator'];
                    const keyDate = ['created_at','deleted_at','updated_at','published_result_at','started_at','ended_at','answered_at'];
                    if(_data?.ignoreKey && _data.ignoreKey?.length > 0)
                        ignoreKey = [...ignoreKey,..._data.ignoreKey]
                    if(_data?.fqs && _data.fqs.length>0){
                        let _fq = '';
                        _data.fqs.forEach(fq => {
                            if(fq?.key && fq?.value) _fq = (_fq == '') ? `${fq.key}:${fq.value}` :  `${_fq},${fq.key}:${fq.value}`;
                        });
                        const _dataCurrents = await this.db.find({query:{fq:_fq,limit:1000} });
                        _data.items.forEach(item=>{
                            for (const key of Object.keys(item)) {
                                if(typeof item[key] == 'string' && keyDate.includes(key)){
                                    item[key] = new Date(item[key]);
                                }
                            }
                            const find = _dataCurrents.data.find(value=>{
                                let _check = true;
                                for (const key of Object.keys(item)) {
                                    if(!(value?.[key] == item[key] || ignoreKey.includes(key))){
                                     _check = false;
                                    }
                                }
                                return _check;
                            });
                            if(find){
                                _dataCurrents.data = _dataCurrents.data.filter(v=>v.id != find.id);
                                if(find.deleted_at){
                                    find.deleted_at = null;
                                    find.updated_at = new Date();   
                                    find.created_at = new Date();
                                    _updates.push({...find,...item});
                                }
                            }
                            else {
                                _inserts.push(item);
                            }
                        });
                        if(_dataCurrents.data.length > 0){
                            _dataCurrents.data.forEach(item=>{
                                if(_inserts.length > 0){
                                    const insert = _inserts.shift();
                                    const obj = Object.assign({},item,insert);
                                    obj.updated_at = new Date();
                                    obj.created_at = new Date();
                                    obj.deleted_at = null;
                                    _updates.push(obj);
                                } else if(!item?.deleted_at) {
                                    _deletes.push(item);
                                }
                            })
                        }
                    }
                    // console.log('insert',_inserts);
                    // console.log('update',_updates);
                    // console.log('delete',_deletes);
                    let _promises = [];
                    if(_updates.length > 0){
                        _promises = [..._promises,..._updates.map(_update=>{
                            const id = _update.id;
                            delete _update.id;
                            returnData = {..._update,id};
                            return this.db.update({id},_update);
                        })];
                    }
                    if(_deletes.length > 0)
                        _promises = [..._promises,_deletes.map(_delete=>this.db.delete({id:_delete.id}))];
                    await Promise.all(_promises);
                    if (_inserts.length > 0)
                        for (const item of _inserts) {
                            if (req?.account?.id) item.creator = req.account.id;
                            const id = await this.db.insert(item, 'id').catch(e=>'');
                            if(id)
                                returnData = { id, ...item };
                        }
                }
                if(_data.items.length == 1)this.response(res, 200,{data:returnData});
                else this.response(res, 200);
            }
        }catch (e) {
            this.response(res, 500, e);
        }
    }

    async delete(req, res) {
        try {
            // Validate
            const _check = await this.validate(req, res);
            if (_check == false) {
                this.db.delete({ id: req.params.id });
                this.response(res, 204,{status: "success"});
            }
        } catch (e) {
            this.response(res, 500, e.message);
        }
    }

    async uploadFileToS3(req,fileName, base64Data, type, oldFile = '', convertToBf = true) {
        return new Promise(async (resolve, reject) => {
            try {
                let _buf = base64Data;
                let _isCancel = true;
                let upload;
                req.connection.on('close', async function (err){
                    if(_isCancel && upload){
                        upload.abort();
                    }
                });
                const _data = {
                    ACL: 'public-read',
                    Key: fileName,
                    Body: _buf,
                    ContentType: type,
                };
                if (convertToBf == true) {
                    _data.Body = Buffer.from(base64Data.replace(/^data:(.*?)\/\w+;base64,/, ''), 'base64');
                    _data.ContentEncoding = 'base64';
                }
                upload = s3.upload(_data, async (err, data) => {
                    if (err) {
                        if(err?.code == 'RequestAbortedError')
                            resolve(true)
                        else reject(err);
                    } else {
                        if (oldFile) await s3.deleteObject({ Key: oldFile });
                        _isCancel = false;
                        resolve(true);
                    }
                }).on('httpUploadProgress',function (progress){
                    console.log(progress.loaded+'/'+ progress.total);
                });
            } catch (e) {
                console.log(e);
                reject(e);
            }
        });
    }

    async abortUploadS3(name,uploadId) {
        return new Promise(async (resolve, reject) => {
            try {
                if(name&&uploadId)
                    await s3.abortMultipartUpload({Key:name, UploadId: uploadId}).promise();
                resolve(true)
            } catch (error) {
                resolve(true)
            }
        })
    }

    async chunkFile (_buffer, size = 10){
        try {
            const chunkSize = (1024 * 1024) * size
            const numParts = Math.ceil(_buffer.length / chunkSize);
            const slicedData = [];
            const promise = [];
            for (let index = 1; index <= numParts; index++) {
                let start = (index - 1) * chunkSize
                let end = index * chunkSize;   
                promise.push((index < numParts) ? _buffer.slice(start, end) : _buffer.slice(start));           
                slicedData.push({ PartNumber: index, buffer: Buffer.from(_buffer.slice(start, end + 1)) });
            }
            return promise;
        } catch (error) {
            console.log(error)
        }
    } 

    async createUploadId (filename, type){
        return new Promise((resolve, reject) => {
            s3.createMultipartUpload({ Key: filename,ContentType: type } , function (e, data) {
                if (e) {
                    console.log(error)
                    reject(e?.name);
                } else {
                    resolve(data);
                }
            })
        })
    }

    async UploadPart(body, UploadId, partNumber, fileName){
        const partParams = {
            Body: body,
            UploadId: UploadId,
            PartNumber: partNumber,
            Key: fileName
        }
        return new Promise( async (resolve, reject) => {
            try {
                let part = await s3.uploadPart(partParams).promise();
                resolve({ PartNumber: partNumber, ETag: part.ETag });
            } catch (error) {
                reject({partNumber, error});
            }
        });
    }

    async UploadComplete(completedParts, UploadId, fileName, oldFile){
        const partParams = {
            MultipartUpload: {
                Parts: completedParts
            },
            UploadId: UploadId,
            Key: fileName
        }
        return new Promise( async (resolve, reject) => {
            try {
                let result = await s3.completeMultipartUpload(partParams).promise();
                if(oldFile) await s3.deleteObject({Key:oldFile});
                resolve(result);
            } catch (error) {
                if(error?.code == 'NoSuchUpload')
                    resolve(true);
                reject(error);
            }
        })
    }

    async deleteObjectS3(_oldFile){
        return new Promise( async (resolve, reject) => {
            try {
                const _object = await s3.headObject({Key: _oldFile}).promise();
                if(_object){
                   await s3.deleteObject({Key: _oldFile}).promise();
                }
                resolve(true);
            } catch (error) {
                resolve(true);
            }
        });
    }
    async getObjectS3(file){
        return new Promise( async (resolve, reject) => {
            try {
                const _object = await s3.headObject({Key: file}).promise();
                resolve(_object);
            } catch (error) {
                resolve(false);
            }
        });
    }
    /* ----------- END API CRUD -----------*/
};
