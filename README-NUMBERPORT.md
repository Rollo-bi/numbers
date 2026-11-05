# NumberPort — integrated marketplace foundation

This project uses plain HTML, CSS and vanilla JavaScript, Node.js/Express, Firebase Authentication + Realtime Database, Paystack and the 1001SMS reseller API.

## Project layout

- `frontend/` — responsive customer website and admin interface.
- `numberport-backend/` — Express API, Firebase Admin integration, Paystack payment verification/webhook, 1001SMS catalogue/orders, wallet ledger, support tickets and admin endpoints.

## 1. Configure Firebase

1. Create a Firebase project and add a Web App.
2. Enable Email/Password in Authentication.
3. Create a Realtime Database.
4. Copy the Web App values into `frontend/js/firebase-config.js`.
5. In `numberport-backend/`, copy `.env.example` to `.env`.
6. Add `FIREBASE_DATABASE_URL` and either `FIREBASE_SERVICE_ACCOUNT_JSON` (single-line service-account JSON) or `GOOGLE_APPLICATION_CREDENTIALS` (path to a service-account JSON file).
7. Import `numberport-backend/database.rules.json` into Firebase Realtime Database Rules.

Never put Firebase Admin credentials in the frontend. Do not commit `.env` or service-account JSON.

## 2. Configure Paystack (Kenya M-PESA + cards)

The customer wallet and supplier pricing are denominated in USD. The current implementation collects deposits in KES so Paystack's Kenyan checkout can offer card and mobile-money payment channels, including M-PESA. The server converts the requested USD wallet credit to KES using `USD_KES_RATE` and stores the exact rate with the pending payment. The rate is a business-controlled configuration value; do not use an invented or stale rate.

Set in the backend `.env`:

- `PAYSTACK_SECRET_KEY` — test key for testing, live key only after go-live approval.
- `PAYSTACK_WEBHOOK_SECRET` — Paystack webhook signing secret (`whsec_...`) when available. The legacy `x-paystack-signature` check is also supported while the signing-secret mode is not active.
- `USD_KES_RATE` — the USD-to-KES rate NumberPort chooses to apply to wallet deposits.
- `PAYSTACK_CURRENCY=KES`.
- `CLIENT_BASE_URL` and `PAYSTACK_CALLBACK_URL` to the deployed frontend URL.

Enable Card and Mobile Money in your Paystack Dashboard. Configure webhook URL as `https://YOUR_API_HOST/api/payments/webhook` and subscribe to successful charge events. Use Paystack test credentials first. The backend verifies transaction reference, amount, currency and success status before crediting the USD wallet. A reference is credited at most once.

## 3. Configure 1001SMS

Create an API key in your 1001SMS account. Give it the `read`, `activate` and `numbers` scopes. Set:

- `SUPPLIER_API_BASE_URL=https://www.1001sms.com/api/v1`
- `SUPPLIER_API_KEY=...`
- `RETAIL_MARKUP_PERCENT` — percentage added to supplier cost.
- `RETAIL_FIXED_FEE_USD` — fixed amount added to supplier cost.

The API key stays on the backend. Live countries, services and supplier prices are read from 1001SMS. Temporary activations and virtual number rentals are purchased using the 1001SMS prepaid balance. Customer wallet deposits collected through Paystack do not top up the supplier account. The owner must separately maintain supplier working capital; the initial deposit amount is intentionally not fixed in code.

The purchase flow debits the customer's wallet, requests the number from 1001SMS, and stores the supplier response. If the supplier clearly rejects the order, the customer wallet is refunded. If the supplier request times out, the order is marked `SUPPLIER_OUTCOME_UNKNOWN` and funds remain reserved until reconciliation; do not ask the customer to retry blindly.

## 4. Make the first admin account

Create/register your own customer account and copy its Firebase Authentication UID. From `numberport-backend/`, run:

```bash
ADMIN_UID="YOUR_FIREBASE_UID" npm run set-admin
```

On Windows PowerShell:

```powershell
$env:ADMIN_UID="YOUR_FIREBASE_UID"
npm run set-admin
```

The command requires Firebase Admin credentials. Sign out and sign in again after the claim is assigned. Admin API endpoints check the `admin` custom claim on the server; hiding the page link is not used as security.

## 5. Run locally

Backend terminal:

```bash
cd numberport-backend
npm install
npm run dev
```

Frontend terminal:

```bash
cd frontend
python -m http.server 5501
```

Open `http://localhost:5501`. The backend health check is `http://localhost:5501/api/health`.

## Implemented modules

- Firebase email/password registration, sign-in, reset and authenticated account pages.
- USD wallet initialized at zero, server-only wallet mutations and transaction ledger.
- Live 1001SMS country/service/rental catalogue and live price lookups.
- Temporary SMS activation ordering, supplier status refresh and SMS retrieval.
- Long-term virtual number ordering, inbox retrieval and renewal.
- Paystack hosted checkout with KES charge / USD wallet credit, M-PESA + card channels, server verification and signed webhook verification.
- Customer order history, active number list, wallet activity and support ticket submission.
- Admin overview, recent orders, transaction monitoring, support ticket list and 1001SMS balance lookup.
- Configurable retail markup and supplier working-capital visibility.

## Important launch checks

This is an integration build, not a production launch certification. Before live customer use:

1. Verify your 1001SMS account permits resale and check supported countries, service terms, refunds and API limits.
2. Test with a small supplier balance and Paystack test keys; verify failed payments, duplicate webhooks, supplier insufficient balance and supplier timeout reconciliation.
3. Set a current USD/KES rate and disclose the conversion basis and fees clearly.
4. Review the Acceptable Use Policy and local laws. Do not offer numbers for spam, fraud, impersonation or bypassing security/identity controls.
5. Deploy the backend over HTTPS, set exact `CLIENT_ORIGIN`, callback URL and webhook URL, and keep all secrets in the hosting provider's secret environment.
6. Add monitoring, backups, support email notifications, reconciliation procedures and operational alerts before launch.

The initial 1001SMS working-capital amount is not assumed or prefilled. It remains a decision for the owner.
