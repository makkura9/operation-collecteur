// Partello : faux réseau social (mobile d'abord). Aucune donnée n'est envoyée nulle part.
// Les profils, publications et stories viennent de data/partello.json.
//
// Pages (adresse après le # de l'URL) :
//   #/                 accueil (comptes à explorer, publications récentes)
//   #/@robin.dpt       profil
//   #/@robin.dpt/p/r4  publication
// Les images manquantes sont remplacées par un cadre sobre qui montre leur description.

import { chargerJson, creer, racine, typographie } from "./chargeur.js";
import * as Progression from "./progression.js";
import { verrouillerPage } from "./verrou.js";

let donnees = null;
const app = () => document.getElementById("app");

/* ---------- Outils ---------- */

const formatDate = new Intl.DateTimeFormat("fr-CH", { day: "numeric", month: "long", year: "numeric" });
const formatDateHeure = new Intl.DateTimeFormat("fr-CH", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

function dateLongue(iso) {
  return formatDate.format(new Date(iso + "T12:00:00"));
}

function profilParId(id) {
  return donnees.profils.find((p) => p.id === id);
}

function adresseProfil(id) { return `#/@${id}`; }
function adressePublication(profilId, publicationId) { return `#/@${profilId}/p/${publicationId}`; }

/** Teinte stable (0-359) calculée à partir d'un texte, pour colorer les cadres d'images manquantes. */
function teinte(texte) {
  let somme = 0;
  for (const c of texte) somme = (somme * 31 + c.charCodeAt(0)) % 360;
  return somme;
}

/** Image avec repli : si le fichier n'existe pas encore, un cadre sobre affiche l'emoji et la description. */
function creerPhoto(fichier, alt, emoji, extra = "") {
  const cadre = creer("div", { class: ("photo " + extra).trim(), style: `--teinte:${teinte(fichier)}` });
  const image = creer("img", { src: `${racine()}assets/img/${fichier}`, alt, loading: "lazy", decoding: "async" });
  image.addEventListener("error", () => {
    cadre.textContent = "";
    cadre.classList.add("manquante");
    cadre.setAttribute("role", "img");
    cadre.setAttribute("aria-label", alt);
    cadre.append(
      creer("span", { class: "photo-emoji", "aria-hidden": "true", texte: emoji || "🖼️" }),
      creer("span", { class: "photo-legende", "aria-hidden": "true", texte: alt }),
    );
  });
  cadre.append(image);
  return cadre;
}

/** Texte avec @mentions cliquables (si le compte existe) et #hashtags colorés. */
function texteEnrichi(texte) {
  const fragment = document.createDocumentFragment();
  for (const morceau of typographie(texte).split(/(@[a-z0-9_.]+|#[\p{L}\p{N}_]+)/u)) {
    if (!morceau) continue;
    if (morceau.startsWith("@")) {
      const id = morceau.slice(1).replace(/\.$/, "");
      if (profilParId(id)) {
        fragment.append(creer("a", { href: adresseProfil(id), class: "mention", texte: "@" + id }));
        if (morceau.endsWith(".") && id !== morceau.slice(1)) fragment.append(".");
        continue;
      }
    }
    if (morceau.startsWith("#")) fragment.append(creer("span", { class: "hashtag", texte: morceau }));
    else fragment.append(morceau);
  }
  return fragment;
}

function avatar(profil, taille = "moyen") {
  const cadre = creerPhoto(profil.avatar, `Photo de profil de ${profil.nom}`, profil.emoji_avatar, "rond avatar-" + taille);
  return cadre;
}

function barreRetour(texte, adresse) {
  return creer("a", { href: adresse, class: "retour" }, [creer("span", { "aria-hidden": "true", texte: "‹ " }), texte]);
}

function titreVue(texte) {
  const titre = creer("h1", { class: "sr-seulement", tabindex: "-1", texte });
  return titre;
}

/* ---------- Vues ---------- */

function vueAccueil() {
  document.title = "Partello";
  const liste = creer("ul", { class: "liste-comptes" });
  const message = creer("p", { class: "vide", hidden: true, texte: "Aucun compte ne correspond à votre recherche." });

  function dessinerComptes(filtre = "") {
    liste.textContent = "";
    const terme = filtre.trim().toLowerCase();
    let compte = 0;
    for (const profil of donnees.profils) {
      if (terme && !(profil.nom + " " + profil.id).toLowerCase().includes(terme)) continue;
      compte++;
      liste.append(creer("li", {}, [
        creer("a", { href: adresseProfil(profil.id), class: "carte-compte" }, [
          avatar(profil),
          creer("span", { class: "carte-compte-texte" }, [
            creer("strong", { texte: profil.id }),
            creer("span", { texte: profil.nom }),
            creer("span", { class: "doux", texte: `${profil.abonnes} abonnés` }),
          ]),
        ]),
      ]));
    }
    message.hidden = compte > 0;
  }

  const recherche = creer("input", { type: "search", id: "recherche", placeholder: "Rechercher un compte", autocomplete: "off", spellcheck: "false" });
  recherche.addEventListener("input", () => dessinerComptes(recherche.value));
  dessinerComptes();

  const recentes = donnees.profils
    .flatMap((p) => p.publications.map((pub) => ({ profil: p, pub })))
    .sort((a, b) => b.pub.date.localeCompare(a.pub.date))
    .slice(0, 9);
  const grille = creer("div", { class: "grille" });
  for (const { profil, pub } of recentes) grille.append(vignette(profil, pub));

  return creer("div", { class: "vue" }, [
    titreVue("Explorer Partello"),
    creer("label", { for: "recherche", class: "sr-seulement", texte: "Rechercher un compte" }),
    creer("div", { class: "recherche" }, [recherche]),
    creer("h2", { class: "sous-titre", texte: "Comptes à explorer" }),
    liste, message,
    creer("h2", { class: "sous-titre", texte: "Publications récentes" }),
    grille,
  ]);
}

function vignette(profil, pub) {
  return creer("a", { href: adressePublication(profil.id, pub.id), class: "vignette", "aria-label": `Publication de ${profil.id}, ${dateLongue(pub.date)}` }, [
    creerPhoto(pub.image, pub.alt, pub.emoji, "carre"),
  ]);
}

function vueProfil(id) {
  const profil = profilParId(id);
  if (!profil) return vueIntrouvable();
  document.title = `${profil.nom} (@${profil.id}) — Partello`;

  const epinglees = profil.stories.filter((s) => s.epinglee);
  const autres = profil.stories.filter((s) => !s.epinglee);

  const rangeeStories = (titre, liste) => {
    if (!liste.length) return null;
    const rangee = creer("div", { class: "rangee-stories", role: "list" });
    liste.forEach((story, index) => {
      const bouton = creer("button", {
        type: "button", class: "pastille-story", role: "listitem",
        "aria-label": `Voir la story ${story.titre_une ? "« " + story.titre_une + " »" : "du " + dateLongue(story.date)}`,
        onclick: () => ouvrirStories(profil, liste, index, bouton),
      }, [
        creer("span", { class: "anneau" }, [creer("span", { class: `rond-story ${story.fond}`, "aria-hidden": "true", texte: story.capture_mail ? "✉️" : "★" })]),
        creer("span", { class: "pastille-texte", texte: story.titre_une || dateCourte(story.date) }),
      ]);
      rangee.append(bouton);
    });
    return creer("section", { class: "bloc-stories", "aria-label": titre }, [creer("h2", { class: "sous-titre petit", texte: titre }), rangee]);
  };

  const grille = creer("div", { class: "grille" });
  for (const pub of profil.publications) grille.append(vignette(profil, pub));

  return creer("div", { class: "vue" }, [
    barreRetour("Explorer", "#/"),
    titreVue(`Profil de ${profil.nom}`),
    creer("header", { class: "entete-profil" }, [
      avatar(profil, "grand"),
      creer("dl", { class: "stats" }, [
        creer("div", {}, [creer("dt", { texte: "publications" }), creer("dd", { texte: String(profil.publications.length) })]),
        creer("div", {}, [creer("dt", { texte: "abonnés" }), creer("dd", { texte: String(profil.abonnes) })]),
        creer("div", {}, [creer("dt", { texte: "abonnements" }), creer("dd", { texte: String(profil.abonnements) })]),
      ]),
    ]),
    creer("div", { class: "bio" }, [
      creer("p", { class: "bio-nom", texte: profil.id }),
      ...profil.bio.map((ligne) => creer("p", { class: "bio-ligne", texte: typographie(ligne) })),
    ]),
    rangeeStories("À la une", epinglees),
    rangeeStories("Stories", autres),
    creer("h2", { class: "sous-titre", texte: "Publications" }),
    grille,
  ]);
}

function dateCourte(iso) {
  return new Intl.DateTimeFormat("fr-CH", { day: "numeric", month: "short" }).format(new Date(iso + "T12:00:00"));
}

function vuePublication(profilId, publicationId) {
  const profil = profilParId(profilId);
  const pub = profil && profil.publications.find((p) => p.id === publicationId);
  if (!pub) return vueIntrouvable();
  document.title = `Publication de ${profil.id} — Partello`;

  const commentaires = creer("ul", { class: "commentaires" });
  for (const c of pub.commentaires) {
    commentaires.append(creer("li", {}, [
      creer("a", { href: profilParId(c.auteur) ? adresseProfil(c.auteur) : null, class: "auteur", texte: c.auteur }), " ",
      creer("span", {}, [texteEnrichi(c.texte)]),
    ]));
  }
  const boutonInfos = creer("button", { type: "button", class: "bouton-pt secondaire", texte: "Infos de la photo" });
  boutonInfos.addEventListener("click", () => ouvrirInfosPhoto(pub, boutonInfos));

  return creer("div", { class: "vue publication" }, [
    barreRetour(`Profil de ${profil.id}`, adresseProfil(profil.id)),
    titreVue(`Publication de ${profil.nom}`),
    creer("a", { href: adresseProfil(profil.id), class: "auteur-ligne" }, [
      avatar(profil, "petit"),
      creer("span", {}, [creer("strong", { texte: profil.id }), pub.lieu ? creer("span", { class: "doux lieu", texte: pub.lieu }) : null]),
    ]),
    creerPhoto(pub.image, pub.alt, pub.emoji, "portrait"),
    creer("p", { class: "likes", texte: `♥ ${pub.likes} mentions « J'aime »` }),
    creer("p", { class: "legende" }, [creer("strong", { texte: profil.id + " " }), texteEnrichi(pub.legende)]),
    commentaires,
    creer("p", { class: "date doux", texte: dateLongue(pub.date) }),
    boutonInfos,
  ]);
}

function vueIntrouvable() {
  return creer("div", { class: "vue" }, [
    barreRetour("Explorer", "#/"),
    creer("h1", { texte: "Page introuvable" }),
    creer("p", { texte: "Ce compte ou cette publication n'existe pas." }),
  ]);
}

/* ---------- Stories ---------- */

function creerCaptureMail(capture) {
  // « group » et non « img » : le texte de la capture (dont la date limite) reste lu par un lecteur d'écran.
  return creer("div", { class: "capture-mail", role: "group", "aria-label": "Capture d'écran partielle d'un e-mail" }, [
    creer("div", { class: "cm-entete" }, [creer("strong", { texte: capture.expediteur }), creer("span", { texte: capture.sous_titre })]),
    creer("p", { class: "cm-objet", texte: capture.objet }),
    ...capture.lignes.map((ligne) => creer("p", { class: "cm-ligne", texte: typographie(ligne) })),
    creer("p", { class: "cm-evidence", texte: typographie(capture.mise_en_evidence) }),
    creer("p", { class: "cm-flou", "aria-hidden": "true", texte: capture.suite_floutee }),
  ]);
}

function ouvrirStories(profil, liste, indexDepart, declencheur) {
  let index = indexDepart;
  const fond = creer("div", { class: "stories-fond", role: "dialog", "aria-modal": "true", "aria-label": `Stories de ${profil.nom}` });
  const boite = creer("div", { class: "stories-boite" });
  fond.append(boite);

  function fermer() {
    document.removeEventListener("keydown", auClavier);
    fond.remove();
    if (declencheur) declencheur.focus();
  }
  function aller(delta) {
    const suivant = index + delta;
    if (suivant < 0) return;
    if (suivant >= liste.length) { fermer(); return; }
    index = suivant;
    dessiner();
  }
  function auClavier(evenement) {
    if (evenement.key === "Escape") fermer();
    else if (evenement.key === "ArrowRight") aller(1);
    else if (evenement.key === "ArrowLeft") aller(-1);
    else if (evenement.key === "Tab") {
      // La touche Tab tourne à l'intérieur de la fenêtre des stories (elle ne passe pas derrière).
      const cibles = [...fond.querySelectorAll("button:not([disabled])")];
      if (!cibles.length) return;
      const premier = cibles[0];
      const dernier = cibles[cibles.length - 1];
      if (!fond.contains(document.activeElement)) { evenement.preventDefault(); premier.focus(); }
      else if (evenement.shiftKey && document.activeElement === premier) { evenement.preventDefault(); dernier.focus(); }
      else if (!evenement.shiftKey && document.activeElement === dernier) { evenement.preventDefault(); premier.focus(); }
    }
  }

  function dessiner() {
    const story = liste[index];
    boite.textContent = "";
    const barres = creer("div", { class: "stories-barres", "aria-hidden": "true" });
    liste.forEach((_, k) => barres.append(creer("span", { class: k <= index ? "plein" : "" })));

    const contenu = creer("div", { class: `story ${story.fond}` });
    if (story.capture_mail) contenu.append(creerCaptureMail(donnees.capture_mail));
    contenu.append(creer("div", { class: "story-texte" }, [
      creer("p", { class: "story-gros", texte: typographie(story.texte) }),
      story.soustitre ? creer("p", { class: "story-petit", texte: typographie(story.soustitre) }) : null,
    ]));

    const boutonFermer = creer("button", { type: "button", class: "story-fermer", "aria-label": "Fermer les stories", onclick: fermer, texte: "✕" });
    boite.append(
      barres,
      creer("div", { class: "story-entete" }, [
        avatar(profil, "petit"),
        creer("span", {}, [creer("strong", { texte: profil.id }), creer("span", { class: "doux", texte: " · " + dateLongue(story.date) })]),
        boutonFermer,
      ]),
      contenu,
      creer("div", { class: "story-nav" }, [
        creer("button", { type: "button", class: "bouton-pt secondaire", disabled: index === 0, onclick: () => aller(-1), texte: "‹ Précédente" }),
        creer("span", { class: "doux", "aria-live": "polite", texte: `${index + 1} / ${liste.length}` }),
        creer("button", { type: "button", class: "bouton-pt", onclick: () => aller(1), texte: index === liste.length - 1 ? "Terminer" : "Suivante ›" }),
      ]),
    );
    boutonFermer.focus({ preventScroll: true });
  }

  document.addEventListener("keydown", auClavier);
  fond.addEventListener("click", (e) => { if (e.target === fond) fermer(); });
  document.body.append(fond);
  dessiner();
}

/* ---------- Infos de la photo ---------- */

function formaterCoordonnee(valeur, positif, negatif) {
  const lettre = valeur >= 0 ? positif : negatif;
  return `${Math.abs(valeur).toFixed(4).replace(".", ",")}° ${lettre}`;
}

function creerCarteFictive(position) {
  const carte = donnees.carte_fictive;
  const b = carte.bornes;
  const x = ((position.longitude - b.longitude_gauche) / (b.longitude_droite - b.longitude_gauche)) * 100;
  const y = ((b.latitude_haut - position.latitude) / (b.latitude_haut - b.latitude_bas)) * 100;
  return creer("figure", { class: "carte-fictive" }, [
    creer("div", { class: "carte-cadre" }, [
      creer("img", { src: `${racine()}assets/${carte.image}`, alt: "Carte fictive de Montrive : le lac au sud, la gare à l'est, la vieille ville à l'ouest, les vignes sur la colline au nord" }),
      creer("span", { class: "epingle", style: `left:${x}%;top:${y}%`, role: "img", "aria-label": position.zone ? `Position de la photo : l'épingle se trouve dans la zone « ${position.zone} »` : "Position de la photo" }),
    ]),
    creer("figcaption", { class: "doux", texte: typographie(carte.description) }),
  ]);
}

function ouvrirInfosPhoto(publication, declencheur) {
  const m = publication.metadonnees || {};
  const lignes = creer("dl", { class: "infos-photo" });
  const ajouter = (nom, valeur) => lignes.append(creer("dt", { texte: nom }), creer("dd", {}, [valeur]));

  ajouter("Date de prise de vue", m.date_prise ? formatDateHeure.format(new Date(m.date_prise)).replace(",", "") : "Inconnue");
  ajouter("Appareil", m.appareil || "Inconnu");

  const zoneCarte = creer("div", { class: "zone-carte" });
  if (m.position) {
    const texte = `${formaterCoordonnee(m.position.latitude, "N", "S")}, ${formaterCoordonnee(m.position.longitude, "E", "O")}`;
    const boutonCarte = creer("button", { type: "button", class: "bouton-pt secondaire", texte: "Voir sur la carte de Montrive" });
    boutonCarte.addEventListener("click", () => {
      zoneCarte.textContent = "";
      zoneCarte.append(creerCarteFictive(m.position));
      boutonCarte.disabled = true;
    });
    ajouter("Position", creer("span", {}, [creer("span", { class: "coordonnees", texte }), " ", boutonCarte]));
  } else {
    ajouter("Position", "Non enregistrée");
  }

  const fond = creer("div", { class: "infos-fond", role: "dialog", "aria-modal": "true", "aria-labelledby": "titre-infos" });
  const fermer = () => { document.removeEventListener("keydown", auClavier); fond.remove(); declencheur.focus(); };
  const auClavier = (e) => { if (e.key === "Escape") fermer(); };
  const boutonFermer = creer("button", { type: "button", class: "bouton-pt", texte: "Fermer", onclick: fermer });
  fond.append(creer("div", { class: "infos-boite" }, [
    creer("h2", { id: "titre-infos", texte: "Infos de la photo" }),
    creer("p", { class: "doux", texte: "Ces informations sont enregistrées dans le fichier de la photo par l'appareil." }),
    lignes, zoneCarte, boutonFermer,
  ]));
  fond.addEventListener("click", (e) => { if (e.target === fond) fermer(); });
  document.addEventListener("keydown", auClavier);
  document.body.append(fond);
  boutonFermer.focus();
}

/* ---------- Navigation ---------- */

function router() {
  const hash = window.location.hash || "#/";
  let vue;
  let m;
  if ((m = /^#\/@([a-z0-9_.]+)\/p\/([a-z0-9]+)$/.exec(hash))) vue = vuePublication(m[1], m[2]);
  else if ((m = /^#\/@([a-z0-9_.]+)$/.exec(hash))) vue = vueProfil(m[1]);
  else vue = vueAccueil();
  app().textContent = "";
  app().append(vue);
  window.scrollTo(0, 0);
  const titre = app().querySelector("h1");
  if (titre) titre.focus({ preventScroll: true });
}

async function demarrer() {
  try {
    const config = await chargerJson("data/config.json");
    Progression.configurer(config);
    await verrouillerPage(1);
    donnees = await chargerJson("data/partello.json");
    window.addEventListener("hashchange", router);
    router();
    document.getElementById("cadre-app").hidden = false;
  } catch (erreur) {
    document.getElementById("cadre-app").hidden = false;
    app().textContent = "Impossible de charger Partello. Ouvrez le site par son adresse web, puis rechargez la page.";
    console.error(erreur);
  }
}

demarrer();
