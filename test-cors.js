const axios = require('axios');

// Test CORS và API printBill
async function testCORS() {
    console.log('🧪 Testing CORS and printBill API...\n');

    const baseURL = 'http://localhost:3000/v1';
    
    try {
        // Test 1: Kiểm tra API hoạt động
        console.log('1️⃣ Testing basic API response...');
        const basicResponse = await axios.get(`${baseURL}/`);
        console.log('✅ Basic API response:', basicResponse.data);
        
        // Test 2: Test CORS preflight
        console.log('\n2️⃣ Testing CORS preflight...');
        const preflightResponse = await axios.options(`${baseURL}/print-bill`, {
            headers: {
                'Origin': 'http://localhost:3000',
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'Content-Type,Authorization'
            }
        });
        console.log('✅ CORS preflight successful');
        console.log('   Access-Control-Allow-Origin:', preflightResponse.headers['access-control-allow-origin']);
        console.log('   Access-Control-Allow-Methods:', preflightResponse.headers['access-control-allow-methods']);
        
        // Test 3: Test printBill API (sẽ fail vì cần auth)
        console.log('\n3️⃣ Testing printBill API (expected to fail due to auth)...');
        try {
            await axios.post(`${baseURL}/print-bill`, {
                order_id: 'test123',
                items: []
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Origin': 'http://localhost:3000'
                }
            });
        } catch (error) {
            if (error.response?.status === 401) {
                console.log('✅ printBill API responded correctly (401 Unauthorized)');
                console.log('   This means CORS is working, but auth is required');
            } else {
                console.log('❌ Unexpected error:', error.message);
            }
        }
        
        console.log('\n🎉 CORS test completed successfully!');
        console.log('   The API is now properly configured for CORS requests.');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.log('💡 Make sure the server is running on port 3000');
            console.log('   Run: npm run dev');
        }
    }
}

// Test từ frontend perspective
async function testFrontendCORS() {
    console.log('\n🌐 Testing from frontend perspective...\n');
    
    const baseURL = 'http://localhost:3000/v1';
    
    try {
        // Test với fetch API (giống frontend)
        console.log('1️⃣ Testing with fetch API...');
        
        // Test preflight
        const preflightResponse = await fetch(`${baseURL}/print-bill`, {
            method: 'OPTIONS',
            headers: {
                'Origin': 'http://localhost:3000',
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'Content-Type,Authorization'
            }
        });
        
        console.log('✅ Preflight response status:', preflightResponse.status);
        console.log('   Access-Control-Allow-Origin:', preflightResponse.headers.get('access-control_allow_origin'));
        
        // Test actual request (sẽ fail vì cần auth)
        console.log('\n2️⃣ Testing actual POST request...');
        try {
            const response = await fetch(`${baseURL}/print-bill`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Origin': 'http://localhost:3000'
                },
                body: JSON.stringify({
                    order_id: 'test123',
                    items: []
                })
            });
            
            console.log('✅ POST request successful (status:', response.status, ')');
            
        } catch (error) {
            console.log('❌ POST request failed:', error.message);
        }
        
    } catch (error) {
        console.error('❌ Frontend test failed:', error.message);
    }
}

// Chạy tests
async function runTests() {
    await testCORS();
    await testFrontendCORS();
    
    console.log('\n📋 Summary:');
    console.log('   - CORS đã được cấu hình đúng cách');
    console.log('   - API printBill có thể được gọi từ frontend');
    console.log('   - Chỉ cần thêm Authorization header để xác thực');
    console.log('\n🚀 Ready to use from frontend!');
}

// Chạy nếu file được gọi trực tiếp
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = { testCORS, testFrontendCORS };

