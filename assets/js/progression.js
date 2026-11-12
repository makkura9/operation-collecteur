// Progression de la classe, mémorisée dans le navigateur uniquement (aucune donnée n'est envoyée).
//
// Deux espaces de stockage :
//  - « persistant » (localStorage) : dossiers clos et tampons ;
//  - « ouverture » : séances ouvertes par un code. Par défaut localStorage ; si le réglage
//    ouverture_par_onglet est vrai (data/config.json), sessionStorage : le code est alors
//    redemandé dans chaque nouvel onglet (utile si plusieurs élèves partagent un ordinateur).
//
// Tout est enveloppé dans try/catch : si le stockage est indisponible (navigation privée,
// réglages du navigateur), le site fonctionne quand même grâce à une copie en mémoire.
//
// Le code maître de l'enseignant n'est mémorisé que pour l'onglet courant (sessionStorage) :
// un poste d'élève dépanné avec ce code ne reste pas ouvert une fois l'onglet fermé.

const CLE = "argos.progression";
const VIDE = () => ({ version: 1, ouvertes: {}, maitre: false, closes: {} });

let parOnglet = false;                 // réglage lu dans data/config.json
const memoire = { persistant: VIDE(), ouverture: VIDE() };

function stockage(type) {
  try {
    return type === "ouverture" && parOnglet ? window.sessionStorage : window.localStorage;
  } catch (erreur) {
    return null;
  }
}

function lire(type) {
  const espace = stockage(type);
  if (espace) {
    try {
      const brut = espace.getItem(CLE);
      if (brut) return { ...VIDE(), ...JSON.parse(brut) };
      return VIDE();
    } catch (erreur) { /* stockage illisible : on utilise la mémoire */ }
  }
  return memoire[type];
}

function ecrire(type, etat) {
  memoire[type] = etat;
  const espace = stockage(type);
  if (!espace) return;
  try { espace.setItem(CLE, JSON.stringify(etat)); } catch (erreur) { /* ignoré */ }
}

/** À appeler une fois au chargement de la page, avec le contenu de data/config.json. */
export function configurer(config) {
  parOnglet = Boolean(config && config.ouverture_par_onglet);
}

const CLE_MAITRE = "argos.maitre";
let maitreEnMemoire = false;

/** Le code maître a-t-il été saisi dans cet onglet ? (porte de sortie de l'enseignant) */
export function estMaitre() {
  try {
    if (window.sessionStorage.getItem(CLE_MAITRE) === "1") return true;
  } catch (erreur) { /* stockage indisponible : on se fie à la mémoire de la page */ }
  return maitreEnMemoire;
}

/** Le navigateur accepte-t-il de mémoriser la progression ? (sinon, tout est perdu à chaque page) */
export function stockageDisponible() {
  try {
    const cle = "argos.essai";
    window.localStorage.setItem(cle, "1");
    window.localStorage.removeItem(cle);
    return true;
  } catch (erreur) {
    return false;
  }
}

export function estOuverte(numero) {
  const o = lire("ouverture");
  return estMaitre() || o.ouvertes[numero] === true || lire("persistant").closes[numero] === true;
}

export function estClose(numero) {
  return lire("persistant").closes[numero] === true;
}

export function ouvrir(numero) {
  const o = lire("ouverture");
  o.ouvertes[numero] = true;
  ecrire("ouverture", o);
}

/** Code maître : ouvre toutes les séances, pour l'onglet courant seulement. */
export function ouvrirTout() {
  maitreEnMemoire = true;
  try { window.sessionStorage.setItem(CLE_MAITRE, "1"); } catch (erreur) { /* ignoré */ }
}

export function clore(numero) {
  const p = lire("persistant");
  p.closes[numero] = true;
  ecrire("persistant", p);
  ouvrir(numero);
}

export function nombreClos() {
  return Object.keys(lire("persistant").closes).length;
}

/** Annexes : petites données de travail d'une pièce (ex. réponses de la grille de classement). */
const memoireAnnexes = {};

export function lireAnnexe(nom) {
  const cle = "argos." + nom;
  try {
    const brut = window.localStorage.getItem(cle);
    if (brut) return JSON.parse(brut);
  } catch (erreur) { /* repli sur la mémoire */ }
  return memoireAnnexes[cle] ?? null;
}

export function ecrireAnnexe(nom, valeur) {
  const cle = "argos." + nom;
  memoireAnnexes[cle] = valeur;
  try { window.localStorage.setItem(cle, JSON.stringify(valeur)); } catch (erreur) { /* ignoré */ }
}

/** Bouton « Nouveau binôme » : efface tout ce qui a été mémorisé sur cet ordinateur (progression et annexes). */
export function reinitialiser() {
  maitreEnMemoire = false;
  ecrire("persistant", VIDE());
  ecrire("ouverture", VIDE());
  for (const cle of Object.keys(memoireAnnexes)) delete memoireAnnexes[cle];
  for (const type of ["localStorage", "sessionStorage"]) {
    try {
      const espace = window[type];
      for (const cle of Object.keys(espace)) {
        if (cle.startsWith("argos.")) espace.removeItem(cle);
      }
    } catch (erreur) { /* ignoré */ }
  }
}
