/* Application */
const axios = require('axios');
const crypto = require('crypto');
const nodemailer = require("nodemailer"); 
require('dotenv').config(); 


const apiUrl = process.env.BASE_API_ADMIN;

class Helper {
    genToken = () => {
        const _time = Date.now();
        return `${_time}_${crypto.createHash('sha1').update(`${_time} ${process.env.SECRET_SHA_KEY} bookmenow`).digest('hex')}`;
    };

    genTokenShare = () => {
        const _time = Date.now();
        return `${_time}_${crypto
			.createHash('sha1')
			.update(`${_time} ${process.env.SECRET_SHA_KEY} share-bookmenow`)
			.digest('hex')}`;
    };

    compareToken = (token) => {
        const _parseToken = token.trim().split('_');
        if (_parseToken.length == 2) {
            const _time = parseInt(_parseToken[0]);
            const _shaToken = _parseToken[1];
            if ((_time + (60 * 1000)) > Date.now()) {
                const _shaAuth = crypto.createHash('sha1').update(`${_time} ${process.env.SECRET_SHA_KEY} bookmenow`).digest('hex');
                if (_shaAuth != _shaToken) return false;
            } else {
                console.log('Token Expired', this.genToken());
                return false;
            }
        } else return false;
        return true;
    };
    compareTokenShare = (token) => {
        const _parseToken = token.trim().split('_');
        if (_parseToken.length == 2) {
            const _time = parseInt(_parseToken[0]);
            const _shaToken = _parseToken[1];
            if ((_time + (60 * 1000)) > Date.now()) {
                const _shaAuth = crypto.createHash('sha1').update(`${_time} ${process.env.SECRET_SHA_KEY} share-bookmenow`).digest('hex');
                if (_shaAuth != _shaToken) return false;
            } else {
                console.log('Token Expired', this.genTokenShare());
                return false;
            }
        } else return false;
        return true;
    };

    fetchApi = async (url, token) => {
        let _url;
        const _options = {};
        if (url.indexOf('http') != '-1') _url = url;
        else _url = apiUrl + url;
        if (token != '') _options.headers = { Authorization: `Bearer ${token}` };
        return await axios.get(_url, _options).then((resp) => resp.data).catch((e) => e);
    };

    postApi = async (url, params, token = '') => {
        let _url;
        const _options = {};
        if (url.indexOf('http') != '-1') _url = url;
        else _url = apiUrl + url;
        if (token != '') _options.headers = { Authorization: `Bearer ${token}` };
        return await axios.post(_url, params, _options).then((resp) => resp.data).catch((e) => e);
    };


    postApiToken = async (url, params, token = '') => {
        let _url;
        const _options = {};
        if (url.indexOf('http') != '-1') _url = url;
        else _url = apiUrl + url;
        if (token != '') _options.headers = { Authorization: `Token ${token}` };
        return await axios.post(_url, params, _options).then((resp) => resp.data).catch((e) => e);
    };

    putApi = async (url, params, token = '', _options = {}) => {
        let _url;
        if (url.indexOf('http') != '-1') _url = url;
        else _url = apiUrl + url;
        if (token != '') _options.headers = { Authorization: `Bearer ${token}` };
        return await axios.put(_url, params, _options);
    };

    deleteApi = async (url, token = '', params = '') => {
        let _url;
        const _options = {};
        if (url.indexOf('http') != '-1') _url = url;
        else _url = apiUrl + url;
        if (token != '') _options.headers = { Authorization: `Bearer ${token}` };
        if (params != '') _options.data = { ids: params };
        return await axios.delete(_url, _options);
    };

    parseCookie = (str) => str.split(';').map((v) => v.split('=')).reduce((cookie, v) => {
        cookie[decodeURIComponent(v[0].trim())] = decodeURIComponent(v[1].trim());
        return cookie;
    }, {});

    dateFormat = (str) => {
        const _date = new Date(str);
        return `${_date.getDate()}/${_date.getMonth() + 1}/${_date.getFullYear()}`;
    };

