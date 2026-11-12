// Historique de navigation de Robin (séance 2). Contenu : data/historique.json.

import { chargerJson, creer, typographie } from "./chargeur.js";
import * as Progression from "./progression.js";
import { verrouillerPage } from "./verrou.js";

const formatJour = new Intl.DateTimeFormat("fr-CH", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const formatHeure = new Intl.DateTimeFormat("fr-CH", { hour: "2-digit", minute: "2-digit" });

function dessiner(entrees, filtre = "") {
  const corps = document.getElementById("corps-historique");
  const terme = filtre.trim().toLowerCase();
  corps.textContent = "";
  let affiches = 0;
  for (const e of entrees) {
    const d = new Date(e.date);
    const jour = formatJour.format(d);
    const heure = formatHeure.format(d);
    const texte = `${jour} ${heure} ${heure.replace(":", " h ")} ${e.titre} ${e.url}`.toLowerCase();
    if (terme && !texte.includes(terme)) continue;
    affiches++;
    // L'adresse est affichée telle quelle, sans mise en évidence : repérer le domaine est le travail de l'élève.
    corps.append(creer("tr", {}, [
      creer("td", { class: "nowrap" }, [creer("span", { class: "jour", texte: jour }), creer("br"), creer("strong", { texte: formatHeure.format(d).replace(":", " h ") })]),
      creer("td", { texte: typographie(e.titre) }),
      creer("td", { class: "url", texte: e.url }),
    ]));
  }
  document.getElementById("aucun").hidden = affiches > 0;
}

async function demarrer() {
  const cadre = document.getElementById("cadre");
  try {
    Progression.configurer(await chargerJson("data/config.json"));
    await verrouillerPage(2);
    const donnees = await chargerJson("data/historique.json");
    document.getElementById("periode").textContent = `${donnees.periode}.`;
    const filtre = document.getElementById("filtre");
    filtre.addEventListener("input", () => dessiner(donnees.entrees, filtre.value));
    dessiner(donnees.entrees);
    cadre.hidden = false;
  } catch (erreur) {
    cadre.hidden = false;
    cadre.textContent = "Impossible de charger l'historique. Ouvrez le site par son adresse web, puis rechargez la page.";
    console.error(erreur);
  }
}

demarrer();
