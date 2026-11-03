// Empreinte SHA-256 avec l'API Web Crypto du navigateur.
// Cette API n'existe qu'en contexte sécurisé : HTTPS (GitHub Pages) ou http://localhost.

/**
 * Calcule l'empreinte SHA-256 d'un texte et la renvoie en hexadécimal (64 caractères).
 * @param {string} texte
 * @returns {Promise<string>}
 */
export async function sha256Hex(texte) {
  if (!(window.crypto && window.crypto.subtle)) {
    throw new Error(
      "Votre navigateur ne permet pas le calcul d'empreintes sur cette page. " +
      "Ouvrez le site par son adresse https:// ou http://localhost."
    );
  }
  const octets = new TextEncoder().encode(texte);
  const empreinte = await window.crypto.subtle.digest("SHA-256", octets);
  return Array.from(new Uint8Array(empreinte))
    .map((octet) => octet.toString(16).padStart(2, "0"))
    .join("");
}
