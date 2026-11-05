import { auth, firebaseReady } from "./firebase-client.js";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const API_BASE = window.NUMBERPORT_API_BASE || "http://localhost:3000";
const navItems = [
  ["Home", "../index.html", "home"], ["Browse numbers", "browse.html", "browse"],
  ["Temporary SMS", "temporary.html", "temporary"], ["Number rentals", "rentals.html", "rentals"],
  ["Pricing", "pricing.html", "pricing"], ["How it works", "how-it-works.html", "how"]
];
const current = document.body.dataset.page || "home";
const inPages = location.pathname.includes("/pages/");
const prefix = inPages ? "" : "pages/";
const nav = navItems.map(([label, url, key]) => `<a class="${current === key ? "active" : ""}" href="${inPages ? url : (key === "home" ? "index.html" : prefix + url)}">${label}</a>`).join("");
const header = `
<header class="site-header"><div class="container nav-wrap">
<a class="brand" href="${inPages ? "../index.html" : "index.html"}"><span class="brand-mark">N</span><span>Number<span>Port</span></span></a>
<nav class="nav-links" id="mainNav">${nav}<a href="${inPages ? "contact.html" : "pages/contact.html"}">Contact</a></nav>
<div class="nav-actions" id="navActions"><a class="btn btn-outline" href="${inPages ? "login.html" : "pages/login.html"}">Log in</a><a class="btn btn-primary" href="${inPages ? "register.html" : "pages/register.html"}">Create account</a></div>
<button class="menu-toggle" id="menuToggle" aria-label="Toggle navigation">☰</button>
</div></header>`;
const footer = `
<footer class="footer"><div class="container"><div class="footer-grid">
<div><a class="brand" href="${inPages ? "../index.html" : "index.html"}"><span class="brand-mark">N</span><span>Number<span>Port</span></span></a><p>Virtual numbers for account verification, business communication and global reach. Availability depends on supplier inventory.</p></div>
<div><h4>Explore</h4><div class="footer-links"><a href="${inPages ? "browse.html" : "pages/browse.html"}">Browse numbers</a><a href="${inPages ? "temporary.html" : "pages/temporary.html"}">Temporary SMS</a><a href="${inPages ? "rentals.html" : "pages/rentals.html"}">Long-term rentals</a><a href="${inPages ? "pricing.html" : "pages/pricing.html"}">Pricing</a></div></div>
<div><h4>Company</h4><div class="footer-links"><a href="${inPages ? "about.html" : "pages/about.html"}">About us</a><a href="${inPages ? "contact.html" : "pages/contact.html"}">Contact</a><a href="${inPages ? "faq.html" : "pages/faq.html"}">FAQs</a><a href="${inPages ? "how-it-works.html" : "pages/how-it-works.html"}">How it works</a></div></div>
<div><h4>Legal</h4><div class="footer-links"><a href="${inPages ? "terms.html" : "pages/terms.html"}">Terms</a><a href="${inPages ? "privacy.html" : "pages/privacy.html"}">Privacy policy</a><a href="${inPages ? "support.html" : "pages/support.html"}">Support</a></div></div>
</div><div class="footer-bottom"><span>© ${new Date().getFullYear()} NumberPort. All rights reserved.</span><span>Built for simple, responsible connectivity.</span></div></div></footer><div class="toast" id="toast" role="status"></div>`;
$("#siteHeader")?.insertAdjacentHTML("afterbegin", header);
$("#siteFooter")?.insertAdjacentHTML("afterbegin", footer);
$("#menuToggle")?.addEventListener("click", () => $("#mainNav")?.classList.toggle("open"));
function toast(message) { const el = $("#toast"); if (!el) { alert(message); return; } el.textContent = message; el.classList.add("show"); clearTimeout(window.__toastTimer); window.__toastTimer = setTimeout(() => el.classList.remove("show"), 4200) }
window.showToast = toast;