    changeToSlug = (str) => {
        const _str = str.trim().toLowerCase();

        return _str
            .replace(/á|à|ả|ạ|ã|ă|ắ|ằ|ẳ|ẵ|ặ|â|ấ|ầ|ẩ|ẫ|ậ/gi, 'a')
            .replace(/é|è|ẻ|ẽ|ẹ|ê|ế|ề|ể|ễ|ệ/gi, 'e')
            .replace(/i|í|ì|ỉ|ĩ|ị/gi, 'i')
            .replace(/ó|ò|ỏ|õ|ọ|ô|ố|ồ|ổ|ỗ|ộ|ơ|ớ|ờ|ở|ỡ|ợ/gi, 'o')
            .replace(/ú|ù|ủ|ũ|ụ|ư|ứ|ừ|ử|ữ|ự/gi, 'u')
            .replace(/ý|ỳ|ỷ|ỹ|ỵ/gi, 'y')
            .replace(/đ/gi, 'd')
            .replace(/&/g, '-va-')
            .replace(/[^a-z0-9 -]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/[^\w\-]+/g, '')
            .replace(/^-+/, '')
            .replace(/-+$/, '')
            .replace(/^-+/, '')
            .replace(/-+$/, '');
    };

    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    capitalize = (str) => {
        if (typeof str !== 'string') return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    };

    extractBase64 = (str) => {
        const _obj = {};
        if (typeof str !== 'undefined' && str != '') {
            const _match = str.match(/^data:(.*?)\/(.*?);base64,(.*?)$/i);
            if (typeof _match[1] !== 'undefined') _obj.type = _match[1];
            if (typeof _match[2] !== 'undefined') _obj.ext = _match[2];
            if (typeof _match[3] !== 'undefined') _obj.data = _match[3];
        }

        return _obj;
    };

    trimSlash = (str) => {
        const _arr = str.split('/');

        if (typeof _arr[1] !== 'undefined') return _arr[1];
        return str.replace('/', '');
    };

    generateOTP = (_otpLength = 6) => {
        const _digits = '0123456789';
        let _otp = '';
        for (let _i = 1; _i <= _otpLength; _i++) {
            const _index = Math.floor(Math.random() * (_digits.length));
            _otp += _digits[_index];
        }
        return _otp;
    };

    generateGiftCode = (customer_id,_addDigits,_codeLength) => {
		const _digits = '0123456789';
		let _code = '';
		for (let _i = 1; _i <= _addDigits; _i++) {
			const _index = Math.floor(Math.random() * _digits.length);
			_code = _code + _digits[_index];
		}
        let final_code = customer_id + _code
        final_code = final_code.substring(final_code.length - _codeLength, final_code.length)
		return final_code;
	};
    
    formatPhone=str=>{
        let result = String(str).trim().replace(/(?!\+)\D+/g,'').replace(/^0|^\+840/g,'+84');
		return result?.indexOf('+84') > -1 ? result : '+84'+result;
	}
    
    formatPhoneVN=str=>{
        let result = String(str).trim().replace(/(?!\+)\D+/g,'').replace(/^0|^\+840|^84/g,'+84');
		return result;
	}

    formatEmail = (str) => String(str).trim().toLowerCase();

