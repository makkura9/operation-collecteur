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
 * Fabrique un dictionnaire personnalisé à partir de quelques mots.
 * Pour chaque mot : ses trois formes, seules puis suivies d'une année (anneeMin..anneeMax)
 * et des dates fournies (jj.mm → « jjmm » et « jjmmaaaa » si une année est associée).
 * C'est exactement ce qu'un humain choisit souvent : un mot familier + une année.
 * Renvoie un tableau de candidats, sans doublon, borné à `maximum`.
 */
export function genererVariantes(mots, { anneeMin = 1990, anneeMax = 2026, avecAnnees = true, dates = [], maximum = 60000 } = {}) {
  const sortie = new Set();
  const suffixesDates = [];
  for (const d of dates) {
    const m = /^(\d{1,2})[.\/-](\d{1,2})$/.exec(d.trim());
    if (m) {
      const jj = m[1].padStart(2, "0");
      const mm = m[2].padStart(2, "0");
      suffixesDates.push(jj + mm);
    }
  }
  for (const motBrut of mots) {
    const mot = motBrut.trim();
    if (!mot) continue;
    for (const forme of formes(mot)) {
      sortie.add(forme);
      if (avecAnnees) {
        for (let annee = anneeMin; annee <= anneeMax; annee++) {
          sortie.add(forme + annee);
          sortie.add(forme + String(annee).slice(2)); // année sur 2 chiffres
        }
      }
      for (const s of suffixesDates) sortie.add(forme + s);
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
