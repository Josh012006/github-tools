import { mkdir, writeFile } from "node:fs/promises";
import { gql, USER, C, esc } from "./lib.mjs";

const TOP = Number(process.env.TOP_LANGS || 8);
const EXCLUDE = (process.env.EXCLUDE_LANGS || "")
  .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

// ---------- 1. Fetch languages of every repo you own (forks excluded) ----------
const Q = `
query($login: String!, $after: String) {
  user(login: $login) {
    repositories(first: 100, after: $after, ownerAffiliations: OWNER, isFork: false) {
      pageInfo { hasNextPage endCursor }
      nodes {
        languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
          edges { size node { name color } }
        }
      }
    }
  }
}`;

const langs = new Map(); // name -> { size, color }
let after = null;
do {
  const { user } = await gql(Q, { login: USER, after });
  const repos = user.repositories;
  for (const repo of repos.nodes)
    for (const e of repo.languages.edges) {
      if (EXCLUDE.includes(e.node.name.toLowerCase())) continue;
      const l = langs.get(e.node.name) || { size: 0, color: e.node.color };
      l.size += e.size;
      langs.set(e.node.name, l);
    }
  after = repos.pageInfo.hasNextPage ? repos.pageInfo.endCursor : null;
} while (after);

const total = [...langs.values()].reduce((a, l) => a + l.size, 0);
const rows = [...langs.entries()]
  .sort((a, b) => b[1].size - a[1].size)
  .slice(0, TOP)
  .map(([name, l]) => ({ name, color: l.color || C.fg, pct: (l.size / total) * 100 }));

// ---------- 2. Draw the SVG ----------
const W = 900, T = 75, RH = 34, BX = 190, BW = 560;
const H = T + Math.max(rows.length, 1) * RH + 25;
const maxPct = Math.max(...rows.map((r) => r.pct), 1);

let body = "";
if (rows.length === 0) {
  body = `<text x="${W / 2}" y="${T + 20}" text-anchor="middle" fill="${C.muted}" font-size="14">No language data</text>`;
}
rows.forEach((r, k) => {
  const y = T + k * RH;
  const w = Math.max(4, (r.pct / maxPct) * BW);
  body += `<text x="40" y="${y + 13}" fill="${C.fg}" font-size="14">${esc(r.name)}</text>`;
  body += `<rect x="${BX}" y="${y}" width="${BW}" height="16" rx="8" fill="${C.grid}"/>`;
  body += `<rect x="${BX}" y="${y}" width="${w.toFixed(1)}" height="16" rx="8" fill="${esc(r.color)}"/>`;
  body += `<text x="${W - 40}" y="${y + 13}" text-anchor="end" fill="${C.muted}" font-size="13">${r.pct.toFixed(1)}%</text>`;
});

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="'Segoe UI', Ubuntu, sans-serif">
<rect width="${W}" height="${H}" rx="8" fill="${C.bg}"/>
<text x="${W / 2}" y="35" text-anchor="middle" fill="${C.fg}" font-size="20" font-weight="600">Most used languages (by code size)</text>
${body}
</svg>`;

await mkdir("dist", { recursive: true });
await writeFile("dist/languages.svg", svg);
console.log(`Languages written: ${rows.map((r) => `${r.name} ${r.pct.toFixed(1)}%`).join(", ")}`);
