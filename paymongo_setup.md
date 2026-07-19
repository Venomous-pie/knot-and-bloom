# PayMongo Setup Guide for Knot & Bloom

This document outlines the exact steps you need to take as a solo developer to set up the **Central Escrow** and **20% COD Trust System** using PayMongo.

## 1. Account Creation & Activation
1. Create an account at [PayMongo](https://paymongo.com/).
2. Submit your business registration documents. *(Note: Since you are operating as a central escrow/marketplace, you will likely need to register as a Sole Proprietorship or Corporation with DTI/SEC).*
3. Wait for account activation to get your **Live API Keys**.

## 2. API Keys Configuration
Once your account is activated, navigate to the **Developers** tab in your PayMongo dashboard.
You will need to copy these into your backend `.env` file:
```env
PAYMONGO_PUBLIC_KEY=pk_live_xxxxxxxxxxx
PAYMONGO_SECRET_KEY=sk_live_xxxxxxxxxxx
```

## 3. Configuring Webhooks (Critical for the Checkout Flow)
For the platform to know when a buyer has successfully paid the 20% COD deposit (or full GCash payment), PayMongo needs to talk to your backend.
1. In the PayMongo Dashboard, go to **Webhooks**.
2. Create a new Webhook pointing to your production backend URL:
   `https://api.knotandbloom.com/webhooks/paymongo`
3. **Select Events to listen to:**
   - `payment.paid`
   - `payment.failed`
4. Copy the **Webhook Secret Key** and add it to your `.env` so your backend can verify the request is authentically from PayMongo:
   ```env
   PAYMONGO_WEBHOOK_SECRET=whsec_live_xxxxxxxxxxx
   ```
5. *(Optional Email Routing)*: Add `knotandbloom.shop+payments@gmail.com` as the billing/receipt email in your PayMongo settings so all transactional emails bypass your main inbox.

## 4. The Disbursements API (Automating Payouts)
To solve the "Payout Bottleneck" where you have to manually transfer 98% of earnings to sellers' GCash accounts:
1. Contact PayMongo Support and request access to the **Disbursements API**. (It is sometimes locked behind a manual request for new accounts).
2. Once approved, the platform can programmatically send money from your PayMongo balance directly to a seller's GCash or Bank Account when you click "Approve Withdrawal" in the Admin Dashboard.

## 5. Development Workflow
While waiting for Live activation, you can use the **Test API Keys**. 
We will integrate the PayMongo Node.js SDK (`paymongo-node` or direct REST calls) into our `PaymentService.ts` to replace the current `MOCK_WALLET` and `MOCK_CARD` logic.
