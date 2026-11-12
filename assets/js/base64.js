import { chargerJson, creer } from "./chargeur.js";
import * as Progression from "./progression.js";
import { verrouillerPage } from "./verrou.js";
import { base64Decode, base64Encode } from "./crypto.js";

async function demarrer() {
  const cadre = document.getElementById("cadre");
  try {
    Progression.configurer(await chargerJson("data/config.json"));
    await verrouillerPage(4);
    const entree = document.getElementById("entree");
    const sortie = document.getElementById("sortie");
    function decoder() {
      try { sortie.textContent = base64Decode(entree.value); }
      catch (e) { sortie.textContent = "(Ce texte n'est pas du Base64 valide.)"; }
    }
    document.getElementById("decoder").addEventListener("click", decoder);
    document.getElementById("encoder").addEventListener("click", () => { sortie.textContent = base64Encode(entree.value); });
    const pre = document.getElementById("pre-remplir");
    if (pre) pre.addEventListener("click", async () => {
      const d = await chargerJson("data/chiffrement.json");
      entree.value = d.base64.chiffre;   // on charge seulement : c'est l'élève qui décode
      sortie.textContent = "";
    });
    cadre.hidden = false;
  } catch (e) { cadre.hidden = false; cadre.textContent = "Impossible de charger l'outil."; console.error(e); }
}
demarrer();
