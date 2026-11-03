// Outil de craquage (séance 3) : essaie un dictionnaire contre la fuite ArenaZone.

import { chargerJson, creer, typographie } from "./chargeur.js";
import * as Progression from "./progression.js";
import { verrouillerPage } from "./verrou.js";
import { genererVariantes, craquer } from "./mots-de-passe.js";

let fuite = null;
let courants = null;

function afficherResultat(zone, titreDico, resultat, nbComptes) {
  zone.textContent = "";
  zone.append(
    creer("p", { class: "resultat-essais", texte: `Dictionnaire « ${titreDico} » : ${resultat.essais} essais contre ${nbComptes} comptes.` }),
  );
  if (!resultat.trouves.length) {
    zone.append(creer("p", { texte: "Aucun mot de passe retrouvé avec ce dictionnaire." }));
    return;
  }
  const liste = creer("ul", { class: "liste-trouves" });
  for (const t of resultat.trouves) {
    const estRobin = t.email.endsWith("@montrivemail.ch");
    liste.append(creer("li", { class: estRobin ? "robin" : "" }, [
      creer("strong", { texte: t.pseudo }), " (", t.email, ") → ",
      creer("code", { texte: t.motDePasse }),
      estRobin ? creer("span", { class: "etiquette-robin", texte: " ← le compte de Robin !" }) : null,
    ]));
  }
  zone.append(creer("p", { class: "resultat-trouves", texte: `${resultat.trouves.length} mot(s) de passe retrouvé(s) :` }), liste);
}

async function demarrer() {
  const cadre = document.getElementById("cadre");
  try {
    Progression.configurer(await chargerJson("data/config.json"));
    await verrouillerPage(3);
    [fuite, courants] = await Promise.all([chargerJson("data/fuite-arenazone.json"), chargerJson("data/mots-de-passe-courants.json")]);
    document.getElementById("nb-comptes").textContent = String(fuite.comptes.length);

    const zone = document.getElementById("resultat-craquage");
    const progression = document.getElementById("progression-craquage");
    const majProgression = (faits, total) => { progression.textContent = `Calcul en cours… ${faits} / ${total} empreintes testées.`; };

    document.getElementById("bouton-courants").addEventListener("click", async (e) => {
      e.target.disabled = true;
      progression.hidden = false;
      const resultat = await craquer(courants.mots, fuite.comptes, majProgression);
      progression.hidden = true;
      afficherResultat(zone, "mots de passe courants", resultat, fuite.comptes.length);
      zone.focus();
      e.target.disabled = false;
    });

    const boutonPerso = document.getElementById("bouton-perso");
    const dicoPerso = Progression.lireAnnexe("dico-perso");
    if (dicoPerso && dicoPerso.length) {
      document.getElementById("info-perso").textContent = `Votre dictionnaire personnalisé contient ${dicoPerso.length} candidats (construit avec l'outil « Dictionnaire personnalisé »).`;
      boutonPerso.disabled = false;
      boutonPerso.addEventListener("click", async (e) => {
        e.target.disabled = true;
        progression.hidden = false;
        const resultat = await craquer(dicoPerso, fuite.comptes, majProgression);
        progression.hidden = true;
        afficherResultat(zone, "dictionnaire personnalisé", resultat, fuite.comptes.length);
        zone.focus();
        e.target.disabled = false;
      });
    }
    cadre.hidden = false;
  } catch (erreur) {
    cadre.hidden = false;
    cadre.textContent = "Impossible de charger l'outil. Ouvrez le site par son adresse web, puis rechargez la page.";
    console.error(erreur);
  }
}

demarrer();
