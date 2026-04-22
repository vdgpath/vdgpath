// ========== VDG PATH Loader (VDG-PATH) v1.0 ==========

(function () {
  const script = document.currentScript;
  const client = script?.getAttribute("data-sc-client");

  if (!client) return;

  const sc = document.createElement("script");
  sc.src = "https://cdn.jsdelivr.net/gh/vdgpath/vdg-path@v1.1.6/vdg-path-v1.1.6.js";
  sc.defer = true;
  sc.setAttribute("data-sc-client", client);

  document.head.appendChild(sc);
})();
