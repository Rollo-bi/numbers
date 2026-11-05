# NumberPort frontend

Plain HTML, CSS and vanilla JavaScript using Firebase Web SDK modules. No React, Vue, Angular or TypeScript.

## Run locally
Serve the project root over HTTP, not by opening the HTML files directly:

```bash
python -m http.server 5501
```

Open `http://localhost:5501`.

## Firebase
Paste your Firebase Web App configuration into `js/firebase-config.js`. Enable Email/Password in Firebase Authentication. Set the Realtime Database URL there too. Configure the backend `.env` with Firebase Admin credentials and the same database URL.

## API
By default, the frontend calls `http://localhost:5501`. To change it, define `window.NUMBERPORT_API_BASE` before loading `js/app.js`.

## Status
Firebase email/password registration, sign-in, password reset, auth-aware navigation, protected customer pages, and initial profile/wallet loading are wired to the backend. The initial wallet is USD 0.00. Live supplier inventory, Paystack payments, number fulfilment, SMS retrieval and admin authorization are not yet implemented. Catalogue pages remain clearly marked preview listings and must not be used as real pricing.

Never put service-account credentials, Paystack secret keys or 1001SMS API keys in frontend files.
