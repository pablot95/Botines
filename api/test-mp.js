const https = require('https');

// Endpoint de diagnóstico - probar si el access token es válido
// Llama a GET /users/me en MercadoPago
// Acceder via: https://botinesfv.gokywebs.net/api/test-mp
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;

  if (!ACCESS_TOKEN) {
    return res.status(200).json({ 
      status: 'ERROR',
      message: 'MP_ACCESS_TOKEN no está configurado en Vercel',
      tokenExists: false
    });
  }

  try {
    // Test 1: Check token validity by getting user info
    const userInfo = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.mercadopago.com',
        path: '/users/me',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`
        }
      };

      const request = https.request(options, (response) => {
        let body = '';
        response.on('data', chunk => { body += chunk; });
        response.on('end', () => {
          resolve({ statusCode: response.statusCode, body });
        });
      });

      request.on('error', reject);
      request.end();
    });

    // Test 2: Try creating a minimal preference
    const testPreference = {
      items: [{
        title: 'Test',
        quantity: 1,
        unit_price: 100.00,
        currency_id: 'ARS'
      }]
    };

    const prefTest = await new Promise((resolve, reject) => {
      const data = JSON.stringify(testPreference);
      const options = {
        hostname: 'api.mercadopago.com',
        path: '/checkout/preferences',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Length': Buffer.byteLength(data)
        }
      };

      const request = https.request(options, (response) => {
        let body = '';
        response.on('data', chunk => { body += chunk; });
        response.on('end', () => {
          resolve({ statusCode: response.statusCode, body });
        });
      });

      request.on('error', reject);
      request.write(data);
      request.end();
    });

    const userParsed = JSON.parse(userInfo.body);
    
    return res.status(200).json({
      status: 'OK',
      tokenExists: true,
      tokenPrefix: ACCESS_TOKEN.substring(0, 15) + '...',
      userTest: {
        httpStatus: userInfo.statusCode,
        userId: userParsed.id || null,
        email: userParsed.email || null,
        siteId: userParsed.site_id || null
      },
      preferenceTest: {
        httpStatus: prefTest.statusCode,
        response: prefTest.body.substring(0, 500)
      }
    });

  } catch (error) {
    return res.status(200).json({
      status: 'ERROR',
      tokenExists: true,
      error: error.message
    });
  }
};
