// Grille de classement (séance 2) : pour chacun des 25 messages, choisir une catégorie et un indice.
// Correction automatique et score. Les choix sont mémorisés dans ce navigateur uniquement (annexe « classement »).
//
// Règle pédagogique : la grille ne donne jamais une réponse que le binôme n'a pas trouvée.
//  - une ligne incomplète n'est pas corrigée ;
//  - l'explication d'un message ne s'affiche que si sa catégorie ET son indice sont justes.

import { chargerJson, creer, typographie } from "./chargeur.js";
import * as Progression from "./progression.js";
import { verrouillerPage } from "./verrou.js";
import { creerLecteur, ouvrirPageDuLien, dateCourte } from "./mail-lecteur.js";

let donnees = null;
let reponses = {};      // { idMessage: { categorie, indice } }
let corrige = false;
let solutionsVisibles = false;

const NOM_ANNEXE = "classement";

function sauvegarder() { Progression.ecrireAnnexe(NOM_ANNEXE, reponses); }

function ouvrirLecture(mail, declencheur) {
  const fond = creer("div", { class: "pf-fond", role: "dialog", "aria-modal": "true", "aria-label": `Message : ${mail.objet}` });
  const fermer = () => { document.removeEventListener("keydown", auClavier); fond.remove(); declencheur.focus(); };
  const auClavier = (e) => { if (e.key === "Escape" && !document.querySelector(".pf-fond ~ .pf-fond")) fermer(); };
  fond.append(creer("div", { class: "pf-boite mail-boite" }, [
    creerLecteur(mail, { auClicLien: (lien, a) => ouvrirPageDuLien(lien, a) }),
    creer("p", { class: "pf-pied" }, [creer("button", { type: "button", class: "bouton secondaire", onclick: fermer, texte: "Fermer le message" })]),
  ]));
  fond.addEventListener("click", (e) => { if (e.target === fond) fermer(); });
  document.addEventListener("keydown", auClavier);
  document.body.append(fond);
  fond.querySelector("button").focus({ preventScroll: true });
}

function selecteur(identifiant, options, valeur, etiquette, auChangement) {
  const select = creer("select", { id: identifiant, "aria-label": etiquette }, [
    creer("option", { value: "", texte: "—" }),
    ...options.map((o) => creer("option", { value: o.id, texte: typographie(o.texte), selected: o.id === valeur })),
  ]);
  select.addEventListener("change", () => auChangement(select.value));
  return select;
}

function dessiner() {
  const corps = document.getElementById("corps-grille");
  corps.textContent = "";
  for (const mail of donnees.mails) {
    const rep = reponses[mail.id] || {};
    const complete = Boolean(rep.categorie && rep.indice);
    const resultat = corrige && complete ? evaluer(mail, rep) : null;
    const juste = Boolean(resultat && resultat.categorie && resultat.indice);

    const ligne = creer("tr", { class: resultat ? (juste ? "ok" : "ko") : "" });
    const boutonLire = creer("button", { type: "button", class: "bouton secondaire petit", texte: "Lire" });
    boutonLire.addEventListener("click", () => ouvrirLecture(mail, boutonLire));

    ligne.append(
      creer("td", { class: "col-message" }, [
        creer("strong", { texte: mail.de.nom }), creer("span", { class: "doux", texte: ` · ${dateCourte(mail.date)}` }),
        creer("div", { texte: typographie(mail.objet) }),
        boutonLire,
      ]),
      creer("td", {}, [selecteur(`cat-${mail.id}`, donnees.categories, rep.categorie, `Catégorie du message « ${mail.objet} »`, (v) => { rep.categorie = v; reponses[mail.id] = rep; sauvegarder(); })]),
      creer("td", {}, [selecteur(`ind-${mail.id}`, donnees.indices, rep.indice, `Indice du message « ${mail.objet} »`, (v) => { rep.indice = v; reponses[mail.id] = rep; sauvegarder(); })]),
      creer("td", { class: "col-resultat", "aria-live": "polite" }, resultat ? [
        creer("span", { class: resultat.categorie ? "bon" : "mauvais", texte: resultat.categorie ? "✓ Catégorie" : "✗ Catégorie" }),
        creer("span", { class: resultat.indice ? "bon" : "mauvais", texte: resultat.indice ? "✓ Indice" : "✗ Indice" }),
      ] : (corrige ? [creer("span", { class: "doux", texte: "À compléter" })] : [])),
    );
    corps.append(ligne);

    // L'explication récompense une ligne entièrement juste : elle ne sert jamais de corrigé.
    if (juste && solutionsVisibles) {
      corps.append(creer("tr", { class: "explication" }, [
        creer("td", { colspan: "4" }, [creer("strong", { texte: "Explication : " }), typographie(mail.explication)]),
      ]));
    }
  }
}

