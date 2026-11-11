// Serious game « Reconstitution à la gare » (séance 5). Conçu pour ordinateur.
// Cinq niveaux, puis un bonus facultatif.

import { chargerJson, creer, typographie } from "./chargeur.js";
import * as Progression from "./progression.js";
import { verrouillerPage } from "./verrou.js";
import { construireCarte } from "./reseau-carte.js";
import { niveau3, niveau4 } from "./reseau-niveaux34.js";
import { niveau5, bonus } from "./reseau-niveau5.js";

let donnees = null;
let carte = null;
let noeudsParId = {};
const niveauxDisponibles = ["n1", "n2", "n3", "n4", "n5", "bonus"];
const NB_NIVEAUX = 5;   // le bonus n'est pas compté comme un niveau
let indexCourant = 0;
let nettoyage = null;   // appelée en quittant un niveau (minuteur, raccourcis)

const panneau = () => document.getElementById("panneau");
const svg = () => document.getElementById("carte-svg");

function serveurs() {
  return donnees.noeuds.filter((n) => n.type === "serveur");
}

const animationsReduites = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Si la carte n'est pas entièrement visible (fenêtre étroite), on la fait revenir à l'écran. */
function ramenerCarte() {
  const zone = document.querySelector(".carte-zone");
  const r = zone.getBoundingClientRect();
  if (r.top < 0 || r.bottom > window.innerHeight) {
    zone.scrollIntoView({ behavior: animationsReduites ? "auto" : "smooth", block: "start" });
  }
}

/** Équivalent textuel de la carte, lu par les lecteurs d'écran. */
function annoncer(texte) {
  const zone = document.getElementById("annonce-carte");
  if (zone) zone.textContent = texte;
}

function majBarre() {
  const estBonus = niveauxDisponibles[indexCourant] === "bonus";
  document.getElementById("libelle-niveau").textContent = estBonus ? "Bonus" : `Niveau ${indexCourant + 1} / ${NB_NIVEAUX}`;
  const fait = Math.min(100, indexCourant / NB_NIVEAUX * 100);
  document.getElementById("jauge-niveau").style.width = `${fait}%`;
}

function enteteNiveau(numero, titre) {
  return creer("header", { class: "niveau-entete" }, [
    creer("p", { class: "etiquette", texte: `Niveau ${numero} sur ${NB_NIVEAUX}` }),
    creer("h2", { texte: titre }),
  ]);
}

function enteteBonus(titre) {
  return creer("header", { class: "niveau-entete" }, [
    creer("p", { class: "etiquette", texte: "Bonus (facultatif)" }),
    creer("h2", { texte: titre }),
  ]);
}

function boiteNotion(texte, termine) {
  const dernier = indexCourant === niveauxDisponibles.length - 1;
  return creer("div", { class: "notion", role: "status" }, [
    creer("p", {}, [creer("strong", { texte: "À retenir : " }), typographie(texte)]),
    creer("button", {
      type: "button", class: "bouton", texte: dernier ? "Terminer la reconstitution" : "Niveau suivant →",
      onclick: termine,
    }),
  ]);
}

/* ---------------- Niveau 1 : Qui parle à qui ? ---------------- */

