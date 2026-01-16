# Notes

Suspend Orange Money payments, and Setswana language support.

Ensure that the endpoint URL is accurate or the format is consistent with AuthBridge webhoojs

CIPA and BURS integration with UBO identificatio

# Observations:


# Review:

- Dodo Payments webhook configuration - upload screenshots in chat.


# Workflow commands:

/ #sm run *create-story workflow

/ #dev run *dev-story workflow for Story 4.2 #4-2-create...

/ #dev run *code-review workflow for Story 4.2 #4-2-create...


---

## 2026-01-16 - Dodo Payments Webhook Configuration

**Context:** Configured Dodo Payments webhook endpoint for AuthBridge billing integration.

**Endpoint Details:**
- URL: `https://www.authbridge.io/api/webhooks/dodo`
- Created: January 13, 2026
- Signing Secret: Stored in environment variables
- Status: Configured but not yet tested

**Related Epic:** Story 8.2 - Dodo Payments Integration (Phase 2)
- Located in: `_bmad-output/planning-artifacts/epics.md`
- Epic 8: Enhanced Verification & Payments
- Phase: Phase 2 (post-MVP)

**Documentation Created:**
- Complete webhook setup guide: `__journal/dodo-payments-webhook-setup.md`
- Includes: Configuration steps, security best practices, implementation examples, testing procedures

**Action Items:**
1. Filter webhook events (currently listening to ALL events)
2. Implement webhook handler with signature verification
3. Add idempotency checks using webhook-id header
4. Test endpoint using Dodo dashboard "Send Test Event"
5. Enable email alerts for webhook failures

**Implementation Priority:** Phase 2 (after MVP completion)

**Reference Links:**
- Dodo Dashboard: https://app.dodopayments.com/developer/webhooks
- Webhook Docs: https://dodopayments.mintlify.app/developer-resources/webhooks
- Event Guide: https://dodopayments.mintlify.app/developer-resources/webhooks/intents/webhook-events-guide
