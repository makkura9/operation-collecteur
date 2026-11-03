// Analyseur de fréquences (séance 4, bonus). Compte les lettres et compare au français.

import { chargerJson, creer } from "./chargeur.js";
import * as Progression from "./progression.js";
import { verrouillerPage } from "./verrou.js";
import { frequences, FREQUENCES_FR } from "./crypto.js";

async function demarrer() {
  const cadre = document.getElementById("cadre");
  try {
    Progression.configurer(await chargerJson("data/config.json"));
    await verrouillerPage(4);
    const entree = document.getElementById("entree");
    const graphe = document.getElementById("graphe");
    const total = document.getElementById("total");
    const maxFr = Math.max(...Object.values(FREQUENCES_FR));

    function dessiner() {
      const { total: n, liste } = frequences(entree.value);
      total.textContent = String(n);
      const maxTexte = Math.max(1, ...liste.map((l) => l.pourcentage));
      const maximum = Math.max(maxTexte, maxFr);
      graphe.textContent = "";
      for (const { lettre, nombre, pourcentage } of liste) {
        const ref = FREQUENCES_FR[lettre] || 0;
        graphe.append(creer("div", { class: "ligne-freq" }, [
          creer("span", { class: "freq-lettre", texte: lettre }),
          creer("span", { class: "freq-barres" }, [
            creer("span", { class: "barre-texte", style: `width:${(pourcentage / maximum) * 100}%`, title: `${pourcentage.toFixed(1)} % dans votre texte` }),
            creer("span", { class: "barre-ref", style: `width:${(ref / maximum) * 100}%`, title: `${ref} % en français` }),
          ]),
          creer("span", { class: "freq-val", texte: nombre ? `${pourcentage.toFixed(1)} %` : "—" }),
        ]));
      }
    }
    entree.addEventListener("input", dessiner);
    const pre = document.getElementById("pre-remplir");
    if (pre) pre.addEventListener("click", async () => {
      const d = await chargerJson("data/chiffrement.json");
      entree.value = d.vigenere.chiffre; dessiner();
    });
    dessiner();
    cadre.hidden = false;
  } catch (e) { cadre.hidden = false; cadre.textContent = "Impossible de charger l'outil."; console.error(e); }
}
demarrer();