    validateEmail = (str) => {
        const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(str).trim().toLowerCase());
    };

    renderRequestHeaders = (token, options) => {
        const RequestHeaders = options;
        if (token !== '') {
            switch (token) {
            case 'Token':
            case 'bookmenow':
                RequestHeaders.headers = { ...RequestHeaders.headers,Authorization: `Token ${this.genToken()}` };
                break;
            case 'admin':
                RequestHeaders.headers = {...RequestHeaders.headers, Authorization: `bookmenow ${this.genTokenAdmin()}` };
                break;
            default:
                RequestHeaders.headers = {...RequestHeaders.headers, Authorization: `Bearer ${token}` };
                break;
            }
        }
        return RequestHeaders;
    };

    get = async (url, data = {}, token = '', options = {}) => new Promise((resolve, reject) => {
        const params = Object.keys(data).map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`).join('&');
        let urlApi = url;
        if (params.length > 0) urlApi += `?${params}`;
        axios.get(urlApi, this.renderRequestHeaders(token, options))
            .then((response) => resolve(response.data))
            .catch((e) => reject(e));
    });

    post = async (url, data, token = '', options = {}) => new Promise((resolve, reject) => {
        axios.post(url, data, this.renderRequestHeaders(token, options))
            .then((response) => resolve(response.data))
            .catch((e) => reject(e));
    });

    put = async (url, data, token = '', options = {}) => new Promise((resolve, reject) => {
        axios.put(url, data, this.renderRequestHeaders(token, options))
            .then((response) => resolve(response.data))
            .catch((e) => reject(e));
    });

    _delete = async (url, data, token = '', options = {}) => new Promise((resolve, reject) => {
        const params = Object.keys(data).map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`).join('&');
        let urlApi = url;
        if (params.length > 0) urlApi += `?${params}`;
        axios.delete(urlApi, this.renderRequestHeaders(token, options))
            .then((response) => resolve(response.data))
            .catch((e) => reject(e));
    });

    sendEmail = async (message) => {
        return new Promise(async(resolve,reject)=>{
            const transporter = await nodemailer.createTransport({ 
                service: process.env.MAIL_SERVICE,
                host: process.env.MAIL_HOST, 
                auth: { 
                    user: process.env.MAIL_USERNAME, 
                    pass: process.env.MAIL_PASSWORD 
                }
            });
            transporter.sendMail(message, function(error, info) { 
                if (error) {
                    console.log('error',error); 
                    return resolve(false); 
                } else { 
                    console.log("success"); 
                    return resolve(true); 
                } 
            }); 
        }) 
    }

    groupBy = async (array, key, keyItem ) => {
        return array.reduce((result, currentValue) => {
            if(typeof(currentValue[key]) != 'undefined' && typeof(currentValue[keyItem]) != 'undefined'){
                (result[currentValue[key]] = result[currentValue[key]] || []).push(
                    currentValue[keyItem]
                );
                return result;
            }
        }, {});
    };

   
    inArray(needle, haystack, key) {
        var length = haystack.length;
        for(var i = 0; i < length; i++) {
            if(haystack[i][key] == needle) return true;
        }
        return false;
    }

    removeSign = (str) => {
        const _str = str.trim().toLowerCase();

        return _str
            .replace(/á|à|ả|ạ|ã|ă|ắ|ằ|ẳ|ẵ|ặ|â|ấ|ầ|ẩ|ẫ|ậ/gi, 'a')
            .replace(/é|è|ẻ|ẽ|ẹ|ê|ế|ề|ể|ễ|ệ/gi, 'e')
            .replace(/i|í|ì|ỉ|ĩ|ị/gi, 'i')
            .replace(/ó|ò|ỏ|õ|ọ|ô|ố|ồ|ổ|ỗ|ộ|ơ|ớ|ờ|ở|ỡ|ợ/gi, 'o')
            .replace(/ú|ù|ủ|ũ|ụ|ư|ứ|ừ|ử|ữ|ự/gi, 'u')
            .replace(/ý|ỳ|ỷ|ỹ|ỵ/gi, 'y')
            .replace(/đ/gi, 'd')
    };

    decodeEntities = (encodedString) => {
        var translate_re = /&(nbsp|amp|quot|lt|gt);/g;
        var translate = {
            "nbsp":" ",
            "amp" : "&",
            "quot": "\"",
            "lt"  : "<",
            "gt"  : ">"
        };
        return encodedString.replace(translate_re, function(match, entity) {
            return translate[entity];
        }).replace(/&#(\d+);/gi, function(match, numStr) {
            var num = parseInt(numStr, 10);
            return String.fromCharCode(num);
        });
    }
    verifyMoMo = async (params) => {
		let _extraData = {};
		try {
			_extraData = JSON.parse(Buffer.from(params.extraData, 'base64').toString('utf8'));
		} catch (e) {
			console.log('error parsing',e);
		}		
		const _result = {
			status: false,
			link: _extraData.callback_url,
			errors: {},
			resp: {
				partnerCode: process.env.MOMO_PARTNER_CODE,
				requestId: params.requestId,
				momo_orderId: params.orderId,
				responseTime: Math.floor(Date.now() / 1000),
				extraData: params.extraData,
				transactionId: params.transId,
				payType: params.payType,
				payment_id: _extraData.payment_id,
				orderId: _extraData.order_id
			},
		};

		try {
			const {
				partnerCode,
				orderId,
				requestId,
				amount,
				orderInfo,
				orderType,
				transId,
				resultCode,
				message,
				payType,
				responseTime,
				extraData,
				signature,
			} = params;
			const accessKey = process.env.MOMO_ACCESS_KEY;
			const serectkey = process.env.MOMO_SECRET_KEY;
			const _rawSign =
				'accessKey=' +
				accessKey +
				'&amount=' +
				amount +
				'&extraData=' +
				extraData +
				'&message=' +
				message +
				'&orderId=' +
				orderId +
				'&orderInfo=' +
				orderInfo +
				'&orderType=' +
				orderType +
				'&partnerCode=' +
				partnerCode +
				'&payType=' +
				payType +
				'&requestId=' +
				requestId +
				'&responseTime=' +
				responseTime +
				'&resultCode=' +
				resultCode +
				'&transId=' +
				transId;
			const _sign = crypto
				.createHmac('sha256', serectkey)
				.update(_rawSign)
				.digest('hex');
			if (_sign == signature) {
				if(resultCode==0){
					console.log(_extraData.order_id,'MOMO',_extraData.token,transId);
					_result.status = true;
				}else{
					_result.errors={
						code:2,
						msg:message
					}
				}
			} else {
				_result.errors = {
					code: 13,
					msg: 'Chữ ký không hợp lệ',
				};
			}

			//Resp MOMO	
			if (_result.status == true) {
				_result.resp.resultCode = 0;
				_result.resp.message = 'Thành công';
			} else {
				_result.resp.resultCode = _result.errors.code;
				_result.resp.message = _result.errors.msg;
			}
			_result.resp.signature = crypto
				.createHmac('sha256', serectkey)
				.update(
					'accessKey=' +
					process.env.MOMO_ACCESS_KEY +
					'&extraData=' +
					_result.resp.extraData +
					'&message=' +
					_result.resp.message +
					'&orderId=' +
					_result.resp.orderId +
					'&partnerCode=' +
					_result.resp.partnerCode +
					'&requestId=' +
					_result.resp.requestId +
					'&responseTime=' +
					_result.resp.responseTime +
					'&resultCode=' +
					_result.resp.resultCode
				)
				.digest('hex');

			return _result;
		} catch (e) {
			console.log(e);
			const serectkey = process.env.MOMO_SECRET_KEY;
			_result.errors = {
				code: '99',
				msg: 'Lỗi hệ thống không xác định',
			};
			_result.resp.resultCode = _result.errors.code;
			_result.resp.message = _result.errors.msg;
			_result.resp.signature = crypto
				.createHmac('sha256', serectkey)
				.update(
					'accessKey=' +
					process.env.MOMO_ACCESS_KEY +
					'&extraData=' +
					_result.resp.extraData +
					'&message=' +
					_result.resp.message +
					'&orderId=' +
					_result.resp.orderId +
					'&partnerCode=' +
					_result.resp.partnerCode +
					'&requestId=' +
					_result.resp.requestId +
					'&responseTime=' +
					_result.resp.responseTime +
					'&resultCode=' +
					_result.resp.resultCode
				)
				.digest('hex');

			return _result;
		}
	}

    transformNested = (items, parent_id=0) =>{
		let _result = [];
		try {
			_result = items.reduce((r, e) => {
				if (parent_id == (e.parent_id ?? 0)) {
				  const object = { ...e }
				  const childrens =  this.transformNested(items, e.id);
	  
				  if (childrens.length) {
					object.childrens = childrens
				  }
			
				  r.push(object)
				}
				return r;
			  }, []);
			return _result;
		} catch (e) {
			console.log('error nest',e);
			return _result;
		}
	}
    formatNum=num=>{
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g,",");
    }
}

module.exports = new Helper();
