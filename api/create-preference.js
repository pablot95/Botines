const https = require('https');

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
  if (!ACCESS_TOKEN) {
    return res.status(500).json({ error: 'MercadoPago no configurado' });
  }

  try {
    const { items, payer, shipment_cost, order_id, back_url } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ error: 'No hay items en el pedido' });
    }

    // Build preference items - ensure unit_price is a Number
    const mpItems = items.map(item => ({
      title: String(item.name).substring(0, 256),
      quantity: parseInt(item.qty) || 1,
      unit_price: parseFloat(item.price) || 0,
      currency_id: 'ARS'
    }));

    // Add shipping as an item if applicable
    if (shipment_cost && parseFloat(shipment_cost) > 0) {
      mpItems.push({
        title: 'Envío',
        quantity: 1,
        unit_price: parseFloat(shipment_cost),
        currency_id: 'ARS'
      });
    }

    const baseUrl = back_url || 'https://botinesfv.gokywebs.net';

    // Minimal preference - only required fields
    const preference = {
      items: mpItems,
      back_urls: {
        success: `${baseUrl}/checkout.html?payment=success&order=${order_id || ''}`,
        failure: `${baseUrl}/checkout.html?payment=failure&order=${order_id || ''}`,
        pending: `${baseUrl}/checkout.html?payment=pending&order=${order_id || ''}`
      },
      auto_return: 'approved',
      external_reference: order_id ? String(order_id) : undefined
    };

    // Only add payer with valid email
    if (payer && payer.email && payer.email.includes('@')) {
      preference.payer = { email: payer.email };
    }

    // Create preference via MercadoPago API
    const data = JSON.stringify(preference);

    const result = await new Promise((resolve, reject) => {
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
          try {
            const parsed = JSON.parse(body);
            if (response.statusCode >= 200 && response.statusCode < 300) {
              resolve(parsed);
            } else {
              reject(new Error(`MP API error ${response.statusCode}: ${body}`));
            }
          } catch (e) {
            reject(new Error('Error parsing MP response: ' + body));
          }
        });
      });

      request.on('error', reject);
      request.write(data);
      request.end();
    });

    return res.status(200).json({
      id: result.id,
      init_point: result.init_point,
      sandbox_init_point: result.sandbox_init_point
    });

  } catch (error) {
    console.error('Error creating preference:', error.message || error);
    return res.status(500).json({ 
      error: 'Error al crear la preferencia de pago',
      detail: error.message || 'Unknown error'
    });
  }
};
