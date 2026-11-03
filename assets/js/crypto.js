// Fonctions de (dé)chiffrement partagées par les outils de la séance 4.
// Convention : on ne décale que les lettres A–Z (majuscules) ; espaces et ponctuation sont conservés.
// En Vigenère, la clé n'avance que sur les lettres. Tout est calculé dans le navigateur.

const A = 65;

/** Retire les accents et met en MAJUSCULES (pour César et Vigenère). */
export function majuscules(texte) {
  return texte.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
}

/** Décale chaque lettre de `decalage` (peut être négatif). */
export function cesar(texte, decalage) {
  const d = ((decalage % 26) + 26) % 26;
  let sortie = "";
  for (const c of texte) {
    const code = c.charCodeAt(0);
    if (code >= A && code <= A + 25) sortie += String.fromCharCode(((code - A + d) % 26) + A);
    else sortie += c;
  }
  return sortie;
}

/** Les 25 décalages possibles d'un texte : [{decalage, texte}]. */
export function tousLesDecalages(texte) {
  const liste = [];
  for (let d = 1; d <= 25; d++) liste.push({ decalage: d, texte: cesar(texte, d) });
  return liste;
}

/** Déchiffre (ou chiffre avec `sens = 1`) en Vigenère. */
export function vigenere(texte, cle, sens = -1) {
  const k = majuscules(cle).replace(/[^A-Z]/g, "");
  if (!k) return texte;
  let i = 0;
  let sortie = "";
  for (const c of texte) {
    const code = c.charCodeAt(0);
    if (code >= A && code <= A + 25) {
      const d = (k.charCodeAt(i % k.length) - A) * sens;
      sortie += String.fromCharCode((((code - A + d) % 26) + 26) % 26 + A);
      i++;
    } else {
      sortie += c;
    }
  }
  return sortie;
}

/** Décode une chaîne Base64 (gère les accents via UTF-8). */
export function base64Decode(texte) {
  const binaire = atob(texte.replace(/\s+/g, ""));
  const octets = Uint8Array.from(binaire, (c) => c.charCodeAt(0));
  return new TextDecoder("utf-8", { fatal: false }).decode(octets);
}

/** Encode un texte en Base64 (UTF-8). */
export function base64Encode(texte) {
  const octets = new TextEncoder().encode(texte);
  let binaire = "";
  for (const o of octets) binaire += String.fromCharCode(o);
  return btoa(binaire);
}

/** Compte les lettres A–Z d'un texte : [{lettre, nombre, pourcentage}], trié par fréquence. */
export function frequences(texte) {
  const maj = majuscules(texte);
  const compte = {};
  let total = 0;
  for (const c of maj) {
    if (c >= "A" && c <= "Z") { compte[c] = (compte[c] || 0) + 1; total++; }
  }
  const liste = [];
  for (let i = 0; i < 26; i++) {
    const lettre = String.fromCharCode(A + i);
    liste.push({ lettre, nombre: compte[lettre] || 0, pourcentage: total ? (compte[lettre] || 0) / total * 100 : 0 });
  }
  return { total, liste };
}

// Fréquences de référence du français (ordres de grandeur ; varient selon le texte).
export const FREQUENCES_FR = {
  E: 15.0, A: 8.1, S: 8.0, I: 7.3, T: 7.2, N: 7.1, R: 6.6, U: 6.3, L: 5.5, O: 5.4,
  D: 3.7, C: 3.3, P: 3.0, M: 3.0, V: 1.6, Q: 1.3, F: 1.1, B: 0.9, G: 0.9, H: 0.9,
  J: 0.3, X: 0.4, Y: 0.3, Z: 0.1, K: 0.05, W: 0.04,
};
