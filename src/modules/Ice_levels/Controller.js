"use strict";

/* Package System */
const Controller = require('@system/Controller');
const { get } = require('@utils/Helper');

const escpos = require('escpos');
// const Network = require('escpos-network');
escpos.Network = require('escpos-network');

const PRINTER_IP = '192.168.2.40';
const PRINTER_PORT = 9100;

module.exports = class extends Controller {

	constructor(tableName) {
		super(tableName);
	}

	async test(req, res) {
		const device = new escpos.Network(PRINTER_IP, PRINTER_PORT);
		const options = { encoding: 'CP437' }; // thử CP437/CP1258 nếu cần
		const printer = new escpos.Printer(device,options);
		device.open((err) => {
			if (err) {
			  console.error('Lỗi kết nối máy in:', err);
			  return;
			}
		  
			// Thiết lập định dạng in
			printer
			  .font('A') // Chọn font
			  .align('CT') // Căn giữa
			  .style('B') // In đậm
			  .size(1, 1) // Kích thước chữ
			  .text('HOA DON BAN HANG')
			  .text('-----------------------------')
			  .align('LT') // Căn trái
			  .text('Cua hang: Ten cua hang XYZ')
			  .text('Dia chi: 123 Duong ABC, Quan 1')
			  .text('SDT: 0123 456 789')
			  .text('Ngay: ' + new Date().toLocaleString())
			  .text('-----------------------------');
		  
			// In danh sách sản phẩm
			printer
    .align('ct').style('b').size(1, 1).text('1996 Coffee & Milk Tea')
    .style('normal').align('lt')
    .text('Hoa don #A10023')
    .text('------------------------------')
    .tableCustom([
      { text: 'Tra sua TC', align: 'LEFT', width: 0.6 },
      { text: 'x1',         align: 'CENTER', width: 0.2 },
      { text: '20,000',     align: 'RIGHT',  width: 0.2 },
    ])
    .text('------------------------------')
    .align('rt').text('Tong: 20,000đ')
    .align('ct').text('Cam on quy khach!')
	.text('------------------------------')
	.text('------------------------------')
    .cut()
    .close();
		  })
		console.log(333);
	}
}