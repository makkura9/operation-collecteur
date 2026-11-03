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

export function estOuverte(numero) {
  const o = lire("ouverture");
  return o.maitre === true || o.ouvertes[numero] === true || lire("persistant").closes[numero] === true;
}

export function estClose(numero) {
  return lire("persistant").closes[numero] === true;
}

export function ouvrir(numero) {
  const o = lire("ouverture");
  o.ouvertes[numero] = true;
  ecrire("ouverture", o);
}

/** Code maître : ouvre toutes les séances (sur cet ordinateur / cet onglet). */
export function ouvrirTout() {
  const o = lire("ouverture");
  o.maitre = true;
  ecrire("ouverture", o);
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
