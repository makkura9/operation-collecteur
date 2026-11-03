// Affichage de la fuite ArenaZone (séance 3). Lecture seule : pseudo, e-mail, empreinte SHA-256.

import { chargerJson, creer } from "./chargeur.js";
import * as Progression from "./progression.js";
import { verrouillerPage } from "./verrou.js";

async function demarrer() {
  const cadre = document.getElementById("cadre");
  try {
    Progression.configurer(await chargerJson("data/config.json"));
    await verrouillerPage(3);
    const fuite = await chargerJson("data/fuite-arenazone.json");
    document.getElementById("nb").textContent = String(fuite.comptes.length);
    const filtre = document.getElementById("filtre");
    const tbody = document.getElementById("corps-fuite");
    function dessiner() {
      const terme = filtre.value.trim().toLowerCase();
      tbody.textContent = "";
      for (const c of fuite.comptes) {
        if (terme && !(c.pseudo + " " + c.email).toLowerCase().includes(terme)) continue;
        tbody.append(creer("tr", {}, [
          creer("td", { texte: c.pseudo }),
          creer("td", { texte: c.email }),
          creer("td", { class: "empreinte" }, [creer("code", { texte: c.empreinte })]),
        ]));
      }
    }
    filtre.addEventListener("input", dessiner);
    dessiner();
    cadre.hidden = false;
  } catch (erreur) {
    cadre.hidden = false;
    cadre.textContent = "Impossible de charger la fuite. Ouvrez le site par son adresse web, puis rechargez la page.";
    console.error(erreur);
  }
}

demarrer();
