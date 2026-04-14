"use strict";

/* Package System */
process.env.NODE_ENV = process.env.NODE_ENV || "development";
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env' + ((process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging') ? '.' + process.env.NODE_ENV : '.development')) });
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const bodyParser = require('body-parser');

/* Package Application */
const app = express();
const { validateContentType } = require('./system/Middleware');
const routeService = require('./src/config/Routes');

try {
	let server;
	app.disable('x-powered-by');
	if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging') {
		app.use(helmet());
	}

	// Cấu hình CORS chi tiết để khắc phục vấn đề
	const corsOptions = {
		origin: function (origin, callback) {
			// Cho phép tất cả origins trong development
			if (process.env.NODE_ENV === 'development') {
				callback(null, true);
			} else {
				// Trong production, chỉ cho phép các domains cụ thể
				const allowedOrigins = [
					'http://localhost:3000',
					'http://localhost:3001',
					'http://localhost:8080',
					'http://127.0.0.1:3000',
					'http://127.0.0.1:3001',
					'http://127.0.0.1:8080',
					'https://demo-online.xyz',
					'https://1996tea.netlify.app'
					// Thêm các domains khác nếu cần
				];
				
				if (!origin || allowedOrigins.indexOf(origin) !== -1) {
					callback(null, true);
				} else {
					callback(new Error('Not allowed by CORS'));
				}
			}
		},
		credentials: true, // Cho phép gửi cookies và headers xác thực
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
		allowedHeaders: [
			'Origin',
			'X-Requested-With',
			'Content-Type',
			'Accept',
			'Authorization',
			'X-Access-Token',
			'X-Key',
			'Cache-Control',
			'Pragma'
		],
		exposedHeaders: ['Content-Length', 'X-Requested-With'],
		maxAge: 86400 // Cache preflight request trong 24 giờ
	};

	app.use(cors(corsOptions));
	
	// Thêm middleware để xử lý preflight requests
	app.options('*', cors(corsOptions));
	
	app.use(bodyParser.json({ limit: '100mb' }));
	app.use(bodyParser.urlencoded({ extended: true }));
	app.use((err, req, res, next) => {
		if (err) {
			res.status(400).json({
				status: 'error',
				errors: { msg: 'Error parsing data' }
			});
		} else next();
	});
	app.use(validateContentType());
	app.use('/v1', routeService);

	app.get('/', (req, res) => {
		res.send('Hi ' + process.env.NODE_ENV + ' - version: 1.0.0');
	})

	const httpServer = require('http').createServer(app);

	// Attach Socket.io
	const { Server } = require('socket.io');
	const io = new Server(httpServer, {
		cors: {
			origin: process.env.NODE_ENV === 'development'
				? '*'
				: ['https://1996tea.netlify.app', 'http://localhost:3000'],
			methods: ['GET', 'POST'],
			credentials: true
		},
		transports: ['websocket', 'polling']
	});

	// Make io accessible globally from any Controller
	global.io = io;

	io.on('connection', (socket) => {
		console.log(`[socket] client connected: ${socket.id}`);

		// Client sends their session token → join a private room
		socket.on('join_session', (token) => {
			if (token && typeof token === 'string') {
				socket.join(`session:${token}`);
				console.log(`[socket] ${socket.id} joined room session:${token}`);
			}
		});

		socket.on('disconnect', () => {
			console.log(`[socket] client disconnected: ${socket.id}`);
		});
	});

	httpServer.listen(process.env.PORT || 3000, '0.0.0.0');
	console.log(`Api master | ${process.env.NODE_ENV} - ${process.pid} is running on port ${process.env.PORT}`);
} catch (e) { console.log('ee', e, process.env) }