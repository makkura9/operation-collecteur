// Dénouement (séance 6) : débloqué quand la frise est reconstituée.
// Récit (texte + audio), recrutement de Kenzo (messages), signaux d'alerte, loi, que faire si victime.

import { chargerJson, creer, racine, typographie } from "./chargeur.js";
import { bandeauCompteARebours, blocVerrouille, demarrerPiece, friseReussie, photo } from "./synthese-commun.js";

async function audioExiste(adresse) {
  try {
    const reponse = await fetch(adresse, { method: "HEAD", cache: "no-cache" });
    return reponse.ok;
  } catch (erreur) {
    return false;
  }
}

async function blocRecit(d) {
  const bloc = creer("section", { class: "carte recit", "aria-labelledby": "titre-recit" }, [
    creer("h2", { id: "titre-recit", texte: "Message de la Commandante Keller" }),
  ]);
  const adresse = `${racine()}assets/audio/${d.audio}`;
  if (await audioExiste(adresse)) bloc.append(creer("audio", { controls: true, preload: "none", src: adresse }));
  else bloc.append(creer("p", { class: "audio-indisponible", texte: "L'enregistrement audio n'est pas encore disponible. Lisez le texte ci-dessous." }));
  const texte = creer("div", { class: "texte-recit" });
  for (const paragraphe of d.texte) texte.append(creer("p", { texte: typographie(paragraphe) }));
  bloc.append(texte, creer("p", { class: "note-fiction", texte: typographie(d.note_fiction) }));
  return bloc;
}

/** Conversation de recrutement : bulles de messagerie générique ; les signaux d'alerte s'affichent sur demande. */
function blocRecrutement(kenzo, signaux) {
  const nomSignal = {};
  for (const s of signaux.liste) nomSignal[s.id] = s.nom;
  const badge = (id) => (id ? creer("span", { class: "signal", texte: `⚠ ${nomSignal[id]}` }) : null);

  const fil = creer("div", { class: "fil", role: "group", "aria-label": "Conversation entre Kenzo et le compte qui l'a recruté" });
  fil.append(creer("div", { class: "story" + (kenzo.story.signal ? " avec-signal" : "") }, [
    creer("small", { texte: `Story de ${kenzo.story.auteur}` }),
    creer("span", { texte: typographie(kenzo.story.texte) }),
    badge(kenzo.story.signal),
  ]));
  for (const m of kenzo.messages) {
    const envoyee = m.auteur === "kenzo";
    fil.append(creer("div", { class: `bulle ${envoyee ? "envoyee" : "recue"}${m.signal ? " avec-signal" : ""}` }, [
      creer("span", { class: "auteur", texte: kenzo.auteurs[m.auteur] }),
      creer("span", { texte: typographie(m.texte) }),
      badge(m.signal),
    ]));
  }

  const bouton = creer("button", { type: "button", class: "bouton secondaire", "aria-pressed": "false", texte: "Montrer les signaux d'alerte" });
  bouton.addEventListener("click", () => {
    const visibles = fil.classList.toggle("signaux-visibles");
    bouton.setAttribute("aria-pressed", String(visibles));
    bouton.textContent = visibles ? "Masquer les signaux d'alerte" : "Montrer les signaux d'alerte";
  });

  return creer("section", { class: "carte bloc-denouement", "aria-labelledby": "titre-recrutement" }, [
    creer("h2", { id: "titre-recrutement", texte: kenzo.titre }),
    creer("div", { class: "recrutement" }, [
      photo(kenzo.image, kenzo.image_alt, "🧑", "portrait"),
      creer("div", {}, [
        creer("p", { class: "contexte", texte: typographie(kenzo.contexte) }),
        fil,
        creer("p", { class: "apres-recrutement", texte: typographie(kenzo.apres) }),
        creer("p", { texte: typographie(signaux.consigne) }),
        bouton,
      ]),
    ]),
  ]);
}

function blocInfos(d) {
  const signaux = creer("ul", { class: "liste-signaux" });
  for (const s of d.signaux.liste) signaux.append(creer("li", {}, [creer("strong", { texte: `${s.nom} : ` }), typographie(s.texte)]));
  const loi = creer("div", { class: "loi" });
  for (const point of d.loi.points) loi.append(creer("p", { texte: typographie(point) }));
  const etapes = creer("ol", { class: "etapes-victime" });
  for (const e of d.victime.etapes) etapes.append(creer("li", { texte: typographie(e) }));
  return creer("div", { class: "grille-infos bloc-denouement" }, [
    creer("section", { class: "carte", "aria-labelledby": "titre-signaux" }, [creer("h2", { id: "titre-signaux", texte: typographie(d.signaux.titre) }), signaux]),
    creer("section", { class: "carte", "aria-labelledby": "titre-loi" }, [creer("h2", { id: "titre-loi", texte: d.loi.titre }), loi]),
    creer("section", { class: "carte", "aria-labelledby": "titre-victime" }, [creer("h2", { id: "titre-victime", texte: d.victime.titre }), etapes]),
  ]);
}

function blocDernierMessage(m) {
  return creer("section", { class: "carte bloc-denouement", "aria-labelledby": "titre-dernier" }, [
    creer("h2", { id: "titre-dernier", texte: m.titre }),
    creer("div", { class: "brouillon-final" }, [
      photo(m.image, m.image_alt, "🐷", "paysage"),
      creer("blockquote", {}, [creer("p", { texte: typographie(`« ${m.texte} »`) }), creer("footer", { texte: m.signature })]),
    ]),
  ]);
}

async function construire(donnees, zone) {
  const d = donnees.denouement;
  if (!friseReussie()) {
    zone.append(bandeauCompteARebours(donnees), blocVerrouille(d.verrou, { href: "frise.html", texte: "Aller à la frise →" }));
    return;
  }
  const kenzo = await chargerJson("data/kenzo.json");
  zone.append(
    bandeauCompteARebours(donnees),
    photo(d.image, d.image_alt, "🌅", "large"),
    await blocRecit(d),
    blocRecrutement(kenzo, d.signaux),
    blocInfos(d),
    blocDernierMessage(d.dernier_message),
    creer("p", { class: "fin-affaire", texte: typographie(d.fin) }),
    creer("p", { class: "actions-suite centre" }, [
      creer("a", { class: "bouton", href: "quiz.html", texte: "Passer au quiz final →" }),
    ]),
  );
}

demarrerPiece("denouement.html", construire);
