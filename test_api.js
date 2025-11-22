const http = require('http');

const options = {
    hostname: 'localhost',
    port: 8101,
    path: '/v1/revenues?startDate=2023-01-01&endDate=2025-12-31&type=month&scope=product',
    method: 'GET'
};

const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log(JSON.stringify(JSON.parse(data), null, 2));
    });
});

req.on('error', (error) => {
    console.error(error);
});

req.end();
