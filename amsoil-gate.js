(function () {
  console.log("AMSOIL Gate Loaded");

  const MODAL_ID = "amsoil-lead-modal";
  const DEST_KEY = "amsoilDestination";

  function createModal() {
    console.log("Creating modal");

    if (document.getElementById(MODAL_ID)) {
      console.log("Modal already exists");
      return;
    }

    const style = document.createElement("style");
    style.textContent = `
      #amsoil-lead-modal {
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,.65);
        z-index: 999999;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }

      #amsoil-lead-modal .amsoil-modal-box {
        background: #fff;
        width: min(520px, 100%);
        border-radius: 12px;
        padding: 28px;
        position: relative;
        box-shadow: 0 20px 60px rgba(0,0,0,.35);
      }

      #amsoil-lead-modal .amsoil-close {
        position: absolute;
        top: 10px;
        right: 14px;
        border: 0;
        background: transparent;
        font-size: 24px;
        cursor: pointer;
      }
    `;
    document.head.appendChild(style);

    const modal = document.createElement("div");
    modal.id = MODAL_ID;

    modal.innerHTML = `
      <div class="amsoil-modal-box">
        <button type="button" class="amsoil-close">&times;</button>

        <h2>Join Our AMSOIL Team</h2>
        <p>Enter your information below to continue.</p>

        <div id="amsoil-gravity-form-holder">
          PUT GRAVITY FORM HERE
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector(".amsoil-close").addEventListener("click", function () {
      console.log("Modal closed");
      modal.style.display = "none";
    });

    console.log("Modal created successfully");
  }

  function openModal(destinationUrl) {
    console.log("Opening modal");
    console.log("Destination URL:", destinationUrl);

    sessionStorage.setItem(DEST_KEY, destinationUrl);

    createModal();

    const modal = document.getElementById(MODAL_ID);

    if (!modal) {
      console.error("Modal not found");
      return;
    }

    modal.style.display = "flex";

    console.log("Modal displayed");
  }

  document.addEventListener(
    "click",
    function (e) {
      const link = e.target.closest("a[href]");

      if (!link) return;

      console.log("Link clicked:", link.href);

      if (link.href.indexOf("amsoil.com") === -1) {
        return;
      }

      console.log("AMSOIL link intercepted");

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      openModal(link.href);

      return false;
    },
    true
  );

  window.amsoilLeadSubmitted = function () {
    console.log("Gravity Form Submitted");

    const destination = sessionStorage.getItem(DEST_KEY);

    console.log("Retrieved destination:", destination);

    window.dataLayer = window.dataLayer || [];

    dataLayer.push({
      event: "amsoil_lead_submit",
      destination_url: destination
    });

    console.log("amsoil_lead_submit pushed");

    if (destination) {
      console.log("Redirecting to:", destination);

      window.location.href = destination;
    } else {
      console.error("No destination URL found in sessionStorage");
    }
  };
})();