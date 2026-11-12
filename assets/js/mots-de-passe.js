// Fonctions partagées par les outils de la séance 3 (mots de passe).
// Aucune donnée n'est envoyée : tout est calculé dans le navigateur.

import { sha256Hex } from "./sha256.js";

/** Trois formes d'un mot : minuscules, Majuscule initiale, MAJUSCULES. */
function formes(mot) {
  const bas = mot.toLowerCase();
  if (!bas) return [];
  const capitale = bas.charAt(0).toUpperCase() + bas.slice(1);
  return Array.from(new Set([bas, capitale, bas.toUpperCase()]));
}

/**
 * Transforme ce que l'élève a saisi dans « Dates et années » en suffixes à coller derrière un mot.
 * Formats reconnus (séparateurs . / ou -) :
 *   - « 31.12.1999 » → 3112, 31121999, 311299, 1999, 99 ;
 *   - « 31.12 »      → 3112 ;
 *   - « 1999 »       → 1999, 99.
 * Renvoie { suffixes: [...], ignorees: [...] } ; « ignorees » liste les saisies non comprises.
 */
export function suffixesDeDates(dates) {
  const suffixes = new Set();
  const ignorees = [];
  for (const brut of dates) {
    const d = brut.trim();
    if (!d) continue;
    let m;
    if ((m = /^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4}|\d{2})$/.exec(d))) {
      const jjmm = m[1].padStart(2, "0") + m[2].padStart(2, "0");
      suffixes.add(jjmm);
      suffixes.add(jjmm + m[3]);
      suffixes.add(m[3]);
      if (m[3].length === 4) { suffixes.add(jjmm + m[3].slice(2)); suffixes.add(m[3].slice(2)); }
    } else if ((m = /^(\d{1,2})[.\/-](\d{1,2})$/.exec(d))) {
      suffixes.add(m[1].padStart(2, "0") + m[2].padStart(2, "0"));
    } else if (/^\d{4}$/.test(d)) {
      suffixes.add(d);
      suffixes.add(d.slice(2));   // année sur 2 chiffres
    } else {
      ignorees.push(d);
    }
  }
  return { suffixes: Array.from(suffixes), ignorees };
}

/**
 * Fabrique un dictionnaire personnalisé à partir des mots ET des dates saisis par l'élève.
 * Pour chaque mot : ses trois formes, seules puis suivies de chaque suffixe tiré des dates.
 * C'est exactement ce qu'un humain choisit souvent : un mot familier + une année ou une date.
 * Aucune année n'est ajoutée d'office : sans date utile, pas de « mot + année ».
 * Renvoie un tableau de candidats, sans doublon, borné à `maximum`.
 */
export function genererVariantes(mots, { dates = [], maximum = 60000 } = {}) {
  const sortie = new Set();
  const { suffixes } = suffixesDeDates(dates);
  for (const motBrut of mots) {
    const mot = motBrut.trim();
    if (!mot) continue;
    for (const forme of formes(mot)) {
      sortie.add(forme);
      for (const s of suffixes) sortie.add(forme + s);
      if (sortie.size > maximum) return Array.from(sortie).slice(0, maximum);
    }
  }
  return Array.from(sortie);
}

/**
 * Essaie chaque candidat contre une liste de comptes {pseudo, email, empreinte}.
 * Calcule l'empreinte SHA-256 de chaque candidat et la compare aux empreintes de la fuite.
 * `surProgression(faits, total)` est appelé régulièrement pour afficher l'avancement.
 * Renvoie { essais, trouves: [{pseudo, email, motDePasse}] }.
 */
export async function craquer(candidats, comptes, surProgression) {
  const parEmpreinte = new Map();
  for (const compte of comptes) {
    if (!parEmpreinte.has(compte.empreinte)) parEmpreinte.set(compte.empreinte, []);
    parEmpreinte.get(compte.empreinte).push(compte);
  }
  const trouves = [];
  const dejaTrouves = new Set();
  let essais = 0;
  for (const candidat of candidats) {
    const empreinte = await sha256Hex(candidat);
    essais++;
    if (parEmpreinte.has(empreinte)) {
      for (const compte of parEmpreinte.get(empreinte)) {
        if (!dejaTrouves.has(compte.pseudo)) {
          dejaTrouves.add(compte.pseudo);
          trouves.push({ pseudo: compte.pseudo, email: compte.email, motDePasse: candidat });
        }
      }
    }
    if (surProgression && essais % 200 === 0) {
      surProgression(essais, candidats.length);
      await new Promise((r) => setTimeout(r, 0)); // laisse l'affichage se rafraîchir
    }
  }
  if (surProgression) surProgression(essais, candidats.length);
  return { essais, trouves };
}
