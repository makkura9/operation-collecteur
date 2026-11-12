// MontriveMail : boîte de réception de Robin (25 messages). Contenu : data/mails.json.
// Page : montrivemail/index.html ; un message précis s'ouvre avec #mail=identifiant.

import { chargerJson, creer, typographie } from "./chargeur.js";
import * as Progression from "./progression.js";
import { verrouillerPage } from "./verrou.js";
import { creerLecteur, ouvrirPageDuLien, dateCourte } from "./mail-lecteur.js";

let mails = [];
const lus = new Set();              // messages ouverts pendant la visite (mémoire uniquement)
let idSelectionne = null;

const liste = () => document.getElementById("liste-messages");
const lecture = () => document.getElementById("lecture");
const appli = () => document.getElementById("mm-app");

function extrait(mail) {
  const texte = mail.corps.find((p) => !p.startsWith("[[")) || "";
  return texte.length > 70 ? texte.slice(0, 68) + "…" : texte;
}

function dessinerListe() {
  liste().textContent = "";
  for (const mail of mails) {
    const nonLu = !mail.lu && !lus.has(mail.id);
    const bouton = creer("button", {
      type: "button", class: "mm-ligne" + (nonLu ? " non-lu" : "") + (mail.id === idSelectionne ? " actif" : ""),
      "data-id": mail.id, "aria-current": mail.id === idSelectionne ? "true" : null,
      onclick: () => { window.location.hash = "mail=" + mail.id; },
    }, [
      creer("span", { class: "mm-ligne-haut" }, [creer("strong", { class: "mm-expediteur", texte: mail.de.nom }), creer("span", { class: "mm-date", texte: dateCourte(mail.date) })]),
      creer("span", { class: "mm-ligne-objet", texte: typographie(mail.objet) }),
      creer("span", { class: "mm-ligne-extrait", texte: typographie(extrait(mail)) }),
    ]);
    liste().append(creer("li", {}, [bouton]));
  }
}

function afficherMessage(id) {
  const mail = mails.find((m) => m.id === id);
  lecture().textContent = "";
  if (!mail) {
    idSelectionne = null;
    appli().classList.remove("lecture");
    lecture().append(creer("p", { class: "mm-vide", texte: "Sélectionnez un message pour le lire." }));
    dessinerListe();
    return;
  }
  idSelectionne = id;
  lus.add(id);
  appli().classList.add("lecture");
  lecture().append(
    creer("p", { class: "mm-retour" }, [creer("button", { type: "button", class: "bouton secondaire", onclick: () => { window.location.hash = ""; }, texte: "← Retour à la liste" })]),
    creerLecteur(mail, { auClicLien: (lien, a) => ouvrirPageDuLien(lien, a) }),
  );
  dessinerListe();
}

/**
 * Dossiers « Brouillons » (séance 4) et « Journal de connexion » (séance 3) : grisés tant que la
 * séance correspondante n'est pas ouverte sur cet ordinateur, cliquables ensuite.
 */
function activerDossiersOuverts() {
  for (const entree of document.querySelectorAll(".mm-dossiers .desactive[data-seance]")) {
    if (!Progression.estOuverte(Number(entree.dataset.seance))) continue;
    const nom = entree.firstChild.textContent.trim();
    entree.replaceWith(creer("a", { href: entree.dataset.page, texte: nom }));
  }
}

function routeur() {
  const m = /^#mail=([a-z0-9-]+)$/.exec(window.location.hash);
  afficherMessage(m ? m[1] : null);
}

async function demarrer() {
  const cadre = document.getElementById("cadre");
  try {
    Progression.configurer(await chargerJson("data/config.json"));
    await verrouillerPage([2, 3, 4]);
    mails = (await chargerJson("data/mails.json")).mails;
    activerDossiersOuverts();
    document.getElementById("compteur-reception").textContent = String(mails.length);
    window.addEventListener("hashchange", routeur);
    routeur();
    dessinerListe();
    cadre.hidden = false;
  } catch (erreur) {
    cadre.hidden = false;
    lecture().textContent = "Impossible de charger la messagerie. Ouvrez le site par son adresse web, puis rechargez la page.";
    console.error(erreur);
  }
}

demarrer();
