// Carte du réseau (séance 5) : dessine les nœuds et les liaisons en SVG, met en évidence un chemin,
// et fait circuler des « enveloppes » (scellées en HTTPS, ouvertes en HTTP).
// Décoratif et illustratif ; toute l'interaction pédagogique est pilotée depuis le panneau (reseau.js).

// (rendu SVG via le helper local « el » ci-dessous)

const NS = "http://www.w3.org/2000/svg";
const reduire = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function el(nom, attrs = {}, enfants = []) {
  const e = document.createElementNS(NS, nom);
  for (const [k, v] of Object.entries(attrs)) if (v !== null && v !== undefined) e.setAttribute(k, v);
  for (const c of [].concat(enfants)) if (c) e.append(c);
  return e;
}

export function construireCarte(svg, donnees, { attaque = false } = {}) {
  svg.textContent = "";
  svg.setAttribute("viewBox", "0 0 1000 600");
  svg.setAttribute("role", "img");
  const coord = {};
  for (const n of donnees.noeuds) coord[n.id] = n;

  const liaisons = attaque ? donnees.liaisons_attaque : donnees.liaisons_normal;
  const visibles = new Set();
  for (const [a, b] of liaisons) { visibles.add(a); visibles.add(b); }

  const coucheLiens = el("g", { class: "carte-liens" });
  const coucheEnvel = el("g", { class: "carte-enveloppes" });
  const coucheNoeuds = el("g", { class: "carte-noeuds" });
  svg.append(coucheLiens, coucheEnvel, coucheNoeuds);

  const liensParCle = {};
  for (const [a, b] of liaisons) {
    const ligne = el("line", { x1: coord[a].x, y1: coord[a].y, x2: coord[b].x, y2: coord[b].y, class: "lien" });
    liensParCle[a + ">" + b] = ligne;
    liensParCle[b + ">" + a] = ligne;
    coucheLiens.append(ligne);
  }

  for (const n of donnees.noeuds) {
    if (!visibles.has(n.id)) continue;
    const classe = "noeud noeud-" + n.type + (n.protocole ? " proto-" + n.protocole : "");
    const g = el("g", { class: classe, "data-noeud": n.id, transform: `translate(${n.x} ${n.y})` });
    if (n.type === "nuage") {
      g.append(el("ellipse", { rx: 56, ry: 34, class: "forme" }));
    } else if (n.type === "serveur" || n.type === "pirate") {
      g.append(el("rect", { x: -34, y: -26, width: 68, height: 52, rx: 8, class: "forme" }));
    } else {
      g.append(el("circle", { r: 30, class: "forme" }));
    }
    g.append(el("text", { class: "noeud-emoji", y: 8, "text-anchor": "middle" }, document.createTextNode(n.emoji)));
    const label = el("text", { class: "noeud-label", y: n.type === "serveur" || n.type === "pirate" ? 46 : 50, "text-anchor": "middle" });
    label.append(document.createTextNode(n.label));
    g.append(label);
    if (n.sous) {
      const sous = el("text", { class: "noeud-sous", y: (n.type === "serveur" || n.type === "pirate" ? 46 : 50) + 19, "text-anchor": "middle" });
      sous.append(document.createTextNode(n.sous));
      g.append(sous);
    }
    if (n.protocole) {
      // Pastille bien lisible : « 🔒 HTTPS » (vert) ou « HTTP » (orange).
      const https = n.protocole !== "http";
      const pastille = el("g", { class: "pastille-proto " + (https ? "https" : "http"), transform: "translate(84 0)" });  // à droite du serveur
      pastille.append(el("rect", { x: https ? -40 : -27, y: -12, width: https ? 80 : 54, height: 22, rx: 11 }));
      const texte = el("text", { y: 4, "text-anchor": "middle" });
      texte.append(document.createTextNode(https ? "🔒 HTTPS" : "HTTP"));
      pastille.append(texte);
      g.append(pastille);
    }
    coucheNoeuds.append(g);
  }

  function pointsDuChemin(chemin) {
    return chemin.filter((id) => coord[id]).map((id) => `${coord[id].x},${coord[id].y}`);
  }

  function mettreEnEvidence(chemin) {
    reinitialiser();
    for (let i = 0; i < chemin.length - 1; i++) {
      const l = liensParCle[chemin[i] + ">" + chemin[i + 1]];
      if (l) l.classList.add("actif");
    }
    for (const id of chemin) {
      const g = coucheNoeuds.querySelector(`[data-noeud="${id}"]`);
      if (g) g.classList.add("actif");
    }
    const arrivee = coucheNoeuds.querySelector(`[data-noeud="${chemin[chemin.length - 1]}"]`);
    if (arrivee) arrivee.classList.add("arrivee");
  }

  function reinitialiser() {
    arreterEnveloppe();
    coucheLiens.querySelectorAll(".actif").forEach((l) => l.classList.remove("actif"));
    coucheNoeuds.querySelectorAll(".actif, .arrivee").forEach((g) => g.classList.remove("actif", "arrivee"));
  }

  let enveloppeCourante = null;
  let animation = null;

  function arreterEnveloppe() {
    if (animation) cancelAnimationFrame(animation);
    animation = null;
    if (enveloppeCourante) enveloppeCourante.remove();
    enveloppeCourante = null;
  }

  function creerEnveloppe(scelle) {
    const env = el("g", { class: "enveloppe " + (scelle ? "scellee" : "ouverte") });
    env.append(el("rect", { x: -16, y: -12, width: 32, height: 24, rx: 3, class: "env-corps" }));
    env.append(el("path", { d: scelle ? "M-16 -12 L0 2 L16 -12" : "M-16 -12 L0 -26 L16 -12", class: "env-rabat" }));
    const icone = el("text", { class: "env-icone", y: 6, "text-anchor": "middle" });
    icone.append(document.createTextNode(scelle ? "🔒" : "✉"));
    env.append(icone);
    return env;
  }

  /**
   * Fait glisser UNE enveloppe le long d'un chemin (la précédente est retirée).
   * Le type d'enveloppe est déduit du serveur de destination : scellée (HTTPS) ou ouverte (HTTP).
   * À l'arrivée, l'enveloppe reste posée à côté du serveur jusqu'au clic suivant.
   */
  function animerPaquet(chemin, { duree = 2.2 } = {}) {
    arreterEnveloppe();
    const pts = chemin.filter((id) => coord[id]).map((id) => [coord[id].x, coord[id].y]);
    if (pts.length < 2) return;
    const destination = coord[chemin[chemin.length - 1]];
    const scelle = !(destination && destination.protocole === "http");
    const env = creerEnveloppe(scelle);
    coucheEnvel.append(env);
    enveloppeCourante = env;
    const placer = (x, y) => env.setAttribute("transform", `translate(${x} ${y})`);
    const [xFin, yFin] = pts[pts.length - 1];
    const poserArrivee = () => placer(xFin - 62, yFin);
    if (reduire) { poserArrivee(); return; }   // sans animation : directement à l'arrivée
    const longueurs = [];
    let total = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
      longueurs.push(l);
      total += l;
    }
    const debut = performance.now();
    const etape = (instant) => {
      const fraction = Math.min(1, (instant - debut) / (duree * 1000));
      let reste = fraction * total;
      let i = 0;
      while (i < longueurs.length - 1 && reste > longueurs[i]) { reste -= longueurs[i]; i++; }
      const r = longueurs[i] ? Math.min(1, reste / longueurs[i]) : 1;
      placer(pts[i][0] + (pts[i + 1][0] - pts[i][0]) * r, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * r);
      if (fraction < 1) animation = requestAnimationFrame(etape);
      else { animation = null; poserArrivee(); }
    };
    animation = requestAnimationFrame(etape);
  }

  function definirDescription(texte) { svg.setAttribute("aria-label", texte); }

  return { mettreEnEvidence, reinitialiser, animerPaquet, definirDescription };
}
