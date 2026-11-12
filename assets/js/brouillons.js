// Dossier Brouillons de MontriveMail (séance 4) : les 3 messages du Collecteur + les réponses de Kenzo.
// Les notes sous les messages donnent des consignes, jamais une réponse (ni la clé, ni une conclusion).

import { chargerJson, creer, typographie } from "./chargeur.js";
import * as Progression from "./progression.js";
import { verrouillerPage } from "./verrou.js";

async function demarrer() {
  const cadre = document.getElementById("cadre");
  try {
    Progression.configurer(await chargerJson("data/config.json"));
    await verrouillerPage(4);
    const d = await chargerJson("data/chiffrement.json");
    const liste = document.getElementById("brouillons");

    function brouillon(etiquette, date, auteur, contenu, classe, note) {
      return creer("article", { class: "brouillon " + (classe || "") }, [
        creer("div", { class: "brouillon-tete" }, [creer("span", { class: "brouillon-etiquette", texte: etiquette }), creer("span", { class: "doux", texte: date })]),
        creer("p", { class: "brouillon-auteur", texte: auteur }),
        creer("pre", { class: "brouillon-contenu", texte: contenu }),
        note ? creer("p", { class: "brouillon-note", texte: typographie(note) }) : null,
      ]);
    }

    liste.append(
      brouillon("Message chiffré 1", "19 février 2027", "Dossier Brouillons — non envoyé", d.base64.chiffre, "chiffre",
        "Ce texte n'a pas l'air d'être du français… mais il se lit peut-être avec l'un des outils du dossier."),
      brouillon("Réponse de Kenzo", "19 février 2027", "Dossier Brouillons — non envoyé",
        "Oui compte ok. C'est quand le virement ? Les 500 c'est sûr ?", "clair", null),
      brouillon("Message chiffré 2 (en 12 fragments)", "20 février 2027", "Dossier Brouillons — non envoyé",
        d.cesar.fragments.filter((f) => !f.copie_de).map((f) => `[${f.numero}] ${f.chiffre}`).join("\n"), "chiffre",
        "Ce message est découpé en 12 fragments, chacun chiffré différemment (César). Chaque binôme traite SON numéro avec la roue de César, puis la classe remet les fragments dans l'ordre. Attention : les numéros ne donnent pas l'ordre du message."),
      brouillon("Message chiffré 3", "27 février 2027", "Dossier Brouillons — non envoyé", d.vigenere.chiffre, "chiffre",
        "Chiffré avec Vigenère. " + d.vigenere.indice + " Utilisez le déchiffreur de Vigenère."),
      brouillon("Réponse de Kenzo", "27 février 2027", "Dossier Brouillons — non envoyé",
        "Ok j'attends le 19 pour transférer comme tu dis.", "clair", null),
    );
    cadre.hidden = false;
  } catch (e) { cadre.hidden = false; cadre.textContent = "Impossible de charger les brouillons."; console.error(e); }
}
demarrer();
