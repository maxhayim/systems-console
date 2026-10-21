// Systems -> animated overhead-panel SVG in the Flight Path Radar phosphor palette.

const W = 960;
const PH = 150, GAP = 12;     // panel height (with titles) and spacing
const TITLE_H = 14;           // room the panel title row takes
const FONT = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";

const T = {
  bg: "#020d07", panel: "#03140b", border: "#14522d", grid: "#0f3d22",
  text: "#5dff95", dim: "#2fc062", faint: "#1c8443", off: "#0b3a1f",
  amber: "#ffb347", lamp: "#0b3a1f", stby: "#2a1d08",
};

const f = (n) => +n.toFixed(2);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const trunc = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

const text = (x, y, s, { size = 11, fill = T.text, anchor = "start", weight = "", opacity = "", extra = "", children = "" } = {}) =>
  `<text x="${f(x)}" y="${f(y)}" font-size="${size}" fill="${fill}" text-anchor="${anchor}"` +
  `${weight ? ` font-weight="${weight}"` : ""}${opacity ? ` opacity="${opacity}"` : ""}${extra}>${esc(s)}${children}</text>`;

// Bezel with corner brackets and an optional title tab.
function panel(x, y, w, h, title) {
  const b = 10, c = (px, py, dx, dy) => `M${px + dx * b},${py}L${px},${py}L${px},${py + dy * b}`;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${T.panel}" stroke="${T.border}"/>` +
    `<path d="${c(x, y, 1, 1)}${c(x + w, y, -1, 1)}${c(x, y + h, 1, -1)}${c(x + w, y + h, -1, -1)}" fill="none" stroke="${T.dim}" stroke-width="1.5"/>` +
    (title == null ? "" : text(x + 12, y + 16, title, { size: 10, fill: T.dim, weight: 700, extra: ` letter-spacing="1.5"` }));
}

const isOn = (g, it) => !g.languages || it.repos > 0;

function readout(it, on) {
  if (!on) return "STBY";
  if (it.repos == null) return "ON";
  return `ON · ${it.repos} REPO${it.repos === 1 ? "" : "S"}`;
}

// One system: a backlit push-button plate with its icon, name and status lamp, wired down to the panel's bus.
function module(it, on, mx, my, mw, busY, k) {
  const mh = 92, cx = mx + mw / 2, out = [];
  const glow = on ? ` filter="url(#glow)"` : "";
  out.push(`<rect x="${f(mx)}" y="${my}" width="${f(mw)}" height="${mh}" rx="5" fill="${T.bg}" stroke="${on ? T.border : T.grid}"/>`);

  // Icon (Simple Icons, 24x24), or a blank plate with the initial when there isn't one.
  const icon = it.path
    ? `<path d="${it.path}" transform="translate(${f(cx - 14)} ${my + 10}) scale(${f(28 / 24)})" fill="${on ? T.text : T.faint}"${glow}/>`
    : `<rect x="${f(cx - 14)}" y="${my + 10}" width="28" height="28" rx="4" fill="none" stroke="${on ? T.text : T.faint}"/>` +
      text(cx, my + 29, it.label[0].toUpperCase(), { size: 14, anchor: "middle", fill: on ? T.text : T.faint, weight: 700 });
  out.push(`<g opacity="0">${icon}<animate attributeName="opacity" from="0" to="1" begin="${f(0.2 + k * 0.07)}s" dur="0.3s" fill="freeze"/></g>`);
  out.push(text(cx, my + 55, trunc(it.label.toUpperCase(), Math.floor(mw / 6.4)), { size: 10, anchor: "middle", fill: on ? T.text : T.faint, extra: ` letter-spacing="0.5"` }));

  // Status lamp: amber during the power-up lamp test, then its own state.
  const lamp = on ? T.lamp : T.stby, ink = on ? T.text : T.amber, t = f(0.9 + k * 0.07);
  out.push(`<rect x="${f(mx + 8)}" y="${my + 64}" width="${f(mw - 16)}" height="20" rx="3" fill="${lamp}" stroke="${ink}" stroke-opacity="0.8">` +
    `<animate attributeName="fill" values="${T.amber};${T.amber};${lamp}" keyTimes="0;0.85;1" dur="${t}s" fill="freeze"/></rect>`,
    text(cx, my + 78, readout(it, on), { size: 9, anchor: "middle", fill: ink, weight: 700,
      children: `<animate attributeName="fill" values="${T.bg};${T.bg};${ink}" keyTimes="0;0.85;1" dur="${t}s" fill="freeze"/>` +
        (on ? "" : `<animate attributeName="opacity" values="1;0.45;1" begin="${t}s" dur="2s" repeatCount="indefinite"/>`) }));

  // Feeder: live current flowing up from the bus, or an open breaker for standby.
  const y0 = my + mh, mid = (y0 + busY) / 2;
  if (on) {
    out.push(`<line x1="${f(cx)}" y1="${y0}" x2="${f(cx)}" y2="${busY}" stroke="${T.dim}" stroke-width="1.5"/>`,
      `<line x1="${f(cx)}" y1="${busY}" x2="${f(cx)}" y2="${y0}" stroke="${T.text}" stroke-width="1.5" stroke-dasharray="2 4">` +
      `<animate attributeName="stroke-dashoffset" from="6" to="0" dur="0.5s" repeatCount="indefinite"/></line>`);
  } else {
    out.push(`<path d="M${f(cx)},${y0}V${mid - 3}M${f(cx)},${busY}V${mid + 3}L${f(cx + 6)},${mid - 4}" fill="none" stroke="${T.faint}" stroke-width="1.5"/>`);
  }
  out.push(`<circle cx="${f(cx)}" cy="${busY}" r="2.5" fill="${on ? T.text : T.faint}"/>`);
  return out.join("\n");
}

