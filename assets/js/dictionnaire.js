// Générateur de dictionnaire personnalisé (séance 3). Le dictionnaire est mémorisé (annexe)
// pour servir à l'outil de craquage.

import { chargerJson, creer } from "./chargeur.js";
import * as Progression from "./progression.js";
import { verrouillerPage } from "./verrou.js";
import { genererVariantes } from "./mots-de-passe.js";

async function demarrer() {
  const cadre = document.getElementById("cadre");
  try {
    Progression.configurer(await chargerJson("data/config.json"));
    await verrouillerPage(3);
    const def = await chargerJson("data/dictionnaire.json");
    const champMots = document.getElementById("mots");
    const champDates = document.getElementById("dates");
    const avecAnnees = document.getElementById("avec-annees");
    champMots.value = def.suggestions.join(", ");
    document.getElementById("plage-annees").textContent = `${def.annee_min}–${def.annee_max}`;

    const apercu = document.getElementById("apercu");
    const compte = document.getElementById("compte-candidats");

    function generer() {
      const mots = champMots.value.split(/[,\n;]+/).map((m) => m.trim()).filter(Boolean);
      const dates = champDates.value.split(/[,\n;]+/).map((m) => m.trim()).filter(Boolean);
      const candidats = genererVariantes(mots, { anneeMin: def.annee_min, anneeMax: def.annee_max, avecAnnees: avecAnnees.checked, dates });
      Progression.ecrireAnnexe("dico-perso", candidats);
      compte.textContent = String(candidats.length);
      apercu.textContent = "";
      for (const c of candidats.slice(0, 40)) apercu.append(creer("code", { texte: c }));
      if (candidats.length > 40) apercu.append(creer("span", { class: "doux", texte: ` … et ${candidats.length - 40} autres` }));
      document.getElementById("lien-craquage").hidden = candidats.length === 0;
    }

    document.getElementById("bouton-generer").addEventListener("click", generer);
    champMots.addEventListener("input", generer);
    champDates.addEventListener("input", generer);
    avecAnnees.addEventListener("change", generer);
    generer();
    cadre.hidden = false;
  } catch (erreur) {
    cadre.hidden = false;
    cadre.textContent = "Impossible de charger l'outil. Ouvrez le site par son adresse web, puis rechargez la page.";
    console.error(erreur);
  }
}

demarrer();
