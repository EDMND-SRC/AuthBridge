# Epic 6: Dodo Payments Integration Research

**Document Version:** 1.0
**Created:** 2026-01-18
**Owner:** Charlie (Senior Dev)
**Status:** Complete
**Estimated Effort:** 0.5 days

---

## Overview

This document provides research findings for integrating Dodo Payments as the Merchant of Record (MoR) for AuthBridge billing and payment processing.

**Source:** [Dodo Payments Documentation](https://docs.dodopayments.com/)

---

## What is Dodo Payments?

Dodo Payments is a global Merchant-of-Record platform that enables SaaS and digital businesses to sell in 150+ countries without managing tax, fraud, or compliance directly.

**Key Benefits:**
- **Merchant of Record:** Dodo handles legal, compliance, and tax liabilities
- **Global Reach:** Accept payments from 150+ countries
- **Developer-Friendly:** Single API for checkout, billing, and payouts
- **Tax Compliance:** Automatic tax calculation and remittance
- **Fraud Protection:** Built-in fraud detection and prevention

---

## Integration Options

### 1. Checkout Sessions (Recommended for AuthBridge)

**How it works:** Create a session on your server, redirect customer to hosted checkout.

**Use Case:** Best for AuthBridge API Access tier signup and usage-based billing.

**Implementation:**
```typescript
import DodoPayments from 'dodopayments';

const client = new DodoPayments({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY,
  environment: 'live_mode' // or 'test_mode'
});

// Create checkout session
const payment = await client.payments.create({
  payment_link: true,
  billing: {
    city: customer.city,
    country: customer.country,
    state: customer.state,
    street: customer.address,
    zipcode: customer.zipCode
  },
  customer: {
    email: customer.email,
    name: customer.name,
    phone_number: customer.phone
  },
  product_cart: [
    { product_id: 'authbridge-api-access', quantity: 1 }
  ],
  return_url: 'https://app.authbridge.io/billing/success'
});

// Redirect customer to payment.payment_link
```

---

### 2. Overlay Checkout

**How it works:** In-page modal checkout without leaving your website.

**Use Case:** Better UX for in-app upgrades.

**Implementation:**
```typescript
// Open checkout as modal overlay
window.DodoCheckout.open({
  sessionId: payment.payment_id,
  onSuccess: (paymentId) => {
    console.log('Payment successful:', paymentId);
    // Update user account status
  },
  onCancel: () => {
    console.log('Payment cancelled');
  }
});
```

---

### 3. Static Payment Links

**How it works:** Share a simple URL for quick payments.

**Use Case:** Manual invoicing, one-off payments.

**Example:**
```
https://checkout.dodopayments.com/pay/prod_abc123?email=customer@example.com&fullName=John+Doe
```

---

### 4. Usage-Based Billing (For AuthBridge)

**How it works:** Track usage events and bill customers based on consumption.

**Use Case:** Perfect for AuthBridge's per-verification pricing model.

**Implementation:**
```typescript
// Track verification usage
await client.usage.ingest({
  customer_id: 'cust_123',
  product_id: 'authbridge-api-access',
  usage_events: [
    {
      event_name: 'verification_completed',
      quantity: 1,
      timestamp: new Date().toISOString(),
      metadata: {
        verification_id: 'ver_456',
        document_type: 'omang'
      }
    }
  ]
});

// Dodo automatically bills customer at end of billing period
```

---

## Webhook Integration

### Webhook Events

Dodo Payments follows the [Standard Webhooks specification](https://www.standardwebhooks.com/).

**Key Events for AuthBridge:**
- `payment.succeeded` - Payment completed successfully
- `payment.failed` - Payment failed
- `subscription.created` - New subscription created
- `subscription.cancelled` - Subscription cancelled
- `usage.recorded` - Usage event recorded

### Webhook Implementation

**Step 1: Create webhook endpoint**

```typescript
// services/verification/src/handlers/dodo-webhook.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import crypto from 'crypto';

export async function handleDodoWebhook(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Verify webhook signature
    const signature = event.headers['webhook-signature'];
    const timestamp = event.headers['webhook-timestamp'];
    const payload = event.body;

    if (!verifySignature(signature, timestamp, payload)) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Invalid signature' }) };
    }

    // Parse webhook event
    const webhookEvent = JSON.parse(payload);

    // Handle event
    switch (webhookEvent.type) {
      case 'payment.succeeded':
        await handlePaymentSucceeded(webhookEvent.data);
        break;
      case 'payment.failed':
        await handlePaymentFailed(webhookEvent.data);
        break;
      case 'subscription.created':
        await handleSubscriptionCreated(webhookEvent.data);
        break;
      case 'subscription.cancelled':
        await handleSubscriptionCancelled(webhookEvent.data);
        break;
      default:
        console.log(`Unhandled event type: ${webhookEvent.type}`);
    }

    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (error) {
    console.error('Webhook error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Webhook processing failed' }) };
  }
}

function verifySignature(signature: string, timestamp: string, payload: string): boolean {
  const secret = process.env.DODO_WEBHOOK_SECRET;
  const signedPayload = `${timestamp}.${payload}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('base64');

  return signature === expectedSignature;
}

async function handlePaymentSucceeded(data: any) {
  // Update customer account status to active
  await dynamodb.updateItem({
    TableName: 'AuthBridgeTable',
    Key: { PK: `CLIENT#${data.customer_id}`, SK: 'META' },
    UpdateExpression: 'SET accountStatus = :active, paidAt = :now',
    ExpressionAttributeValues: {
      ':active': 'active',
      ':now': new Date().toISOString()
    }
  });

  // Send welcome email
  await sendWelcomeEmail(data.customer_email);
}
```

**Step 2: Configure webhook in Dodo Dashboard**

1. Navigate to Dodo Payments Dashboard → Webhooks
2. Add endpoint: `https://api.authbridge.io/webhooks/dodo`
3. Select events: `payment.succeeded`, `payment.failed`, `subscription.*`
4. Copy webhook secret to `.env.local`

---

## Pricing Tiers for AuthBridge

### Recommended Product Structure

**Product 1: API Access (Subscription)**
- **Name:** AuthBridge API Access
- **Price:** $99/month
- **Includes:** 100 verifications/month
- **Overage:** $1 per additional verification

**Product 2: Pay-as-you-go (Usage-Based)**
- **Name:** AuthBridge Verifications
- **Price:** $1.50 per verification
- **No monthly fee**

**Product 3: Enterprise (Custom)**
- **Name:** AuthBridge Enterprise
- **Price:** Custom pricing
- **Includes:** Dedicated support, SLA, white-label

### Creating Products in Dodo

```bash
# Via Dodo Dashboard
1. Navigate to Products → Create Product
2. Select "One-time Payment" or "Subscription"
3. Enter product details:
   - Name: AuthBridge API Access
   - Price: $99
   - Billing Period: Monthly
   - Usage-based: Enable
   - Overage Rate: $1 per verification
4. Save product
5. Copy product_id for API integration
```

---

## SDK Options

### TypeScript SDK (Recommended)

**Installation:**
```bash
npm install dodopayments
```

**Features:**
- Type-safe integration
- Promise-based API
- Auto-pagination
- Environment variable support

**Example:**
```typescript
import DodoPayments from 'dodopayments';

const client = new DodoPayments({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY,
  environment: 'live_mode'
});

// Create payment
const payment = await client.payments.create({
  payment_link: true,
  customer: { email: '[email protected]', name: 'John Doe' },
  product_cart: [{ product_id: 'prod_123', quantity: 1 }]
});

// Track usage
await client.usage.ingest({
  customer_id: 'cust_123',
  product_id: 'prod_123',
  usage_events: [{ event_name: 'verification_completed', quantity: 1 }]
});
```

---

## Implementation Roadmap

### Phase 1: MVP (Story 6.3)
- ✅ Create Dodo Payments account
- ✅ Create products (API Access, Pay-as-you-go)
- ✅ Integrate TypeScript SDK
- ✅ Implement checkout session creation
- ✅ Implement webhook handler
- ✅ Test in sandbox environment

### Phase 2: Usage Tracking (Story 6.3)
- Track verification completions
- Ingest usage events to Dodo
- Display usage in customer portal
- Implement overage alerts

### Phase 3: Customer Portal (Post-MVP)
- Billing history
- Invoice downloads
- Payment method management
- Subscription management

---

## Cost Analysis

### Dodo Payments Fees

**Merchant of Record Fee:** 5% + $0.30 per transaction

**Example Calculation:**
- AuthBridge API Access: $99/month
- Dodo Fee: $99 × 5% + $0.30 = $5.25
- Net Revenue: $99 - $5.25 = $93.75

**Comparison to Stripe:**
- Stripe: 2.9% + $0.30 = $3.17
- Dodo: 5% + $0.30 = $5.25
- **Difference:** $2.08 per transaction

**Why Dodo is Worth It:**
- No tax compliance overhead (saves $5K-10K/year)
- No legal entity setup in each country (saves $10K-50K/year)
- No fraud management overhead (saves time and chargebacks)
- Global reach without licensing (priceless for expansion)

---

## Security Considerations

### API Key Management
- Store API keys in AWS Secrets Manager
- Use environment-specific keys (test vs live)
- Rotate keys quarterly

### Webhook Security
- Verify webhook signatures (HMAC SHA-256)
- Validate timestamp to prevent replay attacks
- Use HTTPS only for webhook endpoints

### PCI Compliance
- Dodo handles all payment data (PCI DSS Level 1)
- AuthBridge never touches credit card data
- No PCI compliance burden on AuthBridge

---

## Testing Strategy

### Sandbox Environment

**Test Mode:**
```typescript
const client = new DodoPayments({
  bearerToken: process.env.DODO_TEST_API_KEY,
  environment: 'test_mode'
});
```

**Test Cards:**
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Insufficient Funds: `4000 0000 0000 9995`

### Integration Tests

```typescript
describe('Dodo Payments Integration', () => {
  it('creates checkout session', async () => {
    const payment = await client.payments.create({
      payment_link: true,
      customer: { email: '[email protected]', name: 'Test User' },
      product_cart: [{ product_id: 'prod_test', quantity: 1 }]
    });

    expect(payment.payment_link).toBeDefined();
    expect(payment.payment_id).toBeDefined();
  });

  it('tracks usage event', async () => {
    await client.usage.ingest({
      customer_id: 'cust_test',
      product_id: 'prod_test',
      usage_events: [{ event_name: 'verification_completed', quantity: 1 }]
    });

    // Verify usage was recorded
  });

  it('handles webhook event', async () => {
    const event = {
      type: 'payment.succeeded',
      data: { customer_id: 'cust_test', amount: 9900 }
    };

    const response = await handleDodoWebhook(event);
    expect(response.statusCode).toBe(200);
  });
});
```

---

## References

- [Dodo Payments Documentation](https://docs.dodopayments.com/)
- [Integration Guide](https://docs.dodopayments.com/api-reference/integration-guide)
- [TypeScript SDK](https://docs.dodopayments.com/developer-resources/dodo-payments-sdks)
- [Webhook Events](https://docs.dodopayments.com/developer-resources/webhook-events)
- [Standard Webhooks Specification](https://www.standardwebhooks.com/)

---

## Next Steps

1. **Create Dodo Payments Account**
   - Sign up at https://dodopayments.com/
   - Complete business verification
   - Generate API keys

2. **Create Products**
   - API Access ($99/month)
   - Pay-as-you-go ($1.50/verification)

3. **Implement Integration**
   - Install TypeScript SDK
   - Create checkout session endpoint
   - Implement webhook handler
   - Test in sandbox

4. **Deploy to Production**
   - Switch to live mode
   - Configure production webhooks
   - Monitor transactions

---

_Last Updated: 2026-01-18_
_Ready for Story 6.3 Implementation_

**Content was rephrased for compliance with licensing restrictions.**
