// Roue de César (séance 4) : charge un fragment par numéro de binôme, puis affiche les 25 décalages.

import { chargerJson, creer } from "./chargeur.js";
import * as Progression from "./progression.js";
import { verrouillerPage } from "./verrou.js";
import { cesar, tousLesDecalages, majuscules } from "./crypto.js";

let fragments = [];

async function demarrer() {
  const cadre = document.getElementById("cadre");
  try {
    Progression.configurer(await chargerJson("data/config.json"));
    await verrouillerPage(4);
    const donnees = await chargerJson("data/chiffrement.json");
    fragments = donnees.cesar.fragments;
    document.getElementById("nb-fragments").textContent = String(donnees.cesar.nombre_fragments);

    const entree = document.getElementById("entree");
    const numero = document.getElementById("numero");
    const infoFragment = document.getElementById("info-fragment");

    document.getElementById("charger").addEventListener("click", () => {
      const n = parseInt(numero.value, 10);
      const frag = fragments.find((f) => f.numero === n);
      if (!frag) { infoFragment.textContent = "Numéro inconnu. Choisissez un numéro entre 1 et " + fragments.length + "."; return; }
      entree.value = frag.chiffre;
      infoFragment.textContent = frag.copie_de ? `Fragment ${n} (copie de contrôle du fragment ${frag.copie_de}).` : `Fragment ${n} chargé. Trouvez le bon décalage ci-dessous.`;
      afficher();
    });

    const tableau = document.getElementById("decalages");
    function afficher() {
      const texte = majuscules(entree.value);
      tableau.textContent = "";
      if (!texte.trim()) return;
      for (const { decalage, texte: resultat } of tousLesDecalages(texte)) {
        tableau.append(creer("tr", {}, [
          creer("td", { class: "num-decalage", texte: "+" + decalage }),
          creer("td", { class: "mono resultat-decalage", texte: resultat }),
        ]));
      }
    }
    entree.addEventListener("input", afficher);
    cadre.hidden = false;
  } catch (e) { cadre.hidden = false; cadre.textContent = "Impossible de charger l'outil."; console.error(e); }
}
demarrer();
