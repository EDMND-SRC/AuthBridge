#!/usr/bin/env node

/**
 * Simple webhook test server
 * Receives webhook notifications and logs them
 */

const http = require('http');
const crypto = require('crypto');

const PORT = 3333;
const WEBHOOK_SECRET = 'test-webhook-secret-123';

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/webhook') {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const signature = req.headers['x-authbridge-signature'];

        console.log('\n📨 Webhook Received:');
        console.log('  Timestamp:', new Date().toISOString());
        console.log('  Event:', payload.event);
        console.log('  Verification ID:', payload.data?.verificationId);
        console.log('  Status:', payload.data?.status);

        if (payload.data?.reason) {
          console.log('  Reason:', payload.data.reason);
        }
        if (payload.data?.notes) {
          console.log('  Notes:', payload.data.notes);
        }

        // Verify signature
        if (signature) {
          const expectedSignature = 'sha256=' + crypto
            .createHmac('sha256', WEBHOOK_SECRET)
            .update(body)
            .digest('hex');

          if (signature === expectedSignature) {
            console.log('  ✅ Signature valid');
          } else {
            console.log('  ❌ Signature invalid');
            console.log('    Expected:', expectedSignature);
            console.log('    Received:', signature);
          }
        }

        console.log('\n  Full Payload:', JSON.stringify(payload, null, 2));

        // Respond with 200 OK
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ received: true }));
      } catch (error) {
        console.error('❌ Error processing webhook:', error.message);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(PORT, () => {
  console.log(`🎯 Webhook Test Server running on http://localhost:${PORT}/webhook`);
  console.log(`📝 Webhook Secret: ${WEBHOOK_SECRET}`);
  console.log('\nWaiting for webhooks...\n');
});