async function apiRequest(path, options = {}) {
  const user = auth?.currentUser;
  const token = user ? await user.getIdToken() : null;
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}
function friendlyAuthError(error) {
  const map = {
    "auth/email-already-in-use": "An account with this email already exists.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/weak-password": "Choose a stronger password (at least 8 characters).",
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/user-not-found": "No account was found with that email.",
    "auth/wrong-password": "Email or password is incorrect.",
    "auth/too-many-requests": "Too many attempts. Please wait and try again.",
    "auth/network-request-failed": "Network error. Check your connection and try again."
  };
  return map[error.code] || error.message || "Something went wrong. Please try again.";
}
function setBusy(form, busy, label) { const button = form.querySelector('button[type="submit"]'); if (!button) return; if (busy) { button.dataset.originalText = button.textContent; button.disabled = true; button.textContent = label || "Please wait…"; } else { button.disabled = false; button.textContent = button.dataset.originalText || "Continue"; } }

// Firebase account registration
const registerForm = $('[data-auth-form="register"]');
registerForm?.addEventListener("submit", async e => {
  e.preventDefault();
  if (!firebaseReady) { toast("Add your Firebase Web App configuration in js/firebase-config.js first."); return; }
  const name = registerForm.elements.fullName.value.trim();
  const email = registerForm.elements.email.value.trim();
  const password = registerForm.elements.password.value;
  const confirm = registerForm.elements.confirmPassword.value;
  if (password !== confirm) { toast("Your passwords do not match."); return; }
  setBusy(registerForm, true, "Creating account…");
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName: name });
    await apiRequest("/api/account/profile", { method: "POST", body: JSON.stringify({ fullName: name }) });
    toast("Your NumberPort account is ready.");
    location.href = "dashboard.html";
  } catch (error) { toast(friendlyAuthError(error)); }
  finally { setBusy(registerForm, false); }
});

// Firebase sign in
const loginForm = $('[data-auth-form="login"]');
loginForm?.addEventListener("submit", async e => {
  e.preventDefault();
  if (!firebaseReady) { toast("Add your Firebase Web App configuration in js/firebase-config.js first."); return; }
  setBusy(loginForm, true, "Signing in…");
  try { await signInWithEmailAndPassword(auth, loginForm.elements.email.value.trim(), loginForm.elements.password.value); location.href = "dashboard.html"; }
  catch (error) { toast(friendlyAuthError(error)); }
  finally { setBusy(loginForm, false); }
});

// Password reset
const resetForm = $('[data-auth-form="reset"]');
resetForm?.addEventListener("submit", async e => {
  e.preventDefault();
  if (!firebaseReady) { toast("Add your Firebase Web App configuration in js/firebase-config.js first."); return; }
  setBusy(resetForm, true, "Sending…");
  try { await sendPasswordResetEmail(auth, resetForm.elements.email.value.trim()); toast("If the email is registered, password reset instructions have been sent."); resetForm.reset(); }
  catch (error) { toast(friendlyAuthError(error)); }
  finally { setBusy(resetForm, false); }
});

// Auth-aware navigation and protected customer pages
const protectedPages = new Set(["dashboard", "my-numbers", "orders", "wallet", "transactions", "profile", "support", "admin"]);
if (auth) {
  onAuthStateChanged(auth, async user => {
    const navActions = $("#navActions");
    if (navActions) {
      if (user) {
        navActions.innerHTML = `<a class="btn btn-outline" href="${inPages ? "dashboard.html" : "pages/dashboard.html"}">My account</a><button class="btn btn-primary" id="signOutButton" type="button">Sign out</button>`;
        $("#signOutButton")?.addEventListener("click", async () => { await signOut(auth); location.href = inPages ? "../index.html" : "index.html"; });
      }
    }
    if (protectedPages.has(current) && !user) { location.replace(inPages ? "login.html" : "pages/login.html"); return; }
    if (user && current === "admin") {
      const tokenInfo = await user.getIdTokenResult();
      if (tokenInfo.claims.admin !== true) { location.replace("dashboard.html"); return; }
    }
    if (user && protectedPages.has(current)) await loadAccountPage(user);
  });
} else if (protectedPages.has(current)) {
  // Avoid displaying private page scaffolding when Firebase has not been configured.
  const main = $("main"); if (main) main.insertAdjacentHTML("afterbegin", '<div class="container"><div class="notice" style="margin-top:24px">Firebase is not configured yet. Add your Firebase Web App settings to enable customer accounts.</div></div>');
}

