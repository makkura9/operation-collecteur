import { chargerJson, creer } from "./chargeur.js";
import * as Progression from "./progression.js";
import { verrouillerPage } from "./verrou.js";
import { vigenere } from "./crypto.js";

async function demarrer() {
  const cadre = document.getElementById("cadre");
  try {
    Progression.configurer(await chargerJson("data/config.json"));
    await verrouillerPage(4);
    const entree = document.getElementById("entree");
    const cle = document.getElementById("cle");
    const sortie = document.getElementById("sortie");
    function dechiffrer() { sortie.textContent = vigenere(entree.value, cle.value, -1); }
    entree.addEventListener("input", dechiffrer);
    cle.addEventListener("input", dechiffrer);
    document.getElementById("dechiffrer").addEventListener("click", dechiffrer);
    const pre = document.getElementById("pre-remplir");
    if (pre) pre.addEventListener("click", async () => {
      const d = await chargerJson("data/chiffrement.json");
      entree.value = d.vigenere.chiffre; dechiffrer();
    });
    cadre.hidden = false;
  } catch (e) { cadre.hidden = false; cadre.textContent = "Impossible de charger l'outil."; console.error(e); }
}
demarrer();
