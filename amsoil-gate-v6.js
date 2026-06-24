(function () {
  console.log("AMSOIL Gate v6 Loaded");

  const MODAL_ID = "amsoil-lead-modal";
  const DEST_KEY = "amsoilDestination";
  const LEAD_CAPTURED_KEY = "amsoilLeadCaptured";
  const DISMISSALS_KEY = "amsoilGateDismissals";
  const DISMISSAL_EXPIRES_KEY = "amsoilGateDismissalExpires";

  const FORM_URL = "/amsoil-lead-form/";
  const SUBMITTED_PARAM = "amsoil_submitted=1";

  const MAX_DISMISSALS = 2;
  const DISMISSAL_DAYS = 7;

  (function resetForTesting() {
    const params = new URLSearchParams(window.location.search);

    if (params.get("amsoil_reset") === "1") {
      console.log("AMSOIL Gate: reset triggered");
      localStorage.removeItem(LEAD_CAPTURED_KEY);
      localStorage.removeItem(DISMISSALS_KEY);
      localStorage.removeItem(DISMISSAL_EXPIRES_KEY);
      sessionStorage.removeItem(DEST_KEY);
    }
  })();

  function now() {
    return Date.now();
  }

  function getDismissals() {
    return parseInt(localStorage.getItem(DISMISSALS_KEY) || "0", 10);
  }

  function resetDismissalsIfExpired() {
    const expires = parseInt(localStorage.getItem(DISMISSAL_EXPIRES_KEY) || "0", 10);
    if (expires && now() > expires) {
      localStorage.removeItem(DISMISSALS_KEY);
      localStorage.removeItem(DISMISSAL_EXPIRES_KEY);
    }
  }

  function shouldBypassGate() {
    resetDismissalsIfExpired();

    if (localStorage.getItem(LEAD_CAPTURED_KEY) === "1") return true;
    if (getDismissals() >= MAX_DISMISSALS) return true;

    return false;
  }

  function recordDismissal() {
    const count = getDismissals() + 1;
    const expires = now() + DISMISSAL_DAYS * 24 * 60 * 60 * 1000;

    localStorage.setItem(DISMISSALS_KEY, String(count));
    localStorage.setItem(DISMISSAL_EXPIRES_KEY, String(expires));

    console.log("AMSOIL Gate dismissed:", count, "of", MAX_DISMISSALS);
  }

  function pushAmsoilClick(destinationUrl) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "amsoil_click_v2",
      destination_url: destinationUrl
    });

    console.log("AMSOIL Gate: amsoil_click_v2 pushed", destinationUrl);
  }

  function closeModal(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    }

    if (closeModal.locked) return false;
    closeModal.locked = true;

    console.log("AMSOIL Gate: modal closed");

    recordDismissal();

    const modal = document.getElementById(MODAL_ID);
    if (modal) {
      modal.style.display = "none";
      modal.classList.remove("amsoil-submitting");
    }

    setTimeout(function () {
      closeModal.locked = false;
    }, 500);

    return false;
  }

  function createModal() {
    if (document.getElementById(MODAL_ID)) return;

    const style = document.createElement("style");
    style.textContent = `
      #amsoil-lead-modal {
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,.7);
        z-index: 999999;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }

      #amsoil-lead-modal .amsoil-modal-box {
        background: #fff;
        width: min(600px, 95%);
        max-height: 90vh;
        overflow-y: auto;
        border-radius: 12px;
        padding: 30px;
        position: relative;
        box-shadow: 0 20px 60px rgba(0,0,0,.35);
      }

      #amsoil-lead-modal .amsoil-close {
        position: fixed;
        top: 14px;
        right: 14px;
        width: 48px;
        height: 48px;
        border: 0;
        border-radius: 999px;
        background: #fff;
        color: #111;
        font-size: 34px;
        font-weight: 700;
        cursor: pointer;
        line-height: 48px;
        z-index: 10000000;
        touch-action: none;
        pointer-events: auto;
        box-shadow: 0 4px 18px rgba(0,0,0,.25);
      }

      #amsoil-lead-modal iframe {
        width: 100%;
        height: 650px;
        border: 0;
      }

      #amsoil-lead-modal .amsoil-loading-message {
        display: none;
        padding: 40px 0;
        text-align: center;
        font-size: 20px;
        font-weight: 700;
        color: #24305c;
      }

      #amsoil-lead-modal.amsoil-submitting iframe {
        display: none;
      }

      #amsoil-lead-modal.amsoil-submitting .amsoil-loading-message {
        display: block;
      }
    `;
    document.head.appendChild(style);

    const modal = document.createElement("div");
    modal.id = MODAL_ID;

    modal.innerHTML = `
      <button type="button" class="amsoil-close" aria-label="Close AMSOIL form">&times;</button>

      <div class="amsoil-modal-box">
        <h2>Join Our AMSOIL Team</h2>
        <p>Enter your information below to continue to the AMSOIL product page.</p>

        <div class="amsoil-loading-message">
          Thank you! Opening AMSOIL...
        </div>

        <iframe src="${FORM_URL}" title="AMSOIL Lead Form"></iframe>
      </div>
    `;

    document.body.appendChild(modal);

    const iframe = modal.querySelector("iframe");

    iframe.addEventListener("load", function () {
      try {
        const iframeUrl = iframe.contentWindow.location.href;
        console.log("AMSOIL Gate iframe loaded:", iframeUrl);

        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

        if (iframeDoc) {
          iframeDoc.addEventListener(
            "submit",
            function () {
              console.log("AMSOIL Gate: iframe form submit detected");
              modal.classList.add("amsoil-submitting");
            },
            true
          );

          const submitButtons = iframeDoc.querySelectorAll(
            "button[type='submit'], input[type='submit'], .gform_button"
          );

          submitButtons.forEach(function (btn) {
            btn.addEventListener("click", function () {
              console.log("AMSOIL Gate: submit button clicked");
              modal.classList.add("amsoil-submitting");
            });
          });
        }

        if (iframeUrl.indexOf(SUBMITTED_PARAM) > -1) {
          console.log("AMSOIL Gate: form submission detected");
          window.amsoilLeadSubmitted();
        }
      } catch (err) {
        console.warn("AMSOIL Gate: could not read iframe", err);
      }
    });

    const closeBtn = modal.querySelector(".amsoil-close");

    ["click", "touchstart", "touchend", "pointerdown", "pointerup"].forEach(function (evt) {
      closeBtn.addEventListener(evt, closeModal, { passive: false });
    });

    console.log("AMSOIL Gate: modal created");
  }

  function openModal(destinationUrl) {
    console.log("AMSOIL Gate: opening modal for", destinationUrl);

    sessionStorage.setItem(DEST_KEY, destinationUrl);
    createModal();

    const modal = document.getElementById(MODAL_ID);
    if (!modal) return;

    modal.classList.remove("amsoil-submitting");
    modal.style.display = "flex";
  }

  function findClickedLink(e) {
    let link = e.target.closest ? e.target.closest("a[href]") : null;

    if (!link && document.elementsFromPoint) {
      const elements = document.elementsFromPoint(e.clientX, e.clientY);

      for (let i = 0; i < elements.length; i++) {
        const possibleLink = elements[i].closest
          ? elements[i].closest("a[href]")
          : null;

        if (possibleLink) {
          link = possibleLink;
          break;
        }
      }
    }

    return link;
  }

  document.addEventListener(
    "click",
    function (e) {
      const link = findClickedLink(e);

      console.log("AMSOIL Gate click:", link ? link.href : "No link found");

      if (!link || !link.href) return;
      if (link.href.indexOf("amsoil.com") === -1) return;

      console.log("AMSOIL Gate: AMSOIL link detected", link.href);

      pushAmsoilClick(link.href);

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      if (shouldBypassGate()) {
        console.log("AMSOIL Gate: bypassing gate and opening new tab");
        window.open(link.href, "_blank", "noopener,noreferrer");
        return false;
      }

      openModal(link.href);

      return false;
    },
    true
  );

  window.amsoilLeadSubmitted = function () {
    console.log("AMSOIL Gate: lead submitted");

    const destination = sessionStorage.getItem(DEST_KEY);

    localStorage.setItem(LEAD_CAPTURED_KEY, "1");
    localStorage.removeItem(DISMISSALS_KEY);
    localStorage.removeItem(DISMISSAL_EXPIRES_KEY);

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "amsoil_lead_submit",
      destination_url: destination
    });

    console.log("AMSOIL Gate: amsoil_lead_submit pushed");
    console.log("AMSOIL Gate: opening new tab to", destination);

    const modal = document.getElementById(MODAL_ID);
    if (modal) {
      modal.style.display = "none";
      modal.classList.remove("amsoil-submitting");
    }

    if (destination) {
      window.open(destination, "_blank", "noopener,noreferrer");
    } else {
      console.error("AMSOIL Gate: no destination found");
    }
  };
})();