const https = require('https');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let email, source;
  try {
    const body = JSON.parse(event.body);
    email = body.email;
    source = body.source || 'historyabroad.com';
  } catch(e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  if (!email) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Email required' }) };
  }

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'API key not configured' }) };
  }

  const payload = JSON.stringify({
    email: email,
    listIds: [3],
    updateEnabled: true,
    attributes: { SOURCE: source }
  });

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.brevo.com',
      path: '/v3/contacts',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('Brevo status:', res.statusCode);
        console.log('Brevo response:', data);
        if (res.statusCode === 201 || res.statusCode === 204) {
          resolve({
            statusCode: 200,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ success: true })
          });
        } else {
          resolve({
            statusCode: res.statusCode,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: data })
          });
        }
      });
    });

    req.on('error', (err) => {
      console.log('Request error:', err.message);
      resolve({
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: err.message })
      });
    });

    req.write(payload);
    req.end();
  });
};
