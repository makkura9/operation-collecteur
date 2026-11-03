// Faux navigateur : un cadre qui imite une fenêtre de navigateur générique.
//
// Pourquoi ? Le site est servi en HTTPS par GitHub Pages. Les pages « HTTP » et les domaines
// frauduleux (séances 1, 2, 3 et 5) sont donc SIMULÉS : ils s'affichent dans ce cadre, avec une
// barre d'adresse fictive. Aucune de ces adresses n'est ouverte pour de vrai, aucun formulaire
// ne part nulle part.
//
// Utilisation :
//   const nav = creerFauxNavigateur({ url: "https://exemple.ch/accueil", titre: "Accueil", contenu: unElement });
//   parent.append(nav.element);
//   nav.naviguer("http://autre.ch/page", { titre: "Autre", contenu: autreElement });
//
// Dans le contenu, tout élément portant l'attribut data-lien-reel="adresse" affiche cette adresse
// dans la barre d'état en bas du cadre quand on le survole (comme un vrai navigateur le fait).

import { creer } from "./chargeur.js";

const ICONE_CADENAS =
  '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M8 1a3.5 3.5 0 0 0-3.5 3.5V6H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-.5V4.5A3.5 3.5 0 0 0 8 1Zm-2 3.5a2 2 0 1 1 4 0V6H6V4.5Z"/></svg>';
const ICONE_ATTENTION =
  '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M8 1.5 15 14H1L8 1.5Zm-.75 4.5v4h1.5V6h-1.5Zm0 5v1.5h1.5V11h-1.5Z"/></svg>';

/** Découpe une adresse en protocole, sous-domaines, domaine, chemin. Le domaine = les deux derniers mots du nom d'hôte. */
export function decouperAdresse(url) {
  const m = /^(https?):\/\/([^/?#]+)(.*)$/i.exec(url);
  if (!m) return { protocole: "", sousDomaine: "", domaine: url, chemin: "" };
  const mots = m[2].split(".");
  const domaine = mots.slice(-2).join(".");
  const sousDomaine = mots.length > 2 ? mots.slice(0, -2).join(".") + "." : "";
  return { protocole: m[1].toLowerCase(), sousDomaine, domaine, chemin: m[3] || "" };
}

export function creerFauxNavigateur({ url, titre = "", contenu = null, securise, mettreDomaineEnEvidence = true, etiquetteAccessible = "Fenêtre de navigateur simulée" } = {}) {
  const pastilles = creer("span", { class: "fn-pastilles", "aria-hidden": "true" }, [
    creer("span"), creer("span"), creer("span"),
  ]);
  const onglet = creer("span", { class: "fn-onglet" });
  const securite = creer("span", { class: "fn-securite" });
  const adresse = creer("span", { class: "fn-url", role: "textbox", "aria-readonly": "true", "aria-label": "Adresse de la page (simulée)" });
  const page = creer("div", { class: "fn-page" });
  const etat = creer("div", { class: "fn-etat", "aria-live": "polite" });

  const element = creer("section", { class: "faux-navigateur", "aria-label": etiquetteAccessible }, [
    creer("div", { class: "fn-barre" }, [pastilles, onglet]),
    creer("div", { class: "fn-adresse" }, [securite, adresse]),
    page,
    etat,
  ]);

  // Barre d'état : adresse réelle du lien survolé ou ayant le focus.
  function montrerEtat(evenement) {
    const cible = evenement.target.closest && evenement.target.closest("[data-lien-reel]");
    if (cible) {
      etat.textContent = cible.dataset.lienReel;
      etat.classList.add("visible");
    }
  }
  function cacherEtat() {
    etat.classList.remove("visible");
    etat.textContent = "";
  }
  page.addEventListener("mouseover", montrerEtat);
  page.addEventListener("focusin", montrerEtat);
  page.addEventListener("mouseout", cacherEtat);
  page.addEventListener("focusout", cacherEtat);

  function afficherAdresse(adresseComplete, typeSecurite) {
    const partie = decouperAdresse(adresseComplete);
    const protocoleReel = typeSecurite || partie.protocole || "https";
    securite.className = "fn-securite " + (protocoleReel === "http" ? "non-securise" : "securise");
    securite.innerHTML = protocoleReel === "http"
      ? ICONE_ATTENTION + "<span>Non sécurisé</span>"
      : ICONE_CADENAS + '<span class="sr-seulement">Connexion HTTPS</span>';
    adresse.textContent = "";
    const morceaux = [
      creer("span", { class: "fn-proto", texte: partie.protocole ? partie.protocole + "://" : "" }),
      creer("span", { class: "fn-sous", texte: partie.sousDomaine }),
      creer("span", { class: mettreDomaineEnEvidence ? "fn-domaine" : "fn-sous", texte: partie.domaine }),
      creer("span", { class: "fn-chemin", texte: partie.chemin }),
    ];
    adresse.append(...morceaux);
  }

  function naviguer(nouvelleUrl, options = {}) {
    const { titre: nouveauTitre = "", contenu: nouveauContenu = null, securise: forceSecurite } = options;
    onglet.textContent = nouveauTitre;
    afficherAdresse(nouvelleUrl, forceSecurite);
    cacherEtat();
    page.textContent = "";
    if (nouveauContenu) page.append(nouveauContenu);
    page.scrollTop = 0;
  }

  naviguer(url || "https://", { titre, contenu, securise });
  return { element, page, naviguer };
}
