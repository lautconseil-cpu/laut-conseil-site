/* ============================================================
   LAUT Conseil — main.js
   1. Menu mobile (hamburger)
   2. Header collant : état "is-stuck"
   3. Apparition au défilement
   4. Compteurs chiffrés
   ============================================================ */

(function () {
  "use strict";

  var reduceMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* --------------------------------------------------------
     1. Menu mobile
     -------------------------------------------------------- */
  function initMobileNav() {
    var burger = document.querySelector("[data-burger]");
    var panel = document.querySelector("[data-mobile-nav]");
    if (!burger || !panel) return;

    function close() {
      burger.setAttribute("aria-expanded", "false");
      panel.classList.remove("is-open");
    }

    burger.addEventListener("click", function () {
      var open = burger.getAttribute("aria-expanded") === "true";
      burger.setAttribute("aria-expanded", String(!open));
      panel.classList.toggle("is-open", !open);
    });

    // fermer après un clic sur un lien
    panel.addEventListener("click", function (e) {
      if (e.target.closest("a")) close();
    });

    // fermer avec Échap
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });

    // fermer si on repasse en desktop
    var mq = window.matchMedia("(min-width: 64rem)");
    var onChange = function (e) {
      if (e.matches) close();
    };
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }

  /* --------------------------------------------------------
     2. Header collant
     -------------------------------------------------------- */
  function initStickyHeader() {
    var header = document.querySelector("[data-header]");
    if (!header) return;

    var ticking = false;
    function update() {
      header.classList.toggle("is-stuck", window.scrollY > 12);
      ticking = false;
    }
    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          window.requestAnimationFrame(update);
          ticking = true;
        }
      },
      { passive: true }
    );
    update();
  }

  /* --------------------------------------------------------
     3. Apparition au défilement + compteurs
     Vérification déterministe liée au défilement plutôt qu'un
     IntersectionObserver : pas de risque de contenu qui reste
     invisible si l'observateur ne se déclenche jamais.
     -------------------------------------------------------- */
  var watched = [];
  var ticking = false;

  function revealAll() {
    document.querySelectorAll(".reveal").forEach(function (el) {
      el.classList.add("is-visible");
    });
    document.querySelectorAll("[data-count]").forEach(setFinalCount);
  }

  /* Un élément est « atteint » dès que son haut passe sous la ligne de
     déclenchement. On ne teste pas son bas : sinon un saut d'ancre ou un
     défilement rapide le ferait franchir la fenêtre entre deux mesures,
     et il resterait invisible définitivement. */
  function inView(el, ratio) {
    var rect = el.getBoundingClientRect();
    var limit = (window.innerHeight || document.documentElement.clientHeight) * ratio;
    return rect.top < limit;
  }

  /* Quand l'onglet est masqué, le navigateur gèle la timeline d'animation :
     une animation qui démarre à opacity:0 resterait bloquée sur son image de
     départ, donc invisible. On ne déclenche donc rien tant que le document
     n'est pas visible — le contenu s'affiche alors normalement, sans effet. */
  function check() {
    ticking = false;
    if (document.hidden) return;
    for (var i = watched.length - 1; i >= 0; i--) {
      var item = watched[i];
      if (!inView(item.el, item.ratio)) continue;
      item.run(item.el);
      watched.splice(i, 1);
    }
  }

  function requestCheck() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(check);
  }

  function watch(el, ratio, run) {
    watched.push({ el: el, ratio: ratio, run: run });
  }

  function initScrollEffects() {
    var reveals = document.querySelectorAll(".reveal");
    var counters = document.querySelectorAll("[data-count]");
    if (!reveals.length && !counters.length) return;

    if (reduceMotion) {
      revealAll();
      return;
    }

    reveals.forEach(function (el) {
      watch(el, 0.94, function (node) {
        node.classList.add("is-visible");
      });
    });

    counters.forEach(function (el) {
      watch(el, 0.85, runCounter);
    });

    window.addEventListener("scroll", requestCheck, { passive: true });
    window.addEventListener("resize", requestCheck);
    window.addEventListener("load", requestCheck);
    document.addEventListener("visibilitychange", requestCheck);
    check();
  }

  /* --------------------------------------------------------
     4. Compteurs
     data-count="45" data-prefix="+" data-suffix="%"
     -------------------------------------------------------- */
  function setFinalCount(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    if (isNaN(target)) return;
    el.textContent =
      (el.getAttribute("data-prefix") || "") + target + (el.getAttribute("data-suffix") || "");
  }

  function runCounter(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var prefix = el.getAttribute("data-prefix") || "";
    var suffix = el.getAttribute("data-suffix") || "";

    if (reduceMotion || isNaN(target)) {
      setFinalCount(el);
      return;
    }

    var duration = 900;
    var start = null;

    function frame(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + Math.round(target * eased) + suffix;
      if (p < 1) window.requestAnimationFrame(frame);
    }
    window.requestAnimationFrame(frame);
  }

  /* --------------------------------------------------------
     5. Filtres du portfolio
     Les cartes portent data-cat ; les boutons data-filter.
     Sans JS, tout reste affiché : aucun contenu n'est perdu.
     -------------------------------------------------------- */
  function initFilters() {
    var bar = document.querySelector("[data-filters]");
    if (!bar) return;

    var buttons = bar.querySelectorAll("[data-filter]");
    var items = document.querySelectorAll("[data-cat]");

    bar.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-filter]");
      if (!btn) return;

      var wanted = btn.getAttribute("data-filter");

      buttons.forEach(function (b) {
        b.setAttribute("aria-pressed", String(b === btn));
      });

      items.forEach(function (item) {
        var cats = (item.getAttribute("data-cat") || "").split(" ");
        var show = wanted === "tous" || cats.indexOf(wanted) !== -1;
        item.hidden = !show;
      });
    });
  }

  /* --------------------------------------------------------
     6. Comparateur avant / après
     Un <input type="range"> pilote la largeur du calque « après ».
     Accessible au clavier, et lisible même sans JS.
     -------------------------------------------------------- */
  function initBeforeAfter() {
    document.querySelectorAll("[data-ba]").forEach(function (wrap) {
      var range = wrap.querySelector(".ba__range");
      var after = wrap.querySelector(".ba__after");
      var handle = wrap.querySelector(".ba__handle");
      if (!range || !after || !handle) return;

      function apply() {
        var v = Number(range.value);
        after.style.clipPath = "inset(0 0 0 " + v + "%)";
        handle.style.left = v + "%";
      }
      range.addEventListener("input", apply);
      apply();
    });
  }

  /* ==========================================================
     CONFIGURATION — à renseigner avant mise en ligne
     ========================================================== */

  /* Endpoint Formspree du formulaire de contact. Les messages arrivent dans la
     boîte plautie.pro@gmail.com déclarée sur le compte Formspree.
     Si cette valeur est vidée, le formulaire n'affiche PAS de faux succès :
     il invite explicitement à écrire ou à appeler. */
  var CONTACT_ENDPOINT = "https://formspree.io/f/moeaokov";

  /* TODO (facultatif) : renseigner l'URL d'un vrai système de réservation.
     Tant qu'elle est vide, les boutons « Réserver un créneau » et
     « Échanger 15 min » ouvrent un e-mail pré-rempli — jamais un lien mort. */
  var BOOKING_URL = "";

  var CONTACT_EMAIL = "plautie.pro@gmail.com";

  /* --------------------------------------------------------
     7. Boutons de réservation
     -------------------------------------------------------- */
  function initBooking() {
    if (!BOOKING_URL) return; // le repli mailto est déjà dans le HTML
    document.querySelectorAll("[data-booking]").forEach(function (a) {
      a.setAttribute("href", BOOKING_URL);
      a.setAttribute("rel", "noopener");
      a.setAttribute("target", "_blank");
    });
  }

  /* --------------------------------------------------------
     8. Formulaire de contact
     Validation accessible, état de chargement, confirmation.
     -------------------------------------------------------- */
  function initContactForm() {
    var form = document.querySelector("[data-contact-form]");
    if (!form) return;

    var statusBox = form.querySelector("[data-form-status]");
    var submit = form.querySelector("[data-submit]");
    var submitLabel = submit ? submit.querySelector("[data-submit-label]") : null;
    var honeypot = form.querySelector("[data-honeypot]");

    var RE_EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
    /* numéro français : 0X XX XX XX XX, +33X…, espaces, points ou tirets tolérés */
    var RE_TEL = /^(?:(?:\+|00)33[\s.-]?(?:\(0\)[\s.-]?)?|0)[1-9](?:[\s.-]?\d{2}){4}$/;

    function showError(field, message) {
      var input = field.querySelector("input, textarea, select");
      var box = field.querySelector("[data-error]");
      if (!input || !box) return;
      input.setAttribute("aria-invalid", "true");
      box.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5M12 16.2h.01"/></svg>' +
        message;
    }

    function clearError(field) {
      var input = field.querySelector("input, textarea, select");
      var box = field.querySelector("[data-error]");
      if (input) input.removeAttribute("aria-invalid");
      if (box) box.textContent = "";
    }

    function validate() {
      var firstBad = null;
      form.querySelectorAll("[data-field]").forEach(function (field) {
        var input = field.querySelector("input, textarea, select");
        if (!input) return;
        clearError(field);

        var value = (input.value || "").trim();
        var required = input.hasAttribute("required");
        var problem = "";

        if (required && !value) {
          problem = "Ce champ est obligatoire.";
        } else if (value && input.type === "email" && !RE_EMAIL.test(value)) {
          problem = "Adresse e-mail invalide. Exemple : nom@domaine.fr";
        } else if (value && input.type === "tel" && !RE_TEL.test(value)) {
          problem = "Numéro invalide. Format attendu : 06 12 34 56 78";
        }

        if (problem) {
          showError(field, problem);
          if (!firstBad) firstBad = input;
        }
      });

      if (firstBad) firstBad.focus();
      return !firstBad;
    }

    function setStatus(kind, html) {
      if (!statusBox) return;
      if (!kind) {
        statusBox.className = "form-status";
        statusBox.hidden = true;
        statusBox.innerHTML = "";
        return;
      }
      statusBox.hidden = false;
      statusBox.className = "form-status form-status--" + kind;
      statusBox.innerHTML = html;
    }

    function busy(on) {
      if (!submit) return;
      submit.setAttribute("aria-busy", String(on));
      submit.disabled = on;
      if (submitLabel) submitLabel.textContent = on ? "Envoi en cours…" : "Envoyer ma demande";
    }

    function mailtoFallback() {
      var d = new FormData(form);
      var corps =
        "Nom : " + (d.get("nom") || "") + "\n" +
        "Entreprise : " + (d.get("entreprise") || "") + "\n" +
        "E-mail : " + (d.get("email") || "") + "\n" +
        "Téléphone : " + (d.get("telephone") || "") + "\n" +
        "Besoin : " + (d.get("besoin") || "") + "\n\n" +
        (d.get("message") || "");
      return (
        "mailto:" + CONTACT_EMAIL +
        "?subject=" + encodeURIComponent("Demande via le site — " + (d.get("nom") || "")) +
        "&body=" + encodeURIComponent(corps)
      );
    }

    function success() {
      form.innerHTML =
        '<div class="form-success" role="status">' +
        '<span class="form-success__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg></span>' +
        "<h3>Merci pour votre message.</h3>" +
        "<p>Je reviendrai vers vous rapidement.</p>" +
        "</div>";
      form.querySelector(".form-success").focus &&
        form.querySelector(".form-success").setAttribute("tabindex", "-1");
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      // piège à robots : rempli = requête ignorée, sans le dire
      if (honeypot && honeypot.value) return;

      setStatus(null);
      if (!validate()) {
        setStatus(
          "error",
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5M12 16.2h.01"/></svg>' +
            "<span>Quelques champs doivent être corrigés avant l’envoi.</span>"
        );
        return;
      }

      // Endpoint non configuré : on le dit franchement plutôt que de simuler.
      if (!CONTACT_ENDPOINT) {
        console.warn(
          "[LAUT Conseil] CONTACT_ENDPOINT n'est pas renseigné dans assets/js/main.js — le formulaire ne peut pas envoyer."
        );
        setStatus(
          "error",
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5M12 16.2h.01"/></svg>' +
            "<span>L’envoi automatique n’est pas encore activé sur ce site. " +
            '<a href="' + mailtoFallback() + '">Ouvrir le message dans votre messagerie</a> ' +
            'ou appelez le <a href="tel:+33664917221">06 64 91 72 21</a>.</span>'
        );
        return;
      }

      busy(true);
      fetch(CONTACT_ENDPOINT, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new FormData(form)
      })
        .then(function (r) {
          if (!r.ok) throw new Error("HTTP " + r.status);
          success();
        })
        .catch(function () {
          busy(false);
          setStatus(
            "error",
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5M12 16.2h.01"/></svg>' +
              "<span>L’envoi a échoué. " +
              '<a href="' + mailtoFallback() + '">Ouvrir le message dans votre messagerie</a> ' +
              'ou appelez le <a href="tel:+33664917221">06 64 91 72 21</a>.</span>'
          );
        });
    });

    // on efface l'erreur dès que l'utilisateur corrige
    form.addEventListener("input", function (e) {
      var field = e.target.closest("[data-field]");
      if (field) clearError(field);
    });
  }

  /* -------------------------------------------------------- */
  function init() {
    initMobileNav();
    initStickyHeader();
    initScrollEffects();
    initFilters();
    initBeforeAfter();
    initBooking();
    initContactForm();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
