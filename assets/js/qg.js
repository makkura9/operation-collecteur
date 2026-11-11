// Page d'accueil (QG) : affiche les six dossiers et leur état (verrouillé, ouvert, clos).

import { chargerJson, creer } from "./chargeur.js";
import * as Progression from "./progression.js";

const NOMBRE_DOSSIERS = 6;

function etatDuDossier(numero) {
  if (Progression.estClose(numero)) return "clos";
  if (Progression.estOuverte(numero)) return "ouvert";
  return "verrouille";
}

function creerCarte(seance) {
  const numero = seance.numero;
  const etat = etatDuDossier(numero);
  const lien = `seance-${numero}/index.html`;

  const carte = creer("article", { class: `dossier ${etat}` });
  carte.append(creer("p", { class: "numero", texte: `Dossier ${numero}` }));

  if (etat === "verrouille") {
    // Le titre d'un dossier verrouillé n'est volontairement pas affiché.
    carte.append(creer("h2", { texte: "Dossier verrouillé" }));
    carte.append(creer("p", { class: "statut", texte: "Demandez le code d'entrée à votre enseignant." }));
    carte.append(creer("p", { class: "actions" }, [creer("a", { class: "bouton secondaire", href: lien, texte: "Saisir le code" })]));
    carte.append(creer("span", { class: "pastille-etat", texte: "Verrouillé" }));
    return carte;
  }

  carte.append(creer("h2", { texte: seance.titre }));
  carte.append(creer("p", { class: "statut", texte: seance.accroche }));
  carte.append(creer("span", { class: "pastille-etat", texte: etat === "clos" ? "Clos" : "Ouvert" }));
  carte.append(creer("p", { class: "actions" }, [
    creer("a", { class: "bouton" + (etat === "clos" ? " secondaire" : ""), href: lien, texte: etat === "clos" ? "Revoir le dossier" : "Reprendre le dossier" }),
  ]));
  if (etat === "clos") carte.append(creer("span", { class: "tampon", texte: "Dossier clos" }));
  // Dossier 6 clos (quiz final terminé) : accès direct au certificat.
  if (etat === "clos" && numero === 6) {
    carte.querySelector(".actions").append(" ", creer("a", { class: "bouton", href: "synthese/certificat.html", texte: "Imprimer le certificat" }));
  }
  return carte;
}

/** Bandeau illustré du QG : affiché seulement quand l'image existe (sinon, rien ne change). */
function afficherBanniere(fichier) {
  if (!fichier) return;
  const image = creer("img", { class: "banniere-qg", src: `assets/img/${fichier}`, alt: "", decoding: "async" });
  image.addEventListener("error", () => image.remove());
  document.querySelector(".intro").prepend(image);
}

function afficherDossiers(seances) {
  const conteneur = document.getElementById("dossiers");
  conteneur.textContent = "";
  for (const seance of seances) conteneur.append(creerCarte(seance));

  const clos = Progression.nombreClos();
  document.getElementById("texte-progression").textContent = `Dossiers clos : ${clos} sur ${NOMBRE_DOSSIERS}`;
  document.getElementById("jauge-progression").style.width = `${Math.round((clos / NOMBRE_DOSSIERS) * 100)}%`;
}

function preparerReinitialisation(seances) {
  const zone = document.getElementById("actions-reinit");
  const bouton = document.getElementById("bouton-reinit");
  bouton.addEventListener("click", () => {
    zone.textContent = "";
    zone.append(
      creer("span", { texte: "Effacer la progression de cet ordinateur ?" }),
      creer("button", {
        type: "button", class: "bouton danger", texte: "Oui, effacer",
        onclick: () => {
          Progression.reinitialiser();
          afficherDossiers(seances);
          zone.textContent = "";
          zone.append(creer("span", { class: "message-code succes", role: "status", texte: "Progression effacée. Vous pouvez commencer avec un nouveau binôme." }));
        },
      }),
      creer("button", { type: "button", class: "bouton secondaire", texte: "Annuler", onclick: () => window.location.reload() }),
    );
  });
}

async function demarrer() {
  try {
    const [config, contenu] = await Promise.all([chargerJson("data/config.json"), chargerJson("data/seances.json")]);
    Progression.configurer(config);
    afficherBanniere(contenu.banniere_qg);
    afficherDossiers(contenu.seances);
    preparerReinitialisation(contenu.seances);
  } catch (erreur) {
    document.getElementById("dossiers").append(
      creer("p", { class: "note", texte: "Impossible de charger les dossiers. Ouvrez le site par son adresse web (pas en double-cliquant sur le fichier), puis rechargez la page." })
    );
    console.error(erreur);
  }
}

demarrer();
