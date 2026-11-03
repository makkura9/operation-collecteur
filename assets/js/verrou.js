// Écrans de saisie des codes : verrou d'entrée d'une séance et formulaire du code de sortie.

import { creer } from "./chargeur.js";
import { verifierEntree, verifierSortie, sortieSensibleCasse } from "./codes.js";
import * as Progression from "./progression.js";

const MESSAGE_ERREUR_ENTREE =
  "Ce code n'est pas le bon. Vérifiez votre saisie (les majuscules, les accents et les espaces autour du code n'ont pas d'importance).";

/** Construit un formulaire « un champ + un bouton » et appelle `traiter(saisie)` à l'envoi. */
function construireFormulaire({ identifiant, etiquette, bouton, aide, traiter }) {
  const champ = creer("input", {
    id: identifiant, type: "text", autocomplete: "off", autocapitalize: "off",
    spellcheck: "false", required: true, class: "champ-code",
  });
  const message = creer("p", { class: "message-code", role: "status", "aria-live": "polite" });
  const formulaire = creer("form", { class: "formulaire-code", novalidate: true }, [
    creer("label", { for: identifiant, texte: etiquette }),
    aide ? creer("p", { class: "aide", texte: aide }) : null,
    creer("div", { class: "ligne-code" }, [champ, creer("button", { type: "submit", class: "bouton", texte: bouton })]),
    message,
  ]);
  formulaire.addEventListener("submit", async (evenement) => {
    evenement.preventDefault();
    message.className = "message-code";
    message.textContent = "";
    const saisie = champ.value;
    if (!saisie.trim()) {
      message.textContent = "Saisissez d'abord un code.";
      message.classList.add("erreur");
      champ.focus();
      return;
    }
    try {
      const resultat = await traiter(saisie);
      if (resultat && resultat.succes) {
        message.textContent = resultat.message || "";
        message.classList.add("succes");
      } else {
        message.textContent = (resultat && resultat.message) || MESSAGE_ERREUR_ENTREE;
        message.classList.add("erreur");
        champ.select();
      }
    } catch (erreur) {
      message.textContent = erreur.message;
      message.classList.add("erreur");
    }
  });
  return { formulaire, champ, message };
}

/**
 * Affiche l'écran « Code d'entrée de la séance n » tant que la séance n'est pas ouverte.
 * `numeros` : un numéro de séance, ou une liste pour une pièce partagée entre plusieurs séances
 * (par exemple le site de l'agence, utilisé en séances 1, 2 et 5) : il suffit alors que l'une d'elles
 * soit ouverte, et le code d'entrée de n'importe laquelle est accepté.
 * Renvoie une promesse résolue quand la pièce est ouverte (tout de suite si elle l'était déjà).
 */
export function verrouillerPage(numeros, lienRetour = "../index.html") {
  const liste = [].concat(numeros);
  if (liste.some((n) => Progression.estOuverte(n))) return Promise.resolve();
  const intitule = liste.length === 1
    ? `Code d'entrée de la séance ${liste[0]}`
    : `Code d'entrée de la séance ${liste.slice(0, -1).join(", ")} ou ${liste[liste.length - 1]}`;
  return new Promise((resoudre) => {
    const { formulaire, champ } = construireFormulaire({
      identifiant: "code-entree",
      etiquette: intitule,
      aide: "Votre enseignant vous donne ce code au début du cours.",
      bouton: "Ouvrir le dossier",
      traiter: async (saisie) => {
        for (const numero of liste) {
          const resultat = await verifierEntree(numero, saisie);
          if (!resultat) continue;
          if (resultat === "maitre") Progression.ouvrirTout();
          else Progression.ouvrir(numero);
          ecran.remove();
          document.body.classList.remove("verrouille");
          resoudre();
          return { succes: true };
        }
        return { succes: false };
      },
    });
    const ecran = creer("div", { class: "verrou", role: "dialog", "aria-modal": "true", "aria-labelledby": "titre-verrou" }, [
      creer("div", { class: "verrou-boite" }, [
        creer("p", { class: "etiquette", texte: liste.length === 1 ? `Dossier ${liste[0]}` : "Pièce du dossier" }),
        creer("h1", { id: "titre-verrou", texte: "Accès protégé" }),
        formulaire,
        creer("p", { class: "verrou-retour" }, [creer("a", { href: lienRetour, texte: "← Retour au QG" })]),
      ]),
    ]);
    document.body.classList.add("verrouille");
    document.body.append(ecran);
    champ.focus();
  });
}

/**
 * Insère dans `conteneur` le formulaire du code de sortie de la séance `numero`.
 * `auSucces` est appelé quand le code est bon (le dossier est alors marqué « clos »).
 */
export async function afficherFormulaireSortie(numero, conteneur, { consigne, auSucces } = {}) {
  conteneur.textContent = "";
  if (Progression.estClose(numero)) {
    conteneur.append(creer("p", { class: "message-code succes", texte: "Code de sortie validé : ce dossier est clos." }));
    return;
  }
  const sensible = await sortieSensibleCasse(numero);
  const { formulaire } = construireFormulaire({
    identifiant: "code-sortie",
    etiquette: `Code de sortie de la séance ${numero}`,
    aide: (consigne || "") + (sensible ? " Attention : pour ce code, les majuscules et les minuscules comptent." : ""),
    bouton: "Valider le code",
    traiter: async (saisie) => {
      const resultat = await verifierSortie(numero, saisie);
      if (!resultat) {
        return { succes: false, message: "Ce n'est pas encore le bon code de sortie. Relisez vos indices et vérifiez votre saisie." };
      }
      Progression.clore(numero);
      if (auSucces) auSucces();
      return { succes: true, message: "Bravo, analystes : code de sortie validé. Le dossier est clos." };
    },
  });
  conteneur.append(formulaire);
}
