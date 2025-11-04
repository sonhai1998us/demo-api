"use strict";

/* Package System */
const os = require('os');
const fs = require('fs');
const Controller = require('@system/Controller');
const Model = require('@system/Model');
const { get } = require('@utils/Helper');

const escpos = require('escpos');
// const Network = require('escpos-network');
escpos.Network = require('escpos-network');
const { createCanvas, loadImage } = require('canvas');

const PRINTER_IP = '192.168.2.40';
const PRINTER_PORT = 9100;
const path = require('path');
const LOGO_PATH = path.join(__dirname, '../..', 'upload', 'logo2.png');
const LOGO_SIZE = 300;

// Tạo file tạm an toàn
function makeTempPngPath(name = 'logo_resized') {
	const rnd = Math.random().toString(36).slice(2, 8);
	return path.join(os.tmpdir(), `${name}_${rnd}.png`);
}

async function loadAndResizeLogoToEscposImage(srcPath, sizePx) {
	if (!fs.existsSync(srcPath)) {
		throw new Error(`Không tìm thấy file ảnh: ${srcPath}`);
	}

	const img = await loadImage(srcPath);
	if (!img || !img.width || !img.height) {
		throw new Error('Ảnh load thất bại hoặc không hợp lệ');
	}

	// Resize + canh giữa, nền trắng
	const canvas = createCanvas(sizePx, sizePx);
	const ctx = canvas.getContext('2d');

	ctx.fillStyle = '#FFFFFF';
	ctx.fillRect(0, 0, sizePx, sizePx);

	const scale = Math.min(sizePx / img.width, sizePx / img.height);
	const w = Math.max(1, Math.floor(img.width * scale));
	const h = Math.max(1, Math.floor(img.height * scale));
	const x = Math.floor((sizePx - w) / 2);
	const y = Math.floor((sizePx - h) / 2);
	ctx.drawImage(img, x, y, w, h);

	// Ghi ra PNG tạm
	const tmpPng = makeTempPngPath('logo_resized');
	fs.writeFileSync(tmpPng, canvas.toBuffer('image/png'));

	// Trả về escpos.Image qua API load() (bọc Promise)
	const escposImage = await new Promise((resolve, reject) => {
		escpos.Image.load(tmpPng, (image) => {
			if (!image) return reject(new Error('escpos.Image.load trả về null'));
			resolve(image);
		});
	});

	// Tuỳ ý: xoá file tạm sau khi in xong (ở chỗ gọi)
	return { escposImage, tmpPng };
}
function removeVietnameseTones(str) {
	str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
	str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
	str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
	str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
	str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
	str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
	str = str.replace(/đ/g, "d");
	str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
	str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
	str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
	str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
	str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
	str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
	str = str.replace(/Đ/g, "D");
	// Remove combining diacritics 
	str = str.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, "");
	str = str.replace(/\u02C6|\u0306|\u031B/g, "");
	return str;
}
module.exports = class extends Controller {

	constructor(tableName) {
		super(tableName);
		this.dbCartItemTopping = new Model('cart_item_toppings');
	}

	async getAll(req, res) {
		try {
			if (!req.query?.fqnull) req.query.fqnull = "deleted_at"
			req.query.joinQueries = [
				{
					fieldJoin: 'product_id',
					fieldTarget: 'id',
					table: 'products',
					mergeField: 'products.name as product_name, products.base_price as product_price',
				},
				{
					fieldJoin: 'topping_id',
					fieldTarget: 'id',
					table: 'toppings',
					mergeField: 'toppings.name as topping_name, toppings.price as topping_price',
				},
				{
					fieldJoin: 'size_id',
					fieldTarget: 'id',
					table: 'sizes',
					mergeField: 'sizes.name as size_name',
				},
				{
					fieldJoin: 'ice_id',
					fieldTarget: 'id',
					table: 'ice_levels',
					mergeField: 'ice_levels.label as ice_name',
				},
				{
					fieldJoin: 'sweetness_id',
					fieldTarget: 'id',
					table: 'sweetness_levels',
					mergeField: 'sweetness_levels.label as sweetness_name',
				},
			];
			const _data = await this.db.find(req);
			if (_data?.data && _data.data.length > 0)
				_data.data = await this.rempDataMapping(_data.data, req.access_token);
			const _result = _data == null ? { items: [] } : _data;
			this.response(res, 200, _result);
		} catch (e) {
			this.response(res, 500, e.message);
		}
	}

	async rempDataMapping(data, token) {
		// const toppingData = await get(`${process.env.BASE_URL}/v1/toppings`, {}, 'Token').then(resp => resp?.data ?? {}).catch((e) => { });
		const cart_item_topping_data = await this.dbCartItemTopping.find({
			query: {
				joinQueries: [
					{
						fieldJoin: 'topping_id',
						fieldTarget: 'id',
						table: 'toppings',
						mergeField: 'toppings.id as id, toppings.name as name, toppings.price as price',
					}
				]
			}
		});

		const cartWithToppings = await Promise.all(
			data.map(async (item) => {
				const toppings = cart_item_topping_data?.data.filter(tr => tr.cart_item_id === item.id).map(tr => { return { id: tr.id, name: tr.name, price: tr.price } });
				
				// Chỉ lấy size_price nếu là PRODUCT và có product_id, size_id
				let sizePriceData = null;
				if (item.item_type === 'PRODUCT' && item.product_id && item.size_id) {
					sizePriceData = await get(`${process.env.BASE_URL}/v1/product_size_prices?fq=product_id:${item.product_id},size_id:${item.size_id}`, {}, 'Token').then(resp => resp?.data ?? {}).catch((e) => { });
				}
				
				// Mapping theo item_type
				let mappedItem = { ...item, size_price: sizePriceData?.[0]?.price || null, toppings };
				
				// Nếu là TOPPING, sử dụng topping_name và topping_price
				if (item.item_type === 'TOPPING') {
					mappedItem.item_name = item.topping_name || '';
					mappedItem.item_price = item.topping_price || 0;
				} else if (item.item_type === 'PRODUCT') {
					// Nếu là PRODUCT, sử dụng product_name và product_price
					mappedItem.item_name = item.product_name || '';
					mappedItem.item_price = item.product_price || 0;
				}
				
				return mappedItem;
			})
		);

		return cartWithToppings;
	}

	async printBill(req, res) {
		const order = req.body;

		// ... hàm removeVietnameseTones giữ nguyên ...

		try {
			const device = new escpos.Network(PRINTER_IP, PRINTER_PORT);
			const printer = new escpos.Printer(device);

			// ⬇️ lấy ảnh đã resize dạng escpos.Image + đường dẫn tạm
			const { escposImage, tmpPng } = await loadAndResizeLogoToEscposImage(LOGO_PATH, LOGO_SIZE);

			const vnd = (n) => (Number(n) || 0).toLocaleString('vi-VN');

			// tính tổng 1 dòng hàng
			const itemLineTotal = (item) => {
				if (item.item_type === 'TOPPING') {
					// Nếu là TOPPING, chỉ tính giá topping
					const toppingPrice = Number(item.item_price || item.topping_price || 0);
					return toppingPrice * (Number(item.quantity) || 0);
				} else {
					// Nếu là PRODUCT, tính base + size + toppings
					const base = (Number(item.item_price || item.product_price) || 0) + (Number(item.size_price) || 0);
					const toppingsSum = (item.toppings || []).reduce((s, t) => s + (Number(t.price) || 0), 0);
					const unit = base + toppingsSum; // giá cho 1 đơn vị (đã cộng size + topping)
					return unit * (Number(item.quantity) || 0);
				}
			};

			// tổng trước giảm
			const subTotal = (order.items || []).reduce((s, it) => s + itemLineTotal(it), 0);

			// giảm giá (hỗ trợ cả discount_amount và discount_mount)
			const discount = Number(order.discount_amount ?? order.discount_mount ?? 0) || 0;

			// tổng sau giảm
			const grandTotal = Math.max(0, subTotal - discount);
			device.open((err) => {
				if (err) {
					console.error('Loi ket noi may in:', err);
					return res.status(500).send('Loi ket noi may in');
				}

				try {
					printer
					
						.align('ct')
						.style('NORMAL')
						.size(1, 1)
						.text('Hoa Don Ban Hang')

						.align('ct')
						.raster(escposImage, 'normal')       // logo đã resize
						.feed(2)

						// Header cửa hàng
						.font('A')
						.style('B')
						.size(1, 1)
						.align('ct')
						.text(removeVietnameseTones('La va Suong'))
						
						.align('ct')
						.style('NORMAL')
						.size(0, 0)
						.text(removeVietnameseTones('36/27B Duong so 4, phuong Hiep Binh, Thu Duc'))
						.text(removeVietnameseTones('SDT: 0931 792 220'))
						.text('-----------------------------')

						// Thông tin đơn hàng
						.align('lt')
						.style('NORMAL')
						.size(0, 0)
						.text(removeVietnameseTones(`Ma don: #${order.id}`))
						.text(removeVietnameseTones(`Thoi gian: ${new Date(order.order_time).toLocaleString('vi-VN')}`))
						.text(removeVietnameseTones(`Phuong thuc thanh toan: ${order.payment_method_id === 2 ? 'Tien mat' : 'Chuyen khoan'}`))
						.text('-----------------------------');

					// Header bảng SP
					printer.tableCustom([
						{ text: removeVietnameseTones('San pham'), align: 'LEFT', width: 0.5 },
						{ text: 'SL', align: 'CENTER', width: 0.15 },
						{ text: removeVietnameseTones('Gia'), align: 'RIGHT', width: 0.35 },
					]);

					// Dòng sản phẩm
					(order.items || []).forEach((item) => {
						const qty = Number(item.quantity) || 0;
						const lineTotal = itemLineTotal(item);
						
						// Xác định tên hiển thị dựa trên item_type
						const displayName = item.item_name || item.product_name || item.topping_name || '';

						// Tên + dòng chính (đã nhân SL)
						printer.tableCustom([
							{ text: removeVietnameseTones(displayName), align: 'LEFT', width: 0.5 },
							{ text: String(qty), align: 'CENTER', width: 0.15 },
							{ text: vnd(lineTotal), align: 'RIGHT', width: 0.35 },
						]);

						// Nếu là TOPPING, chỉ hiển thị giá topping
						if (item.item_type === 'TOPPING') {
							const toppingPrice = Number(item.item_price || item.topping_price || 0);
							printer.text(
								removeVietnameseTones(`   Gia: ${vnd(toppingPrice)} /sp x ${qty} = ${vnd(toppingPrice * qty)}`)
							);
						} else {
							// Nếu là PRODUCT, hiển thị size, giá sản phẩm, và toppings
							// Size (nếu có)
							if (item.size_name) {
								const sp = Number(item.size_price) || 0;
								printer.text(
									removeVietnameseTones(
										`   Size: ${item.size_name} ${sp ? `(+${vnd(sp)} /sp)` : ''}`
									)
								);
							}

							// Giá gốc sản phẩm (nếu muốn show rõ)
							const productPrice = Number(item.item_price || item.product_price || 0);
							if (productPrice > 0) {
								printer.text(
									removeVietnameseTones(`   Gia san pham: ${vnd(productPrice)} /sp`)
								);
							}

							// Topping (mỗi topping hiển thị giá / 1 sp, có *SL* để rõ tổng)
							(item.toppings || []).forEach((t) => {
								const tp = Number(t.price) || 0;
								// hiển thị +Giá topping/1 sp và nhân SL để người dùng hiểu tổng
								printer.text(
									removeVietnameseTones(`   + Topping: ${t.name} (+${vnd(tp)} /sp) x ${qty}`)
								);
							});
						}

						// Ghi chú
						if (item.notes) {
							printer.text(removeVietnameseTones(`   Ghi chu: ${item.notes}`));
						}
					});

					// Ngăn cách totals
					printer
						.text('-----------------------------');

					// Nếu có giảm giá → in giảm giá & Tổng sau giảm
					if (discount > 0) {
						printer
							.align('rt')
							.style('B')
							.text(removeVietnameseTones(`Tong cong: ${vnd(subTotal)} VND`))
							.text(removeVietnameseTones(`Giam gia: -${vnd(discount)} VND`))
							.text(removeVietnameseTones(`Tong sau giam: ${vnd(grandTotal)} VND`));
					} else {
						// Không giảm giá → chỉ in tổng cộng
						printer
							.align('rt')
							.style('B')
							.text(removeVietnameseTones(`Tong cong: ${vnd(subTotal)} VND`));
					}

					// Footer
					printer
						.align('ct')
						.style('NORMAL')
						.text('-----------------------------')
						.text(removeVietnameseTones('Cam on quy khach!'))
						.text(removeVietnameseTones('Hen gap lai!'))
						.feed(3)
						.cut()
						.close();

					// Xoá file tạm (không chặn response)
					try { fs.unlink(tmpPng, () => { }); } catch { }

					return res.status(200).send('In hoa don thanh cong');
				} catch (e) {
					console.error('Loi khi in:', e);
					try { fs.unlink(tmpPng, () => { }); } catch { }
					return res.status(500).send('Loi khi in hoa don');
				}
			});
		} catch (error) {
			console.error('Loi:', error);
			return res.status(500).send('Loi khi in hoa don');
		}
	}
}