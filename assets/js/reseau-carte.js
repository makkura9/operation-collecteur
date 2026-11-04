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
      const sous = el("text", { class: "noeud-sous", y: (n.type === "serveur" || n.type === "pirate" ? 46 : 50) + 16, "text-anchor": "middle" });
      sous.append(document.createTextNode(n.sous));
      g.append(sous);
    }
    if (n.protocole) {
      const badge = el("text", { class: "noeud-proto", x: 40, y: -18, "text-anchor": "middle" });
      badge.append(document.createTextNode(n.protocole === "http" ? "HTTP" : "HTTPS"));
      g.append(badge);
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
  }

  function reinitialiser() {
    coucheLiens.querySelectorAll(".actif").forEach((l) => l.classList.remove("actif"));
    coucheNoeuds.querySelectorAll(".actif").forEach((g) => g.classList.remove("actif"));
  }

  /** Fait glisser une enveloppe le long d'un chemin. protocole : "https" (scellée) ou "http" (ouverte). */
  function animerPaquet(chemin, protocole, { duree = 2.4, boucle = false } = {}) {
    const pts = pointsDuChemin(chemin);
    if (pts.length < 2) return () => {};
    const d = "M" + pts.join(" L");
    const scelle = protocole !== "http";
    const env = el("g", { class: "enveloppe " + (scelle ? "scellee" : "ouverte") });
    env.append(el("rect", { x: -15, y: -11, width: 30, height: 22, rx: 3, class: "env-corps" }));
    env.append(el("path", { d: "M-15 -11 L0 2 L15 -11", class: "env-rabat" }));
    env.append(el("text", { class: "env-icone", y: 6, "text-anchor": "middle" }, document.createTextNode(scelle ? "🔒" : "✉")));
    if (reduire) {
      // Sans animation : enveloppe posée au milieu du chemin.
      const milieu = pts[Math.floor(pts.length / 2)].split(",");
      env.setAttribute("transform", `translate(${milieu[0]} ${milieu[1]})`);
      coucheEnvel.append(env);
      return () => env.remove();
    }
    const motion = el("animateMotion", { dur: duree + "s", path: d, repeatCount: boucle ? "indefinite" : "1", rotate: "0", fill: "freeze" });
    env.append(motion);
    coucheEnvel.append(env);
    if (!boucle) {
      motion.addEventListener("endEvent", () => env.remove());
      // Repli si endEvent n'est pas émis : on retire après la durée.
      setTimeout(() => env.remove(), duree * 1000 + 400);
    }
    if (motion.beginElement) motion.beginElement();
    return () => env.remove();
  }

  function definirDescription(texte) { svg.setAttribute("aria-label", texte); }

  return { mettreEnEvidence, reinitialiser, animerPaquet, definirDescription };
}
