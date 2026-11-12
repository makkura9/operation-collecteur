// Niveau 5 (« Contre-attaque ») et bonus (« Le cadenas trompeur ») du serious game réseau (séance 5).
// Pilotés par reseau.js, qui fournit un contexte partagé (ctx).

import { creerFauxNavigateur } from "./faux-navigateur.js";

/* ---------------- Niveau 5 : Contre-attaque ---------------- */

export function niveau5(ctx, termine) {
  const { donnees, creer, melanger, typographie, construireCarte, svg, panneau, enteteNiveau, setNettoyage, animationsReduites, finJeu } = ctx;
  const n = donnees.niveaux.n5;

  let carte = construireCarte(svg(), donnees, { attaque: true });
  carte.definirDescription("La scène de la gare : le faux point d'accès, l'ordinateur du Collecteur, puis le paiement sur la banque.");

  const conteneur = panneau();
  conteneur.textContent = "";
  conteneur.append(enteteNiveau(5, n.titre), creer("p", { texte: typographie(n.consigne) }));

  const choisies = new Set();
  const compteur = creer("p", { class: "compteur-cartes", role: "status", texte: `Cartes choisies : 0 sur ${n.budget}` });
  const grille = creer("div", { class: "grille-cartes" });
  const boutonsCartes = [];
  // Ordre tiré au sort à chaque affichage : les vraies parades ne sont jamais « les premières ».
  for (const c of melanger(n.cartes)) {
    const b = creer("button", { type: "button", class: "carte-defense", "aria-pressed": "false", "data-carte": c.id }, [
      creer("span", { class: "carte-symbole", "aria-hidden": "true", texte: "🛡" }),
      creer("span", { class: "carte-titre", texte: typographie(c.titre) }),
    ]);
    b.addEventListener("click", () => {
      if (choisies.has(c.id)) choisies.delete(c.id);
      else if (choisies.size < n.budget) choisies.add(c.id);
      majCartes();
    });
    boutonsCartes.push([c, b]);
    grille.append(b);
  }
  const rejouer = creer("button", { type: "button", class: "bouton", texte: "Rejouer la scène avec mes cartes", disabled: true });
  const listeEtapes = creer("ol", { class: "etapes-attaque" });
  const zone = creer("div", { class: "zone-jeu", tabindex: "-1", "aria-live": "polite" });
  conteneur.append(compteur, grille, creer("div", { class: "barre-boutons" }, [rejouer]), listeEtapes, zone);

  function majCartes() {
    for (const [c, b] of boutonsCartes) {
      const pris = choisies.has(c.id);
      b.setAttribute("aria-pressed", pris ? "true" : "false");
      b.classList.toggle("choisie", pris);
      b.disabled = !pris && choisies.size >= n.budget;
    }
    compteur.textContent = `Cartes choisies : ${choisies.size} sur ${n.budget}`;
    rejouer.disabled = choisies.size !== n.budget;
  }

  let minuteurs = [];
  const arreter = () => { minuteurs.forEach(clearTimeout); minuteurs = []; };
  setNettoyage(arreter);

  rejouer.addEventListener("click", () => {
    arreter();
    rejouer.disabled = true;
    boutonsCartes.forEach(([, b]) => { b.disabled = true; });
    listeEtapes.textContent = "";
    zone.textContent = "";
    carte = construireCarte(svg(), donnees, { attaque: true });

    const cartes = n.cartes.filter((c) => choisies.has(c.id));
    const bloquantes = cartes.filter((c) => c.bonne);
    // L'attaque est arrêtée à la PREMIÈRE étape (dans l'ordre) couverte par une carte choisie.
    const indexBlocage = n.etapes.findIndex((e) => bloquantes.some((c) => c.bloque === e.id));
    const pas = animationsReduites ? 0 : 1100;

    n.etapes.forEach((etape, i) => {
      if (indexBlocage !== -1 && i > indexBlocage) return;
      minuteurs.push(setTimeout(() => {
        carte.mettreEnEvidence(etape.chemin);
        const bloquee = i === indexBlocage;
        if (bloquee) {
          const parade = bloquantes.find((c) => c.bloque === etape.id);
          carte.marquer(etape.noeud, "bloque");
          listeEtapes.append(creer("li", { class: "etape bloquee" }, [creer("strong", { texte: "🛡 Bloquée ici : " }), typographie(etape.texte), creer("span", { class: "etape-parade", texte: ` (grâce à « ${typographie(parade.titre)} »)` })]));
        } else {
          carte.marquer(etape.noeud, "alerte");
          listeEtapes.append(creer("li", { class: "etape passe" }, [creer("strong", { texte: "✗ L'attaque passe : " }), typographie(etape.texte)]));
        }
        if (bloquee || (indexBlocage === -1 && i === n.etapes.length - 1)) bilan(cartes, indexBlocage);
      }, pas * i));
    });
  });

  function bilan(cartes, indexBlocage) {
    zone.textContent = "";
    const arretee = indexBlocage !== -1;
    const pieges = cartes.filter((c) => !c.bonne).length;
    // Le niveau n'est validé que si les trois cartes sont de vraies parades : une seule bonne carte
    // arrête bien l'attaque, mais elle ne prouve pas qu'on sait reconnaître les fausses bonnes idées.
    const reussi = arretee && pieges === 0;
    zone.append(creer("p", { class: arretee ? "bon" : "mauvais", texte: arretee
      ? `Attaque arrêtée à l'étape ${indexBlocage + 1} sur ${n.etapes.length}.`
      : "L'attaque a réussi jusqu'au bout : vos cartes n'ont rien empêché." }));
    if (arretee && pieges) {
      const constat = pieges > 1 ? `Mais ${pieges} de vos cartes ne servent à rien contre cette attaque.` : "Mais l'une de vos cartes ne sert à rien contre cette attaque.";
      zone.append(creer("p", { class: "mauvais", texte: `${constat} Pour valider le niveau, vos trois cartes doivent être de vraies parades : remplacez ${pieges > 1 ? "les fausses bonnes idées" : "la fausse bonne idée"}.` }));
    }

    const couches = new Set(cartes.filter((c) => c.bonne).map((c) => c.bloque)).size;
    if (couches >= 2) zone.append(creer("p", { texte: `Vos cartes protègent ${couches} étapes différentes : si une parade échouait, une autre prendrait le relais.` }));

    const detail = creer("ul", { class: "detail-cartes" });
    for (const c of cartes) {
      detail.append(creer("li", { class: c.bonne ? "bon" : "mauvais" }, [
        creer("strong", { texte: (c.bonne ? "✓ " : "✗ Fausse bonne idée : ") + typographie(c.titre) + ". " }),
        typographie(c.explication),
      ]));
    }
    zone.append(detail);

    if (reussi) {
      zone.append(creer("div", { class: "notion", role: "status" }, [
        creer("p", {}, [creer("strong", { texte: "À retenir : " }), typographie(n.notion)]),
        creer("div", { class: "barre-boutons" }, [
          creer("button", { type: "button", class: "bouton", texte: "Bonus : le cadenas trompeur →", onclick: termine }),
          creer("button", { type: "button", class: "bouton secondaire", texte: "Terminer la reconstitution", onclick: finJeu }),
        ]),
      ]));
    } else {
      zone.append(creer("button", { type: "button", class: "bouton", texte: "Choisir d'autres cartes", onclick: () => {
        choisies.clear();
        listeEtapes.textContent = "";
        zone.textContent = "";
        carte = construireCarte(svg(), donnees, { attaque: true });
        majCartes();
      } }));
    }
    zone.focus();
  }
}

