// ========== VDG PATH Tracker (PATH) v1.1.6 ==========
// Event Tracking + Identity Stitching (UNCHANGED)
// + Shadow Submissions (ADD-ON ONLY)

(function () {
  console.log(
    "%cPATH Tracking Loaded (v1.1.6)",
    "color:#4fc3f7;font-weight:bold;"
  );

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

  function shouldIncludeField(el) {
    if (!el || el.disabled) return false;

    const type = (el.type || "").toLowerCase();
    const tag = (el.tagName || "").toLowerCase();
    const name = (el.name || "").toLowerCase();

    if (["password", "file", "submit", "button", "reset", "image"].includes(type)) return false;
    if (tag === "button") return false;

    const hiddenAllowedNames = ["gclid", "gbraid", "wbraid", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
    if (type === "hidden" && !hiddenAllowedNames.includes(name)) return false;

    return true;
  }

  function getFieldValue(el) {
    const tag = (el.tagName || "").toLowerCase();
    const type = (el.type || "").toLowerCase();

    if (type === "checkbox") return el.checked ? (el.value || true) : null;
    if (type === "radio") return el.checked ? el.value : null;

    if (tag === "select") {
      if (el.multiple) {
        const vals = Array.from(el.selectedOptions || []).map((o) => (o.textContent || o.value || "").trim()).filter(Boolean);
        return vals.length ? vals : null;
      }
      return (el.selectedOptions && el.selectedOptions[0] && (el.selectedOptions[0].textContent || "").trim()) || el.value || null;
    }

    const v = typeof el.value === "string" ? el.value.trim() : el.value;
    return v || null;
  }

  function collectFormFields(form) {
    if (!form) return { fields: [], bestMessage: null };

    const fields = [];
    let bestMessage = null;
    let bestLen = 0;

    const els = form.querySelectorAll("input, textarea, select");
    els.forEach((el) => {
      if (!shouldIncludeField(el)) return;

      const value = getFieldValue(el);
      if (value == null || value === "" || (Array.isArray(value) && !value.length)) return;

      const label = getFieldLabel(el);
      const type = (el.type || el.tagName || "").toLowerCase();

      const item = {
        name: el.name || null,
        label,
        type,
        value
      };

      fields.push(item);

      const fieldHint = `${label} ${el.name || ""} ${el.id || ""}`.toLowerCase();
      const asString = Array.isArray(value) ? value.join(", ") : String(value);
      const isMessageLike =
        el.tagName === "TEXTAREA" ||
        fieldHint.includes("message") ||
        fieldHint.includes("comment") ||
        fieldHint.includes("detail") ||
        fieldHint.includes("description") ||
        fieldHint.includes("question") ||
        fieldHint.includes("help");

      if (isMessageLike && asString.length > bestLen) {
        bestMessage = asString;
        bestLen = asString.length;
      }
    });

    if (!bestMessage && fields.length) {
      const fallback = fields
        .map((f) => {
          const v = Array.isArray(f.value) ? f.value.join(", ") : f.value;
          return `${f.label}: ${v}`;
        })
        .join(" | ");
      bestMessage = fallback || null;
    }

    return { fields, bestMessage };
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
        message,
        fields
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

      message: message || null,
      fields_json: fields,
      shadow_status: shadowStatus,
      page_url: window.location.href,

      submitted_at: new Date().toISOString()
    };

    try {
      await fetch(`${SUPABASE_URL}/rest/v1/sc_shadow_submissions`, {
        method: "POST",
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
  // SHADOW SUBMISSION INTENT (ACTUAL FORM SUBMIT + CLICK FALLBACK)
  // -------------------------------------------------------
  document.addEventListener(
    "submit",
    (e) => {
      const form = e.target;
      if (!form || form.tagName !== "FORM") return;

      scSubmitIntentDetected = true;

      const formMeta = getFormMeta(form);
      const attemptKey =
        (form && form.__sc_formdata_snapshot && form.__sc_formdata_snapshot.attemptKey) ||
        getOrCreateAttemptKey(form);
      setLatestAttemptKey(attemptKey);

      if (scShadowSentForms.has(formMeta.formKey)) return;
      scShadowSentForms.add(formMeta.formKey);

      const snapshot = form && form.__sc_formdata_snapshot ? form.__sc_formdata_snapshot : collectFormFields(form);

      sendShadowSubmission({
        attemptKey,
        message: snapshot.bestMessage || scShadowMessage || null,
        formId: formMeta.formId,
        formName: formMeta.formName,
        fields: snapshot.fields,
        shadowStatus: "attempted"
      });

      scheduleUiSuccessCheck(form, formMeta);
    },
    true
  );

  document.addEventListener(
    "click",
    (e) => {
      const btn = e.target.closest(
        "button[type='submit'], input[type='submit']"
      );
      if (!btn) return;

      const form = btn.form || null;
      const formMeta = getFormMeta(form);
      const attemptKey =
        (form && form.__sc_formdata_snapshot && form.__sc_formdata_snapshot.attemptKey) ||
        getOrCreateAttemptKey(form);
      setLatestAttemptKey(attemptKey);

      scSubmitIntentDetected = true;

      if (scShadowSentForms.has(formMeta.formKey)) return;
      scShadowSentForms.add(formMeta.formKey);

      const snapshot = form && form.__sc_formdata_snapshot ? form.__sc_formdata_snapshot : collectFormFields(form);

      sendShadowSubmission({
        attemptKey,
        message: snapshot.bestMessage || scShadowMessage || null,
        formId: formMeta.formId,
        formName: formMeta.formName,
        fields: snapshot.fields,
        shadowStatus: "attempted"
      });

      scheduleUiSuccessCheck(form, formMeta);
    },
    true
  );

  // -------------------------------------------------------
  // SHADOW SUBMISSION SAFETY NET (PAGE UNLOAD)
  // -------------------------------------------------------
  window.addEventListener("beforeunload", () => {
    if (!scSubmitIntentDetected) return;

    const attemptKey = getLatestAttemptKey();

    const beaconPayload = {
      client: CLIENT_ID,
      client_id: SC_CLIENT_UUID,
      visitor_id: visitorId,
      session_id: sessionId,
      attempt_key: attemptKey,
      completeness_score: getCompletenessScore({
        email: identity.email,
        first_name: identity.first_name,
        last_name: identity.last_name,
        message: scShadowMessage || null,
        fields: []
      }),
      email: identity.email,
      first_name: identity.first_name,
      last_name: identity.last_name,
      message: scShadowMessage || null,
      fields_json: [],
      shadow_status: "attempted_unload",
      page_url: window.location.href,
      submitted_at: new Date().toISOString()
    };

    try {
      const blob = new Blob([JSON.stringify(beaconPayload)], { type: "application/json" });
      navigator.sendBeacon(`${SUPABASE_URL}/rest/v1/sc_shadow_submissions`, blob);
    } catch {}
  });

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

        const formMeta = getFormMeta(form);
        if (scShadowSentForms.has(formMeta.formKey)) return;

        const fields = [];
        for (const [name, value] of e.formData.entries()) {
          if (!name) continue;
          if (typeof value !== "string") continue;
          const v = String(value).trim();
          if (!v) continue;
          fields.push({
            name,
            label: name,
            type: "formdata",
            value: v
          });
        }

        if (!fields.length) return;

        let bestMessage = null;
        let bestLen = 0;
        fields.forEach((f) => {
          const hint = `${f.label} ${f.name}`.toLowerCase();
          const val = String(f.value);
          if (
            (hint.includes("message") ||
              hint.includes("comment") ||
              hint.includes("detail") ||
              hint.includes("description")) &&
            val.length > bestLen
          ) {
            bestMessage = val;
            bestLen = val.length;
          }
        });

        form.__sc_formdata_snapshot = {
          attemptKey,
          fields,
          bestMessage: bestMessage || fields.map((f) => `${f.label}: ${f.value}`).join(" | ")
        };
      } catch (err) {
        console.error("SC formdata snapshot error:", err);
      }
    },
    true
  );

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
    version: "1.1.6",
    client: CLIENT_ID,
	client_id: SC_CLIENT_UUID,
    visitor: visitorId,
    session: sessionId,
    sendEvent,
    // helpful in console debugging
    _identity: identity
  };
})();
