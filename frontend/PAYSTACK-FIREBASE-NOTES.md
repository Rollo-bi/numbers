# Payment and data safety

- Customer wallet currency: USD.
- Paystack collection currency: KES, so Kenyan checkout can expose card and mobile-money channels including M-PESA.
- `USD_KES_RATE` is configured on the backend and saved on each pending payment; never accept an FX rate from the browser.
- Paystack secret and webhook signing secret stay on the backend.
- The browser redirect is not proof of payment. The backend verifies the transaction reference, exact KES amount, currency and success status before crediting the exact USD wallet amount.
- Webhook signature verification uses the raw request body and supports the current timestamped `Paystack-Signature` plus the legacy `x-paystack-signature` mode.
- Wallet credits use an idempotency reference so repeated webhooks or verify requests do not credit twice.
- Firebase client rules deny direct writes to wallet, orders, transactions and payment intents. The backend uses Firebase Admin and checks the authenticated UID.
- Admin endpoints require a Firebase custom claim (`admin: true`) verified server-side.

Use Paystack test keys and supplier test/low-value operations before live launch.
