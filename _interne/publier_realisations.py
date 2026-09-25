#!/usr/bin/env python3
"""Régénère les blocs conditionnels de realisations.html.

Règle : une réalisation n'est publiée que si preuve, visuel ET autorisation
valent true dans _interne/realisations.json. Le bloc CV n'est publié que si
le fichier PDF existe réellement dans le dépôt.

Usage (depuis la racine du dépôt) :
    python3 _interne/publier_realisations.py
"""
import json
import os
import re
import sys

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGE = os.path.join(RACINE, "realisations.html")
REGISTRE = os.path.join(RACINE, "_interne", "realisations.json")
CV = "assets/docs/cv-pierre-lautie.pdf"

EXT = ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" '
       'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>')
DL = ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" '
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>')


def publiable(e):
    return e.get("preuve") is True and e.get("visuel") is True and e.get("autorisation") is True


def fiche_site(e, une):
    items = "".join(f"\n              <li>{x}</li>" for x in e.get("realise") or [])
    liste = f'\n            <ul class="work__done">{items}\n            </ul>' if items else ""
    besoin = f'\n            <p class="work__need">{e["besoin"]}</p>' if e.get("besoin") else ""
    lien = ""
    if e.get("url"):
        lien = (f'\n            <a class="text-link" href="{e["url"]}" target="_blank" rel="noopener" '
                f'aria-label="Voir le site de {e["nom"]} (nouvel onglet)">Voir le site{EXT}</a>')
    charge = "" if une else ' loading="lazy"'
    domaine = re.sub(r"^https?://(www\.)?|/$", "", e.get("url") or "")
    return f'''
        <article class="work{' work--feature' if une else ''}">
          <div class="work__shot"><img src="{e["capture"]}" width="1600" height="1000" alt="Page d’accueil du site {domaine}"{charge} decoding="async"></div>
          <div class="work__body">
            <h3>{e["nom"]}</h3>
            <p class="work__sector">{e["secteur"]}</p>{besoin}{liste}{lien}
          </div>
        </article>'''


def fiche_support(e, i):
    teinte = "navy on-navy" if i % 2 == 0 else "cream"
    return f'''
        <article class="support support--{teinte}">
          <h3>{e["nom"]}</h3>
          <p>{e["description"]}</p>
        </article>'''


def bloc_realisations(reg):
    sites = [e for e in reg if e["section"] == "sites" and publiable(e)]
    supports = [e for e in reg if e["section"] == "supports" and publiable(e)]
    for e in sites:
        if not e.get("capture") or not os.path.exists(os.path.join(RACINE, e["capture"])):
            sys.exit(f"Refus : capture absente pour {e['id']} ({e.get('capture')})")
    out = ""
    if sites:
        cartes = "".join(fiche_site(e, i == 0) for i, e in enumerate(sites))
        out += f'''
  <section class="section" id="sites-web">
    <div class="shell">
      <h2>Sites web</h2>
      <div class="works">{cartes}
      </div>
    </div>
  </section>
'''
    if supports:
        cartes = "".join(fiche_support(e, i) for i, e in enumerate(supports))
        out += f'''
  <section class="section section--deep" id="supports">
    <div class="shell">
      <h2>Supports et contenus</h2>
      <div class="supports">{cartes}
      </div>
    </div>
  </section>
'''
    return out, [e["id"] for e in sites + supports]


def bloc_cv():
    if not os.path.exists(os.path.join(RACINE, CV)):
        return ""
    return f'''
  <section class="section section--deep" id="cv">
    <div class="shell cv">
      <h2>Mon parcours en une page</h2>
      <a class="btn btn--line" href="{CV}" download>
        {DL}
        Télécharger le CV (PDF)
      </a>
    </div>
  </section>
'''


def remplacer(html, nom, contenu):
    motif = re.compile(rf"(<!-- {nom}:DEBUT[^>]*-->)[\s\S]*?(\n  <!-- {nom}:FIN -->)")
    if not motif.search(html):
        sys.exit(f"Marqueurs {nom} introuvables dans realisations.html")
    return motif.sub(lambda m: m.group(1) + contenu + m.group(2), html)


def main():
    reg = json.load(open(REGISTRE, encoding="utf-8"))
    html = open(PAGE, encoding="utf-8").read()
    bloc, publies = bloc_realisations(reg)
    html = remplacer(html, "REALISATIONS", bloc)
    html = remplacer(html, "CV", bloc_cv())
    open(PAGE, "w", encoding="utf-8").write(html)
    print("Réalisations publiées :", ", ".join(publies) if publies else "aucune")
    print("Bloc CV :", "publié" if bloc_cv() else f"non publié ({CV} absent)")


if __name__ == "__main__":
    main()
