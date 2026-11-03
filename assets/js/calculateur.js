// Calculateur de temps de recherche d'un mot de passe (séance 3).
// Deux modes : caractères aléatoires, ou mots tirés au hasard dans une liste.
// Les vitesses par défaut sont des ORDRES DE GRANDEUR (voir fiche enseignant, sources dans docs/journal.md).

import { chargerJson, creer } from "./chargeur.js";
import * as Progression from "./progression.js";
import { verrouillerPage } from "./verrou.js";

const AN = 365.25 * 24 * 3600;           // une année en secondes
const AGE_UNIVERS = 13.8e9 * AN;          // ~13,8 milliards d'années (Planck/ESA)

// Durée lisible (on arrondit, c'est un ordre de grandeur).
function dureeLisible(secondes) {
  if (secondes < 1) return "moins d'une seconde";
  const unites = [
    [AN * 1e9, "milliard d'années", "milliards d'années", 1e9 * AN],
    [AN * 1e6, "million d'années", "millions d'années", 1e6 * AN],
    [AN * 1000, "millénaire", "millénaires", 1000 * AN],
    [AN, "an", "ans", AN],
    [86400, "jour", "jours", 86400],
    [3600, "heure", "heures", 3600],
    [60, "minute", "minutes", 60],
    [1, "seconde", "secondes", 1],
  ];
  for (const [seuil, sing, plur, taille] of unites) {
    if (secondes >= seuil) {
      const valeur = secondes / taille;
      const arrondi = valeur >= 100 ? Math.round(valeur) : Math.round(valeur * 10) / 10;
      return `${arrondi.toLocaleString("fr-CH")} ${arrondi >= 2 ? plur : sing}`;
    }
  }
  return "moins d'une seconde";
}

function comparaisonUnivers(secondes) {
  const rapport = secondes / AGE_UNIVERS;
  if (rapport >= 1) {
    const r = rapport >= 100 ? Math.round(rapport) : Math.round(rapport * 10) / 10;
    return `soit environ ${r.toLocaleString("fr-CH")} fois l'âge de l'Univers`;
  }
  if (rapport >= 0.001) return `soit ${(rapport * 100).toFixed(1)} % de l'âge de l'Univers`;
  return null;
}

function afficher(zone, combinaisons, vitesse) {
  // Temps MOYEN pour trouver : la moitié de l'espace de recherche.
  const secondes = combinaisons / 2 / vitesse;
  zone.textContent = "";
  zone.append(
    creer("p", { class: "calc-combos", html: `Nombre de combinaisons possibles : <strong>${combinaisons.toExponential(2).replace("e+", " × 10<sup>").replace(/$/, "</sup>")}</strong>` }),
    creer("p", { class: "calc-temps", texte: `Temps moyen pour le trouver : ${dureeLisible(secondes)}` }),
  );
  const comp = comparaisonUnivers(secondes);
  if (comp) zone.append(creer("p", { class: "doux", texte: comp }));
}

async function demarrer() {
  const cadre = document.getElementById("cadre");
  try {
    Progression.configurer(await chargerJson("data/config.json"));
    await verrouillerPage(3);

    const mode = () => document.querySelector("input[name=mode]:checked").value;
    const zone = document.getElementById("resultat-calc");

    function vitesse() {
      const choix = document.querySelector("input[name=vitesse]:checked");
      if (choix.value === "perso") {
        const v = parseFloat(document.getElementById("vitesse-perso").value);
        return Number.isFinite(v) && v > 0 ? v : 1;
      }
      return parseFloat(choix.value);
    }

    function calculer() {
      document.getElementById("bloc-caracteres").hidden = mode() !== "caracteres";
      document.getElementById("bloc-mots").hidden = mode() !== "mots";
      document.getElementById("vitesse-perso").disabled = document.querySelector("input[name=vitesse]:checked").value !== "perso";
      let combinaisons;
      if (mode() === "caracteres") {
        let taille = 0;
        if (document.getElementById("minuscules").checked) taille += 26;
        if (document.getElementById("majuscules").checked) taille += 26;
        if (document.getElementById("chiffres").checked) taille += 10;
        if (document.getElementById("symboles").checked) taille += 30;
        const longueur = parseInt(document.getElementById("longueur").value, 10) || 0;
        if (taille === 0 || longueur === 0) { zone.textContent = "Choisissez au moins un type de caractère et une longueur."; return; }
        combinaisons = Math.pow(taille, longueur);
      } else {
        const taille = parseInt(document.getElementById("taille-liste").value, 10) || 0;
        const nombre = parseInt(document.getElementById("nombre-mots").value, 10) || 0;
        if (taille === 0 || nombre === 0) { zone.textContent = "Indiquez la taille de la liste et le nombre de mots."; return; }
        combinaisons = Math.pow(taille, nombre);
      }
      if (!Number.isFinite(combinaisons)) { zone.textContent = "Le nombre de combinaisons est trop grand pour être calculé : autant dire infini à notre échelle."; return; }
      afficher(zone, combinaisons, vitesse());
    }

    cadre.querySelectorAll("input, select").forEach((el) => el.addEventListener("input", calculer));
    calculer();
    cadre.hidden = false;
  } catch (erreur) {
    cadre.hidden = false;
    cadre.textContent = "Impossible de charger le calculateur. Ouvrez le site par son adresse web, puis rechargez la page.";
    console.error(erreur);
  }
}

demarrer();
