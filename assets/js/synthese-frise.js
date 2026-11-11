// Frise chronologique (séance 6) : remettre dans l'ordre les dix événements de l'attaque.
// Deux façons de déplacer une étiquette : la faire glisser par sa poignée (souris ou doigt),
// ou utiliser ses boutons ↑ et ↓ (navigation aux touches, lecteurs d'écran).

import { creer, typographie } from "./chargeur.js";
import * as Progression from "./progression.js";
import { bandeauCompteARebours, boiteNotion, demarrerPiece, melanger } from "./synthese-commun.js";

const CLE = "frise";   // annexe : { ordre: [identifiants], essais: n, reussie: booléen }

let donnees = null;
let liste = null;      // l'élément <ol> de la frise
let etat = null;

const evenementParId = {};

function sauver() {
  etat.ordre = [...liste.children].map((li) => li.dataset.id);
  Progression.ecrireAnnexe(CLE, etat);
}

function annoncer(texte) {
  document.getElementById("annonce-frise").textContent = texte;
}

/** Ordre de départ : l'ordre sauvegardé s'il est valable, sinon un mélange (peu d'étiquettes déjà à leur place). */
function ordreDeDepart(evenements) {
  const ids = evenements.map((e) => e.id);
  const sauve = etat.ordre;
  if (Array.isArray(sauve) && sauve.length === ids.length && ids.every((id) => sauve.includes(id))) return sauve;
  let ordre;
  do {
    ordre = melanger(ids);
  } while (ordre.filter((id, i) => id === ids[i]).length > 2);
  return ordre;
}

/** Efface les marques ✓ / ✗ d'une vérification précédente (dès qu'on déplace une étiquette). */
function effacerMarques() {
  for (const li of liste.children) {
    li.classList.remove("juste", "faux");
    li.querySelector(".marque").textContent = "";
  }
}

function position(li) {
  return [...liste.children].indexOf(li) + 1;
}

/** Déplace une étiquette d'un cran. On déplace sa voisine plutôt qu'elle : le bouton garde ainsi le focus. */
function deplacerDUnCran(li, sens) {
  const total = liste.children.length;
  const texte = evenementParId[li.dataset.id].texte;
  if (sens < 0) {
    const precedente = li.previousElementSibling;
    if (!precedente) { annoncer(`Déjà en première position : ${texte}`); return; }
    liste.insertBefore(precedente, li.nextElementSibling);
  } else {
    const suivante = li.nextElementSibling;
    if (!suivante) { annoncer(`Déjà en dernière position : ${texte}`); return; }
    liste.insertBefore(suivante, li);
  }
  effacerMarques();
  sauver();
  annoncer(`Position ${position(li)} sur ${total} : ${texte}`);
}

/** Glisser-déposer par la poignée, avec les « pointer events » (souris, doigt et stylet). */
function activerGlisser(li, poignee) {
  poignee.addEventListener("pointerdown", (evenement) => {
    if (evenement.button !== 0 || liste.classList.contains("resolue")) return;
    evenement.preventDefault();
    poignee.setPointerCapture(evenement.pointerId);
    li.classList.add("en-deplacement");
    document.body.classList.add("glisser-en-cours");
    const depart = position(li);

    let dernierY = evenement.clientY;   // position verticale du pointeur dans la fenêtre
    let animation = null;

    const milieu = (element) => {
      const r = element.getBoundingClientRect();
      return r.top + r.height / 2;
    };
    // On déplace les voisines autour de l'étiquette tenue (elle-même ne quitte jamais la page).
    const reordonner = () => {
      let precedente = li.previousElementSibling;
      while (precedente && dernierY < milieu(precedente)) {
        liste.insertBefore(precedente, li.nextElementSibling);
        precedente = li.previousElementSibling;
      }
      let suivante = li.nextElementSibling;
      while (suivante && dernierY > milieu(suivante)) {
        liste.insertBefore(suivante, li);
        suivante = li.nextElementSibling;
      }
    };
    // Défilement automatique tant que le pointeur reste près du haut ou du bas de la fenêtre
    // (indispensable sur un petit écran, où la frise ne tient pas en entier).
    const MARGE = 70;
    const VITESSE_MAX = 12;   // pixels par image
    const defiler = () => {
      let pas = 0;
      if (dernierY < MARGE) pas = -Math.ceil(((MARGE - dernierY) / MARGE) * VITESSE_MAX);
      else if (dernierY > window.innerHeight - MARGE) pas = Math.ceil(((dernierY - (window.innerHeight - MARGE)) / MARGE) * VITESSE_MAX);
      if (pas) {
        const avant = window.scrollY;
        window.scrollBy(0, pas);
        if (window.scrollY !== avant) reordonner();
      }
      animation = window.requestAnimationFrame(defiler);
    };
    animation = window.requestAnimationFrame(defiler);

    const suivre = (ev) => {
      dernierY = ev.clientY;
      reordonner();
    };
    const terminer = () => {
      window.cancelAnimationFrame(animation);
      poignee.removeEventListener("pointermove", suivre);
      poignee.removeEventListener("pointerup", terminer);
      poignee.removeEventListener("pointercancel", terminer);
      li.classList.remove("en-deplacement");
      document.body.classList.remove("glisser-en-cours");
      if (position(li) !== depart) {
        effacerMarques();
        sauver();
        annoncer(`Position ${position(li)} sur ${liste.children.length} : ${evenementParId[li.dataset.id].texte}`);
      }
    };
    poignee.addEventListener("pointermove", suivre);
    poignee.addEventListener("pointerup", terminer);
    poignee.addEventListener("pointercancel", terminer);
  });
}

