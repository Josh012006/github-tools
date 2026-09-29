import { mkdir, writeFile } from "node:fs/promises";
import { gql, USER, C, barChartSvg } from "./lib.mjs";

const DAYS = Math.min(Number(process.env.RECENT_DAYS || 90), 365); // API window: max 1 year
const TOP = Number(process.env.TOP_LANGS || 8);
const EXCLUDE = (process.env.EXCLUDE_LANGS || "")
  .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

// ---------- 1. Repos where you committed recently, with their languages ----------
// Each repo's commit count is split across its languages in proportion to code size.
const Q = `
query($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      commitContributionsByRepository(maxRepositories: 100) {
        repository {
          languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
            edges { size node { name color } }
          }
        }
        contributions(first: 100) { nodes { commitCount } }
      }
    }
  }
}`;

const from = new Date(Date.now() - DAYS * 86400000);
const data = await gql(Q, { login: USER, from: from.toISOString(), to: new Date().toISOString() });

const langs = new Map(); // name -> { score, color }
for (const rc of data.user.contributionsCollection.commitContributionsByRepository) {
  const commits = rc.contributions.nodes.reduce((a, n) => a + n.commitCount, 0);
  const edges = rc.repository.languages.edges.filter((e) => !EXCLUDE.includes(e.node.name.toLowerCase()));
  const bytes = edges.reduce((a, e) => a + e.size, 0);
  if (!commits || !bytes) continue;
  for (const e of edges) {
    const l = langs.get(e.node.name) || { score: 0, color: e.node.color };
    l.score += (commits * e.size) / bytes;
    langs.set(e.node.name, l);
  }
}

const total = [...langs.values()].reduce((a, l) => a + l.score, 0);
const rows = [...langs.entries()]
  .sort((a, b) => b[1].score - a[1].score)
  .slice(0, TOP)
  .map(([name, l]) => ({ name, color: l.color || C.fg, pct: (l.score / total) * 100 }));

// ---------- 2. Draw the SVG ----------
await mkdir("dist", { recursive: true });
await writeFile(
  "dist/recent-languages.svg",
  barChartSvg(`Recently used languages (last ${DAYS} days)`, rows, "No recent commits")
);
console.log(`Recent languages written: ${rows.map((r) => `${r.name} ${r.pct.toFixed(1)}%`).join(", ")}`);
