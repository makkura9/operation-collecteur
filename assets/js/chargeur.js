// Petites fonctions utilitaires partagées par toutes les pages.

/** Dossier racine du site, relativement à la page courante (ex. "../" dans seance-1/). */
export function racine() {
  return document.documentElement.dataset.racine || "./";
}

/** Charge un fichier JSON du dossier data/ (ou tout autre chemin relatif à la racine). */
export async function chargerJson(cheminDepuisRacine) {
  const reponse = await fetch(racine() + cheminDepuisRacine, { cache: "no-cache" });
  if (!reponse.ok) {
    throw new Error("Fichier introuvable : " + cheminDepuisRacine);
  }
  return reponse.json();
}

/** Crée un élément HTML : creer("p", { class: "note", texte: "Bonjour" }, [enfant1, enfant2]). */
export function creer(balise, proprietes = {}, enfants = []) {
  const element = document.createElement(balise);
  for (const [cle, valeur] of Object.entries(proprietes)) {
    if (valeur === undefined || valeur === null || valeur === false) continue;
    if (cle === "texte") element.textContent = valeur;
    else if (cle === "html") element.innerHTML = valeur; // contenu écrit par nous uniquement
    else if (cle.startsWith("on") && typeof valeur === "function") element.addEventListener(cle.slice(2), valeur);
    else element.setAttribute(cle, valeur === true ? "" : valeur);
  }
  for (const enfant of [].concat(enfants)) {
    if (enfant === null || enfant === undefined) continue;
    element.append(enfant);
  }
  return element;
}

/** Remplace les espaces ordinaires avant : ; ? ! par des espaces insécables (affichage dynamique). */
export function typographie(texte) {
  return String(texte)
    .replace(/ ([:;?!»])/g, " $1")
    .replace(/« /g, "« ");
}

/** Crée un élément SVG (namespace correct). */
export function creerSVG(balise, proprietes = {}) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", balise);
  for (const [cle, valeur] of Object.entries(proprietes)) {
    if (valeur === undefined || valeur === null || valeur === false) continue;
    el.setAttribute(cle, valeur === true ? "" : valeur);
  }
  return el;
}
