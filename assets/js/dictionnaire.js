// Générateur de dictionnaire personnalisé (séance 3).
//
// Règle pédagogique : l'outil ne propose RIEN d'avance. Le mot de passe de Robin ne peut être
// retrouvé que si le binôme saisit lui-même les bons mots ET une date ou une année utile, tirés
// de sa fiche cible. Le dictionnaire obtenu est mémorisé (annexe) pour l'outil de craquage ;
// la saisie du binôme l'est aussi, pour survivre à un rechargement de la page.

import { chargerJson, creer } from "./chargeur.js";
import * as Progression from "./progression.js";
import { verrouillerPage } from "./verrou.js";
import { genererVariantes, suffixesDeDates } from "./mots-de-passe.js";

export const ANNEXE_DICTIONNAIRE = "dictionnaire-perso";   // lu par l'outil de craquage
const ANNEXE_SAISIE = "dictionnaire-saisie";               // { mots, dates } tels que saisis

const decouper = (texte) => texte.split(/[,\n;]+/).map((m) => m.trim()).filter(Boolean);

async function demarrer() {
  const cadre = document.getElementById("cadre");
  try {
    Progression.configurer(await chargerJson("data/config.json"));
    await verrouillerPage(3);
    const champMots = document.getElementById("mots");
    const champDates = document.getElementById("dates");
    const apercu = document.getElementById("apercu");
    const compte = document.getElementById("compte-candidats");
    const ignorees = document.getElementById("dates-ignorees");

    function generer() {
      const mots = decouper(champMots.value);
      const dates = decouper(champDates.value);
      const candidats = genererVariantes(mots, { dates });
      Progression.ecrireAnnexe(ANNEXE_DICTIONNAIRE, candidats);
      Progression.ecrireAnnexe(ANNEXE_SAISIE, { mots: champMots.value, dates: champDates.value });
      compte.textContent = String(candidats.length);
      apercu.textContent = "";
      for (const c of candidats.slice(0, 40)) apercu.append(creer("code", { texte: c }));
      if (candidats.length > 40) apercu.append(creer("span", { class: "doux", texte: ` … et ${candidats.length - 40} autres` }));
      document.getElementById("lien-craquage").hidden = candidats.length === 0;
      // Dates non comprises : on le dit, sans rien deviner à la place de l'élève.
      const nonComprises = suffixesDeDates(dates).ignorees;
      ignorees.hidden = nonComprises.length === 0;
      ignorees.textContent = nonComprises.length
        ? `Non reconnu : ${nonComprises.join(", ")}. Écrivez les dates en chiffres, par exemple 31.12.1999 ou 1999.`
        : "";
    }

    // Seule la saisie du binôme lui-même est restaurée (jamais de valeur fournie par le site).
    const saisie = Progression.lireAnnexe(ANNEXE_SAISIE);
    if (saisie && typeof saisie === "object") {
      champMots.value = typeof saisie.mots === "string" ? saisie.mots : "";
      champDates.value = typeof saisie.dates === "string" ? saisie.dates : "";
      if (champMots.value.trim()) generer();
    }

    document.getElementById("bouton-generer").addEventListener("click", generer);
    champMots.addEventListener("input", generer);
    champDates.addEventListener("input", generer);
    cadre.hidden = false;
  } catch (erreur) {
    cadre.hidden = false;
    cadre.textContent = "Impossible de charger l'outil. Ouvrez le site par son adresse web, puis rechargez la page.";
    console.error(erreur);
  }
}

demarrer();
