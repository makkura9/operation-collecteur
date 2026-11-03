// Site de l'agence Horizons Jeunesse, affiché dans le faux navigateur.
// Contenu : data/agence.json. Les fonctions exportées servent aussi à fabriquer le faux site (séance 2).

import { chargerJson, creer, racine, typographie } from "./chargeur.js";
import { creerFauxNavigateur } from "./faux-navigateur.js";
import * as Progression from "./progression.js";
import { verrouillerPage } from "./verrou.js";

/** Image avec repli (cadre sobre) si le fichier n'existe pas encore. */
function photo(fichier, alt, emoji) {
  const cadre = creer("div", { class: "photo" });
  const image = creer("img", { src: `${racine()}assets/img/${fichier}`, alt, loading: "lazy" });
  image.addEventListener("error", () => {
    cadre.textContent = "";
    cadre.classList.add("manquante");
    cadre.setAttribute("role", "img");
    cadre.setAttribute("aria-label", alt);
    cadre.append(creer("span", { class: "photo-emoji", "aria-hidden": "true", texte: emoji || "🖼️" }));
  });
  cadre.append(image);
  return cadre;
}

/**
 * Construit une page du site.
 * options.adresse(idPage) : adresse affichée dans la barre d'état au survol d'un lien.
 * options.aller(idPage)   : appelé quand on clique sur un lien interne.
 * options.connexion(formulaire, message) : branche le formulaire de connexion (par défaut : message neutre).
 */
export function construirePage(agence, idPage, options) {
  const page = agence.pages[idPage];
  const lien = (texte, vers, classe) => creer("a", {
    href: "#", class: classe, "data-lien-reel": options.adresse(vers), texte,
    onclick: (e) => { e.preventDefault(); options.aller(vers); },
  });

  const corps = creer("div", { class: "ag-corps" });
  for (const bloc of page.blocs) {
    if (bloc.type === "hero") {
      corps.append(creer("section", { class: "ag-hero" }, [
        photo(bloc.image, bloc.alt, bloc.emoji),
        creer("div", { class: "ag-hero-texte" }, [
          creer("h1", { texte: typographie(bloc.titre) }),
          creer("p", { texte: typographie(bloc.texte) }),
          bloc.bouton ? lien(bloc.bouton.texte, bloc.bouton.vers, "ag-bouton") : null,
        ]),
      ]));
    } else if (bloc.type === "cartes") {
      const grille = creer("div", { class: "ag-cartes" });
      for (const c of bloc.elements) {
        grille.append(creer("article", { class: "ag-carte" }, [
          photo(c.image, c.alt, c.emoji),
          creer("div", { class: "ag-carte-texte" }, [
            creer("h3", { texte: typographie(c.titre) }),
            creer("p", { texte: typographie(c.texte) }),
            c.vers ? lien("Voir le détail", c.vers) : null,
          ]),
        ]));
      }
      corps.append(creer("section", {}, [bloc.titre ? creer("h2", { texte: typographie(bloc.titre) }) : null, grille]));
    } else if (bloc.type === "texte") {
      corps.append(creer("section", {}, [
        creer(idPage === "accueil" ? "h2" : "h1", { texte: typographie(bloc.titre) }),
        ...bloc.paragraphes.map((p) => creer("p", { texte: typographie(p) })),
      ]));
    } else if (bloc.type === "liste") {
      corps.append(creer("section", {}, [
        bloc.titre ? creer("h2", { texte: typographie(bloc.titre) }) : null,
        creer("ul", { class: "ag-liste" }, bloc.elements.map((e) => creer("li", { texte: typographie(e) }))),
      ]));
    } else if (bloc.type === "contact") {
      const dl = creer("dl", { class: "ag-contact" });
      for (const [nom, valeur] of bloc.lignes) dl.append(creer("dt", { texte: nom }), creer("dd", { texte: typographie(valeur) }));
      corps.append(creer("section", {}, [creer("h1", { texte: bloc.titre }), dl, bloc.note ? creer("p", { class: "ag-note", texte: typographie(bloc.note) }) : null]));
    } else if (bloc.type === "connexion") {
      const message = creer("p", { class: "ag-message", role: "status", hidden: true });
      const formulaire = creer("form", { class: "ag-formulaire", novalidate: true, autocomplete: "off" }, [
        creer("label", {}, ["Adresse e-mail", creer("input", { type: "email", name: "courriel", autocomplete: "off", placeholder: "prenom.nom@exemple.ch" })]),
        creer("label", {}, ["Mot de passe", creer("input", { type: "password", name: "secret", autocomplete: "off" })]),
        creer("button", { type: "submit", class: "ag-bouton", texte: "Se connecter" }),
        message,
      ]);
      formulaire.addEventListener("submit", (e) => {
        e.preventDefault();
        if (options.connexion) options.connexion(formulaire, message);
        else {
          message.hidden = false;
          message.textContent = "Cet espace client n'est pas disponible dans cet environnement pédagogique. Rien n'a été enregistré.";
        }
      });
      corps.append(creer("section", {}, [creer("h1", { texte: bloc.titre }), creer("p", { texte: typographie(bloc.texte) }), formulaire]));
    }
  }

  const menu = creer("nav", { class: "ag-menu", "aria-label": "Menu du site" });
  for (const entree of agence.menu) {
    const a = lien(entree.texte, entree.id);
    if (entree.id === idPage) a.setAttribute("aria-current", "page");
    menu.append(a);
  }
  return creer("div", { class: "site-agence" }, [
    creer("header", { class: "ag-entete" }, [
      creer("a", { href: "#", class: "ag-marque", "data-lien-reel": options.adresse("accueil"), onclick: (e) => { e.preventDefault(); options.aller("accueil"); } },
        [agence.marque, creer("small", { texte: agence.slogan })]),
      menu,
    ]),
    corps,
    creer("footer", { class: "ag-pied", texte: agence.pied }),
  ]);
}

async function demarrer() {
  const cadre = document.getElementById("navigateur");
  try {
    Progression.configurer(await chargerJson("data/config.json"));
    await verrouillerPage([1, 2, 5]);
    const agence = await chargerJson("data/agence.json");
    const adresse = (id) => `https://${agence.domaine}${agence.pages[id].chemin === "/" ? "/" : agence.pages[id].chemin}`;
    const navigateur = creerFauxNavigateur({ url: adresse("accueil") });
    const aller = (id) => {
      navigateur.naviguer(adresse(id), { titre: `${agence.pages[id].titre} — ${agence.marque}`, contenu: construirePage(agence, id, { adresse, aller }), securise: "https" });
    };
    cadre.append(navigateur.element);
    aller("accueil");
    document.getElementById("zone-agence").hidden = false;
  } catch (erreur) {
    document.getElementById("zone-agence").hidden = false;
    cadre.textContent = "Impossible de charger le site. Ouvrez le site par son adresse web, puis rechargez la page.";
    console.error(erreur);
  }
}

if (document.getElementById("navigateur")) demarrer();