async function loadAccountPage(user) {
  const name = user.displayName || user.email || "Customer";
  $("[data-account-name]") && ($("[data-account-name]").textContent = name);
  try {
    const [walletData, ordersData, numbersData] = await Promise.all([
      apiRequest("/api/account/wallet"), apiRequest("/api/account/orders"), apiRequest("/api/account/numbers")
    ]);
    const wallet = walletData.wallet || { balance: 0, currency: "USD" };
    const orders = ordersData.orders || [];
    const activeNumbers = numbersData.numbers || [];
    const money = new Intl.NumberFormat("en-US", { style: "currency", currency: wallet.currency || "USD" }).format(Number(wallet.balance || 0));
    $$('[data-wallet-balance]').forEach(el => el.textContent = money);
    $$('[data-order-count]').forEach(el => el.textContent = String(orders.length));
    $$('[data-active-number-count]').forEach(el => el.textContent = String(activeNumbers.filter(o => !o.expiresAt || new Date(o.expiresAt).getTime() > Date.now()).length));
    $$('[data-pending-order-count]').forEach(el => el.textContent = String(orders.filter(o => ["AWAITING_PAYMENT", "PENDING"].includes(o.status)).length));
    $$('[data-account-email]').forEach(el => el.textContent = user.email || "—");
    const welcome = $("[data-account-welcome]"); if (welcome) welcome.textContent = `Welcome back, ${name}`;
    const status = $("[data-account-status]"); if (status) status.textContent = "Firebase account connected";
    const balanceText = $("[data-wallet-balance-text]"); if (balanceText) balanceText.textContent = money;
    const ordersList = $("[data-orders-list]"); if (ordersList) { ordersList.innerHTML = orders.length ? orders.map(o => `<div class="list-row"><div><strong>${escapeHtml(o.productId || "Number order")}</strong><small>${escapeHtml(o.country || "")} · ${new Date(o.createdAt || Date.now()).toLocaleString()}</small></div><span class="tag">${escapeHtml(o.status || "PENDING")}</span></div>`).join("") : '<p class="muted">No orders yet. Browse numbers to get started.</p>'; }
  } catch (error) { toast(`Account data could not be loaded: ${error.message}`); }
}
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

// Generic preview-only forms/actions remain for features not yet integrated.
$$("[data-demo-form]").forEach(form => form.addEventListener("submit", e => { e.preventDefault(); toast(form.dataset.message || "This feature will be connected in a later stage."); }));
$$("[data-demo-action]").forEach(el => el.addEventListener("click", e => { if (el.tagName === "A") e.preventDefault(); toast(el.dataset.demoAction || "This feature will be available in a later stage."); }));
$$(".faq-question").forEach(q => q.addEventListener("click", () => q.closest(".faq-item").classList.toggle("open")));

