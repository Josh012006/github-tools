import { mkdir, writeFile } from "node:fs/promises";
import { gql, USER, C, barChartSvg } from "./lib.mjs";

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
await mkdir("dist", { recursive: true });
await writeFile("dist/languages.svg", barChartSvg("Most used languages (by code size)", rows));
console.log(`Languages written: ${rows.map((r) => `${r.name} ${r.pct.toFixed(1)}%`).join(", ")}`);
