"use strict";

const Controller = require('@system/Controller');
const { v4: uuidv4 } = require('uuid');

// Global in-memory storage for sessions
if (!global.shopSessions) {
    global.shopSessions = new Map();
    global.shopQueuePosition = 0;
}

module.exports = class extends Controller {
    constructor(tableName) {
        super(tableName);
    }

    // Override join/create session (POST /sessions)
    async create(req, res) {
        try {
            const token = uuidv4();
            global.shopQueuePosition += 1;
            const position = global.shopQueuePosition;
            
            const sessionData = {
                token,
                queue_position: position,
                joined_at: new Date(Date.now() + 7 * 3600 * 1000),
                expires_at: new Date(Date.now() + (7 + 2) * 3600 * 1000), // GMT+7 + 2 hours TTL
                order_placed: false
            };
            
            global.shopSessions.set(token, sessionData);
            
            this.response(res, 201, {
                status: 'success',
                data: sessionData
            });
        } catch (e) {
            this.response(res, 500, e.message);
        }
    }

    // Override get session status (GET /sessions/:token)
    async get(req, res) {
        try {
            const token = req.params.id; // from /:id
            const session = global.shopSessions.get(token);
            
            if (!session) {
                return this.response(res, 404, { status: 'error', errors: { msg: 'Session not found or expired' } });
            }
            
            // Optionally check expiration
            if (new Date(Date.now() + 7 * 3600 * 1000) > session.expires_at) {
                global.shopSessions.delete(token);
                // Notify client via socket that session has expired
                if (global.io) {
                    global.io.to(`session:${token}`).emit('session:expired', { msg: 'Phiên đặt hàng đã hết hạn.' });
                }
                return this.response(res, 404, { status: 'error', errors: { msg: 'Session expired' } });
            }
            
            this.response(res, 200, {
                status: 'success',
                data: session
            });
        } catch (e) {
            this.response(res, 500, e.message);
        }
    }
}
