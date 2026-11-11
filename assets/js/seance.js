// Page d'une séance : verrou d'entrée, briefing (audio + texte), mission, pièces, code de sortie.
// Le contenu vient de data/seances.json ; le numéro de séance est lu dans <body data-seance="n">.

import { chargerJson, creer, racine, typographie } from "./chargeur.js";
import * as Progression from "./progression.js";
import { verrouillerPage, afficherFormulaireSortie } from "./verrou.js";

async function audioExiste(adresse) {
  try {
    const reponse = await fetch(adresse, { method: "HEAD", cache: "no-cache" });
    return reponse.ok;
  } catch (erreur) {
    return false;
  }
}

/**
 * Image facultative : tant que le fichier n'existe pas dans assets/img/, l'élément `aRetirer`
 * (l'image elle-même ou son cadre) disparaît, sans laisser de trou dans la page.
 */
function imageFacultative(fichier, alt, classe, aRetirer = null) {
  const image = creer("img", { src: `${racine()}assets/img/${fichier}`, alt, class: classe, decoding: "async" });
  image.addEventListener("error", () => {
    const cible = aRetirer || image;
    const parent = cible.parentElement;
    cible.remove();
    // Un groupe de portraits devenu vide disparaît lui aussi.
    if (parent && parent.classList.contains("portraits") && !parent.children.length) parent.remove();
  });
  return image;
}

/** Portraits des personnages du briefing (Keller, puis selon le dossier M. Favre ou le Collecteur). */
function blocPortraits(seance, portraits) {
  const ids = (seance.portraits || []).filter((id) => portraits && portraits[id]);
  if (!ids.length) return null;
  const groupe = creer("div", { class: "portraits" });
  for (const id of ids) {
    const p = portraits[id];
    const figure = creer("figure", { class: "portrait" });
    figure.append(imageFacultative(p.image, p.alt, "", figure), creer("figcaption", { texte: typographie(p.legende) }));
    groupe.append(figure);
  }
  return groupe;
}

async function blocBriefing(seance, portraits) {
  const bloc = creer("section", { class: "carte bloc-seance briefing", "aria-labelledby": "titre-briefing" }, [
    creer("h2", { id: "titre-briefing", texte: "Briefing de la Commandante Keller" }),
    blocPortraits(seance, portraits),
  ]);
  const adresseAudio = `${racine()}assets/audio/${seance.audio}`;
  if (await audioExiste(adresseAudio)) {
    bloc.append(creer("audio", { controls: true, preload: "none", src: adresseAudio }));
  } else {
    bloc.append(creer("p", { class: "audio-indisponible", texte: "L'enregistrement audio de ce briefing n'est pas encore disponible. Lisez le texte ci-dessous." }));
  }
  const texte = creer("div", { class: "texte-briefing" });
  for (const paragraphe of seance.briefing) texte.append(creer("p", { texte: typographie(paragraphe) }));
  bloc.append(texte);
  return bloc;
}

function blocMission(seance) {
  const liste = creer("ul");
  for (const consigne of seance.mission) liste.append(creer("li", { texte: typographie(consigne) }));
  return creer("section", { class: "carte bloc-seance mission", "aria-labelledby": "titre-mission" }, [
    creer("h2", { id: "titre-mission", texte: "Votre mission" }),
    liste,
  ]);
}

function blocPieces(seance) {
  const grille = creer("div", { class: "liste-pieces" });
  for (const piece of seance.pieces) {
    const contenu = [creer("strong", { texte: piece.titre }), creer("span", { texte: typographie(piece.texte) })];
    if (piece.dispo) {
      grille.append(creer("a", { class: "piece", href: racine() + piece.url }, contenu));
    } else {
      contenu.push(creer("span", { texte: " (bientôt disponible)" }));
      grille.append(creer("div", { class: "piece indisponible" }, contenu));
    }
  }
  return creer("section", { class: "carte bloc-seance", "aria-labelledby": "titre-pieces" }, [
    creer("h2", { id: "titre-pieces", texte: "Les pièces du dossier" }),
    grille,
  ]);
}

function blocSortie(seance) {
  const zone = creer("div");
  const bloc = creer("section", { class: "carte bloc-seance sortie", "aria-labelledby": "titre-sortie" }, [
    creer("h2", { id: "titre-sortie", texte: "Code de sortie" }),
    creer("p", { texte: "Quand votre enquête est terminée, saisissez le code de sortie pour clore le dossier." }),
    zone,
  ]);
  afficherFormulaireSortie(seance.numero, zone, { consigne: typographie(seance.sortie.consigne) });
  return bloc;
}

async function demarrer() {
  const numero = Number(document.body.dataset.seance);
  const main = document.getElementById("contenu");
  try {
    const config = await chargerJson("data/config.json");
    Progression.configurer(config);

    await verrouillerPage(numero);

    const donnees = await chargerJson("data/seances.json");
    const seance = donnees.seances.find((s) => s.numero === numero);
    if (!seance) throw new Error("Séance inconnue");
    document.title = `Dossier ${numero} — ${seance.titre} — Cellule ARGOS`;

    main.textContent = "";
    main.append(
      creer("header", { class: "titre-seance" }, [
        seance.bandeau ? imageFacultative(seance.bandeau, "", "bandeau-seance") : null,
        creer("p", { class: "etiquette", texte: `Dossier ${numero}` }),
        creer("h1", { texte: seance.titre }),
        creer("p", { class: "bandeau-cadrage", texte: typographie(donnees.cadrage) }),
      ]),
      await blocBriefing(seance, donnees.portraits),
      blocMission(seance),
      blocPieces(seance),
    );
    if (seance.sortie) main.append(blocSortie(seance));
    main.append(creer("p", {}, [creer("a", { href: `${racine()}index.html`, texte: "← Retour au QG" })]));
    main.hidden = false;
  } catch (erreur) {
    main.hidden = false;
    main.textContent = "";
    main.append(creer("p", { class: "note", texte: "Impossible de charger ce dossier. Ouvrez le site par son adresse web, puis rechargez la page." }));
    console.error(erreur);
  }
}

demarrer();