/* ---------------- Bonus : Le cadenas trompeur ---------------- */

export function bonus(ctx, termine) {
  const { donnees, creer, typographie, construireCarte, svg, panneau, enteteBonus, boiteNotion, setNettoyage } = ctx;
  const n = donnees.niveaux.bonus;
  setNettoyage(null);

  const carte = construireCarte(svg(), donnees, { attaque: false });
  carte.definirDescription("Le cadenas protège le trajet entre le téléphone et le site, quel que soit ce site.");

  const conteneur = panneau();
  conteneur.textContent = "";
  conteneur.append(enteteBonus(n.titre), creer("p", { texte: typographie(n.consigne) }));

  // Image du faux site dans le navigateur simulé : aucun champ de saisie, rien à taper.
  const page = creer("div", { class: "apercu-faux-site", role: "img", "aria-label": "Aperçu du faux site : page « Espace client » avec un formulaire de connexion" }, [
    creer("p", { class: "afs-marque", texte: "Horizons Jeunesse" }),
    creer("p", { class: "afs-titre", texte: "Espace client" }),
    creer("div", { class: "afs-champ", texte: "Adresse e-mail" }),
    creer("div", { class: "afs-champ", texte: "Mot de passe" }),
    creer("div", { class: "afs-bouton", texte: "Se connecter" }),
  ]);
  const navigateur = creerFauxNavigateur({ url: n.url, titre: "Espace client — Horizons Jeunesse", contenu: page, securise: "https", etiquetteAccessible: "Faux site affiché dans un navigateur simulé" });
  conteneur.append(navigateur.element);

  const formulaire = creer("fieldset", { class: "affirmations" }, [creer("legend", { texte: "Que garantit ce cadenas ?" })]);
  const cases = [];
  for (const a of n.affirmations) {
    const caseA = creer("input", { type: "checkbox", id: `aff-${a.id}` });
    const retour = creer("span", { class: "retour-aff", "aria-live": "polite" });
    cases.push([a, caseA, retour]);
    formulaire.append(creer("div", { class: "affirmation" }, [
      creer("label", { for: `aff-${a.id}` }, [caseA, " ", typographie(a.texte)]),
      retour,
    ]));
  }
  const zone = creer("div", { class: "zone-jeu", tabindex: "-1", "aria-live": "polite" });
  const verifier = creer("button", { type: "button", class: "bouton", texte: "Vérifier" });
  conteneur.append(formulaire, creer("div", { class: "barre-boutons" }, [verifier]), zone);

  verifier.addEventListener("click", () => {
    let justes = 0;
    for (const [a, caseA, retour] of cases) {
      const juste = caseA.checked === a.vrai;
      if (juste) justes++;
      retour.textContent = (juste ? "✓ " : "✗ ") + typographie(a.explication);
      retour.className = "retour-aff " + (juste ? "bon" : "mauvais");
    }
    zone.textContent = "";
    zone.append(creer("p", { class: "score-jeu", texte: `Affirmations bien jugées : ${justes} sur ${cases.length}.` }));
    if (justes === cases.length) zone.append(boiteNotion(n.notion, termine));
    else zone.append(creer("p", { texte: "Relisez les explications, corrigez vos choix et vérifiez à nouveau." }));
    zone.focus();
  });
}
