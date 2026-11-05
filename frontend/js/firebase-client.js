import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

const configured = firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith("YOUR_");
export const firebaseReady = Boolean(configured);
export const app = firebaseReady
  ? (getApps().length ? getApps()[0] : initializeApp(firebaseConfig))
  : null;
export const auth = app ? getAuth(app) : null;