function niveau1(termine) {
  const n = donnees.niveaux.n1;
  carte = construireCarte(svg(), donnees, { attaque: false });
  carte.definirDescription("Réseau de la gare : le téléphone de Robin passe par le point d'accès, puis par Internet, pour joindre les serveurs.");
  const conteneur = panneau();
  conteneur.textContent = "";
  conteneur.append(enteteNiveau(1, n.titre), creer("p", { texte: typographie(n.consigne) }), creer("p", { class: "aide-jeu", texte: typographie(n.aide) }));

  const reponses = {};
  const liste = creer("ol", { class: "paquets" });
  n.paquets.forEach((paquet, i) => {
    const cible = noeudsParId[paquet.vers];
    const selDest = creer("select", { "aria-label": `Destination du paquet ${i + 1}` }, [
      creer("option", { value: "", texte: "— destination —" }),
      ...serveurs().map((s) => creer("option", { value: s.id, texte: s.label })),
    ]);
    const nom = `lis-${paquet.id}`;
    const radios = creer("span", { class: "oui-non" }, [
      creer("label", {}, [creer("input", { type: "radio", name: nom, value: "oui" }), " lisible"]),
      creer("label", {}, [creer("input", { type: "radio", name: nom, value: "non" }), " scellé"]),
    ]);
    const voir = creer("button", { type: "button", class: "bouton secondaire petit", texte: "Voir sur la carte" });
    voir.addEventListener("click", () => {
      carte.mettreEnEvidence(paquet.chemin);
      carte.animerPaquet(paquet.chemin);
      ramenerCarte();
      annoncer(`Paquet ${i + 1} : il part du téléphone de Robin, passe par le point d'accès de la gare puis par Internet, et arrive au serveur ${cible.label}.`);
    });
    reponses[paquet.id] = { selDest, nom, paquet };
    liste.append(creer("li", { class: "paquet" }, [
      creer("span", { class: "paquet-num", texte: `Paquet ${i + 1}` }),
      voir,
      creer("span", { class: "paquet-champs" }, [selDest, radios]),
      creer("span", { class: "paquet-resultat", "aria-live": "polite" }),
    ]));
  });
  conteneur.append(liste);

  const zone = creer("div", { class: "zone-jeu", tabindex: "-1", "aria-live": "polite" });
  const corriger = creer("button", { type: "button", class: "bouton", texte: "Corriger" });
  corriger.addEventListener("click", () => {
    let bons = 0;
    const total = n.paquets.length * 2;
    n.paquets.forEach((paquet, i) => {
      const r = reponses[paquet.id];
      const cible = noeudsParId[paquet.vers];
      const destOk = r.selDest.value === paquet.vers;
      const choixLis = document.querySelector(`input[name="${r.nom}"]:checked`);
      const lisAttendu = cible.protocole === "http" ? "oui" : "non";
      const lisOk = choixLis && choixLis.value === lisAttendu;
      if (destOk) bons++;
      if (lisOk) bons++;
      const cell = liste.children[i].querySelector(".paquet-resultat");
      const proto = cible.protocole === "http" ? "HTTP" : "HTTPS";
      const etat = lisAttendu === "oui" ? "lisible" : "scellé";
      cell.textContent =
        `${destOk ? "✓" : "✗"} Destination : ${destOk ? "" : "c'était "}${cible.label}` +
        ` · ${lisOk ? "✓" : "✗"} Contenu ${etat}, car ce serveur utilise ${proto}`;
      cell.className = "paquet-resultat " + (destOk && lisOk ? "bon" : "mauvais");
    });
    zone.textContent = "";
    zone.append(creer("p", { class: "score-jeu", texte: `Score : ${bons} sur ${total}.` }));
    if (bons === total) {
      zone.append(boiteNotion(n.notion, termine));
    } else {
      zone.append(creer("p", { texte: "Relisez les lignes en rouge : la destination se voit sur la carte (« Voir sur la carte »), et c'est le serveur de destination qui décide : HTTPS = scellé, HTTP = lisible. Corrigez, puis cliquez à nouveau sur « Corriger »." }));
    }
    zone.focus();
  });
  conteneur.append(creer("div", { class: "barre-boutons" }, [corriger]), zone);
}

/* ---------------- Niveau 2 : Le jumeau maléfique ---------------- */

function niveau2(termine) {
  const n = donnees.niveaux.n2;
  carte = construireCarte(svg(), donnees, { attaque: false });
  carte.definirDescription("Deux réseaux portent le même nom : il faut repérer le faux point d'accès.");
  const conteneur = panneau();
  conteneur.textContent = "";
  conteneur.append(enteteNiveau(2, n.titre), creer("p", { texte: typographie(n.consigne) }));

  const cartes = creer("div", { class: "fiches-reseau" });
  for (const reseau of n.reseaux) {
    const champs = creer("dl", { class: "fiche-champs" });
    for (const [cle, libelle] of n.champs) {
      let valeur = reseau[cle];
      if (cle === "signal") valeur = "▮".repeat(reseau.signal) + "▯".repeat(4 - reseau.signal);
      champs.append(creer("dt", { texte: libelle }), creer("dd", { texte: typographie(String(valeur)) }));
    }
    cartes.append(creer("label", { class: "fiche-reseau" }, [
      creer("span", { class: "fiche-tete" }, [
        creer("input", { type: "radio", name: "faux", value: reseau.id }),
        creer("strong", { texte: `Réseau ${reseau.id}` }),
      ]),
      champs,
    ]));
  }
  conteneur.append(cartes);

  const zone = creer("div", { class: "zone-jeu", tabindex: "-1", "aria-live": "polite" });
  const valider = creer("button", { type: "button", class: "bouton", texte: "Désigner le faux réseau" });
  valider.addEventListener("click", () => {
    const choix = document.querySelector('input[name="faux"]:checked');
    zone.textContent = "";
    if (!choix) { zone.append(creer("p", { class: "mauvais", texte: "Choisissez d'abord un réseau." })); zone.focus(); return; }
    const reseau = n.reseaux.find((r) => r.id === choix.value);
    if (!reseau.faux) {
      zone.append(creer("p", { class: "mauvais", texte: "Ce n'est pas le bon. Comparez l'appareil qui émet et sa position : une borne de gare n'est pas un ordinateur posé sur un banc." }));
      zone.focus();
      return;
    }
    zone.append(creer("p", { class: "bon", texte: "Exact : le réseau " + reseau.id + " est le piège." }), creer("p", { texte: typographie(n.explication) }));
    // Montrer la bascule : le téléphone se relie au faux point d'accès.
    carte = construireCarte(svg(), donnees, { attaque: true });
    carte.definirDescription("Le téléphone de Robin s'est connecté au faux point d'accès, qui fait passer tout le trafic par l'ordinateur du Collecteur.");
    carte.mettreEnEvidence(["phone", "ap_faux", "collecteur", "internet"]);
    carte.animerPaquet(["phone", "ap_faux", "collecteur", "internet", "banque"], { duree: 3 });
    zone.append(creer("p", { class: "bascule", texte: typographie(n.bascule) }));
    zone.append(boiteNotion(n.notion, termine));
    zone.focus();
  });
  conteneur.append(creer("div", { class: "barre-boutons" }, [valider]), zone);
}

