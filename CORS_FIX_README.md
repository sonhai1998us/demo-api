# Khắc phục vấn đề CORS trong demo-api

## Vấn đề đã được khắc phục

### 1. Cấu hình CORS chi tiết trong server.js

Đã cải thiện cấu hình CORS từ:
```javascript
app.use(cors());
```

Thành cấu hình chi tiết:
```javascript
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
                'http://127.0.0.1:8080'
            ];
            
            if (!origin || allowedOrigins.indexOf(origin) !== -1) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        }
    },
    credentials: true,
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
    maxAge: 86400
};
```

### 2. Thêm middleware xử lý preflight requests

```javascript
app.options('*', cors(corsOptions));
```

### 3. Sửa lỗi trong hàm printBill

Đã sửa lỗi syntax và hoàn thiện error handling trong Controller.

## Cách sử dụng

### 1. Khởi động server
```bash
cd demo-api
npm run dev
```

### 2. Test API printBill
```bash
curl -X POST http://localhost:3000/v1/print-bill \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{"order_id": "123", "items": []}'
```

### 3. Từ frontend (JavaScript)
```javascript
fetch('http://localhost:3000/v1/print-bill', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_TOKEN'
    },
    body: JSON.stringify({
        order_id: '123',
        items: []
    })
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));
```

## Cấu hình môi trường

### Development (.env.development)
```env
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
```

### Production (.env.production)
```env
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
```

## Lưu ý quan trọng

1. **Trong development**: CORS sẽ cho phép tất cả origins
2. **Trong production**: Chỉ cho phép các domains được cấu hình trong `allowedOrigins`
3. **Headers**: Đã cấu hình đầy đủ các headers cần thiết cho API
4. **Methods**: Hỗ trợ đầy đủ các HTTP methods
5. **Credentials**: Cho phép gửi cookies và headers xác thực

## Troubleshooting

### Nếu vẫn gặp lỗi CORS:

1. Kiểm tra console browser để xem lỗi cụ thể
2. Đảm bảo frontend đang gọi đúng URL và port
3. Kiểm tra xem có đang sử dụng HTTPS/HTTP đúng không
4. Restart server sau khi thay đổi cấu hình

### Test CORS với Postman:
- Sử dụng Postman để test API trước
- Đảm bảo không có vấn đề với API logic
- Sau đó test từ frontend

## Kết luận

Với những thay đổi trên, vấn đề CORS đã được khắc phục hoàn toàn. API `printBill` giờ đây có thể được gọi từ frontend mà không gặp lỗi CORS.

