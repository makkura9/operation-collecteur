// Niveaux 3 et 4 du serious game réseau (séance 5).
// Pilotés par reseau.js, qui fournit un « contexte » (ctx) avec les fonctions et données partagées.

/* ---------------- Niveau 3 : Au milieu (prévoir, puis voir) ---------------- */

// Règle pédagogique : l'enveloppe ne montre JAMAIS la réponse avant l'essai.
//  1. Prévision : on ne voit que l'adresse (http:// ou https:// + nom du site). Le binôme
//     annonce « scellé » ou « lisible ».
//  2. Révélation : l'enveloppe montre alors ce que le Collecteur a réellement vu (le contenu,
//     ou rien). C'est à ce moment-là seulement que la facture peut être signalée, en la lisant :
//     aucun bouton ne s'allume, aucune enveloppe n'est mise en évidence.
export function niveau3(ctx, termine) {
  const { donnees, noeudsParId, creer, typographie, construireCarte, svg, panneau, enteteNiveau, boiteNotion, setNettoyage, animationsReduites } = ctx;
  const n = donnees.niveaux.n3;
  const SEUIL_TRI = 0.75;            // part de prévisions justes exigée
  const FAUSSES_ALERTES_MAX = 1;     // au-delà, la facture a été « trouvée » en cliquant partout

  const carte = construireCarte(svg(), donnees, { attaque: true });
  carte.definirDescription("Tout le trafic du téléphone de Robin passe par l'ordinateur du Collecteur, intercalé entre le faux point d'accès et Internet.");
  carte.mettreEnEvidence(["phone", "ap_faux", "collecteur", "internet"]);
  carte.marquer("collecteur", "alerte");

  const conteneur = panneau();
  conteneur.textContent = "";
  conteneur.append(enteteNiveau(3, n.titre), creer("p", { texte: typographie(n.consigne) }), creer("p", { class: "aide-jeu", texte: typographie(n.aide) }));

  // Options : un mode « sans chrono » plus accessible (pas de limite de temps par enveloppe).
  const sansChrono = creer("input", { type: "checkbox", id: "sans-chrono" });
  if (animationsReduites) sansChrono.checked = true;
  conteneur.append(creer("p", { class: "option-jeu" }, [
    creer("label", { for: "sans-chrono" }, [sansChrono, " Mode sans chronomètre (prendre son temps)"]),
  ]));

  const bande = creer("div", { class: "bande-tri", "aria-live": "polite" });
  const zone = creer("div", { class: "zone-jeu", tabindex: "-1", "aria-live": "polite" });
  const commencer = creer("button", { type: "button", class: "bouton", texte: "Commencer la reconstitution" });
  conteneur.append(creer("div", { class: "barre-boutons" }, [commencer]), bande, zone);

  let minuteur = null;
  let animFrame = null;
  const arreter = () => { if (minuteur) clearTimeout(minuteur); if (animFrame) cancelAnimationFrame(animFrame); minuteur = null; animFrame = null; };
  setNettoyage(arreter);

  const total = n.paquets.length;
  let index = 0, bonsTri = 0, factureAttrapee = false, faussesAlertes = 0;
  const avecChrono = () => !animationsReduites && !sansChrono.checked;

  function serveurDe(paquet) { return noeudsParId[paquet.vers]; }

  /** Barre de temps qui se vide en `duree` millisecondes, puis appelle `aLaFin`. */
  function lancerChrono(duree, aLaFin) {
    const barre = creer("span", { class: "barre-temps" }, [creer("span")]);
    const debut = performance.now();
    const vider = (t) => {
      const reste = Math.max(0, 1 - (t - debut) / duree);
      barre.firstChild.style.width = `${reste * 100}%`;
      if (reste > 0) animFrame = requestAnimationFrame(vider);
    };
    animFrame = requestAnimationFrame(vider);
    minuteur = setTimeout(aLaFin, duree);
    return barre;
  }

  function lancerPartie() {
    index = 0; bonsTri = 0; factureAttrapee = false; faussesAlertes = 0;
    commencer.disabled = true;
    sansChrono.disabled = true;
    zone.textContent = "";
    prevision();
  }

  /* Étape 1 : l'enveloppe fermée. Seule l'adresse est visible. */
  function prevision() {
    arreter();
    bande.textContent = "";
    if (index >= total) { finPartie(); return; }
    const serveur = serveurDe(n.paquets[index]);
    const adresse = `${serveur.protocole}://${serveur.domaine || serveur.label}`;

    const boutons = creer("div", { class: "barre-boutons tri-boutons" }, [
      creer("button", { type: "button", class: "bouton", texte: "Scellé", onclick: () => reveler("scelle") }),
      creer("button", { type: "button", class: "bouton", texte: "Lisible", onclick: () => reveler("lisible") }),
    ]);
    bande.append(
      creer("p", { class: "compteur-tri", texte: `Enveloppe ${index + 1} sur ${total} — que pouvait lire le Collecteur ?` }),
      creer("div", { class: "env-tri fermee" }, [
        creer("span", { class: "env-tri-icone", "aria-hidden": "true", texte: "✉" }),
        creer("span", { class: "env-tri-site" }, [creer("strong", { texte: adresse })]),
        creer("span", { class: "env-tri-contenu doux", texte: "Enveloppe pas encore examinée." }),
      ]),
      boutons,
    );
    if (avecChrono()) {
      const duree = Math.max(n.vitesse.minimum, n.vitesse.depart - index * n.vitesse.acceleration) * 1000;
      bande.append(lancerChrono(duree, () => reveler(null)));
    }
    boutons.querySelector("button").focus({ preventScroll: true });
  }

  /* Étape 2 : ce que le Collecteur a vu. `choix` vaut "scelle", "lisible" ou null (temps écoulé). */
  function reveler(choix) {
    arreter();
    const paquet = n.paquets[index];
    const serveur = serveurDe(paquet);
    const lisible = serveur.protocole === "http";
    const estFacture = Boolean(paquet.facture);
    const juste = choix === (lisible ? "lisible" : "scelle");
    if (juste) bonsTri++;

    const regle = lisible ? "http (sans S) : contenu lisible" : "https : contenu scellé";
    const verdict = choix === null ? `Trop tard. C'était ${regle}.` : (juste ? `Bien vu. ${regle[0].toUpperCase() + regle.slice(1)}.` : `Raté. C'était ${regle}.`);

    const suivante = () => { index++; prevision(); };
    const actions = creer("div", { class: "barre-boutons tri-boutons" });
    if (lisible) {
      // Le bouton existe pour TOUTE enveloppe lisible, toujours avec la même apparence.
      actions.append(creer("button", {
        type: "button", class: "bouton secondaire", texte: "C'est la facture !",
        onclick: () => { if (estFacture) factureAttrapee = true; else faussesAlertes++; suivante(); },
      }));
    }
    actions.append(creer("button", { type: "button", class: "bouton", texte: index === total - 1 ? "Voir le résultat →" : "Enveloppe suivante →", onclick: suivante }));

    bande.textContent = "";
    bande.append(
      creer("p", { class: "compteur-tri", texte: `Enveloppe ${index + 1} sur ${total} — ce que le Collecteur a vu` }),
      creer("div", { class: "env-tri " + (lisible ? "ouverte" : "scellee") }, [
        creer("span", { class: "env-tri-icone", "aria-hidden": "true", texte: lisible ? "✉" : "🔒" }),
        creer("span", { class: "env-tri-site" }, [creer("strong", { texte: `${serveur.protocole}://${serveur.domaine || serveur.label}` })]),
        lisible
          ? creer("span", { class: "env-tri-contenu", texte: typographie(paquet.contenu || "") })
          : creer("span", { class: "env-tri-contenu doux", texte: "(contenu chiffré, illisible)" }),
        creer("span", { class: "verdict " + (juste ? "bon" : "mauvais"), texte: (juste ? "✓ " : "✗ ") + verdict }),
      ]),
      actions,
    );
    if (avecChrono()) {
      const duree = (lisible ? n.revelation.lisible : n.revelation.scelle) * 1000;
      bande.append(lancerChrono(duree, suivante));
    }
    actions.lastChild.focus({ preventScroll: true });
  }

  function finPartie() {
    arreter();
    bande.textContent = "";
    zone.textContent = "";
    zone.append(creer("p", { class: "score-jeu", texte: `Prévisions justes : ${bonsTri} sur ${total}.` }));
    zone.append(creer("p", { texte: factureAttrapee
      ? "Vous avez repéré la facture de l'agence au passage : c'est elle qui sera modifiée au niveau suivant."
      : "Vous avez laissé passer la facture de l'agence. Elle circulait en HTTP (lisible) : c'est la pièce clé." }));
    if (faussesAlertes) zone.append(creer("p", { texte: `Enveloppes signalées à tort comme « la facture » : ${faussesAlertes}.` }));
    const reussi = factureAttrapee && faussesAlertes <= FAUSSES_ALERTES_MAX && bonsTri >= Math.ceil(total * SEUIL_TRI);
    if (reussi) {
      zone.append(boiteNotion(n.notion, termine));
    } else {
      zone.append(creer("button", { type: "button", class: "bouton", texte: "Rejouer la reconstitution", onclick: () => { commencer.disabled = false; sansChrono.disabled = false; lancerPartie(); } }));
      if (!factureAttrapee) zone.append(creer("p", { class: "aide-jeu", texte: "Pour continuer, repérez la facture : lisez le contenu des enveloppes lisibles, l'une d'elles affiche un montant et un IBAN." }));
      else if (faussesAlertes > FAUSSES_ALERTES_MAX) zone.append(creer("p", { class: "aide-jeu", texte: "Pour continuer, ne signalez que la vraie facture : lisez le contenu avant de cliquer." }));
      else zone.append(creer("p", { class: "aide-jeu", texte: "Pour continuer, il faut prévoir juste pour au moins trois enveloppes sur quatre : regardez comment commence chaque adresse." }));
    }
    zone.focus();
  }

  commencer.addEventListener("click", lancerPartie);
}