/* ---------------- Enchaînement ---------------- */

// Contexte partagé transmis aux niveaux définis dans d'autres modules.
const ctx = {
  get donnees() { return donnees; },
  get noeudsParId() { return noeudsParId; },
  creer, typographie, construireCarte, enteteNiveau, enteteBonus, boiteNotion,
  svg, panneau, annoncer, ramenerCarte, animationsReduites,
  setNettoyage: (fn) => { nettoyage = fn; },
  finJeu: () => { if (nettoyage) { nettoyage(); nettoyage = null; } finJeu(); },
};

const constructeurs = {
  n1: niveau1,
  n2: niveau2,
  n3: (termine) => niveau3(ctx, termine),
  n4: (termine) => niveau4(ctx, termine),
  n5: (termine) => niveau5(ctx, termine),
  bonus: (termine) => bonus(ctx, termine),
};

function lancerNiveau(index) {
  if (nettoyage) { nettoyage(); nettoyage = null; }
  indexCourant = index;
  majBarre();
  const id = niveauxDisponibles[index];
  constructeurs[id]((function suivant() {
    if (index + 1 < niveauxDisponibles.length) {
      lancerNiveau(index + 1);
    } else {
      finJeu();
    }
    window.scrollTo({ top: 0, behavior: animationsReduites ? "auto" : "smooth" });
  }));
}

function finJeu() {
  document.getElementById("libelle-niveau").textContent = "Reconstitution terminée";
  document.getElementById("jauge-niveau").style.width = "100%";
  const c = panneau();
  c.textContent = "";
  c.append(
    creer("h2", { texte: "Reconstitution terminée" }),
    creer("p", { texte: "Bravo, analystes. Vous avez rejoué toute l'attaque de la gare : le faux réseau, l'ordinateur au milieu, la facture modifiée en route… et les parades qui l'auraient arrêtée." }),
    creer("p", { class: "aide-jeu", texte: typographie("Retournez au dossier 5 pour saisir le code de sortie : les 4 derniers chiffres de l'IBAN du compte qui a reçu l'argent (vu au niveau 4).") }),
    creer("p", {}, [creer("a", { class: "bouton", href: "../seance-5/index.html", texte: "← Retour au dossier 5" })]),
  );
  carte = construireCarte(svg(), donnees, { attaque: true });
  carte.definirDescription("Vue du réseau avec le faux point d'accès et l'ordinateur du Collecteur intercalés.");
}

async function demarrer() {
  const cadre = document.getElementById("cadre");
  try {
    Progression.configurer(await chargerJson("data/config.json"));
    await verrouillerPage(5);
    donnees = await chargerJson("data/reseau.json");
    for (const n of donnees.noeuds) noeudsParId[n.id] = n;
    cadre.hidden = false;
    lancerNiveau(0);
  } catch (e) {
    cadre.hidden = false;
    document.getElementById("panneau").textContent = "Impossible de charger le jeu. Ouvrez le site par son adresse web, puis rechargez la page.";
    console.error(e);
  }
}

demarrer();
