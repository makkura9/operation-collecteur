// Vérification des codes d'entrée et de sortie.
//
// Les codes en clair n'existent PAS sur ce site : data/codes.json ne contient que des empreintes
// SHA-256. Pour tester un code, on calcule l'empreinte de ce qui a été saisi et on la compare.
//
// Normalisation, mode « souple » (la plupart des codes) :
//   minuscules, accents retirés, espaces de début et de fin retirés, suites d'espaces réduites à un
//   seul espace. Les tirets et les points sont conservés.
// Mode « strict » (code de sortie de la séance 3) : seuls les espaces de début et de fin sont retirés.
//
// Cette règle doit rester identique à celle du programme qui fabrique les empreintes.

import { sha256Hex } from "./sha256.js";
import { chargerJson } from "./chargeur.js";

export function normaliser(texte, mode = "souple") {
  if (mode === "strict") return texte.trim();
  return texte
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

let codesEnMemoire = null;

export async function chargerCodes() {
  if (!codesEnMemoire) codesEnMemoire = await chargerJson("data/codes.json");
  return codesEnMemoire;
}

/** La saisie correspond-elle à l'une des empreintes de la liste ? */
async function correspond(saisie, empreintes, prefixe) {
  const dejaCalcule = {};
  for (const element of empreintes) {
    const mode = element.mode || "souple";
    if (!(mode in dejaCalcule)) {
      dejaCalcule[mode] = await sha256Hex(prefixe + normaliser(saisie, mode));
    }
    if (dejaCalcule[mode] === element.empreinte) return true;
  }
  return false;
}

/** Renvoie "maitre", "seance" ou null selon le code d'entrée saisi pour la séance `numero`. */
export async function verifierEntree(numero, saisie) {
  const codes = await chargerCodes();
  if (await correspond(saisie, codes.maitre, codes.prefixe)) return "maitre";
  const seance = codes.seances[String(numero)];
  if (seance && await correspond(saisie, seance.entree, codes.prefixe)) return "seance";
  return null;
}

/** Renvoie "maitre", "seance" ou null selon le code de sortie saisi pour la séance `numero`. */
export async function verifierSortie(numero, saisie) {
  const codes = await chargerCodes();
  if (await correspond(saisie, codes.maitre, codes.prefixe)) return "maitre";
  const seance = codes.seances[String(numero)];
  if (seance && await correspond(saisie, seance.sortie, codes.prefixe)) return "seance";
  return null;
}

/** Le code de sortie de cette séance est-il sensible à la casse ? (pour adapter le message d'aide) */
export async function sortieSensibleCasse(numero) {
  const codes = await chargerCodes();
  const seance = codes.seances[String(numero)];
  return Boolean(seance && seance.sortie.some((e) => e.mode === "strict"));
}
