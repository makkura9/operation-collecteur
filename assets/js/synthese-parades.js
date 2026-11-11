// Failles et parades (séance 6) : associer chaque faille de Robin à la parade qui l'aurait évitée.
// Une liste déroulante par faille : simple aux touches, au doigt et avec un lecteur d'écran.

import { creer, typographie } from "./chargeur.js";
import * as Progression from "./progression.js";
import { bandeauCompteARebours, boiteNotion, demarrerPiece, friseReussie, melanger } from "./synthese-commun.js";

const CLE = "parades";   // annexe : { choix: { idFaille: idParade }, essais: n, reussie: booléen }

let donnees = null;
let etat = null;
const selecteurs = {};   // idFaille → <select>

function sauver() {
  Progression.ecrireAnnexe(CLE, etat);
}

function creerFaille(paire, numero, ordreParades) {
  const idSelect = `parade-${paire.id}`;
  const select = creer("select", { id: idSelect, name: idSelect });
  select.append(creer("option", { value: "", texte: "— Choisissez une parade —" }));
  for (const p of ordreParades) select.append(creer("option", { value: p.id, texte: typographie(p.parade) }));
  if (etat.choix[paire.id]) select.value = etat.choix[paire.id];

  const carte = creer("li", { class: "faille", "data-id": paire.id }, [
    creer("p", { class: "titre-faille" }, [creer("span", { class: "etiquette", texte: `Faille ${numero}` }), creer("br"), typographie(paire.faille)]),
    creer("label", { for: idSelect, texte: "Parade qui l'aurait évitée :" }),
    select,
    creer("p", { class: "retour", "aria-live": "polite" }),
  ]);
  select.addEventListener("change", () => {
    etat.choix[paire.id] = select.value;
    carte.classList.remove("juste", "faux");
    carte.querySelector(".retour").textContent = "";
    sauver();
  });
  selecteurs[paire.id] = select;
  return carte;
}

function afficherReussite(bilan) {
  bilan.className = "bilan reussi";
  bilan.textContent = "";
  const liens = friseReussie()
    ? [{ href: "denouement.html", texte: "Découvrir le dénouement →" }, { href: "quiz.html", texte: "Quiz final", secondaire: true }]
    : [{ href: "frise.html", texte: "Terminer la frise →" }, { href: "quiz.html", texte: "Quiz final", secondaire: true }];
  bilan.append(
    creer("p", {}, [creer("strong", { texte: "✓ " + typographie(donnees.parades.reussite) })]),
    boiteNotion(donnees.parades.notion, liens),
  );
}

/** Corrige les choix. `depuisBouton` est faux au rechargement d'une page déjà réussie (pas d'essai compté). */
function verifier(depuisBouton = true) {
  const paires = donnees.parades.paires;
  const bilan = document.getElementById("bilan-parades");
  const choisies = Object.values(etat.choix).filter(Boolean);
  const doublons = choisies.length !== new Set(choisies).size;
  let justes = 0;
  let vides = 0;
  for (const paire of paires) {
    const carte = document.querySelector(`.faille[data-id="${paire.id}"]`);
    const retour = carte.querySelector(".retour");
    const choix = selecteurs[paire.id].value;
    retour.textContent = "";
    carte.classList.remove("juste", "faux");
    if (!choix) { vides++; continue; }
    if (choix === paire.id) {
      justes++;
      carte.classList.add("juste");
      retour.append(
        creer("strong", { texte: "✓ Bonne parade. " }),
        typographie(paire.explication) + " ",
        creer("span", { class: "pastille-dossier", texte: `Dossier ${paire.dossier}` }),
      );
    } else {
      carte.classList.add("faux");
      retour.append(creer("strong", { texte: "✗ Cette parade ne corrige pas cette faille. " }), "Cherchez-en une autre.");
    }
  }
  if (depuisBouton) etat.essais = (etat.essais || 0) + 1;
  etat.reussie = justes === paires.length;
  sauver();
  if (etat.reussie) {
    afficherReussite(bilan);
  } else {
    bilan.className = "bilan partiel";
    bilan.textContent = "";
    bilan.append(creer("p", { texte: `${justes} parade${justes > 1 ? "s" : ""} juste${justes > 1 ? "s" : ""} sur ${paires.length}.` }));
    if (vides) bilan.append(creer("p", { texte: `Il reste ${vides} faille${vides > 1 ? "s" : ""} sans parade.` }));
    if (doublons) bilan.append(creer("p", { texte: "Attention : une même parade est choisie pour plusieurs failles. Chaque parade sert une seule fois." }));
  }
  if (depuisBouton) bilan.focus();
}

function construire(d, zone) {
  donnees = d;
  const p = donnees.parades;
  etat = Progression.lireAnnexe(CLE) || { choix: {}, essais: 0, reussie: false };
  etat.choix = etat.choix || {};
  const ordreParades = melanger(p.paires);
  const liste = creer("ol", { class: "liste-failles" });
  p.paires.forEach((paire, i) => liste.append(creerFaille(paire, i + 1, ordreParades)));

  zone.append(
    bandeauCompteARebours(donnees),
    creer("p", { class: "intro", texte: typographie(p.intro) }),
    creer("p", { class: "consigne", texte: typographie(p.consigne) }),
    liste,
    creer("p", { class: "actions-suite" }, [
      creer("button", { type: "button", class: "bouton", texte: "Vérifier mes parades", onclick: () => verifier(true) }),
    ]),
    creer("div", { id: "bilan-parades", tabindex: "-1" }),
  );
  if (etat.reussie) verifier(false);
}

demarrerPiece("parades.html", construire);
