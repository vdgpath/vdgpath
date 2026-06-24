(function () {
  console.log("AMSOIL Gate v3 Loaded");

  const MODAL_ID = "amsoil-lead-modal";
  const DEST_KEY = "amsoilDestination";
  const LEAD_CAPTURED_KEY = "amsoilLeadCaptured";
  const DISMISSALS_KEY = "amsoilGateDismissals";
  const DISMISSAL_EXPIRES_KEY = "amsoilGateDismissalExpires";

  const FORM_URL = "/amsoil-lead-form/";
  const SUBMITTED_PARAM = "amsoil_submitted=1";

  const MAX_DISMISSALS = 2;
  const DISMISSAL_DAYS = 7;

  function now() {
    return Date.now();
  }

  function getDismissals() {
    return parseInt(localStorage.getItem(DISMISSALS_KEY) || "0", 10);
  }

  function dismissalsExpired() {
    const expires = parseInt(localStorage.getItem(DISMISSAL_EXPIRES_KEY) || "0", 10);
    return expires && now() > expires;
  }

  function resetDismissalsIfExpired() {
    if (dismissalsExpired()) {
      localStorage.removeItem(DISMISSALS_KEY);
      localStorage.removeItem(DISMISSAL_EXPIRES_KEY);
      console.log("AMSOIL Gate: dismissal window expired");
    }
  }

  function shouldBypassGate() {
    resetDismissalsIfExpired();

    if (localStorage.getItem(LEAD_CAPTURED_KEY) === "1") {
      console.log("AMSOIL Gate: lead already captured, bypassing gate");
      return true;
    }

    if (getDismissals() >= MAX_DISMISSALS) {
      console.log("AMSOIL Gate: dismissal limit reached, bypassing gate");
      return true;
    }

    return false;
  }

  function recordDismissal() {
    const count = getDismissals() + 1;
    localStorage.setItem(DISMISSALS_KEY, String(count));

    const expires = now() + DISMISSAL_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISSAL_EXPIRES_KEY, String(expires));

    console.log("AMSOIL Gate dismissed:", count, "of", MAX_DISMISSALS);
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
        position: absolute;
        top: 10px;
        right: 15px;
        border: 0;
        background: transparent;
        font-size: 30px;
        cursor: pointer;
        line-height: 1;
      }

      #amsoil-lead-modal iframe {
        width: 100%;
        height: 650px;
        border: 0;
      }
    `;
    document.head.appendChild(style);

    const modal = document.createElement("div");
    modal.id = MODAL_ID;

    modal.innerHTML = `
      <div class="amsoil-modal-box">
        <button type="button" class="amsoil-close">&times;</button>

        <h2>Join Our AMSOIL Team</h2>
        <p>Enter your information below to continue to the AMSOIL product page.</p>

        <iframe src="${FORM_URL}" title="AMSOIL Lead Form"></iframe>
      </div>
    `;

    document.body.appendChild(modal);

    const iframe = modal.querySelector("iframe");

    iframe.addEventListener("load", function () {
      try {
        const iframeUrl = iframe.contentWindow.location.href;

        console.log("AMSOIL Gate iframe loaded:", iframeUrl);

        if (iframeUrl.indexOf(SUBMITTED_PARAM) > -1) {
          console.log("AMSOIL Gate: form submission detected");
          window.amsoilLeadSubmitted();
        }
      } catch (err) {
        console.warn("AMSOIL Gate: could not read iframe URL", err);
      }
    });

    modal.querySelector(".amsoil-close").addEventListener("click", function () {
      console.log("AMSOIL Gate: modal closed");
      recordDismissal();
      modal.style.display = "none";
    });

    console.log("AMSOIL Gate: modal created");
  }

  function openModal(destinationUrl) {
    console.log("AMSOIL Gate: opening modal for", destinationUrl);

    sessionStorage.setItem(DEST_KEY, destinationUrl);
    createModal();

    const modal = document.getElementById(MODAL_ID);
    if (!modal) {
      console.error("AMSOIL Gate: modal not found");
      return;
    }

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

      if (shouldBypassGate()) {
        console.log("AMSOIL Gate: allowing direct redirect");
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

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
    console.log("AMSOIL Gate: redirecting to", destination);

    if (destination) {
      window.location.href = destination;
    } else {
      console.error("AMSOIL Gate: no destination found");
    }
  };
})();