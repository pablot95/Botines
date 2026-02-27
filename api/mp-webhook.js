const https = require('https');

module.exports = async (req, res) => {
  // MercadoPago sends POST notifications
  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true });
  }

  const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
  if (!ACCESS_TOKEN) {
    return res.status(500).json({ error: 'No configurado' });
  }

  try {
    const { type, data } = req.body;

    // We only care about payment notifications
    if (type === 'payment' && data && data.id) {
      const paymentId = data.id;

      // Get payment details from MercadoPago
      const payment = await new Promise((resolve, reject) => {
        const options = {
          hostname: 'api.mercadopago.com',
          path: `/v1/payments/${paymentId}`,
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`
          }
        };

        const request = https.request(options, (response) => {
          let body = '';
          response.on('data', chunk => { body += chunk; });
          response.on('end', () => {
            try {
              resolve(JSON.parse(body));
            } catch (e) {
              reject(e);
            }
          });
        });

        request.on('error', reject);
        request.end();
      });

      // Log payment status (you can extend this to update Firebase)
      console.log(`Payment ${paymentId}: status=${payment.status}, external_ref=${payment.external_reference}`);

      // Here you could update the order status in Firebase if needed
      // The external_reference contains the order_id from Firestore
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(200).json({ ok: true }); // Always return 200 to MP
  }
};
