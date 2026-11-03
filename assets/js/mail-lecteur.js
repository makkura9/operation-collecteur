// Lecture d'un message de MontriveMail et ouverture des liens dans un faux navigateur.
//
// - creerLecteur(mail, { auClicLien }) : fabrique la vue d'un message (adresse de l'expéditeur visible,
//   adresse réelle de chaque lien dans la barre d'état au survol).
// - ouvrirPageDuLien(lien) : ouvre la page visée dans un faux navigateur (fausse page de connexion ou de
//   paiement, page légitime, ancien portail en HTTP). Les formulaires n'envoient RIEN : ils affichent
//   un message pédagogique.

import { chargerJson, creer, typographie } from "./chargeur.js";
import { creerFauxNavigateur, decouperAdresse } from "./faux-navigateur.js";
import { construirePage } from "./agence.js";

const formatComplet = new Intl.DateTimeFormat("fr-CH", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
const formatCourt = new Intl.DateTimeFormat("fr-CH", { day: "numeric", month: "short" });

export function dateComplete(iso) { return formatComplet.format(new Date(iso)).replace(",", ""); }
export function dateCourte(iso) { return formatCourt.format(new Date(iso)); }

let cacheDonnees = null;
async function donnees() {
  if (!cacheDonnees) {
    const [pages, agence] = await Promise.all([chargerJson("data/pages-fausses.json"), chargerJson("data/agence.json")]);
    cacheDonnees = { pages, agence };
  }
  return cacheDonnees;
}

/* ---------- Lecture d'un message ---------- */

export function creerLecteur(mail, { auClicLien } = {}) {
  const etat = creer("div", { class: "mm-etat", "aria-live": "polite" });
  const corps = creer("div", { class: "mm-corps-mail" });
  for (const paragraphe of mail.corps) {
    const ligne = creer("p");
    for (const morceau of paragraphe.split(/(\[\[l\d+\]\])/)) {
      const m = /^\[\[(l\d+)\]\]$/.exec(morceau);
      if (m) {
        const lien = mail.liens[m[1]];
        const a = creer("a", { href: "#", class: "mm-lien", "data-lien-reel": lien.reel, texte: lien.texte });
        a.addEventListener("click", (evenement) => {
          evenement.preventDefault();
          if (auClicLien) auClicLien(lien, a);
        });
        ligne.append(a);
      } else if (morceau) {
        ligne.append(typographie(morceau));
      }
    }
    corps.append(ligne);
  }

  const lecteur = creer("article", { class: "mm-lecteur" }, [
    creer("h2", { class: "mm-objet", texte: typographie(mail.objet) }),
    creer("dl", { class: "mm-entete-mail" }, [
      creer("dt", { texte: "De" }),
      creer("dd", {}, [creer("strong", { texte: mail.de.nom }), " ", creer("span", { class: "mm-adresse", texte: `<${mail.de.adresse}>` })]),
      creer("dt", { texte: "À" }),
      creer("dd", { texte: mail.a }),
      creer("dt", { texte: "Date" }),
      creer("dd", { texte: dateComplete(mail.date) }),
    ]),
    corps,
    etat,
  ]);

  // Survol (souris) ou focus (touche Tab) d'un lien : l'adresse réelle s'affiche en bas du message.
  const montrer = (e) => {
    const cible = e.target.closest && e.target.closest("[data-lien-reel]");
    if (cible) { etat.textContent = cible.dataset.lienReel; etat.classList.add("visible"); }
  };
  const cacher = () => { etat.classList.remove("visible"); etat.textContent = ""; };
  lecteur.addEventListener("mouseover", montrer);
  lecteur.addEventListener("focusin", montrer);
  lecteur.addEventListener("mouseout", cacher);
  lecteur.addEventListener("focusout", cacher);
  return lecteur;
}

/* ---------- Pages ouvertes par les liens ---------- */

function messageFinal(def, adresse, fermer, neutre = false) {
  const domaine = decouperAdresse(adresse).domaine;
  const boite = creer("div", { class: "pf-message" + (neutre ? " neutre" : "") });
  if (neutre) {
    boite.append(creer("h2", { texte: "Simulation" }), creer("p", { texte: def }));
  } else {
    boite.append(
      creer("h2", { texte: typographie(def.titre) }),
      creer("p", { class: "pf-gras", texte: typographie(def.texte) }),
      creer("ul", {}, def.conseils.map((c) => creer("li", { texte: typographie(c.replace("{domaine}", domaine)) }))),
    );
  }
  boite.append(creer("p", {}, [creer("button", { type: "button", class: "bouton", onclick: fermer, texte: "Retour à la messagerie" })]));
  return boite;
}

function champsFormulaire(def) {
  return def.champs.map((c) => creer("label", { class: "pf-champ" }, [
    c.libelle,
    creer("input", { type: c.type === "password" ? "password" : "text", name: c.nom, autocomplete: "off", placeholder: c.placeholder || null, spellcheck: "false" }),
  ]));
}

function creerPageFausse(def, surEnvoi) {
  const formulaire = creer("form", { class: "pf-formulaire", novalidate: true, autocomplete: "off" }, [
    ...champsFormulaire(def),
    creer("button", { type: "submit", class: "pf-bouton", texte: def.bouton }),
  ]);
  formulaire.addEventListener("submit", (e) => { e.preventDefault(); surEnvoi(); });
  return creer("div", { class: "pf-site", style: `--marque:${def.couleur}` }, [
    creer("header", { class: "pf-entete", texte: def.marque }),
    creer("div", { class: "pf-contenu" }, [
      creer("h1", { texte: typographie(def.titre) }),
      def.texte ? creer("p", { texte: typographie(def.texte) }) : null,
      def.montant ? creer("p", { class: "pf-montant", texte: `Montant : ${def.montant}` }) : null,
      formulaire,
    ]),
  ]);
}

/** Ouvre la page visée par un lien, dans un faux navigateur affiché au-dessus du message. */
export async function ouvrirPageDuLien(lien, declencheur) {
  const { pages, agence } = await donnees();
  const fond = creer("div", { class: "pf-fond", role: "dialog", "aria-modal": "true", "aria-label": "Page web simulée" });
  const fermer = () => {
    document.removeEventListener("keydown", auClavier);
    fond.remove();
    if (declencheur && declencheur.focus) declencheur.focus();
  };
  const auClavier = (e) => { if (e.key === "Escape") fermer(); };

  let navigateur;
  let securise = "https";
  let titre = "Page simulée";
  let contenu;

  if (lien.page === "legitime") {
    titre = pages.page_legitime.titre;
    contenu = creer("div", { class: "pf-site", style: "--marque:#4a5f8a" }, [
      creer("header", { class: "pf-entete", texte: decouperAdresse(lien.reel).domaine }),
      creer("div", { class: "pf-contenu" }, [creer("h1", { texte: pages.page_legitime.titre }), creer("p", { texte: typographie(pages.page_legitime.texte) })]),
    ]);
  } else if (lien.page === "portail-http") {
    securise = "http";
    const p = pages.portail_http;
    titre = `${p.titre} — ${p.marque}`;
    contenu = creerPageFausse(
      { marque: `${p.marque} · ${p.sous_titre}`, couleur: "#7a4a1a", titre: p.titre, texte: p.texte, bouton: "Se connecter",
        champs: [{ nom: "identifiant", libelle: "Adresse e-mail", type: "text" }, { nom: "secret", libelle: "Mot de passe", type: "password" }] },
      () => navigateur.naviguer(lien.reel, { titre, securise, contenu: messageFinal(p.message, lien.reel, fermer, true) }),
    );
  } else if (lien.page === "connexion-agence") {
    titre = `Espace client — ${agence.marque}`;
    contenu = construirePage(agence, "espace-client", {
      adresse: () => lien.reel,
      aller: () => {},
      connexion: () => navigateur.naviguer(lien.reel, { titre, securise, contenu: messageFinal(pages.message_final, lien.reel, fermer) }),
    });
  } else {
    const def = pages.pages[lien.page];
    titre = `${def.titre} — ${def.marque}`;
    contenu = creerPageFausse(def, () => navigateur.naviguer(lien.reel, { titre, securise, contenu: messageFinal(pages.message_final, lien.reel, fermer) }));
  }

  navigateur = creerFauxNavigateur({ url: lien.reel, titre, contenu, securise, etiquetteAccessible: "Page web simulée" });
  fond.append(creer("div", { class: "pf-boite" }, [
    creer("p", { class: "pf-bandeau", texte: typographie(pages.bandeau) }),
    navigateur.element,
    creer("p", { class: "pf-pied" }, [creer("button", { type: "button", class: "bouton secondaire", onclick: fermer, texte: "Fermer la page" })]),
  ]));
  fond.addEventListener("click", (e) => { if (e.target === fond) fermer(); });
  document.addEventListener("keydown", auClavier);
  document.body.append(fond);
  fond.querySelector("input, button").focus({ preventScroll: true });
}