function evaluer(mail, rep) {
  const categories = [mail.categorie].concat(mail.categories_acceptees || []);   // frontière parfois discutable
  return { categorie: categories.includes(rep.categorie), indice: Boolean(rep.indice) && mail.indices_valides.includes(rep.indice) };
}

function corriger() {
  corrige = true;
  let cat = 0; let ind = 0; let vides = 0; let justes = 0;
  for (const mail of donnees.mails) {
    const rep = reponses[mail.id] || {};
    if (!rep.categorie || !rep.indice) { vides++; continue; }   // ligne incomplète : pas corrigée
    const r = evaluer(mail, rep);
    if (r.categorie) cat++;
    if (r.indice) ind++;
    if (r.categorie && r.indice) justes++;
  }
  const total = donnees.mails.length;
  const zone = document.getElementById("resultat");
  zone.hidden = false;
  zone.textContent = "";
  zone.append(
    creer("p", { class: "score", texte: `Score : ${cat + ind} sur ${total * 2}` }),
    creer("p", { texte: `Catégories correctes : ${cat} sur ${total} · indices corrects : ${ind} sur ${total}.` }),
  );
  if (vides) zone.append(creer("p", { class: "doux", texte: `${vides} message${vides > 1 ? "s" : ""} pas encore complètement renseigné${vides > 1 ? "s" : ""} : une ligne incomplète n'est pas corrigée.` }));
  zone.append(creer("p", { class: "doux", texte: "Les lignes en rouge sont à revoir : relisez le message, regardez l'adresse de l'expéditeur et celle du lien, puis corrigez vos choix et recommencez. L'explication d'un message s'affiche quand sa catégorie et son indice sont justes." }));
  // Le bouton des explications n'apparaît que s'il y a au moins une ligne entièrement juste.
  const bouton = document.getElementById("bouton-solutions");
  bouton.hidden = justes === 0;
  if (justes === 0) solutionsVisibles = false;
  bouton.textContent = libelleExplications();
  dessiner();
  zone.focus();
}

function libelleExplications() {
  return solutionsVisibles ? "Masquer les explications" : "Afficher les explications des lignes justes";
}

async function demarrer() {
  const cadre = document.getElementById("cadre");
  try {
    Progression.configurer(await chargerJson("data/config.json"));
    await verrouillerPage(2);
    donnees = await chargerJson("data/mails.json");
    reponses = Progression.lireAnnexe(NOM_ANNEXE) || {};

    const definitions = document.getElementById("definitions");
    for (const c of donnees.categories) definitions.append(creer("li", {}, [creer("strong", { texte: c.texte + " : " }), typographie(c.aide)]));

    document.getElementById("bouton-corriger").addEventListener("click", corriger);
    document.getElementById("bouton-solutions").addEventListener("click", (e) => {
      solutionsVisibles = !solutionsVisibles;
      e.target.textContent = libelleExplications();
      dessiner();
    });
    dessiner();
    cadre.hidden = false;
  } catch (erreur) {
    cadre.hidden = false;
    cadre.textContent = "Impossible de charger la grille. Ouvrez le site par son adresse web, puis rechargez la page.";
    console.error(erreur);
  }
}

demarrer();
