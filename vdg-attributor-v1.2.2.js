// ========== VDG PATH Attributor (SC) v1.2.2 ==========
// Event Tracking + Identity Stitching (UNCHANGED)
// + Shadow Submissions (ADD-ON ONLY)

(function () {
  console.log(
    "%cSC Tracking Loaded (v1.2.2)",
    "color:#4fc3f7;font-weight:bold;"
  );

  // -------------------------------------------------------
  // DEV RESET VIA QUERY PARAM (?sc_reset=1)
  // -------------------------------------------------------
  (function () {
    const params = new URLSearchParams(window.location.search);

    if (params.get("sc_reset") === "1") {
      console.log("PATH: Reset triggered via query param");

      // Clear cookies
      document.cookie.split(";").forEach(c => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });

      // Clear storage
      localStorage.clear();
      sessionStorage.clear();
    }
  })();

  // -------------------------------------------------------
  // BOT / AUTOMATION EXCLUSION (ManageWP, crawlers, tools)
  // -------------------------------------------------------
  const ua = navigator.userAgent.toLowerCase();

  const BOT_UA_PATTERNS = [
    // CMS automation
    "managewp",
    "managewpworker",
    "wp-cron",

    // Monitoring bots
    "uptimerobot",
    "pingdom",
    "statuscake",
    "site24x7",

    // Search engine crawlers
    "googlebot",
    "bingbot",
    "duckduckbot",
    "yandex",
    "baiduspider",
    "slurp",
    "exabot",

    // Headless automation (true non-humans)
    "headlesschrome",
    "phantomjs",
    "puppeteer",
    "playwright",
    "selenium",
    "webdriver",

    // CLI / programmatic clients
    "curl",
    "wget",
    "python-requests",
    "go-http-client",
    "java/",
    "okhttp"
  ];

  if (BOT_UA_PATTERNS.some((p) => ua.includes(p))) {
    console.log("PATH: bot / automated traffic ignored");
    return;
  }


  // -------------------------------------------------------
  // BOOT CONFIG LOOKUP (CONSENT MODE PER CLIENT)
  // -------------------------------------------------------
  // This small pre-consent lookup lets the tracker decide whether the
  // built-in consent UI should run for this specific client. If lookup
  // fails, consent defaults to ON for safety.
  const SC_BOOT_SUPABASE_URL = "https://ejldmatndlmiugxydiae.supabase.co";
  const SC_BOOT_SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqbGRtYXRuZGxtaXVneHlkaWFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMDk0MDYsImV4cCI6MjA4MjY4NTQwNn0.9m2GmCnHFmKJP1eYNRm5Q8EgFzwOpIP4ZaWn7msiSgQ";

  function resolveBootClientKey() {
    if (document.currentScript) {
      const v = document.currentScript.getAttribute("data-sc-client");
      if (v) return v;
    }

    const scripts = document.querySelectorAll("script[data-sc-client]");
    for (const s of scripts) {
      const v = s.getAttribute("data-sc-client");
      if (v) return v;
    }

    return "UNKNOWN_CLIENT";
  }

  function fetchConsentEnabledForClientSync() {
    const bootClientKey = resolveBootClientKey();
    if (!bootClientKey || bootClientKey === "UNKNOWN_CLIENT") return true;

    try {
      const xhr = new XMLHttpRequest();
      const url = `${SC_BOOT_SUPABASE_URL}/rest/v1/sc_clients?client_key=eq.${encodeURIComponent(bootClientKey)}&select=consent_enabled`;
      xhr.open("GET", url, false); // intentional: consent gate must be known before tracking continues
      xhr.setRequestHeader("apikey", SC_BOOT_SUPABASE_ANON_KEY);
      xhr.setRequestHeader("Authorization", `Bearer ${SC_BOOT_SUPABASE_ANON_KEY}`);
      xhr.setRequestHeader("Accept", "application/json");
      xhr.send(null);

      if (xhr.status >= 200 && xhr.status < 300 && xhr.responseText) {
        const rows = JSON.parse(xhr.responseText);
        if (rows && rows.length && rows[0].consent_enabled === false) {
          return false;
        }
      }
    } catch (err) {
      console.warn("PATH: consent_enabled lookup failed; defaulting consent mode ON", err);
    }

    return true;
  }


  // -------------------------------------------------------
  // CONSENT MANAGEMENT (BUILT-IN)
  // -------------------------------------------------------
  const CONSENT_COOKIE = "_sc_consent";
  const CONSENT_DURATION_DAYS = 180;
  const SC_COOKIE_INFO = [
    {
      name: "_sc_consent",
      category: "Necessary",
      duration: "180 days",
      purpose: "Remembers whether you accepted or declined analytics and attribution tracking."
    },
    {
      name: "_sc_vid",
      category: "Analytics",
      duration: "90 days",
      purpose: "Distinguishes repeat visitors so VDG PATH can connect journeys across visits."
    },
    {
      name: "_sc_sid",
      category: "Analytics",
      duration: "90 days",
      purpose: "Groups activity into a browsing session for attribution and submission tracking."
    },
    {
      name: "_sc_last_session",
      category: "Local storage",
      duration: "30 minutes+",
      purpose: "Helps VDG PATH determine whether a visit is part of the same session."
    }
  ];

  function setConsentCookie(value, days = CONSENT_DURATION_DAYS) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${CONSENT_COOKIE}=${value}; expires=${expires}; path=/; SameSite=Lax`;
    try {
      localStorage.setItem(CONSENT_COOKIE, value);
    } catch {}
  }

  function getConsentValue() {
    const cookieVal = getCookie(CONSENT_COOKIE);
    if (cookieVal) return cookieVal;
    try {
      return localStorage.getItem(CONSENT_COOKIE);
    } catch {
      return null;
    }
  }

  function hasAnalyticsConsent() {
    return getConsentValue() === "accepted";
  }

  function isConsentDeclined() {
    return getConsentValue() === "declined";
  }

  function removeSCCookiesAndStorage() {
    const names = ["_sc_vid", "_sc_sid", "_sc_consent"];
    const domains = [location.hostname, "." + location.hostname.replace(/^www\./, ""), "." + location.hostname, location.hostname.replace(/^www\./, "")];

    names.forEach((name) => {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
      domains.forEach((domain) => {
        if (!domain) return;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${domain}; SameSite=Lax`;
      });
    });

    try {
      localStorage.removeItem("_sc_last_session");
      localStorage.removeItem("_sc_vid");
      localStorage.removeItem("_sc_sid");
      sessionStorage.removeItem("_sc_session_source");
    } catch {}
  }

  function injectConsentStyles() {
    if (document.getElementById("sc-consent-styles")) return;

    const style = document.createElement("style");
    style.id = "sc-consent-styles";
    style.textContent = `
      .sc-consent-hidden { display:none !important; }
      .sc-consent-banner {
        position: fixed;
        left: 20px;
        bottom: 20px;
        width: min(420px, calc(100vw - 32px));
        background: #fff;
        color: #1f2937;
        border: 1px solid rgba(107, 114, 128, 0.2);
        border-radius: 16px;
        box-shadow: 0 22px 50px rgba(0,0,0,0.22);
        z-index: 2147483000;
        padding: 20px 20px 18px;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .sc-consent-badge {
        display: inline-block;
        margin-bottom: 10px;
        padding: 6px 10px;
        border-radius: 999px;
        background: #f2ebff;
        color: #5b34da;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: .06em;
        text-transform: uppercase;
      }
      .sc-consent-title {
        margin: 0 0 10px;
        font-size: 18px;
        line-height: 1.2;
        font-weight: 800;
      }
      .sc-consent-copy {
        margin: 0;
        color: #4b5563;
        font-size: 14px;
        line-height: 1.6;
      }
      .sc-consent-actions {
        display: flex;
        gap: 10px;
        margin-top: 18px;
        flex-wrap: wrap;
      }
      .sc-consent-btn {
        appearance: none;
        border: 1px solid #d1d5db;
        background: #fff;
        color: #374151;
        border-radius: 10px;
        padding: 11px 14px;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
      }
      .sc-consent-btn:hover { filter: brightness(0.98); }
      .sc-consent-btn-primary {
        border-color: #5b34da;
        background: linear-gradient(135deg, #6f4dff 0%, #5b34da 100%);
        color: #fff;
      }
      .sc-consent-btn-secondary {
        background: #f8fafc;
      }
      .sc-consent-overlay {
        position: fixed;
        inset: 0;
        background: rgba(17, 24, 39, 0.48);
        z-index: 2147483001;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }
      .sc-consent-modal {
        width: min(720px, 100%);
        max-height: min(86vh, 900px);
        overflow: auto;
        background: #fff;
        color: #1f2937;
        border-radius: 20px;
        border: 1px solid rgba(107,114,128,0.18);
        box-shadow: 0 30px 90px rgba(0,0,0,0.28);
        padding: 24px;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .sc-consent-modal h2 {
        margin: 0 0 12px;
        font-size: 18px;
        line-height: 1.25;
      }
      .sc-consent-modal p {
        margin: 0 0 12px;
        color: #4b5563;
        font-size: 14px;
        line-height: 1.65;
      }
      .sc-consent-cookie-box {
        margin-top: 14px;
        border: 1px solid #e5e7eb;
        border-radius: 16px;
        background: #f8fafc;
        padding: 14px;
      }
      .sc-consent-cookie-card {
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 12px 14px;
        margin-top: 10px;
      }
      .sc-consent-cookie-card:first-of-type { margin-top: 12px; }
      .sc-consent-cookie-name {
        font-weight: 800;
        font-size: 13px;
        margin-bottom: 2px;
      }
      .sc-consent-cookie-cat {
        color: #6b7280;
        font-size: 12px;
        margin-bottom: 8px;
      }
      .sc-consent-grid {
        display: grid;
        grid-template-columns: 120px 1fr;
        gap: 4px 12px;
        font-size: 13px;
        line-height: 1.45;
      }
      .sc-consent-grid strong { color: #111827; }
      .sc-consent-modal-actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin-top: 18px;
      }
      .sc-privacy-settings-btn {
        position: fixed;
        left: 16px;
        bottom: 16px;
        z-index: 2147482999;
        border: 0;
        background: rgba(17, 24, 39, 0.92);
        color: #fff;
        border-radius: 999px;
        padding: 10px 14px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 8px 25px rgba(0,0,0,0.2);
      }
      @media (max-width: 640px) {
        .sc-consent-banner { left: 12px; right: 12px; bottom: 12px; width: auto; padding: 18px 16px 16px; }
        .sc-consent-actions .sc-consent-btn, .sc-consent-modal-actions .sc-consent-btn { flex: 1 1 calc(50% - 8px); text-align: center; }
        .sc-consent-modal { padding: 18px; }
        .sc-consent-grid { grid-template-columns: 1fr; }
      }
    `;
    document.head.appendChild(style);
  }

  function buildCookieCardsHtml() {
    return SC_COOKIE_INFO.map((item) => `
      <div class="sc-consent-cookie-card">
        <div class="sc-consent-cookie-name">${item.name}</div>
        <div class="sc-consent-cookie-cat">${item.category}</div>
        <div class="sc-consent-grid">
          <strong>Duration</strong><span>${item.duration}</span>
          <strong>Purpose</strong><span>${item.purpose}</span>
        </div>
      </div>
    `).join("");
  }

  function hideConsentBanner() {
    const banner = document.getElementById("sc-consent-banner");
    if (banner) banner.classList.add("sc-consent-hidden");
  }

  function showConsentBannerAgain() {
    const banner = document.getElementById("sc-consent-banner");
    if (banner) banner.classList.remove("sc-consent-hidden");
  }

  function removeConsentUI() {
    document.getElementById("sc-consent-banner")?.remove();
    document.getElementById("sc-consent-overlay")?.remove();
  }

  function showPrivacySettingsButton() {
    if (document.getElementById("sc-privacy-settings-btn")) return;
    const btn = document.createElement("button");
    btn.id = "sc-privacy-settings-btn";
    btn.className = "sc-privacy-settings-btn";
    btn.type = "button";
    btn.textContent = "Privacy Settings";
    btn.addEventListener("click", () => openConsentModal());
    document.body.appendChild(btn);
  }

  function applyConsentDecision(value) {
    if (value === "accepted") {
      setConsentCookie("accepted");
      location.reload();
      return;
    }

    setConsentCookie("declined");
    removeSCCookiesAndStorage();
    removeConsentUI();
    showPrivacySettingsButton();
  }

  function openConsentModal() {
    injectConsentStyles();
    hideConsentBanner();

    let overlay = document.getElementById("sc-consent-overlay");
    if (overlay) {
      overlay.classList.remove("sc-consent-hidden");
      return;
    }

    overlay = document.createElement("div");
    overlay.id = "sc-consent-overlay";
    overlay.className = "sc-consent-overlay";
    overlay.innerHTML = `
      <div class="sc-consent-modal" role="dialog" aria-modal="true" aria-labelledby="sc-consent-modal-title">
        <div class="sc-consent-badge">VDG PATH Tracking</div>
        <h2 id="sc-consent-modal-title">Control analytics and attribution cookies</h2>
        <p>We use VDG PATH to understand how visitors reach this site, which pages they view, and whether they submit a form or call. These cookies help with attribution and reporting, and they are only enabled if you choose to allow them.</p>
        <div class="sc-consent-cookie-box">
          <h3 style="margin:0 0 8px;font-size:14px;">What cookies are used?</h3>
          <p style="margin:0 0 6px;">Necessary preferences are stored so we remember your choice. If you accept analytics, VDG PATH will also store visitor and session identifiers for attribution reporting.</p>
          ${buildCookieCardsHtml()}
        </div>
        <p style="margin-top:16px;">Choose whether VDG PATH may set analytics and attribution cookies on this site.</p>
        <div class="sc-consent-modal-actions">
          <button type="button" class="sc-consent-btn sc-consent-btn-secondary" id="sc-modal-close">Back</button>
          <button type="button" class="sc-consent-btn" id="sc-modal-decline">Decline analytics</button>
          <button type="button" class="sc-consent-btn sc-consent-btn-primary" id="sc-modal-accept">Accept analytics</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    function closeModalToBanner() {
      overlay.classList.add("sc-consent-hidden");
      showConsentBannerAgain();
    }

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModalToBanner();
    });
    overlay.querySelector("#sc-modal-close").addEventListener("click", closeModalToBanner);
    overlay.querySelector("#sc-modal-decline").addEventListener("click", () => applyConsentDecision("declined"));
    overlay.querySelector("#sc-modal-accept").addEventListener("click", () => applyConsentDecision("accepted"));
  }

  function showConsentBanner() {
    injectConsentStyles();
    if (document.getElementById("sc-consent-banner")) return;

    const banner = document.createElement("div");
    banner.id = "sc-consent-banner";
    banner.className = "sc-consent-banner";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-live", "polite");
    banner.innerHTML = `
      <div class="sc-consent-badge">VDG PATH Tracking</div>
      <h2 class="sc-consent-title">We value your privacy</h2>
      <p class="sc-consent-copy">We use cookies to improve analytics and attribution reporting so we can understand which pages visitors view and whether they submit a form or call.</p>
      <div class="sc-consent-actions">
        <button type="button" class="sc-consent-btn sc-consent-btn-secondary" id="sc-consent-customize">Customize</button>
        <button type="button" class="sc-consent-btn" id="sc-consent-decline">Reject All</button>
        <button type="button" class="sc-consent-btn sc-consent-btn-primary" id="sc-consent-accept">Accept All</button>
      </div>
    `;
    document.body.appendChild(banner);

    banner.querySelector("#sc-consent-customize").addEventListener("click", () => openConsentModal());
    banner.querySelector("#sc-consent-decline").addEventListener("click", () => applyConsentDecision("declined"));
    banner.querySelector("#sc-consent-accept").addEventListener("click", () => applyConsentDecision("accepted"));
  }

  function ensureConsentUI() {
    const show = () => {
      showConsentBanner();
      showPrivacySettingsButton();
    };

    if (document.body) show();
    else document.addEventListener("DOMContentLoaded", show, { once: true });
  }

  const SC_CONSENT_ENABLED_FOR_CLIENT = fetchConsentEnabledForClientSync();

  if (SC_CONSENT_ENABLED_FOR_CLIENT) {
    if (!hasAnalyticsConsent()) {
      ensureConsentUI();
      if (isConsentDeclined()) {
        showPrivacySettingsButton();
      }
      return;
    }
  } else {
    console.log("PATH: consent mode disabled for this client; tracking will run without showing the consent banner.");
    removeConsentUI();
  }

  // -------------------------------------------------------
  // CONFIG
  // -------------------------------------------------------
  const SUPABASE_URL = "https://ejldmatndlmiugxydiae.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqbGRtYXRuZGxtaXVneHlkaWFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMDk0MDYsImV4cCI6MjA4MjY4NTQwNn0.9m2GmCnHFmKJP1eYNRm5Q8EgFzwOpIP4ZaWn7msiSgQ";

  // Always initialize conversion rules container
  window._sc_conversion_rules = [];

  // -------------------------------------------------------
  // UTILITIES
  // -------------------------------------------------------
  function resolveClientKey() {
	  // 1️⃣ Immediate execution (classic script)
	  if (document.currentScript) {
		const v = document.currentScript.getAttribute("data-sc-client");
		if (v) return v;
	  }

	  // 2️⃣ Fallback: scan DOM for the embed script
	  const scripts = document.querySelectorAll("script[data-sc-client]");
	  for (const s of scripts) {
		const v = s.getAttribute("data-sc-client");
		if (v) return v;
	  }

	  return "UNKNOWN_CLIENT";
	}

	const CLIENT_ID = resolveClientKey();
	let SC_CLIENT_UUID = null;
  
  async function resolveClientUUID() {
    if (!CLIENT_ID || CLIENT_ID === "UNKNOWN_CLIENT") return null;

    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/sc_clients?client_key=eq.${encodeURIComponent(CLIENT_ID)}&select=id`,
        {
          credentials: "omit",
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`
          }
        }
      );

      if (!res.ok) return null;

      const rows = await res.json();
      if (rows && rows.length) {
        SC_CLIENT_UUID = rows[0].id;
        return SC_CLIENT_UUID;
      }
    } catch (e) {
      console.error("SC client_id resolve failed", e);
    }

    return null;
  }
  
  function uuid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  function getCookie(name) {
    const m = document.cookie.match("(^|;)\\s*" + name + "\\s*=\\s*([^;]+)");
    return m ? m.pop() : null;
  }

  function setCookie(name, value, days = 90) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
  }

  function getUTMs() {
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get("utm_source"),
      utm_medium: params.get("utm_medium"),
      utm_campaign: params.get("utm_campaign"),
      utm_term: params.get("utm_term"),
      utm_content: params.get("utm_content")
    };
  }

  function detectSource() {
    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);
    const ref = document.referrer;
    const host = location.hostname.replace("www.", "");

    // 1) UTM
    if (params.get("utm_source")) {
      return params.get("utm_source").toLowerCase();
    }

    // 2) Google PPC
    if (params.has("gclid") || params.has("gbraid") || params.has("wbraid")) {
      return "google_cpc";
    }

    // 3) Direct
    if (!ref || ref.trim() === "") return "direct";

    let refUrl;
    try {
      refUrl = new URL(ref);
    } catch {
      return "direct";
    }

    const refDomain = refUrl.hostname.replace("www.", "");

    // 4) Internal
    if (refDomain === host) return "internal";

    // 5) Organic search (same as 1.7.3)
    const searchEngines = ["google.", "bing.", "yahoo.", "duckduckgo."];
    if (searchEngines.some((d) => refDomain === d || refDomain.endsWith(d) || refDomain.includes(d))) {
      if (refDomain.includes("google")) return "google_organic";
      if (refDomain.includes("bing")) return "bing_organic";
      if (refDomain.includes("yahoo")) return "yahoo_organic";
      if (refDomain.includes("duckduckgo")) return "duckduckgo";
    }

    // 6) Social exact match / subdomain match
    const socialDomains = [
      "facebook.com",
      "instagram.com",
      "twitter.com",
      "t.co",
      "x.com",
      "linkedin.com",
      "pinterest.com",
      "reddit.com"
    ];

    const matchedSocial = socialDomains.find((d) => refDomain === d || refDomain.endsWith("." + d));
    if (matchedSocial) {
      const base = matchedSocial.split(".")[0];
      return `${base}_social`;
    }

    // 7) External referral
    return refDomain;
  }

  function isExternalLink(href) {
    try {
      const url = new URL(href, window.location.href);
      return url.origin !== window.location.origin;
    } catch {
      return false;
    }
  }

  function normalizeEmail(v) {
    return (v || "").trim().toLowerCase();
  }

  function looksLikeEmail(v) {
    const s = (v || "").trim();
    return typeof s === "string" && s.includes("@") && s.length > 5;
  }

  // -------------------------------------------------------
  // SESSION + VISITOR MANAGEMENT
  // -------------------------------------------------------
  let visitorId = getCookie("_sc_vid");
  if (!visitorId) {
    visitorId = uuid();
    setCookie("_sc_vid", visitorId);
  }

  let sessionId = getCookie("_sc_sid");
  const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  function startNewSession() {
    sessionId = uuid();
    setCookie("_sc_sid", sessionId);
    localStorage.setItem("_sc_last_session", Date.now());
  }

  const lastSessionTime = parseInt(localStorage.getItem("_sc_last_session") || "0");
  const now = Date.now();

  if (!sessionId || now - lastSessionTime > SESSION_TIMEOUT) {
    startNewSession();
  } else {
    localStorage.setItem("_sc_last_session", now);
  }
  
  // -------------------------------------------------------
  // SESSION SOURCE MEMORY (FIRST NON-INTERNAL)
  // -------------------------------------------------------
  const SESSION_SOURCE_KEY = "_sc_session_source";

  function setSessionSourceIfEligible(source) {
    if (!source || source === "internal") return;

    if (!sessionStorage.getItem(SESSION_SOURCE_KEY)) {
      sessionStorage.setItem(SESSION_SOURCE_KEY, source);
    }
  }

  function getSessionSource() {
    return sessionStorage.getItem(SESSION_SOURCE_KEY);
  }

  // -------------------------------------------------------
  // IDENTITY CAPTURE (email / first / last)
  // -------------------------------------------------------
  const identity = {
    email: null,
    first_name: null,
    last_name: null,
    first_seen_at: null,
  };

  function captureIdentity(field, value) {
    if (!value) return;

    if (field === "email" && looksLikeEmail(value)) {
      identity.email = normalizeEmail(value);
    }
    if (field === "first_name" && !identity.first_name) {
      identity.first_name = String(value).trim();
    }
    if (field === "last_name" && !identity.last_name) {
      identity.last_name = String(value).trim();
    }

    if (field === "full_name" && !identity.first_name && !identity.last_name) {
      const parts = String(value).trim().split(/\s+/);
      if (parts.length >= 1) {
        identity.first_name = parts[0];
        if (parts.length > 1) {
          identity.last_name = parts.slice(1).join(" ");
        }
      }
    }

    // first_seen anchored to the moment we first learn the email (not necessarily a conversion)
    if (identity.email && !identity.first_seen_at) {
      identity.first_seen_at = new Date().toISOString();
    }

    // low-noise auto-upsert when we first capture an email
    if (identity.email) scheduleIdentityUpsert(null);

    if (identity.email && (field === "first_name" || field === "last_name")) {
      scheduleIdentityUpsert(null);
    }
  }

  function getClosestLabelText(el) {
  try {
    // 1) explicit label[for=id]
    if (el.id) {
      const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (lbl && lbl.textContent) return lbl.textContent.trim().toLowerCase();
    }

    // 2) wrapped label
    const parentLabel = el.closest("label");
    if (parentLabel && parentLabel.textContent) return parentLabel.textContent.trim().toLowerCase();

    // 3) Gravity Forms: common structure: .gfield_label, .ginput_container, etc.
    const gfield = el.closest(".gfield");
    if (gfield) {
      const gLabel = gfield.querySelector(".gfield_label");
      if (gLabel && gLabel.textContent) return gLabel.textContent.trim().toLowerCase();
    }
  } catch {}
  return "";
}

function inferFieldFromElement(el) {
  const name = (el.name || "").toLowerCase();
  const id = (el.id || "").toLowerCase();
  const type = (el.type || "").toLowerCase();
  const autocomplete = (el.autocomplete || "").toLowerCase();
  const placeholder = (el.placeholder || "").toLowerCase();
  const aria = (el.getAttribute("aria-label") || "").toLowerCase();
  const labelText = getClosestLabelText(el);

  const hay = `${name} ${id} ${autocomplete} ${placeholder} ${aria} ${labelText}`;

  // EMAIL
  if (type === "email" || autocomplete === "email" || hay.includes("email")) return "email";

  // FIRST NAME
  // Covers: "first", "fname", "given", and Gravity Forms compound name inputs
  if (
    autocomplete === "given-name" ||
    hay.includes("first name") ||
    hay.includes("firstname") ||
    hay.includes("fname") ||
    hay.includes("given")
  ) return "first_name";

  // LAST NAME
  if (
    autocomplete === "family-name" ||
    hay.includes("last name") ||
    hay.includes("lastname") ||
    hay.includes("lname") ||
    hay.includes("family")
  ) return "last_name";

  // Gravity Forms "Name" field often uses inputs like input_1_3 (first) and input_1_6 (last)
  // If label says "Name" and placeholder/aria says first/last, we already catch it above.
  // As a fallback: if label says "name" and the element is one of the sub-inputs:
  if (labelText.includes("name")) {
    if (placeholder.includes("first") || aria.includes("first")) return "first_name";
    if (placeholder.includes("last") || aria.includes("last")) return "last_name";
  }

  // Gravity Forms Name compound field detection
  const gfSpan = el.closest("span");
  if (gfSpan) {
    if (gfSpan.classList.contains("name_first")) return "first_name";
    if (gfSpan.classList.contains("name_last")) return "last_name";
  }

  // Single "Name" field (full name)
  if (
    hay.includes("name") &&
    !hay.includes("first") &&
    !hay.includes("last") &&
    el.type === "text"
  ) {
    return "full_name";
  }

  return null;
}

  function onFieldChanged(e) {
    const el = e.target;
    if (!el || !("value" in el)) return;
    const value = el.value;
    if (!value) return;

    const field = inferFieldFromElement(el);
    if (!field) return;

    captureIdentity(field, value);
  }

  // Use multiple events so Gravity Forms / WP quirks still get caught
  document.addEventListener("change", onFieldChanged, true);
  document.addEventListener("blur", onFieldChanged, true);
  document.addEventListener("input", (e) => {
    // only run lightweight checks on input to reduce noise
    const el = e.target;
    if (!el || !("value" in el)) return;
    const field = inferFieldFromElement(el);
    if (field === "email") captureIdentity("email", el.value);
  }, true);

  // -------------------------------------------------------
  // SHADOW MESSAGE COLLECTION (ALL FORMS)
  // -------------------------------------------------------
  document.addEventListener(
    "input",
    (e) => {
      const el = e.target;
      if (!el || !("value" in el)) return;

      if (
        el.tagName === "TEXTAREA" ||
        (el.tagName === "INPUT" &&
          ["text", "email", "tel"].includes(el.type))
      ) {
        updateShadowMessage(el.value);
      }
    },
    true
  );

  // -------------------------------------------------------
  // IDENTITY UPSERT (sc_identities)
  // - IMPORTANT: accumulates visitor_ids (does NOT overwrite)
  // -------------------------------------------------------
  let _identityUpsertTimer = null;

  function scheduleIdentityUpsert(conversionType) {
    // debounce (typing in email field fires a lot)
    if (_identityUpsertTimer) clearTimeout(_identityUpsertTimer);
    _identityUpsertTimer = setTimeout(() => {
      upsertIdentity(conversionType);
    }, 600);
  }

  async function supabaseFetch(path, options) {
    return fetch(`${SUPABASE_URL}${path}`, {
      ...options,
      credentials: "omit",
      headers: {
        ...(options && options.headers ? options.headers : {}),
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
  }

  // -------------------------------------------------------
  // SHADOW MESSAGE BUFFER (INTENT-BASED, UNIVERSAL)
  // -------------------------------------------------------
  let scShadowMessage = "";
  let scShadowMessageLen = 0;
  let scSubmitIntentDetected = false;
  const scShadowSentForms = new Set();

  function updateShadowMessage(value) {
    if (!value) return;
    const v = String(value).trim();
    if (v.length > scShadowMessageLen) {
      scShadowMessage = v;
      scShadowMessageLen = v.length;
    }
  }

  function getFormKey(form) {
    if (!form) return `page:${window.location.pathname}`;
    return (
      form.getAttribute("data-sc-form-key") ||
      form.id ||
      form.getAttribute("name") ||
      form.getAttribute("action") ||
      `form_${Array.from(document.forms).indexOf(form)}`
    );
  }

  function getFieldLabel(el) {
    try {
      if (el.id) {
        const explicit = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (explicit?.textContent) return explicit.textContent.trim();
      }

      const wrapped = el.closest("label");
      if (wrapped?.textContent) return wrapped.textContent.trim();

      const gfield = el.closest(".gfield");
      const gLabel = gfield?.querySelector(".gfield_label");
      if (gLabel?.textContent) return gLabel.textContent.trim();
    } catch {}

    return (
      el.getAttribute("aria-label") ||
      el.getAttribute("placeholder") ||
      el.name ||
      el.id ||
      "field"
    );
  }

  const SC_MAX_FIELD_LENGTH = 5000;
  const SC_MAX_FIELDS = 80;
  const scFormDataCache = new WeakMap();
  const scRecentShadowHashes = new Map();
  const scAjaxSnapshots = new Map();

  function normalizeFieldName(name) {
    return String(name || "").trim();
  }

  function shouldSkipFieldName(fieldName) {
    if (!fieldName) return true;
    const name = String(fieldName).toLowerCase();
    return (
      name.includes("password") ||
      name.includes("passcode") ||
      name.includes("ssn") ||
      name.includes("social_security") ||
      name.includes("credit") ||
      name.includes("card") ||
      name.includes("ccnum") ||
      name.includes("cvc") ||
      name.includes("cvv") ||
      name.includes("security") ||
      name.includes("captcha") ||
      name === "g-recaptcha-response" ||
      name === "h-captcha-response" ||
      name === "cf-turnstile-response" ||
      name.startsWith("_wp") ||
      name === "wpnonce" ||
      name.includes("nonce")
    );
  }

  function cleanFieldValue(value) {
    if (value === null || value === undefined) return null;

    if (Array.isArray(value)) {
      const cleanedArray = value
        .map((v) => cleanFieldValue(v))
        .filter((v) => v !== null && v !== "");
      return cleanedArray.length ? cleanedArray : null;
    }

    if (typeof File !== "undefined" && value instanceof File) {
      return value.name ? `[file: ${value.name}]` : "[file]";
    }

    let cleaned = String(value).trim();
    if (!cleaned) return null;

    cleaned = cleaned.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "");
    cleaned = cleaned.replace(/\s+/g, " ").trim();

    if (cleaned.length > SC_MAX_FIELD_LENGTH) {
      cleaned = cleaned.slice(0, SC_MAX_FIELD_LENGTH);
    }

    return cleaned || null;
  }

  function shouldIncludeField(el) {
    if (!el || el.disabled) return false;

    const type = (el.type || "").toLowerCase();
    const tag = (el.tagName || "").toLowerCase();
    const name = normalizeFieldName(el.name || el.id || el.getAttribute("aria-label") || el.getAttribute("placeholder"));
    const lowerName = name.toLowerCase();

    if (["password", "submit", "button", "reset", "image"].includes(type)) return false;
    if (tag === "button") return false;
    if (shouldSkipFieldName(lowerName)) return false;

    const hiddenAllowedNames = ["gclid", "gbraid", "wbraid", "fbclid", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
    if (type === "hidden" && !hiddenAllowedNames.includes(lowerName)) return false;

    return true;
  }

  function getFieldValue(el) {
    const tag = (el.tagName || "").toLowerCase();
    const type = (el.type || "").toLowerCase();

    if (type === "checkbox") return el.checked ? (el.value || true) : null;
    if (type === "radio") return el.checked ? el.value : null;

    if (tag === "select") {
      if (el.multiple) {
        const vals = Array.from(el.selectedOptions || [])
          .map((o) => (o.textContent || o.value || "").trim())
          .filter(Boolean);
        return vals.length ? vals : null;
      }
      return (el.selectedOptions && el.selectedOptions[0] && (el.selectedOptions[0].textContent || "").trim()) || el.value || null;
    }

    if (type === "file") {
      const files = Array.from(el.files || []).map((f) => f.name).filter(Boolean);
      return files.length ? files.map((name) => `[file: ${name}]`) : null;
    }

    const v = typeof el.value === "string" ? el.value.trim() : el.value;
    return v || null;
  }

  function makeFieldItem(el, rawValue, source = "dom") {
    const fieldName = normalizeFieldName(el.name || el.id || el.getAttribute("aria-label") || el.getAttribute("placeholder"));
    if (shouldSkipFieldName(fieldName)) return null;

    const value = cleanFieldValue(rawValue);
    if (value === null || value === "") return null;

    const label = getFieldLabel(el);
    const type = (el.type || el.tagName || "field").toLowerCase();

    return {
      name: el.name || el.id || null,
      label,
      type,
      value,
      source
    };
  }

  function getFieldSourcePriority(source) {
    const s = String(source || "").toLowerCase();
    if (s.includes("submit_click")) return 100;
    if (s.includes("submit")) return 95;
    if (s.includes("formdata")) return 90;
    if (s.includes("fetch") || s.includes("xhr")) return 85;
    if (s.includes("container")) return 75;
    if (s.includes("dom")) return 70;
    if (s.includes("live_change")) return 45;
    if (s.includes("live_input")) return 35;
    return 50;
  }

  function getFieldMergeKey(field) {
    const name = String(field?.name || "").trim().toLowerCase();
    const label = String(field?.label || "").trim().toLowerCase();
    const type = String(field?.type || "").trim().toLowerCase();

    // Prefer the real field name. This prevents live typing snapshots from creating
    // dozens of rows for the same textarea while still keeping First/Last split fields.
    if (name) return `name:${name}`;
    if (label) return `label:${label}|type:${type}`;

    const valueString = Array.isArray(field?.value) ? field.value.join(", ") : String(field?.value || "");
    return `value:${valueString.slice(0, 80).toLowerCase()}`;
  }

  function chooseBetterField(existing, incoming) {
    if (!existing) return incoming;
    if (!incoming) return existing;

    const existingValue = Array.isArray(existing.value) ? existing.value.join(", ") : String(existing.value || "");
    const incomingValue = Array.isArray(incoming.value) ? incoming.value.join(", ") : String(incoming.value || "");
    const existingPriority = getFieldSourcePriority(existing.source);
    const incomingPriority = getFieldSourcePriority(incoming.source);

    if (incomingPriority > existingPriority) return incoming;
    if (incomingPriority < existingPriority) return existing;

    // Same source quality: keep the more complete value.
    if (incomingValue.length > existingValue.length) return incoming;
    return existing;
  }

  function mergeFieldItems(primary = [], secondary = []) {
    const byKey = new Map();

    [...primary, ...secondary].forEach((field) => {
      if (!field) return;
      const valueString = Array.isArray(field.value) ? field.value.join(", ") : String(field.value || "");
      if (!valueString.trim()) return;

      const normalized = {
        ...field,
        value: Array.isArray(field.value) ? field.value : cleanFieldValue(field.value)
      };
      if (normalized.value === null || normalized.value === "") return;

      const key = getFieldMergeKey(normalized);
      byKey.set(key, chooseBetterField(byKey.get(key), normalized));
    });

    return Array.from(byKey.values()).slice(0, SC_MAX_FIELDS);
  }

  function inferBestMessage(fields = []) {
    let bestMessage = null;
    let bestScore = -1;

    fields.forEach((f) => {
      const value = Array.isArray(f.value) ? f.value.join(", ") : String(f.value || "");
      if (!value.trim()) return;

      const hint = `${f.label || ""} ${f.name || ""} ${f.type || ""}`.toLowerCase();
      let score = 0;

      if (hint.includes("message")) score += 80;
      if (hint.includes("comment") || hint.includes("comments")) score += 75;
      if (hint.includes("question") || hint.includes("questions")) score += 70;
      if (hint.includes("detail") || hint.includes("details")) score += 65;
      if (hint.includes("description") || hint.includes("describe")) score += 60;
      if (hint.includes("note") || hint.includes("notes")) score += 55;
      if (hint.includes("help")) score += 45;
      if ((f.type || "").includes("textarea")) score += 40;
      score += Math.min(value.length / 20, 30);

      if (score > bestScore) {
        bestScore = score;
        bestMessage = value;
      }
    });

    if (bestMessage) return bestMessage;

    if (fields.length) {
      return fields
        .map((f) => {
          const v = Array.isArray(f.value) ? f.value.join(", ") : f.value;
          return `${f.label || f.name || "field"}: ${v}`;
        })
        .join(" | ");
    }

    return null;
  }

  function collectFieldsFromRoot(root, source = "dom") {
    if (!root || !root.querySelectorAll) return [];

    const fields = [];
    const els = root.querySelectorAll("input, textarea, select");

    els.forEach((el) => {
      if (fields.length >= SC_MAX_FIELDS) return;
      if (!shouldIncludeField(el)) return;

      const item = makeFieldItem(el, getFieldValue(el), source);
      if (item) fields.push(item);
    });

    return fields;
  }

  function collectFormFields(form) {
    if (!form) return { fields: [], bestMessage: scShadowMessage || null };

    const cached = scFormDataCache.get(form);
    const domFields = collectFieldsFromRoot(form, "dom");
    const fields = mergeFieldItems(domFields, cached ? cached.fields : []);
    const bestMessage = inferBestMessage(fields) || (cached && cached.bestMessage) || scShadowMessage || null;

    return { fields, bestMessage };
  }

  function cacheFormSnapshot(form, source = "live") {
    if (!form || form.tagName !== "FORM") return null;

    const attemptKey = getOrCreateAttemptKey(form);
    setLatestAttemptKey(attemptKey);

    const current = collectFieldsFromRoot(form, source);
    const existing = scFormDataCache.get(form);
    const fields = mergeFieldItems(current, existing ? existing.fields : []);
    const bestMessage = inferBestMessage(fields) || (existing && existing.bestMessage) || scShadowMessage || null;

    const snapshot = { attemptKey, fields, bestMessage, source, cachedAt: Date.now() };
    scFormDataCache.set(form, snapshot);
    form.__sc_formdata_snapshot = snapshot;
    return snapshot;
  }

  function getLikelyFormFromElement(el) {
    if (!el) return null;
    if (el.form) return el.form;
    if (el.closest) return el.closest("form");
    return null;
  }

  function collectGenericContainerFields(el) {
    if (!el) return { fields: [], bestMessage: scShadowMessage || null };

    const root = el.closest("form") ||
      el.closest(".gform_wrapper, .wpcf7, .elementor-form, .nf-form-cont, .wpforms-container, .frm_forms, [data-form-id], [role='form']") ||
      el.parentElement ||
      document;

    const fields = collectFieldsFromRoot(root, "container");
    return { fields, bestMessage: inferBestMessage(fields) || scShadowMessage || null };
  }

  function buildShadowHash({ attemptKey, formMeta, fields, shadowStatus }) {
    const fieldSig = (fields || [])
      .map((f) => `${f.name || ""}:${Array.isArray(f.value) ? f.value.join(",") : f.value}`)
      .join("|")
      .slice(0, 1000);
    return `${attemptKey || ""}|${formMeta?.formKey || ""}|${shadowStatus || ""}|${fieldSig}`;
  }

  function shouldSendShadowSnapshot(hash, ttlMs = 8000) {
    const nowTs = Date.now();
    const last = scRecentShadowHashes.get(hash);
    if (last && nowTs - last < ttlMs) return false;
    scRecentShadowHashes.set(hash, nowTs);

    for (const [key, ts] of scRecentShadowHashes.entries()) {
      if (nowTs - ts > 30000) scRecentShadowHashes.delete(key);
    }

    return true;
  }

  function sendShadowFromSnapshot(form, snapshot, shadowStatus = "attempted") {
    const formMeta = getFormMeta(form);
    const fields = snapshot && snapshot.fields ? snapshot.fields : [];
    const attemptKey = snapshot?.attemptKey || getOrCreateAttemptKey(form);
    setLatestAttemptKey(attemptKey);

    const hash = buildShadowHash({ attemptKey, formMeta, fields, shadowStatus });
    if (!shouldSendShadowSnapshot(hash)) return;

    sendShadowSubmission({
      attemptKey,
      message: snapshot?.bestMessage || inferBestMessage(fields) || scShadowMessage || null,
      formId: formMeta.formId,
      formName: formMeta.formName,
      fields,
      shadowStatus
    });
  }

  function parseBodyToFields(body, source = "ajax") {
    const fields = [];

    try {
      if (!body) return fields;

      if (typeof FormData !== "undefined" && body instanceof FormData) {
        for (const [name, value] of body.entries()) {
          if (!name || shouldSkipFieldName(name)) continue;
          const cleaned = cleanFieldValue(value);
          if (cleaned === null) continue;
          fields.push({ name, label: name, type: "formdata", value: cleaned, source });
          if (fields.length >= SC_MAX_FIELDS) break;
        }
      } else if (typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams) {
        for (const [name, value] of body.entries()) {
          if (!name || shouldSkipFieldName(name)) continue;
          const cleaned = cleanFieldValue(value);
          if (cleaned === null) continue;
          fields.push({ name, label: name, type: "urlencoded", value: cleaned, source });
          if (fields.length >= SC_MAX_FIELDS) break;
        }
      } else if (typeof body === "string") {
        const trimmed = body.trim();
        if (!trimmed) return fields;

        if (trimmed[0] === "{" || trimmed[0] === "[") {
          const json = JSON.parse(trimmed);
          flattenObjectToFields(json, fields, source);
        } else if (trimmed.includes("=")) {
          const params = new URLSearchParams(trimmed);
          for (const [name, value] of params.entries()) {
            if (!name || shouldSkipFieldName(name)) continue;
            const cleaned = cleanFieldValue(value);
            if (cleaned === null) continue;
            fields.push({ name, label: name, type: "urlencoded", value: cleaned, source });
            if (fields.length >= SC_MAX_FIELDS) break;
          }
        }
      }
    } catch {}

    return fields.slice(0, SC_MAX_FIELDS);
  }

  function flattenObjectToFields(obj, fields, source, prefix = "") {
    if (!obj || fields.length >= SC_MAX_FIELDS) return;

    if (typeof obj !== "object") {
      const cleaned = cleanFieldValue(obj);
      if (cleaned !== null && prefix && !shouldSkipFieldName(prefix)) {
        fields.push({ name: prefix, label: prefix, type: "json", value: cleaned, source });
      }
      return;
    }

    Object.keys(obj).forEach((key) => {
      if (fields.length >= SC_MAX_FIELDS) return;
      const path = prefix ? `${prefix}.${key}` : key;
      if (shouldSkipFieldName(path)) return;
      const val = obj[key];

      if (val && typeof val === "object" && !Array.isArray(val)) {
        flattenObjectToFields(val, fields, source, path);
      } else {
        const cleaned = cleanFieldValue(val);
        if (cleaned !== null) fields.push({ name: path, label: path, type: "json", value: cleaned, source });
      }
    });
  }

  function cacheAjaxSnapshot(url, fields) {
    if (!fields || !fields.length) return null;
    const key = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const snapshot = {
      attemptKey: getLatestAttemptKey() || `${sessionId}_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`,
      fields,
      bestMessage: inferBestMessage(fields),
      url: String(url || ""),
      cachedAt: Date.now()
    };
    setLatestAttemptKey(snapshot.attemptKey);
    scAjaxSnapshots.set(key, snapshot);

    setTimeout(() => scAjaxSnapshots.delete(key), 20000);
    return snapshot;
  }

  function getFormMeta(form) {
    if (!form) return { formId: null, formName: null, formKey: getFormKey(null) };

    const formId =
      form.id && form.id.startsWith("gform_")
        ? form.id.replace("gform_", "")
        : form.id || null;

    const formName =
      form.getAttribute("name") ||
      form.getAttribute("data-form-name") ||
      form.getAttribute("aria-label") ||
      form.getAttribute("id") ||
      null;

    return {
      formId,
      formName,
      formKey: getFormKey(form)
    };
  }

  function getOrCreateAttemptKey(form) {
    if (form && form.__sc_attempt_key) return form.__sc_attempt_key;

    const key = `${sessionId}_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;

    if (form) {
      form.__sc_attempt_key = key;
    }

    window.__sc_last_attempt_key = key;
    return key;
  }

  function getLatestAttemptKey() {
    return window.__sc_last_attempt_key || null;
  }

  function setLatestAttemptKey(key) {
    if (key) window.__sc_last_attempt_key = key;
  }

  function getCompletenessScore({ email, first_name, last_name, message, fields }) {
    let score = 0;

    if (email) score += 5;
    if (first_name) score += 2;
    if (last_name) score += 2;
    if (message && String(message).trim()) score += 3;

    score += Math.min((fields || []).length, 10);

    return score;
  }

  function scanForSubmissionSuccess(root = document) {
    const successSelectors = [
      ".gform_confirmation_message",
      ".gform_confirmation_wrapper",
      ".wpcf7-mail-sent-ok",
      ".wpcf7-response-output",
      ".form-submitted-message",
      ".elementor-message-success",
      ".hs-form__thank-you",
      ".nf-response-msg"
    ];

    for (const sel of successSelectors) {
      const el = root.querySelector(sel);
      if (el && /thank|success|sent|received|submitted/i.test(el.textContent || "")) {
        return true;
      }
    }

    const text = (root.body ? root.body.innerText : root.innerText) || "";
    return /thank you|message sent|successfully submitted|request received|form submitted/i.test(text);
  }

  function scheduleUiSuccessCheck(form, formMeta) {
    setTimeout(() => {
      try {
        const formRoot = form?.parentElement || document;
        if (scanForSubmissionSuccess(formRoot) || scanForSubmissionSuccess(document)) {
          sendConversion("form_submit_ui_success", {
            form_id: formMeta.formId || null,
            form_name: formMeta.formName || null
          });
        }
      } catch (err) {
        console.error("SC UI success check error:", err);
      }
    }, 1500);
  }

  // -------------------------------------------------------
  // SHADOW SUBMISSION SNAPSHOT
  // -------------------------------------------------------
  async function sendShadowSubmission({
    attemptKey = null,
    message,
    formId,
    formName,
    fields = [],
    shadowStatus = "attempted"
  }) {
    const utms = getUTMs();
    const cleanFields = mergeFieldItems(fields, []);
    const cleanMessage = message || inferBestMessage(cleanFields) || null;

    const sessionSource =
      getSessionSource() ||
      (detectSource() !== "internal" ? detectSource() : "direct");

    const campaignDisplay =
      utms.utm_campaign || `(${sessionSource})`;

    const payload = {
      client: CLIENT_ID,
      client_id: SC_CLIENT_UUID,

      visitor_id: visitorId,
      session_id: sessionId,

      attempt_key: attemptKey,
      completeness_score: getCompletenessScore({
        email: identity.email,
        first_name: identity.first_name,
        last_name: identity.last_name,
        message: cleanMessage,
        fields: cleanFields
      }),

      email: identity.email,
      first_name: identity.first_name,
      last_name: identity.last_name,

      form_id: formId || null,
      form_name: formName || null,

      utm_campaign: utms.utm_campaign,
      utm_source: utms.utm_source,
      utm_medium: utms.utm_medium,
      utm_term: utms.utm_term,
      utm_content: utms.utm_content,

      session_source: sessionSource,
      campaign_display: campaignDisplay,

      message: cleanMessage,
      fields_json: cleanFields,
      shadow_status: shadowStatus,
      page_url: window.location.href,

      submitted_at: new Date().toISOString()
    };

    try {
      await fetch(`${SUPABASE_URL}/rest/v1/sc_shadow_submissions`, {
        method: "POST",
        credentials: "omit",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Prefer: "return=minimal"
        },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.error("SC shadow submit error:", err);
    }
  }
  
  function uniqueArray(arr) {
    const out = [];
    const seen = new Set();
    (arr || []).forEach((v) => {
      const s = String(v);
      if (!seen.has(s)) {
        seen.add(s);
        out.push(s);
      }
    });
    return out;
  }

  async function upsertIdentity(conversionType = null) {
    if (!identity.email) return;

    // Prevent spam: only upsert once per email per session unless it's a conversion
    const hasNames = !!(identity.first_name || identity.last_name);
    const dedupeKey = `sc_ident_${identity.email}_${sessionId}_${conversionType ? "conv" : "base"}_${hasNames ? "named" : "anon"}`;

    if (sessionStorage.getItem(dedupeKey)) return;
    sessionStorage.setItem(dedupeKey, "1");

    const email = identity.email;
    const encodedEmail = encodeURIComponent(email);

    // 1) Try to read existing identity row (so we can merge visitor_ids)
    let existing = null;
    try {
      const res = await supabaseFetch(
        `/rest/v1/sc_identities?client=eq.${encodeURIComponent(CLIENT_ID)}&email=eq.${encodedEmail}&select=visitor_ids,primary_visitor_id,first_seen_at`,
        { method: "GET" }
      );

      if (res.ok) {
        const rows = await res.json();
        if (rows && rows.length) existing = rows[0];
      }
    } catch (err) {
      console.error("SC identity read error:", err);
    }

    const existingVisitorIds = existing?.visitor_ids || [];
    const mergedVisitorIds = uniqueArray([visitorId, ...existingVisitorIds]);

    const payload = {
      client: CLIENT_ID,
	  client_id: SC_CLIENT_UUID,
      email: email,
      first_name: identity.first_name || null,
      last_name: identity.last_name || null,

      first_seen_at: existing?.first_seen_at || identity.first_seen_at || new Date().toISOString(),

      primary_visitor_id: existing?.primary_visitor_id || visitorId,
      visitor_ids: mergedVisitorIds,

      updated_at: new Date().toISOString()
    };

    // 2) If exists -> PATCH, else -> POST
    try {
      if (existing) {
        const patchRes = await supabaseFetch(
          `/rest/v1/sc_identities?client=eq.${encodeURIComponent(CLIENT_ID)}&email=eq.${encodedEmail}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Prefer: "return=minimal"
            },
            body: JSON.stringify(payload)
          }
        );

        if (!patchRes.ok) {
          console.error("SC identity PATCH failed:", await patchRes.text());
        }
      } else {
        const postRes = await supabaseFetch(`/rest/v1/sc_identities`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Prefer: "return=minimal"
          },
          body: JSON.stringify(payload)
        });

        if (!postRes.ok) {
          console.error("SC identity POST failed:", await postRes.text());
        }
      }
    } catch (err) {
      console.error("SC identity upsert error:", err);
    }
  }

  // -------------------------------------------------
  // SEND CONVERSION EVENT
  // + triggers identity upsert with conversion context
  // -------------------------------------------------
  async function sendConversion(conversionType = "conversion", extra = {}) {
    // prevent duplicate conversions on refresh
    const dedupeKey = `sc_conv_${conversionType}_${sessionId}`;
    if (sessionStorage.getItem(dedupeKey)) {
      console.log("PATH: duplicate conversion blocked", conversionType);
      return;
    }
    sessionStorage.setItem(dedupeKey, "1");

    const payload = {
      client: CLIENT_ID,
	  client_id: SC_CLIENT_UUID,
      visitor_id: visitorId,
      session_id: sessionId,
      conversion_type: conversionType,
      page_url: window.location.href,
      created_at: new Date().toISOString(),
      ...extra
    };

    console.log("SC Conversion ->", payload);

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/sc_conversions`, {
        method: "POST",
        credentials: "omit",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Prefer: "return=minimal"
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) console.error(await res.text());
    } catch (err) {
      console.error("SC conversion error:", err);
    }

    // Identity stitch on conversion (best moment for “conversion_at”)
    scheduleIdentityUpsert(conversionType);
  }

  // Manual API trigger: scConversion("contact_form")
  window.scConversion = (type = "conversion") => sendConversion(type);

  function autoDetectSuccessPage() {
    // If you re-enable, it will also stitch identity via scheduleIdentityUpsert("auto_success")
    const path = window.location.pathname.toLowerCase();
    const successKeywords = [
      "/thank-you",
      "/thankyou",
      "/success",
      "/submitted",
      "/form-received",
      "/request-received",
      "/confirmation"
    ];

    // if (successKeywords.some(word => path.includes(word))) {
    //   console.log("PATH: auto success page match");
    //   sendConversion("auto_success");
    // }
  }

  async function checkSupabaseConversionRules() {
    // Always reset before fetching (prevents stale / undefined state)
    window._sc_conversion_rules = [];

    try {
      const url = `${SUPABASE_URL}/rest/v1/sc_conversion_rules?client=eq.${CLIENT_ID}&enabled=eq.true`;

      const res = await fetch(url, {
        credentials: "omit",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`
        }
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("SC rules fetch failed:", res.status, text);
        return;
      }

      const rules = await res.json();
      console.log("SC rules loaded:", rules);

      window._sc_conversion_rules = rules;

      // PAGE-BASED RULES
      const path = window.location.pathname;

      rules.forEach((rule) => {
        if (rule.rule_type !== "page") return;

        let match = false;

        if (rule.match_type === "contains" && path.includes(rule.pattern)) match = true;
        if (rule.match_type === "starts_with" && path.startsWith(rule.pattern)) match = true;
        if (rule.match_type === "ends_with" && path.endsWith(rule.pattern)) match = true;

        if (!match) return;

        const ruleKey = `sc_rule_${rule.id}_${sessionId}`;
        if (sessionStorage.getItem(ruleKey)) return;
        sessionStorage.setItem(ruleKey, "1");

        sendConversion(rule.conversion_type || "conversion", { rule_id: rule.id });
      });
    } catch (err) {
      console.error("SC rule check error:", err);
    }
  }

  // EXTERNAL CLICK RULES
  document.addEventListener("mousedown", (e) => {
    const link = e.target.closest("a[href]");
    if (!link) return;

    const href = link.href;
    const isFileDownload =
      /\.(pdf|doc|docx|xls|xlsx|csv|ppt|pptx|txt|rtf|odt|ods|odp|zip|rar|7z|tar|gz|bz2|mp3|wav|m4a|mp4|mov|avi|wmv|webm|jpg|jpeg|png|gif|svg|webp)(\?|$)/i
        .test(href);

    if (!href || (!isExternalLink(href) && !isFileDownload)) return;

    const rules = window._sc_conversion_rules;
    if (!rules || !rules.length) return;

    rules.forEach((rule) => {
      if (rule.rule_type !== "external_click") return;

      let match = false;
      if (rule.match_type === "contains" && href.includes(rule.pattern)) match = true;
      if (rule.match_type === "starts_with" && href.startsWith(rule.pattern)) match = true;
      if (rule.match_type === "ends_with" && href.endsWith(rule.pattern)) match = true;

      if (!match) return;

      sendConversion(rule.conversion_type || "external_click", {
        external_url: href,
        rule_id: rule.id
      });
    });
  });

  // -------------------------------------------------------
  // SUPABASE EVENT INSERT
  // -------------------------------------------------------
  async function sendEvent(eventType, extra = {}) {
    const detectedSource = detectSource();
	setSessionSourceIfEligible(detectedSource);
    const utmData = getUTMs();

    const payload = {
      client: CLIENT_ID,
	  client_id: SC_CLIENT_UUID,
      event_type: eventType,
      visitor_id: visitorId,
      session_id: sessionId,
      page_url: window.location.href,

      // Clean referrer (null instead of empty string)
      referrer: document.referrer && document.referrer.trim() !== "" ? document.referrer : null,

      source: detectedSource,
      ...utmData,
      ...extra,
      created_at: new Date().toISOString()
    };

    console.log("SC Event ->", payload);

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/sc_events`, {
        method: "POST",
        credentials: "omit",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Prefer: "return=minimal"
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        console.error("SC event not stored:", await res.text());
      }
    } catch (err) {
      console.error("SC tracking error:", err);
    }
  }

  // Phone clicks
  document.addEventListener("mousedown", (e) => {
    const link = e.target.closest('a[href^="tel:"]');
    if (!link) return;

    console.log("📞 Phone click:", link.href);
    window.scConversion("phone_call_click");
  });
  
  // -------------------------------------------------------
  // SHADOW SUBMISSION CAPTURE v1.2
  // Universal only: live cache + submit/click + formdata + fetch/XHR body capture.
  // No plugin-specific success events are required for shadow payload collection.
  // -------------------------------------------------------
  document.addEventListener(
    "input",
    (e) => {
      const form = getLikelyFormFromElement(e.target);
      if (form) cacheFormSnapshot(form, "live_input");
    },
    true
  );

  document.addEventListener(
    "change",
    (e) => {
      const form = getLikelyFormFromElement(e.target);
      if (form) cacheFormSnapshot(form, "live_change");
    },
    true
  );

  document.addEventListener(
    "submit",
    (e) => {
      const form = e.target;
      if (!form || form.tagName !== "FORM") return;

      scSubmitIntentDetected = true;
      const snapshot = cacheFormSnapshot(form, "submit") || collectFormFields(form);
      const attemptKey = snapshot?.attemptKey || getOrCreateAttemptKey(form);
      setLatestAttemptKey(attemptKey);

      sendShadowFromSnapshot(form, { ...snapshot, attemptKey }, "attempted");

      const formMeta = getFormMeta(form);
      scheduleUiSuccessCheck(form, formMeta);
    },
    true
  );

  document.addEventListener(
    "click",
    (e) => {
      const btn = e.target.closest(
        "button[type='submit'], input[type='submit'], button:not([type]), [role='button'], .gform_button, .wpcf7-submit, .elementor-button, .wpforms-submit, .nf-element[type='button']"
      );
      if (!btn) return;

      const form = getLikelyFormFromElement(btn);
      scSubmitIntentDetected = true;

      if (form) {
        const snapshot = cacheFormSnapshot(form, "submit_click") || collectFormFields(form);
        const attemptKey = snapshot?.attemptKey || getOrCreateAttemptKey(form);
        setLatestAttemptKey(attemptKey);
        sendShadowFromSnapshot(form, { ...snapshot, attemptKey }, "attempted_click");

        const formMeta = getFormMeta(form);
        scheduleUiSuccessCheck(form, formMeta);
        return;
      }

      // Fallback for form-like containers where the submit control is not associated with a real <form>.
      const generic = collectGenericContainerFields(btn);
      if (!generic.fields.length) return;

      const attemptKey = `${sessionId}_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
      setLatestAttemptKey(attemptKey);
      const formMeta = getFormMeta(null);
      const hash = buildShadowHash({ attemptKey, formMeta, fields: generic.fields, shadowStatus: "attempted_click_container" });
      if (!shouldSendShadowSnapshot(hash)) return;

      sendShadowSubmission({
        attemptKey,
        message: generic.bestMessage || null,
        formId: null,
        formName: null,
        fields: generic.fields,
        shadowStatus: "attempted_click_container"
      });
    },
    true
  );

  // -------------------------------------------------------
  // FORMDATA HOOK (BEST-EFFORT SNAPSHOT FOR NATIVE/AJAX FORMS)
  // -------------------------------------------------------
  document.addEventListener(
    "formdata",
    (e) => {
      try {
        const form = e.target;
        if (!form || form.tagName !== "FORM") return;

        const attemptKey = getOrCreateAttemptKey(form);
        setLatestAttemptKey(attemptKey);

        const formDataFields = parseBodyToFields(e.formData, "formdata");
        const current = collectFormFields(form);
        const fields = mergeFieldItems(formDataFields, current.fields);
        if (!fields.length) return;

        const snapshot = {
          attemptKey,
          fields,
          bestMessage: inferBestMessage(fields) || current.bestMessage,
          source: "formdata",
          cachedAt: Date.now()
        };

        scFormDataCache.set(form, snapshot);
        form.__sc_formdata_snapshot = snapshot;
      } catch (err) {
        console.error("SC formdata snapshot error:", err);
      }
    },
    true
  );

  // -------------------------------------------------------
  // FETCH / XHR BODY SNAPSHOT FOR AJAX FORMS THAT CLEAR THE DOM
  // -------------------------------------------------------
  (function installAjaxPayloadCapture() {
    try {
      if (window.__sc_ajax_capture_installed) return;
      window.__sc_ajax_capture_installed = true;

      const originalFetch = window.fetch;
      if (typeof originalFetch === "function") {
        window.fetch = function(input, init) {
          try {
            const url = typeof input === "string" ? input : input?.url;
            const body = init?.body;

            if (url && !String(url).includes(SUPABASE_URL) && body) {
              const fields = parseBodyToFields(body, "fetch");
              if (fields.length) cacheAjaxSnapshot(url, fields);
            }
          } catch {}

          return originalFetch.apply(this, arguments);
        };
      }

      const OriginalXHR = window.XMLHttpRequest;
      if (OriginalXHR && OriginalXHR.prototype) {
        const originalOpen = OriginalXHR.prototype.open;
        const originalSend = OriginalXHR.prototype.send;

        OriginalXHR.prototype.open = function(method, url) {
          this.__sc_method = method;
          this.__sc_url = url;
          return originalOpen.apply(this, arguments);
        };

        OriginalXHR.prototype.send = function(body) {
          try {
            const url = this.__sc_url || "";
            if (url && !String(url).includes(SUPABASE_URL) && body) {
              const fields = parseBodyToFields(body, "xhr");
              if (fields.length) cacheAjaxSnapshot(url, fields);
            }
          } catch {}

          return originalSend.apply(this, arguments);
        };
      }
    } catch (err) {
      console.error("SC ajax capture install error:", err);
    }
  })();

  // -------------------------------------------------------
  // SHADOW SUBMISSION SAFETY NET (PAGE UNLOAD)
  // -------------------------------------------------------
  // v1.2.2 intentionally does not POST on beforeunload. The prior sendBeacon
  // fallback could create red CORS errors on redirects because Supabase REST
  // requires auth headers and browsers treat unload/beacon requests differently.
  // We rely on submit/click/formdata/fetch/XHR capture, which fires before unload.

  // -------------------------------------------------------
  // FIRE PAGEVIEW + INIT RULES
  // -------------------------------------------------------
  
  (async function () {
    await resolveClientUUID();
    sendEvent("pageview");
    autoDetectSuccessPage();
    checkSupabaseConversionRules();
  })();
  
  // -------------------------------------------------------
  // EXPOSE DEBUG INFO
  // -------------------------------------------------------
  window.SC = {
    version: "1.2.2",
    client: CLIENT_ID,
	client_id: SC_CLIENT_UUID,
    visitor: visitorId,
    session: sessionId,
    sendEvent,
    // helpful in console debugging
    _identity: identity
  };
})();
