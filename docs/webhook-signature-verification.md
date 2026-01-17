# Webhook Signature Verification Guide

## Overview

AuthBridge signs all webhook payloads using HMAC-SHA256 to ensure authenticity and integrity. This guide explains how to verify webhook signatures in your application.

## Signature Format

Every webhook request includes these headers:

| Header | Description |
|--------|-------------|
| `X-AuthBridge-Signature` | HMAC-SHA256 signature (hex-encoded) |
| `X-AuthBridge-Timestamp` | Unix timestamp (seconds) when signature was generated |
| `X-AuthBridge-Webhook-Id` | Unique identifier for this webhook delivery |

## Verification Algorithm

1. Extract the timestamp and signature from headers
2. Validate timestamp is within tolerance (5 minutes recommended)
3. Construct the signed payload: `{timestamp}.{rawBody}`
4. Compute HMAC-SHA256 using your webhook secret
5. Compare signatures using constant-time comparison

## Code Examples

### Node.js / TypeScript

```typescript
import crypto from 'crypto';

interface WebhookHeaders {
  'x-authbridge-signature': string;
  'x-authbridge-timestamp': string;
  'x-authbridge-webhook-id': string;
}

export function verifyWebhookSignature(
  rawBody: string,
  headers: WebhookHeaders,
  webhookSecret: string,
  toleranceSeconds = 300
): boolean {
  const signature = headers['x-authbridge-signature'];
  const timestamp = headers['x-authbridge-timestamp'];

  // 1. Validate timestamp freshness
  const timestampNum = parseInt(timestamp, 10);
  const now = Math.floor(Date.now() / 1000);

  if (Math.abs(now - timestampNum) > toleranceSeconds) {
    console.error('Webhook timestamp outside tolerance window');
    return false;
  }

  // 2. Construct signed payload
  const signedPayload = `${timestamp}.${rawBody}`;

  // 3. Compute expected signature
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(signedPayload)
    .digest('hex');

  // 4. Constant-time comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

// Express.js middleware example
import express from 'express';

const app = express();

// IMPORTANT: Use raw body for signature verification
app.use('/webhooks', express.raw({ type: 'application/json' }));

app.post('/webhooks/authbridge', (req, res) => {
  const rawBody = req.body.toString();
  const headers = req.headers as unknown as WebhookHeaders;

  if (!verifyWebhookSignature(rawBody, headers, process.env.WEBHOOK_SECRET!)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const payload = JSON.parse(rawBody);

  // Process webhook...
  console.log('Verified webhook:', payload.event);

  res.status(200).json({ received: true });
});
```

### Python

```python
import hmac
import hashlib
import time
from typing import Dict

def verify_webhook_signature(
    raw_body: str,
    headers: Dict[str, str],
    webhook_secret: str,
    tolerance_seconds: int = 300
) -> bool:
    """Verify AuthBridge webhook signature."""
    signature = headers.get('x-authbridge-signature', '')
    timestamp = headers.get('x-authbridge-timestamp', '')

    # 1. Validate timestamp freshness
    try:
        timestamp_num = int(timestamp)
    except ValueError:
        return False

    now = int(time.time())
    if abs(now - timestamp_num) > tolerance_seconds:
        print('Webhook timestamp outside tolerance window')
        return False

    # 2. Construct signed payload
    signed_payload = f"{timestamp}.{raw_body}"

    # 3. Compute expected signature
    expected_signature = hmac.new(
        webhook_secret.encode(),
        signed_payload.encode(),
        hashlib.sha256
    ).hexdigest()

    # 4. Constant-time comparison
    return hmac.compare_digest(signature, expected_signature)


# Flask example
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/webhooks/authbridge', methods=['POST'])
def handle_webhook():
    raw_body = request.get_data(as_text=True)
    headers = {k.lower(): v for k, v in request.headers}

    if not verify_webhook_signature(raw_body, headers, WEBHOOK_SECRET):
        return jsonify({'error': 'Invalid signature'}), 401

    payload = request.get_json()

    # Process webhook...
    print(f"Verified webhook: {payload['event']}")

    return jsonify({'received': True}), 200
```

### Go