function creerEtiquette(evenement) {
  const poignee = creer("span", { class: "poignee", "aria-hidden": "true", title: "Faire glisser", texte: "⠿" });
  const texteCourt = evenement.texte.length > 60 ? evenement.texte.slice(0, 57) + "…" : evenement.texte;
  const li = creer("li", { "data-id": evenement.id }, [
    poignee,
    creer("div", { class: "contenu" }, [
      creer("p", { texte: typographie(evenement.texte) }),
      creer("div", { class: "meta" }, [
        creer("span", { class: "date", texte: typographie(evenement.date) }),
        creer("span", { class: "marque" }),
      ]),
      creer("span", { class: "details" }, [
        evenement.dossier ? creer("span", { class: "pastille-dossier", texte: `Dossier ${evenement.dossier}` }) : null,
      ]),
    ]),
    creer("div", { class: "boutons" }, [
      creer("button", { type: "button", "aria-label": `Monter : ${texteCourt}`, title: "Monter", texte: "↑" }),
      creer("button", { type: "button", "aria-label": `Descendre : ${texteCourt}`, title: "Descendre", texte: "↓" }),
    ]),
  ]);
  const [monter, descendre] = li.querySelectorAll(".boutons button");
  monter.addEventListener("click", () => deplacerDUnCran(li, -1));
  descendre.addEventListener("click", () => deplacerDUnCran(li, +1));
  activerGlisser(li, poignee);
  return li;
}

/** Fige la frise résolue : dates et dossiers visibles, plus de déplacement possible. */
function afficherReussite(bilan) {
  liste.classList.add("resolue", "dates-visibles");
  for (const li of liste.children) {
    li.classList.add("juste");
    li.querySelector(".marque").textContent = "";
  }
  document.getElementById("verifier-frise").hidden = true;
  bilan.className = "bilan reussi";
  bilan.textContent = "";
  bilan.append(
    creer("p", {}, [creer("strong", { texte: "✓ " + typographie(donnees.frise.reussite) })]),
    boiteNotion(donnees.frise.notion, [
      { href: "denouement.html", texte: "Découvrir le dénouement →" },
      { href: "parades.html", texte: "Failles et parades", secondaire: true },
    ]),
  );
  // Le bandeau passe à « Affaire résolue »
  const ancien = document.querySelector(".compte-rebours");
  if (ancien) ancien.replaceWith(bandeauCompteARebours(donnees));
}

function verifier() {
  const solution = donnees.frise.evenements.map((e) => e.id);
  const bilan = document.getElementById("bilan-frise");
  // Un essai n'est compté que si l'ordre a changé depuis la dernière vérification
  // (sinon, deux clics suffiraient à faire apparaître les dates).
  const ordreActuel = [...liste.children].map((li) => li.dataset.id).join(",");
  const dejaVerifie = etat.dernierVerifie === ordreActuel;
  etat.dernierVerifie = ordreActuel;
  let justes = 0;
  [...liste.children].forEach((li, i) => {
    const juste = li.dataset.id === solution[i];
    if (juste) justes++;
    li.classList.toggle("juste", juste);
    li.classList.toggle("faux", !juste);
    li.querySelector(".marque").textContent = juste ? "✓ Bien placé" : "✗ Pas à sa place";
  });
  if (!dejaVerifie) etat.essais = (etat.essais || 0) + 1;
  if (justes === solution.length) {
    etat.reussie = true;
    sauver();
    afficherReussite(bilan);
    bilan.focus();
    return;
  }
  sauver();
  bilan.className = "bilan partiel";
  bilan.textContent = "";
  bilan.append(creer("p", { texte: `${justes} événement${justes > 1 ? "s" : ""} sur ${solution.length} ${justes > 1 ? "sont" : "est"} à la bonne place. Déplacez les étiquettes marquées ✗, puis vérifiez à nouveau.` }));
  if (dejaVerifie) bilan.append(creer("p", { texte: "Cet ordre avait déjà été vérifié : cet essai n'est pas compté." }));
  if (etat.essais >= donnees.frise.essais_avant_dates) {
    liste.classList.add("dates-visibles");
    bilan.append(creer("p", { texte: typographie(donnees.frise.indice_dates) }));
  }
  bilan.focus();
}

function construire(d, zone) {
  donnees = d;
  const f = donnees.frise;
  for (const e of f.evenements) evenementParId[e.id] = e;
  etat = Progression.lireAnnexe(CLE) || { ordre: null, essais: 0, reussie: false };

  liste = creer("ol", { class: "frise", id: "frise", "aria-label": "Événements de l'attaque, du plus ancien au plus récent" });
  for (const id of ordreDeDepart(f.evenements)) liste.append(creerEtiquette(evenementParId[id]));

  zone.append(
    bandeauCompteARebours(donnees),
    creer("p", { class: "intro", texte: typographie(f.intro) }),
    creer("p", { class: "consigne", texte: typographie(f.consigne) }),
    creer("p", { class: "sr-seulement", id: "annonce-frise", "aria-live": "polite" }),
    liste,
    creer("p", { class: "actions-suite" }, [
      creer("button", { type: "button", class: "bouton", id: "verifier-frise", texte: "Vérifier l'ordre", onclick: verifier }),
    ]),
    creer("div", { class: "bilan", id: "bilan-frise", tabindex: "-1", hidden: false }),
  );
  const bilan = document.getElementById("bilan-frise");
  if (etat.reussie) {
    // Frise déjà reconstituée : on la montre dans le bon ordre.
    liste.textContent = "";
    for (const e of f.evenements) liste.append(creerEtiquette(e));
    afficherReussite(bilan);
  } else {
    bilan.className = "";
    if ((etat.essais || 0) >= f.essais_avant_dates) liste.classList.add("dates-visibles");
    sauver();
  }
}

demarrerPiece("frise.html", construire);
