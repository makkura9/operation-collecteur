// Affichage simple d'un journal (kit de phishing, journal de connexion). Lecture seule.
// Le fichier de données et le numéro de séance sont lus sur <body data-journal="..." data-seance="...">.

import { chargerJson, creer, typographie } from "./chargeur.js";
import * as Progression from "./progression.js";
import { verrouillerPage } from "./verrou.js";

const formatHeure = new Intl.DateTimeFormat("fr-CH", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

function cellule(colonne, ligne) {
  if (colonne === "Date et heure" || colonne === "Horodatage") {
    const d = new Date(ligne.date);
    return formatHeure.format(d).replace(",", " ·");
  }
  const cle = { "Adresse e-mail saisie": "email", "Mot de passe saisi": "motdepasse", "Service": "service", "Appareil": "appareil", "Lieu estimé": "lieu", "Résultat": "resultat" }[colonne];
  return ligne[cle] ?? "";
}

async function demarrer() {
  const cadre = document.getElementById("cadre");
  try {
    Progression.configurer(await chargerJson("data/config.json"));
    const seance = Number(document.body.dataset.seance);
    await verrouillerPage(seance);
    const donnees = await chargerJson("data/" + document.body.dataset.journal + ".json");
    document.getElementById("titre-journal").textContent = donnees.titre;
    document.getElementById("intro-journal").textContent = typographie(donnees.intro);

    const thead = document.getElementById("entete-journal");
    thead.append(creer("tr", {}, donnees.colonnes.map((c) => creer("th", { scope: "col", texte: c }))));
    const tbody = document.getElementById("corps-journal");
    for (const ligne of donnees.lignes) {
      const tr = creer("tr", { class: ligne.suspecte ? "suspecte" : "" });
      for (const colonne of donnees.colonnes) {
        const valeur = cellule(colonne, ligne);
        const estMotDePasse = colonne === "Mot de passe saisi";
        tr.append(creer("td", estMotDePasse ? { class: "mono" } : {}, [estMotDePasse ? creer("code", { texte: valeur }) : typographie(String(valeur))]));
      }
      if (ligne.suspecte) tr.append();
      tbody.append(tr);
    }
    if (donnees.lignes.some((l) => l.suspecte)) document.getElementById("legende-suspecte").hidden = false;
    document.getElementById("note-journal").textContent = typographie(donnees.note);
    cadre.hidden = false;
  } catch (erreur) {
    cadre.hidden = false;
    cadre.textContent = "Impossible de charger le journal. Ouvrez le site par son adresse web, puis rechargez la page.";
    console.error(erreur);
  }
}

demarrer();
