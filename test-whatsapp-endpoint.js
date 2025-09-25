const fetch = require('node-fetch');

// Test the WhatsApp endpoint
async function testWhatsAppEndpoint() {
  try {
    // You'll need to replace this with an actual bill ID from your database
    const billId = '67f3a1b2c3d4e5f6a7b8c9d0'; // This is a placeholder ID
    
    console.log('🧪 Testing WhatsApp endpoint...');
    
    const response = await fetch('http://localhost:5001/api/bills/' + billId + '/whatsapp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer your-auth-token-here' // You'll need a valid auth token
      },
      body: JSON.stringify({
        phoneNumber: '9123456789'
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ WhatsApp endpoint test successful:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log('❌ WhatsApp endpoint test failed:', response.status);
      console.log('Error:', data);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testWhatsAppEndpoint();
