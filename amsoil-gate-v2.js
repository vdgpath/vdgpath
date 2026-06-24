(function () {
  console.log("AMSOIL Gate Loaded");

  const MODAL_ID = "amsoil-lead-modal";
  const DEST_KEY = "amsoilDestination";

  function createModal() {
    if (document.getElementById(MODAL_ID)) {
      console.log("Modal already exists");
      return;
    }

    console.log("Creating modal");

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

        <p>
          Enter your information below to continue to the AMSOIL product page.
        </p>

        <iframe
          src="/amsoil-lead-form/"
          title="AMSOIL Lead Form">
        </iframe>

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

      let link = e.target.closest("a[href]");

      if (!link) {
        const elements = document.elementsFromPoint(
          e.clientX,
          e.clientY
        );

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

      console.log(
        "Click detected:",
        link ? link.href : "No link found"
      );

      if (!link || !link.href) {
        return;
      }

      if (link.href.indexOf("amsoil.com") === -1) {
        return;
      }

      console.log(
        "AMSOIL link intercepted:",
        link.href
      );

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

    const destination =
      sessionStorage.getItem(DEST_KEY);

    console.log(
      "Retrieved destination:",
      destination
    );

    window.dataLayer =
      window.dataLayer || [];

    window.dataLayer.push({
      event: "amsoil_lead_submit",
      destination_url: destination
    });

    console.log(
      "amsoil_lead_submit pushed"
    );

    if (destination) {
      console.log(
        "Redirecting to:",
        destination
      );

      window.location.href = destination;
    } else {
      console.error(
        "No destination URL found"
      );
    }
  };
})();