function moneyUSD(value) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0)); }
function commerceNotice(message) { const box = $('#commerceNotice'); if (box) box.textContent = message; else toast(message); }
function optionList(items, valueKey, labelKey, placeholder) { return `<option value="">${placeholder}</option>` + (items || []).map(x => `<option value="${escapeHtml(x[valueKey] || '')}">${escapeHtml(x[labelKey] || x.name || x.code || '')}</option>`).join(''); }
async function initCommerce() {
  const catalogGrid = $('#catalogueGrid');
  if (catalogGrid) {
    if (current === 'browse') {
      catalogGrid.innerHTML = `<article class="card"><span class="tag">Temporary SMS</span><h3>One-time verification</h3><p>Check live supplier services and prices before ordering.</p><a class="btn btn-primary" href="temporary.html">Browse temporary numbers</a></article><article class="card"><span class="tag">Long-term rental</span><h3>Keep a number</h3><p>Choose an available country, number type and rental term.</p><a class="btn btn-primary" href="rentals.html">Browse rentals</a></article>`;
    } else if (current === 'temporary') {
      catalogGrid.innerHTML = `<div class="card" style="grid-column:1/-1"><h3>Find a temporary SMS number</h3><p class="muted">Prices are retrieved live from 1001SMS. Your wallet is charged only after you confirm an order.</p><div class="toolbar"><div class="field"><label>Country</label><select id="tempCountry"><option value="">Loading countries…</option></select></div><div class="field"><label>Service</label><select id="tempService"><option value="">Loading services…</option></select></div></div><div id="tempOffers" class="notice">Select a country and service to see current offers.</div><div id="tempAction"></div><div id="commerceNotice" class="muted" role="status"></div></div>`;
      try { const [c, s] = await Promise.all([apiRequest('/api/catalog/temporary/countries'), apiRequest('/api/catalog/temporary/services')]); const countries = c.countries || [], services = s.services || []; $('#tempCountry').innerHTML = optionList(countries, 'code', 'name', 'Choose country'); $('#tempService').innerHTML = optionList(services, 'slug', 'name', 'Choose service'); } catch (e) { commerceNotice(`Live catalogue unavailable: ${e.message}. Check supplier configuration.`); }
      async function loadTempOffers() { const country = $('#tempCountry').value, service = $('#tempService').value; if (!country || !service) return; $('#tempOffers').textContent = 'Loading live prices…'; try { const d = await apiRequest(`/api/catalog/temporary/pricing?country=${encodeURIComponent(country)}&service=${encodeURIComponent(service)}`); const offers = d.offers || []; if (!offers.length) { $('#tempOffers').textContent = 'No supplier offers are available for this selection.'; $('#tempAction').innerHTML = ''; return; } $('#tempOffers').innerHTML = `<div class="field"><label>Available offer</label><select id="tempProvider">${offers.map((o, i) => `<option value="${escapeHtml(o.provider || o.alias || '')}" data-price="${Number(o.sellPrice)}">${escapeHtml(o.provider || o.alias || 'Standard')} · ${moneyUSD(o.sellPrice)}</option>`).join('')}</select></div>`; $('#tempAction').innerHTML = '<button class="btn btn-primary" id="buyTemp">Buy temporary number</button>'; $('#buyTemp').onclick = async () => { try { const provider = $('#tempProvider').value; $('#buyTemp').disabled = true; $('#buyTemp').textContent = 'Processing…'; const result = await apiRequest('/api/orders', { method: 'POST', body: JSON.stringify({ serviceType: 'temporary', country, service, provider }) }); commerceNotice(`Number ordered: ${result.supplier?.phoneNumber || 'processing'}. View it in My numbers.`); location.href = 'my-numbers.html'; } catch (e) { commerceNotice(e.message); } finally { const b = $('#buyTemp'); if (b) { b.disabled = false; b.textContent = 'Buy temporary number'; } } }; } catch (e) { $('#tempOffers').textContent = e.message; } }
      $('#tempCountry').addEventListener('change', loadTempOffers); $('#tempService').addEventListener('change', loadTempOffers);
    } else if (current === 'rentals') {
      catalogGrid.innerHTML = `<div class="card" style="grid-column:1/-1"><h3>Choose a virtual number rental</h3><p class="muted">Live prices and terms are supplied by 1001SMS. The wallet is charged in USD.</p><div class="toolbar"><div class="field"><label>Country</label><select id="rentCountry"><option value="">Loading countries…</option></select></div><div class="field"><label>Number type</label><select id="rentType"><option value="unlimited">Unlimited inbox</option><option value="service">Dedicated service</option></select></div><div class="field"><label>Service (for dedicated)</label><select id="rentService"><option value="">Select service</option></select></div><div class="field"><label>Rental term</label><select id="rentTerm"><option value="">Select term</option></select></div></div><p class="muted">Auto-renew is off. You can renew manually from My numbers so future charges are clear.</p><div id="rentPrice" class="notice">Choose a country to load rental options.</div><button class="btn btn-primary" id="buyRental" disabled>Rent number</button><div id="commerceNotice" class="muted" role="status"></div></div>`;
      try { const d = await apiRequest('/api/catalog/rentals/countries'); $('#rentCountry').innerHTML = optionList(d.countries || [], 'code', 'name', 'Choose country'); } catch (e) { commerceNotice(`Rental catalogue unavailable: ${e.message}`); }
      let rentalOffers = []; async function loadRentals() { const country = $('#rentCountry').value; if (!country) return; try { const d = await apiRequest(`/api/catalog/rentals/pricing?country=${encodeURIComponent(country)}`); rentalOffers = d; $('#rentService').innerHTML = optionList(d.services || [], 'service', 'name', 'Choose service'); updateTerms(); } catch (e) { commerceNotice(e.message); } }
      function updateTerms() { const type = $('#rentType').value, service = $('#rentService').value; let rows = type === 'unlimited' ? (rentalOffers.unlimited || []) : ((rentalOffers.services || []).find(x => x.service === service)?.terms || []); $('#rentTerm').innerHTML = '<option value="">Select term</option>' + rows.map(x => `<option value="${x.term}" data-price="${x.sellPrice}">${x.term} · ${moneyUSD(x.sellPrice)}</option>`).join(''); $('#rentService').disabled = type === 'unlimited'; $('#rentPrice').textContent = rows.length ? 'Select a term to confirm the selling price.' : 'No rental options for this selection.'; $('#buyRental').disabled = true; }
      $('#rentCountry').addEventListener('change', loadRentals); $('#rentType').addEventListener('change', updateTerms); $('#rentService').addEventListener('change', updateTerms); $('#rentTerm').addEventListener('change', () => { const opt = $('#rentTerm').selectedOptions[0]; $('#rentPrice').textContent = opt?.dataset.price ? `Your price: ${moneyUSD(opt.dataset.price)}` : 'Select a rental term.'; $('#buyRental').disabled = !opt?.value; });
      $('#buyRental').addEventListener('click', async () => { try { const body = { serviceType: 'rental', country: $('#rentCountry').value, type: $('#rentType').value, term: $('#rentTerm').value, service: $('#rentType').value === 'service' ? $('#rentService').value : undefined, autoRenew: false }; $('#buyRental').disabled = true; $('#buyRental').textContent = 'Processing…'; const result = await apiRequest('/api/orders', { method: 'POST', body: JSON.stringify(body) }); commerceNotice(`Rental activated: ${result.supplier?.phoneNumber || 'processing'}`); location.href = 'my-numbers.html'; } catch (e) { commerceNotice(e.message); } finally { $('#buyRental').textContent = 'Rent number'; $('#buyRental').disabled = !$('#rentTerm').value; } });
    }
  }
  const topupForm = $('[data-topup-form]'); if (topupForm) { const note = $('[data-fx-note]'); let fx = null; try { const cfg = await apiRequest('/api/payments/config'); fx = cfg.usdKesRate; if (note) note.textContent = fx ? `Current configured rate: 1 USD = ${Number(fx).toFixed(2)} KES. Checkout supports M-PESA and cards.` : 'Payments are not enabled until the server USD/KES rate is configured.'; } catch (e) { if (note) note.textContent = 'Payment configuration is unavailable.'; } topupForm.elements.amount.addEventListener('input', () => { if (note && fx) { const v = Number(topupForm.elements.amount.value); note.textContent = v > 0 ? `Estimated Paystack charge: KES ${(v * fx).toLocaleString('en-KE', { maximumFractionDigits: 2 })}. Final amount is confirmed by the server.` : `1 USD = ${Number(fx).toFixed(2)} KES.`; } }); topupForm.addEventListener('submit', async e => { e.preventDefault(); try { const amount = Number(topupForm.elements.amount.value); const result = await apiRequest('/api/payments/initialize', { method: 'POST', body: JSON.stringify({ amount }) }); location.href = result.authorizationUrl; } catch (err) { toast(err.message); } }); }
  const supportForm = $('[data-support-form]'); supportForm?.addEventListener('submit', async e => { e.preventDefault(); const b = supportForm.querySelector('button[type=submit]'); b.disabled = true; try { const result = await apiRequest('/api/support', { method: 'POST', body: JSON.stringify({ topic: supportForm.elements.topic.value, orderReference: supportForm.elements.orderReference.value, message: supportForm.elements.message.value }) }); toast(`Support ticket submitted: ${result.ticketId}`); supportForm.reset(); } catch (err) { toast(err.message); } finally { b.disabled = false; } });
  const verifyBox = $('[data-payment-return]');

  //const verifyBox = $('[data-payment-return]');

  if (verifyBox) {
    verifyBox.textContent = 'Verifying your payment…';

    try {
      const user = await waitForAuthUser();

      if (!user) {
        verifyBox.textContent =
          'Please sign in using the account that initiated this payment, then return to your payment confirmation page.';
        return;
      }

      const reference = new URLSearchParams(location.search)
        .get('reference');

      if (!reference) {
        verifyBox.textContent = 'No payment reference was supplied.';
        return;
      }

      await user.getIdToken(true);

      const result = await apiRequest(
        `/api/payments/verify/${encodeURIComponent(reference)}`
      );

      verifyBox.textContent =
        `Payment confirmed. Your wallet balance is ${moneyUSD(result.wallet?.balance)}.`;

    } catch (error) {
      verifyBox.textContent =
        `Payment verification failed: ${error.message}. Your payment may still be processing. Please try again or contact support.`;
    }
  }
  if (['orders', 'my-numbers', 'transactions'].includes(current)) {
    try {
      // Wait until Firebase restores the user's authentication session.
      const user = await waitForAuthUser();

      if (!user) {
        location.replace(inPages ? "login.html" : "pages/login.html");
        return;
      }

      // Force a fresh Firebase ID token.
      await user.getIdToken(true);

      const endpoint =
        current === 'orders'
          ? '/api/account/orders'
          : current === 'my-numbers'
            ? '/api/account/numbers'
            : '/api/account/transactions';

      const d = await apiRequest(endpoint);

      const rows = d.orders || d.numbers || d.transactions || [];

      const target = $('[data-live-list]') || $('.dash-main .card');

      if (target) {
        target.innerHTML = rows.length
          ? rows.map(x => {
            const title =
              x.phoneNumber ||
              x.productName ||
              x.type ||
              x.reference ||
              'Transaction';

            const sub =
              x.country ||
              x.description ||
              x.service ||
              '';

            const status =
              x.status ||
              x.fulfilmentStatus ||
              'SUCCESS';

            const controls = current === 'my-numbers'
              ? `
                ${x.serviceType === 'temporary'
                ? `<button class="btn btn-outline" data-refresh-order="${escapeHtml(x.id)}">Check SMS</button>`
                : ''}

                ${x.serviceType === 'rental'
                ? `
                    <button class="btn btn-outline" data-show-messages="${escapeHtml(x.id)}">View inbox</button>
                    <button class="btn btn-outline" data-renew-order="${escapeHtml(x.id)}">Renew</button>
                  `
                : ''}

                ${x.status === 'FULFILLED' &&
                (x.serviceType === 'temporary' || x.details?.type === 'unlimited')
                ? `<button class="btn btn-outline" data-cancel-order="${escapeHtml(x.id)}">Cancel eligible order</button>`
                : ''}
              `
              : '';

            return `
              <div class="list-row">
                <div>
                  <strong>${escapeHtml(title)}</strong>
                  <small>
                    ${escapeHtml(sub)} ·
                    ${new Date(x.createdAt || 0).toLocaleString()}
                  </small>

                  ${x.expiresAt
                ? `<small>Expires: ${new Date(x.expiresAt).toLocaleString()}</small>`
                : ''}
                </div>

                <span class="tag">${escapeHtml(status)}</span>

                ${current === 'transactions'
                ? `<strong>${moneyUSD(x.amount)}</strong>`
                : x.sellingPrice
                  ? `<strong>${moneyUSD(x.sellingPrice)}</strong>`
                  : ''}

                <div>${controls}</div>
              </div>

              ${x.id && current === 'my-numbers'
                ? `<div id="messages-${escapeHtml(x.id)}" class="muted"></div>`
                : ''}
            `;
          }).join('')
          : `
          <div class="empty-state">
            <h3>Nothing to show yet</h3>
            <p>Your account activity will appear here.</p>
          </div>
        `;

        // Check SMS
        $$('[data-refresh-order]').forEach(btn => {
          btn.addEventListener('click', async () => {
            const id = btn.dataset.refreshOrder;
            btn.disabled = true;

            try {
              const result = await apiRequest(
                `/api/orders/${encodeURIComponent(id)}/refresh`,
                { method: 'POST', body: '{}' }
              );

              const messages =
                result.order?.supplierResult?.messages || [];

              const box = $(`#messages-${CSS.escape(id)}`);

              if (box) {
                box.innerHTML = messages.length
                  ? messages.map(v => `
                    <p>
                      <strong>${escapeHtml(v.sender || 'SMS')}</strong>:
                      ${escapeHtml(v.text || v.message || '')}
                      ${v.code ? `<b>Code: ${escapeHtml(v.code)}</b>` : ''}
                    </p>
                  `).join('')
                  : 'No SMS received yet. Check again in a moment.';
              }
            } catch (e) {
              toast(e.message);
            } finally {
              btn.disabled = false;
            }
          });
        });

        // View rental inbox
        $$('[data-show-messages]').forEach(btn => {
          btn.addEventListener('click', async () => {
            const id = btn.dataset.showMessages;
            btn.disabled = true;

            try {
              const result = await apiRequest(
                `/api/orders/${encodeURIComponent(id)}/messages`
              );

              const box = $(`#messages-${CSS.escape(id)}`);

              if (box) {
                const messages = result.messages || [];

                box.innerHTML = messages.length
                  ? messages.map(v => `
                    <p>
                      <strong>${escapeHtml(v.sender || 'SMS')}</strong>:
                      ${escapeHtml(v.text || v.message || '')}
                      ${v.code ? `<b>Code: ${escapeHtml(v.code)}</b>` : ''}
                    </p>
                  `).join('')
                  : 'No messages received yet.';
              }
            } catch (e) {
              toast(e.message);
            } finally {
              btn.disabled = false;
            }
          });
        });

        // Renew rental
        $$('[data-renew-order]').forEach(btn => {
          btn.addEventListener('click', async () => {
            const id = btn.dataset.renewOrder;

            if (!confirm('Renew this number for the same rental term? Your wallet will be charged the current price.')) {
              return;
            }

            btn.disabled = true;

            try {
              await apiRequest(
                `/api/orders/${encodeURIComponent(id)}/renew`,
                { method: 'POST', body: JSON.stringify({}) }
              );

              toast('Rental renewed successfully.');
              location.reload();
            } catch (e) {
              toast(e.message);
            } finally {
              btn.disabled = false;
            }
          });
        });

        // Cancel eligible order
        $$('[data-cancel-order]').forEach(btn => {
          btn.addEventListener('click', async () => {
            const id = btn.dataset.cancelOrder;

            if (!confirm('Request cancellation? A refund is only possible if the supplier confirms the number is eligible.')) {
              return;
            }

            btn.disabled = true;

            try {
              const result = await apiRequest(
                `/api/orders/${encodeURIComponent(id)}/cancel`,
                { method: 'POST', body: '{}' }
              );

              toast(`Cancellation confirmed. Wallet refund: ${moneyUSD(result.amount)}.`);
              location.reload();
            } catch (e) {
              toast(e.message);
            } finally {
              btn.disabled = false;
            }
          });
        });
      }

    } catch (e) {
      toast(`Could not load account activity: ${e.message}`);
    }
  }
  if (current === 'admin') {
    try {
      const d = await apiRequest('/api/admin/overview'); const cards = $$('.stat-card strong'); const vals = [d.stats.customers, d.stats.orders, d.stats.pending, moneyUSD(d.stats.revenue)]; cards.forEach((el, i) => { if (vals[i] !== undefined) el.textContent = vals[i]; });
      let b; try { b = await apiRequest('/api/admin/supplier-balance'); } catch (e) { b = { balance: 'Not connected', currency: 'USD', error: e.message }; }
      const adminNotice = document.createElement('div'); adminNotice.className = 'notice'; adminNotice.textContent = `1001SMS supplier balance: ${b.balance ?? 'Unavailable'} ${b.currency || 'USD'}. This is separate from customer Paystack payments. ${b.error || ''}`; $('.dash-main')?.prepend(adminNotice);
      const [tx, tickets] = await Promise.all([apiRequest('/api/admin/transactions'), apiRequest('/api/admin/tickets')]);
      const lists = document.createElement('div'); lists.className = 'grid-2'; lists.innerHTML = `<div class="card"><h3>Recent orders</h3><div>${(d.orders || []).slice(0, 15).map(o => `<div class="list-row"><div><strong>${escapeHtml(o.phoneNumber || o.productName || o.orderId || 'Order')}</strong><small>${escapeHtml(o.uid || '')} · ${escapeHtml(o.country || '')}</small></div><span class="tag">${escapeHtml(o.status || '')}</span><small>${moneyUSD(o.sellingPrice)}</small></div>`).join('') || '<p class="muted">No orders yet.</p>'}</div></div><div class="card"><h3>Recent transactions</h3><div>${(tx.transactions || []).slice(0, 15).map(x => `<div class="list-row"><div><strong>${escapeHtml(x.type || 'Transaction')}</strong><small>${escapeHtml(x.uid || '')} · ${new Date(x.createdAt || 0).toLocaleString()}</small></div><span>${moneyUSD(x.amount)}</span></div>`).join('') || '<p class="muted">No transactions yet.</p>'}</div></div><div class="card"><h3>Support tickets</h3><div>${(tickets.tickets || []).slice(0, 10).map(x => `<div class="list-row"><div><strong>${escapeHtml(x.topic)}</strong><small>${escapeHtml(x.email || x.uid || '')} · ${escapeHtml(x.message)}</small></div><span class="tag">${escapeHtml(x.status)}</span></div>`).join('') || '<p class="muted">No open tickets.</p>'}</div></div>`;
      $('.dash-main')?.append(lists);
    } catch (e) { toast(`Admin data unavailable: ${e.message}`); }
  }
}
function waitForAuthUser() {
  if (!auth) return Promise.resolve(null);

  if (auth.currentUser) {
    return Promise.resolve(auth.currentUser);
  }

  return new Promise(resolve => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      unsubscribe();
      resolve(user);
    });
  });
}
initCommerce();
$$("[data-password-toggle]").forEach(btn => btn.addEventListener("click", () => { const input = $(btn.dataset.passwordToggle); if (input) input.type = input.type === "password" ? "text" : "password" }));