```go
package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"math"
	"net/http"
	"strconv"
	"time"
)

func verifyWebhookSignature(rawBody []byte, headers http.Header, webhookSecret string, toleranceSeconds int64) bool {
	signature := headers.Get("X-AuthBridge-Signature")
	timestamp := headers.Get("X-AuthBridge-Timestamp")

	// 1. Validate timestamp freshness
	timestampNum, err := strconv.ParseInt(timestamp, 10, 64)
	if err != nil {
		return false
	}

	now := time.Now().Unix()
	if math.Abs(float64(now-timestampNum)) > float64(toleranceSeconds) {
		fmt.Println("Webhook timestamp outside tolerance window")
		return false
	}

	// 2. Construct signed payload
	signedPayload := fmt.Sprintf("%s.%s", timestamp, string(rawBody))

	// 3. Compute expected signature
	mac := hmac.New(sha256.New, []byte(webhookSecret))
	mac.Write([]byte(signedPayload))
	expectedSignature := hex.EncodeToString(mac.Sum(nil))

	// 4. Constant-time comparison
	return hmac.Equal([]byte(signature), []byte(expectedSignature))
}

func webhookHandler(w http.ResponseWriter, r *http.Request) {
	rawBody, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Failed to read body", http.StatusBadRequest)
		return
	}

	if !verifyWebhookSignature(rawBody, r.Header, webhookSecret, 300) {
		http.Error(w, "Invalid signature", http.StatusUnauthorized)
		return
	}

	// Process webhook...
	fmt.Println("Verified webhook")

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"received": true}`))
}
```

### PHP

```php
<?php

function verifyWebhookSignature(
    string $rawBody,
    array $headers,
    string $webhookSecret,
    int $toleranceSeconds = 300
): bool {
    $signature = $headers['X-AuthBridge-Signature'] ?? '';
    $timestamp = $headers['X-AuthBridge-Timestamp'] ?? '';

    // 1. Validate timestamp freshness
    $timestampNum = (int) $timestamp;
    $now = time();

    if (abs($now - $timestampNum) > $toleranceSeconds) {
        error_log('Webhook timestamp outside tolerance window');
        return false;
    }

    // 2. Construct signed payload
    $signedPayload = "{$timestamp}.{$rawBody}";

    // 3. Compute expected signature
    $expectedSignature = hash_hmac('sha256', $signedPayload, $webhookSecret);

    // 4. Constant-time comparison
    return hash_equals($expectedSignature, $signature);
}

// Usage
$rawBody = file_get_contents('php://input');
$headers = getallheaders();

if (!verifyWebhookSignature($rawBody, $headers, $_ENV['WEBHOOK_SECRET'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid signature']);
    exit;
}

$payload = json_decode($rawBody, true);

// Process webhook...
error_log("Verified webhook: " . $payload['event']);

http_response_code(200);
echo json_encode(['received' => true]);
```

## Security Best Practices

### 1. Always Verify Signatures

Never process webhook payloads without verifying the signature first.

### 2. Use Raw Body

Parse the JSON body only AFTER signature verification. Many frameworks parse JSON automatically, which can alter whitespace and break signatures.

### 3. Implement Timestamp Tolerance

Reject webhooks with timestamps older than 5 minutes to prevent replay attacks.

### 4. Store Secrets Securely

- Use environment variables or secrets manager
- Never commit webhook secrets to version control
- Rotate secrets periodically

### 5. Return 200 Quickly

Return HTTP 200 as soon as you've verified the signature and queued the event for processing. Long-running handlers may cause timeout retries.

### 6. Handle Retries Idempotently

Use `X-AuthBridge-Webhook-Id` to deduplicate retried webhooks:

```typescript
const processedWebhooks = new Set<string>();

function handleWebhook(webhookId: string, payload: any) {
  if (processedWebhooks.has(webhookId)) {
    console.log('Duplicate webhook, skipping');
    return;
  }

  processedWebhooks.add(webhookId);
  // Process...
}
```

## Webhook Events

| Event | Description |
|-------|-------------|
| `verification.started` | Verification session initiated |
| `verification.document_uploaded` | Document image received |
| `verification.completed` | Verification finished (check `result`) |
| `verification.failed` | Verification failed (check `error`) |
| `verification.expired` | Session expired without completion |

## Testing Webhooks

### Local Development

Use the test webhook server included in the repository:

```bash
cd services/verification
node scripts/test-webhook-server.cjs
```

### Generate Test Signatures

```typescript
import crypto from 'crypto';

function generateTestSignature(payload: object, secret: string) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const body = JSON.stringify(payload);
  const signedPayload = `${timestamp}.${body}`;

  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  return {
    body,
    headers: {
      'X-AuthBridge-Signature': signature,
      'X-AuthBridge-Timestamp': timestamp,
      'X-AuthBridge-Webhook-Id': crypto.randomUUID(),
    },
  };
}
```

## Troubleshooting

### "Invalid signature" errors

1. Ensure you're using the raw request body (not parsed JSON)
2. Check that your webhook secret matches the one in AuthBridge dashboard
3. Verify timestamp is within tolerance window
4. Check for encoding issues (UTF-8)

### Missed webhooks

1. Check your server logs for 5xx errors
2. Verify your endpoint is publicly accessible
3. Check firewall rules allow AuthBridge IPs
4. Review webhook delivery logs in AuthBridge dashboard

## Support

For webhook issues, contact support@authbridge.bw with:
- Your client ID
- Webhook endpoint URL
- `X-AuthBridge-Webhook-Id` from failed deliveries
- Relevant error messages
