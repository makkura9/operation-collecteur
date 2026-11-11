// Quiz final (séance 6) : dix questions, une à la fois, chacune corrigée et expliquée.
// Terminer le quiz clôt le dossier 6 (tampon au QG) et délivre le certificat, quel que soit le score.

import { creer, typographie } from "./chargeur.js";
import * as Progression from "./progression.js";
import { SEANCE, bandeauCompteARebours, demarrerPiece } from "./synthese-commun.js";

const CLE = "quiz";   // annexe : { index, reponses: [indice du choix], termine, score }
const LETTRES = ["A", "B", "C", "D", "E"];

let donnees = null;
let etat = null;
let zoneQuiz = null;

function sauver() {
  Progression.ecrireAnnexe(CLE, etat);
}

function questions() {
  return donnees.quiz.questions;
}

function barreProgression(index) {
  const total = questions().length;
  return creer("div", { class: "progression-quiz" }, [
    creer("strong", { texte: `Question ${index + 1} sur ${total}` }),
    creer("span", { class: "jauge", role: "img", "aria-label": `${index} question${index > 1 ? "s" : ""} terminée${index > 1 ? "s" : ""} sur ${total}` }, [
      creer("span", { style: `width:${Math.round((index / total) * 100)}%` }),
    ]),
  ]);
}

/** Affiche la correction d'une question déjà répondue (après « Valider » ou au rechargement). */
function corriger(formulaire, q, choix) {
  const labels = formulaire.querySelectorAll(".choix label");
  labels.forEach((label, i) => {
    label.querySelector("input").disabled = true;
    if (i === q.bonne) label.classList.add("bonne");
    else if (i === choix) label.classList.add("mauvaise");
  });
  formulaire.querySelector(".choix").classList.add("corrige");
  const radio = formulaire.querySelectorAll("input")[choix];
  if (radio) radio.checked = true;

  const juste = choix === q.bonne;
  const retour = formulaire.querySelector(".retour-quiz");
  retour.textContent = "";
  retour.className = "retour-quiz bilan " + (juste ? "reussi" : "partiel");
  retour.append(
    creer("p", {}, [creer("strong", {
      texte: juste ? "✓ Bonne réponse !" : `✗ Ce n'est pas la bonne réponse. Réponse attendue : ${LETTRES[q.bonne]}.`,
    })]),
    creer("p", { texte: typographie(q.explication) }),
  );

  const dernier = etat.index === questions().length - 1;
  const suite = creer("button", { type: "button", class: "bouton", texte: dernier ? "Voir mon résultat →" : "Question suivante →" });
  suite.addEventListener("click", () => {
    etat.index += 1;
    sauver();
    afficher(true);
  });
  formulaire.querySelector(".actions-suite").replaceChildren(suite);
  return suite;
}

function ecranQuestion(index, donnerFocus) {
  const q = questions()[index];
  const nom = `question-${index}`;
  const choix = creer("div", { class: "choix" });
  q.choix.forEach((texte, i) => {
    choix.append(creer("label", {}, [
      creer("input", { type: "radio", name: nom, value: String(i) }),
      creer("span", {}, [creer("strong", { texte: `${LETTRES[i]}. ` }), typographie(texte)]),
    ]));
  });
  const legende = creer("legend", { tabindex: "-1", texte: typographie(q.question) });
  const formulaire = creer("form", { class: "formulaire-quiz", novalidate: true }, [
    creer("fieldset", { class: "question-quiz" }, [
      legende,
      choix,
      creer("div", { class: "retour-quiz", "aria-live": "polite" }),
      creer("p", { class: "actions-suite" }, [creer("button", { type: "submit", class: "bouton", texte: "Valider ma réponse" })]),
    ]),
  ]);
  formulaire.addEventListener("submit", (evenement) => {
    evenement.preventDefault();
    const coche = formulaire.querySelector("input:checked");
    const retour = formulaire.querySelector(".retour-quiz");
    if (!coche) {
      retour.className = "retour-quiz bilan partiel";
      retour.textContent = "Choisissez d'abord une réponse.";
      return;
    }
    etat.reponses[index] = Number(coche.value);
    sauver();
    corriger(formulaire, q, etat.reponses[index]).focus();
  });

  zoneQuiz.replaceChildren(barreProgression(index), formulaire);
  if (Number.isInteger(etat.reponses[index])) corriger(formulaire, q, etat.reponses[index]);
  if (donnerFocus) legende.focus();
}

function ecranResultat(donnerFocus) {
  const qs = questions();
  const score = qs.reduce((total, q, i) => total + (etat.reponses[i] === q.bonne ? 1 : 0), 0);
  if (etat.score !== score || !etat.termine) {
    etat.score = score;
    etat.termine = true;
    sauver();
  }
  Progression.clore(SEANCE);   // tampon « Dossier clos » au QG

  const message = donnees.quiz.messages_score.find((m) => score >= m.minimum);
  const recap = creer("ol", { class: "recap-quiz" });
  qs.forEach((q, i) => {
    const juste = etat.reponses[i] === q.bonne;
    recap.append(creer("li", {}, [
      creer("strong", { class: juste ? "symbole-juste" : "symbole-faux", "aria-label": juste ? "Juste : " : "Faux : ", texte: juste ? "✓ " : "✗ " }),
      typographie(q.question),
      juste ? null : creer("span", { texte: ` — réponse ${LETTRES[q.bonne]}` }),
    ]));
  });
  const titre = creer("h2", { tabindex: "-1", texte: "Résultat du quiz" });
  const recommencer = creer("button", { type: "button", class: "bouton secondaire", texte: "Recommencer le quiz" });
  recommencer.addEventListener("click", () => {
    etat.index = 0;
    etat.reponses = [];
    sauver();
    afficher(true);
  });
  zoneQuiz.replaceChildren(creer("section", { class: "carte" }, [
    titre,
    creer("p", { class: "score-final", texte: `${score} / ${qs.length}` }),
    creer("p", { texte: typographie(message ? message.texte : "") }),
    creer("p", { class: "message-code succes", texte: "Dossier 6 clos : un tampon apparaît sur le dossier, au QG." }),
    creer("p", { class: "actions-suite" }, [
      creer("a", { class: "bouton", href: "certificat.html", texte: "Obtenir votre certificat →" }),
      recommencer,
    ]),
    creer("h3", { texte: "Récapitulatif" }),
    recap,
  ]));
  if (donnerFocus) titre.focus();
}

function afficher(donnerFocus = false) {
  if (etat.index >= questions().length) ecranResultat(donnerFocus);
  else ecranQuestion(etat.index, donnerFocus);
}

function construire(d, zone) {
  donnees = d;
  const sauve = Progression.lireAnnexe(CLE);
  etat = {
    index: 0, reponses: [], termine: false, score: null,
    ...(sauve && typeof sauve === "object" ? sauve : {}),
  };
  if (!Array.isArray(etat.reponses)) etat.reponses = [];
  if (!Number.isInteger(etat.index) || etat.index < 0) etat.index = 0;
  zoneQuiz = creer("div", { id: "zone-quiz" });
  zone.append(
    bandeauCompteARebours(donnees),
    creer("p", { class: "intro", texte: typographie(donnees.quiz.intro) }),
    zoneQuiz,
  );
  afficher(false);
}

demarrerPiece("quiz.html", construire);
