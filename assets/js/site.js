/* ============================================================
   LAUT Conseil — site.js (refonte)
   Seul comportement scripté : le menu mobile.
   Le bouton « Échanger 15 min » est un lien mailto pré-rempli
   directement dans le HTML, il fonctionne sans JavaScript.
   ============================================================ */
(function () {
  "use strict";

  var burger = document.querySelector("[data-burger]");
  var panel = document.querySelector("[data-mobile-nav]");
  if (!burger || !panel) return;

  function setOpen(open) {
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
    panel.classList.toggle("is-open", open);
    document.body.classList.toggle("menu-open", open);
  }

  burger.addEventListener("click", function () {
    setOpen(burger.getAttribute("aria-expanded") !== "true");
  });

  panel.addEventListener("click", function (e) {
    if (e.target.closest("a")) setOpen(false);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && burger.getAttribute("aria-expanded") === "true") {
      setOpen(false);
      burger.focus();
    }
  });

  var desktop = window.matchMedia("(min-width: 64rem)");
  var onChange = function (e) { if (e.matches) setOpen(false); };
  if (desktop.addEventListener) desktop.addEventListener("change", onChange);
  else if (desktop.addListener) desktop.addListener(onChange);
})();
