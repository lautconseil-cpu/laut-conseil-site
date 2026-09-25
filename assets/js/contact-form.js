/* ============================================================
   LAUT Conseil — contact-form.js (refonte)
   Module du formulaire de contact repris à l'identique de l'ancien main.js :
   même endpoint Formspree, même validation, même piège à robots,
   même repli mailto en cas d'échec. Chargé uniquement sur contact.html.
   ============================================================ */
(function () {
  "use strict";

  /* Endpoint Formspree du formulaire de contact. Les messages arrivent dans la
     boîte plautie.pro@gmail.com déclarée sur le compte Formspree.
     Si cette valeur est vidée, le formulaire n'affiche PAS de faux succès :
     il invite explicitement à écrire ou à appeler. */
  var CONTACT_ENDPOINT = "https://formspree.io/f/moeaokov";

  var CONTACT_EMAIL = "plautie.pro@gmail.com";

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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initContactForm);
  } else {
    initContactForm();
  }
})();
