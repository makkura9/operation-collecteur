// Outils communs aux pièces de la séance 6 (frise, failles et parades, dénouement, quiz, certificat).
// Le contenu vient de data/synthese.json ; seul le navigateur garde la progression (annexes).

import { chargerJson, creer, racine, typographie } from "./chargeur.js";
import * as Progression from "./progression.js";
import { verrouillerPage } from "./verrou.js";

export const SEANCE = 6;

/** Les pièces du dossier 6, dans l'ordre du cours (pour la petite navigation en haut de page). */
const PIECES = [
  { fichier: "frise.html", titre: "Frise" },
  { fichier: "parades.html", titre: "Failles et parades" },
  { fichier: "denouement.html", titre: "Dénouement" },
  { fichier: "quiz.html", titre: "Quiz final" },
  { fichier: "certificat.html", titre: "Certificat" },
];

/** Petite navigation entre les pièces ; la page courante est signalée. */
export function navigationPieces(courante) {
  const liste = creer("ul", { class: "navigation-pieces", "aria-label": "Pièces du dossier 6" });
  for (const piece of PIECES) {
    liste.append(creer("li", {}, [
      creer("a", { href: piece.fichier, texte: piece.titre, "aria-current": piece.fichier === courante ? "page" : null }),
    ]));
  }
  return liste;
}

/** La frise est-elle reconstituée ? (Elle débloque le dénouement.) */
export function friseReussie() {
  const etat = Progression.lireAnnexe("frise");
  return Boolean(etat && etat.reussie);
}

/** Le quiz a-t-il été terminé au moins une fois ? (Il délivre le certificat.) */
export function quizTermine() {
  const etat = Progression.lireAnnexe("quiz");
  return Boolean((etat && etat.termine) || Progression.estClose(SEANCE));
}

/** Bandeau narratif : compte à rebours tant que la frise n'est pas reconstituée, puis « transfert bloqué ». */
export function bandeauCompteARebours(donnees) {
  const c = donnees.compte_a_rebours;
  if (friseReussie()) {
    return creer("div", { class: "compte-rebours resolu", role: "note" }, [
      creer("span", { class: "icone", "aria-hidden": "true", texte: "✅" }),
      creer("p", {}, [creer("strong", { texte: "Affaire résolue" }), typographie(c.resolu)]),
    ]);
  }
  return creer("div", { class: "compte-rebours", role: "note" }, [
    creer("span", { class: "icone", "aria-hidden": "true", texte: "⏳" }),
    creer("p", {}, [creer("strong", { texte: c.titre }), typographie(c.texte) + " " + typographie(c.detail)]),
  ]);
}

/** Teinte stable (0-359) calculée à partir d'un texte, pour colorer les cadres d'images manquantes. */
function teinte(texte) {
  let somme = 0;
  for (const c of texte) somme = (somme * 31 + c.charCodeAt(0)) % 360;
  return somme;
}

/** Image avec repli : tant que le fichier n'existe pas, un cadre sobre affiche sa description. */
export function photo(fichier, alt, emoji, forme = "") {
  const cadre = creer("div", { class: ("photo " + forme).trim(), style: `--teinte:${teinte(fichier)}` });
  const image = creer("img", { src: `${racine()}assets/img/${fichier}`, alt, decoding: "async" });
  image.addEventListener("error", () => {
    cadre.textContent = "";
    cadre.classList.add("manquante");
    cadre.setAttribute("role", "img");
    cadre.setAttribute("aria-label", alt);
    cadre.append(
      creer("span", { class: "photo-emoji", "aria-hidden": "true", texte: emoji || "🖼️" }),
      creer("span", { class: "photo-legende", "aria-hidden": "true", texte: alt }),
    );
  });
  cadre.append(image);
  return cadre;
}

/** Mélange une liste (algorithme de Fisher-Yates) et renvoie une copie. */
export function melanger(liste) {
  const copie = [...liste];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}

/** Boîte « notion clé » avec, en option, des liens vers la suite. */
export function boiteNotion(texte, liens = []) {
  const actions = creer("div", { class: "actions-suite" });
  for (const lien of liens) {
    actions.append(creer("a", { class: "bouton" + (lien.secondaire ? " secondaire" : ""), href: lien.href, texte: lien.texte }));
  }
  return creer("div", { class: "notion" }, [
    creer("p", {}, [creer("strong", { texte: "Notion clé : " }), typographie(texte)]),
    liens.length ? actions : null,
  ]);
}

/** Message affiché à la place d'une pièce qui n'est pas encore débloquée. */
export function blocVerrouille(texte, lien) {
  return creer("section", { class: "carte" }, [
    creer("p", { texte: typographie(texte) }),
    creer("p", { class: "actions-suite" }, [creer("a", { class: "bouton", href: lien.href, texte: lien.texte })]),
  ]);
}

/**
 * Démarrage commun d'une pièce : réglages, verrou de la séance 6, chargement des données,
 * puis appel de `construire(donnees, zone)` qui remplit la page.
 */
export async function demarrerPiece(courante, construire) {
  const cadre = document.getElementById("cadre");
  const zone = document.getElementById("contenu");
  try {
    Progression.configurer(await chargerJson("data/config.json"));
    await verrouillerPage(SEANCE);
    const donnees = await chargerJson("data/synthese.json");
    cadre.prepend(navigationPieces(courante));
    cadre.hidden = false;
    await construire(donnees, zone);
  } catch (erreur) {
    cadre.hidden = false;
    zone.textContent = "Impossible de charger cette pièce. Ouvrez le site par son adresse web, puis rechargez la page.";
    console.error(erreur);
  }
}