function group(g, gi, x, y, w, k0, titles) {
  const n = g.items.length, gap = 14;
  const mw = Math.min(160, (w - 32 - (n - 1) * gap) / n), total = n * mw + (n - 1) * gap;
  const ph = titles ? PH : PH - TITLE_H, x0 = x + (w - total) / 2, busY = y + ph - 16;
  const on = g.items.filter((it) => isOn(g, it)).length;
  const out = [panel(x, y, w, ph, titles ? g.title.toUpperCase() : null)];
  if (titles) out.push(text(x + w - 12, y + 16, `BUS ${gi + 1} · ${on}/${n} ON`, { size: 10, anchor: "end", fill: on === n ? T.dim : T.amber }));

  // Bus bar with current running along it.
  const bx0 = x + 16, bx1 = x + w - 16;
  out.push(`<line x1="${bx0}" y1="${busY}" x2="${bx1}" y2="${busY}" stroke="${T.dim}" stroke-width="2"/>`,
    `<line x1="${bx0}" y1="${busY}" x2="${bx1}" y2="${busY}" stroke="${T.text}" stroke-width="2" stroke-dasharray="3 13">` +
    `<animate attributeName="stroke-dashoffset" from="${gi % 2 ? -16 : 16}" to="0" dur="1.2s" repeatCount="indefinite"/></line>`,
    `<rect x="${bx0 - 4}" y="${busY - 4}" width="8" height="8" fill="${T.panel}" stroke="${T.text}"/>`,
    `<rect x="${bx1 - 4}" y="${busY - 4}" width="8" height="8" fill="${T.panel}" stroke="${T.text}"/>`);
  g.items.forEach((it, i) => out.push(module(it, isOn(g, it), x0 + i * (mw + gap), y + (titles ? 26 : 12), mw, busY, k0 + i)));
  return out.join("\n");
}

function annunciators(s, y) {
  const all = s.groups.flatMap((g) => g.items.map((it) => isOn(g, it)));
  const on = all.filter(Boolean).length, stby = all.length - on;
  const sync = s.generatedAt.slice(0, 16).replace("T", " ") + "Z";
  const lamps = [["SYS NOMINAL", true], [`${s.groups.length} BUSES`, false], [`${all.length} SYSTEMS`, false], [`${on} ONLINE`, false],
    ...(stby ? [[`${stby} STBY`, "amber"]] : []), ["LAMP TEST OK", false], [`SYNC ${sync}`, false]];
  let x = 16;
  return lamps.map(([l, lit]) => {
    const w = l.length * 6.6 + 18, amber = lit === "amber";
    const g = `<rect x="${f(x)}" y="${y}" width="${f(w)}" height="20" rx="3" fill="${lit === true ? T.lamp : T.panel}" stroke="${lit === true ? T.text : amber ? T.amber : T.border}"/>` +
      text(x + w / 2, y + 14, l, { size: 10, anchor: "middle", fill: lit === true ? T.text : amber ? T.amber : T.dim, weight: lit ? 700 : "",
        children: l === "SYS NOMINAL" ? `<animate attributeName="opacity" values="1;0.55;1" dur="2.4s" repeatCount="indefinite"/>` : "" });
    x += w + 8;
    return g;
  }).join("\n");
}

// titles: false drops the header (title, callsign and name) and the panel titles; the panels move up to fill the space.
export function buildSvg(s, { titles = true } = {}) {
  const ph = titles ? PH : PH - TITLE_H, py = titles ? 56 : 12;
  const H = py + s.groups.length * (ph + GAP) + 32;
  const header = !titles ? "" : [
    text(16, 34, "SYSTEMS CONSOLE", { size: 18, weight: 700, extra: ` letter-spacing="3"` }),
    text(260, 34, `CALLSIGN ${s.login.toUpperCase()}`, { size: 11, fill: T.amber, extra: ` letter-spacing="1.5"` }),
    `<text x="${W - 16}" y="34" font-size="14" fill="${T.text}" text-anchor="end">${esc(s.name)}</text>`,
    `<line x1="16" y1="46" x2="${W - 16}" y2="46" stroke="${T.border}"/>`,
  ].join("\n");
  let k = 0;
  const groups = s.groups.map((g, i) => { const out = group(g, i, 16, py + i * (ph + GAP), W - 32, k, titles); k += g.items.length; return out; });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${FONT}">
<title>Systems Console: ${esc(s.login)}</title>
<defs><filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
<rect width="${W}" height="${H}" rx="10" fill="${T.bg}"/>
${header}
${groups.join("\n")}
${annunciators(s, H - 32)}
</svg>`;
}
