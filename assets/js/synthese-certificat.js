// Certificat « Analyste cyber — Cellule ARGOS » (séance 6), délivré quand le quiz final est terminé.
// Les prénoms saisis servent uniquement à l'aperçu et à l'impression : ils ne sont ni enregistrés
// (aucun stockage) ni envoyés (aucun formulaire transmis), et sont effacés quand on quitte la page.

import { creer, racine, typographie } from "./chargeur.js";
import { bandeauCompteARebours, blocVerrouille, demarrerPiece, quizTermine } from "./synthese-commun.js";

const LONGUEUR_MAX = 40;

function dateDuJour() {
  return new Intl.DateTimeFormat("fr-CH", { day: "numeric", month: "long", year: "numeric" }).format(new Date());
}

/** Prénoms saisis (sans les champs vides). */
function prenoms(champs) {
  return champs.map((c) => c.value.trim().slice(0, LONGUEUR_MAX)).filter(Boolean);
}

/** « Alex », « Alex et Sam », ou rien si aucun prénom n'est saisi. */
function nomsAffiches(champs) {
  return prenoms(champs).join(" et ");
}

function creerCertificat(c) {
  const competences = creer("ul", { class: "competences" });
  for (const comp of c.competences) competences.append(creer("li", { texte: typographie(comp) }));
  return creer("article", { class: "certificat", "aria-label": "Aperçu du certificat" }, [
    creer("img", { class: "logo", src: `${racine()}assets/img/logo-argos.svg`, alt: "" }),
    creer("p", { class: "surtitre", texte: "Certificat" }),
    creer("h2", { class: "titre-certificat", texte: c.titre }),
    creer("p", { class: "organisme", texte: c.organisme }),
    creer("p", { class: "formule", texte: typographie(c.formule) }),
    creer("p", { class: "noms", id: "noms-certificat" }),
    creer("p", { class: "texte-certificat", id: "texte-certificat", texte: typographie(c.texte_deux) }),
    competences,
    creer("div", { class: "bas" }, [
      creer("p", { class: "date-certificat" }, ["Délivré le", creer("br"), creer("strong", { texte: dateDuJour() })]),
      creer("div", { class: "tampon-certificat", "aria-hidden": "true" }, [creer("span", { html: "Cellule<br>ARGOS<br>Dossier clos" })]),
      creer("p", { class: "signature" }, [creer("span", { class: "nom-signature", texte: c.signature_nom }), c.signature_titre]),
    ]),
    creer("p", { class: "mention-fictive", texte: typographie(c.mention) }),
  ]);
}

function construire(donnees, zone) {
  const c = donnees.certificat;
  if (!quizTermine()) {
    zone.append(bandeauCompteARebours(donnees), blocVerrouille(c.verrou, { href: "quiz.html", texte: "Aller au quiz final →" }));
    return;
  }
  const champ = (id, etiquette) => creer("label", { for: id }, [
    etiquette,
    creer("input", { id, type: "text", maxlength: String(LONGUEUR_MAX), autocomplete: "off", spellcheck: "false" }),
  ]);
  const message = creer("p", { class: "message-code", role: "status", "aria-live": "polite" });
  const formulaire = creer("form", { class: "formulaire-certificat", novalidate: true }, [
    champ("prenom-1", "Prénom de l'analyste 1"),
    champ("prenom-2", "Prénom de l'analyste 2 (facultatif)"),
    creer("button", { type: "submit", class: "bouton", texte: "Imprimer le certificat" }),
  ]);
  const champs = [...formulaire.querySelectorAll("input")];
  const certificat = creerCertificat(c);

  zone.append(
    creer("div", { class: "ne-pas-imprimer" }, [
      bandeauCompteARebours(donnees),
      creer("p", { class: "consigne", texte: typographie(c.consigne) }),
      formulaire,
      creer("p", { class: "confidentialite", texte: "🔒 " + typographie(c.confidentialite) }),
      message,
    ]),
    creer("div", { class: "apercu-certificat" }, [certificat]),
  );

  const zoneNoms = certificat.querySelector("#noms-certificat");
  const zoneTexte = certificat.querySelector("#texte-certificat");
  const mettreAJour = () => {
    const noms = nomsAffiches(champs);
    zoneNoms.textContent = noms || " ";
    // Accord : « Alex a mené… », « Alex et Sam ont mené… »
    zoneTexte.textContent = typographie(prenoms(champs).length === 1 ? c.texte_un : c.texte_deux);
    message.textContent = "";
    message.className = "message-code";
  };
  champs.forEach((ch) => ch.addEventListener("input", mettreAJour));
  mettreAJour();

  formulaire.addEventListener("submit", (evenement) => {
    evenement.preventDefault();   // rien n'est envoyé : on imprime seulement
    if (!nomsAffiches(champs)) {
      message.textContent = "Saisissez au moins un prénom.";
      message.className = "message-code erreur";
      champs[0].focus();
      return;
    }
    window.print();
  });

  // Quand on quitte la page, les prénoms sont effacés (même si le navigateur garde la page en mémoire).
  window.addEventListener("pagehide", () => {
    champs.forEach((ch) => { ch.value = ""; });
    mettreAJour();
  });
}

demarrerPiece("certificat.html", construire);