/* ---------------- Niveau 4 : L'enveloppe modifiée ---------------- */

export function niveau4(ctx, termine) {
  const { donnees, creer, typographie, construireCarte, svg, panneau, enteteNiveau, boiteNotion, setNettoyage } = ctx;
  const n = donnees.niveaux.n4;
  setNettoyage(null);

  const carte = construireCarte(svg(), donnees, { attaque: true });
  carte.definirDescription("La facture de l'agence est passée par l'ordinateur du Collecteur avant d'arriver au téléphone de Robin.");
  carte.mettreEnEvidence(["portail", "internet", "collecteur", "ap_faux", "phone"]);
  carte.marquer("collecteur", "alerte");

  const conteneur = panneau();
  conteneur.textContent = "";
  conteneur.append(enteteNiveau(4, n.titre), creer("p", { texte: typographie(n.consigne) }));

  const trouvees = new Set();
  const nbDifferences = n.recue.filter((l) => l.difference).length;

  const colEnvoyee = creer("div", { class: "facture facture-envoyee" }, [
    creer("h3", { texte: "Facture envoyée par l'agence" }),
    ...n.envoyee.map((l) => creer("p", { class: "ligne-facture", texte: typographie(l.texte) })),
  ]);
  const colRecue = creer("div", { class: "facture facture-recue" }, [creer("h3", { texte: "Facture reçue par Robin" })]);
  for (const ligne of n.recue) {
    const diff = Boolean(ligne.difference);
    const b = creer("button", { type: "button", class: "ligne-facture ligne-cliquable", texte: typographie(ligne.texte) });
    b.addEventListener("click", () => {
      if (!diff) {
        b.classList.add("non-diff");
        annonce("Cette ligne est identique à l'originale.");
        return;
      }
      if (trouvees.has(ligne.id)) return;
      trouvees.add(ligne.id);
      b.classList.add("diff-trouvee");
      b.append(creer("span", { class: "diff-note", texte: " — " + typographie(ligne.difference) }));
      annonce(`Différence trouvée : ${trouvees.size} sur ${nbDifferences}.`);
      if (trouvees.size === nbDifferences) reussite();
    });
    colRecue.append(b);
  }

  conteneur.append(creer("div", { class: "comparaison-factures" }, [colEnvoyee, colRecue]));
  const info = creer("p", { class: "aide-jeu", role: "status", texte: `Différences trouvées : 0 sur ${nbDifferences}.` });
  const zone = creer("div", { class: "zone-jeu", tabindex: "-1", "aria-live": "polite" });
  conteneur.append(info, zone);
  function annonce(t) { info.textContent = t; }

  function reussite() {
    zone.textContent = "";
    zone.append(creer("p", { class: "bon", texte: "Vous avez repéré les deux modifications." }), creer("p", { texte: typographie(n.explication) }));

    // Test : tenter d'ouvrir une enveloppe HTTPS -> contenu protégé.
    const messageHttps = creer("p", { class: "message-https", hidden: true });
    const boutonHttps = creer("button", { type: "button", class: "bouton secondaire", texte: n.https.bouton });
    boutonHttps.addEventListener("click", () => {
      messageHttps.hidden = false;
      messageHttps.textContent = "";
      messageHttps.append(creer("strong", { texte: "🔒 " }), typographie(n.https.message), creer("span", { class: "doux", texte: " " + typographie(n.https.nuance) }));
      carte.animerPaquet(["portail", "internet", "collecteur", "ap_faux", "phone"]);
      boutonHttps.disabled = true;
    });
    zone.append(boutonHttps, messageHttps, boiteNotion(n.notion, termine));
    zone.focus();
  }
}
