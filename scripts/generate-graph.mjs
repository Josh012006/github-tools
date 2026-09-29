import { mkdir, writeFile } from "node:fs/promises";

const TOKEN = process.env.GH_TOKEN;
const USER = process.env.GH_USERNAME || "Josh012006";
const DAYS = Number(process.env.DAYS || 30);

if (!TOKEN) {
  console.error("Missing GH_TOKEN");
  process.exit(1);
}

// ---------- 1. Fetch commits per day ----------
const days = [];
const today = new Date();
for (let i = DAYS - 1; i >= 0; i--) {
  days.push(
    new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i))
      .toISOString()
      .slice(0, 10)
  );
}

const query = `
query($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      commitContributionsByRepository(maxRepositories: 100) {
        contributions(first: 100) { nodes { commitCount occurredAt } }
      }
    }
  }
}`;

const res = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    query,
    variables: { login: USER, from: `${days[0]}T00:00:00Z`, to: new Date().toISOString() },
  }),
});
const json = await res.json();
if (!res.ok || json.errors) {
  console.error(JSON.stringify(json.errors || json, null, 2));
  process.exit(1);
}

const perDay = Object.fromEntries(days.map((d) => [d, 0]));
for (const repo of json.data.user.contributionsCollection.commitContributionsByRepository) {
  for (const n of repo.contributions.nodes) {
    const d = n.occurredAt.slice(0, 10);
    if (d in perDay) perDay[d] += n.commitCount;
  }
}
const values = days.map((d) => perDay[d]);
const total = values.reduce((a, b) => a + b, 0);

// ---------- 2. Draw the SVG (react-dark theme) ----------
const C = { bg: "#20232a", fg: "#61dafb", grid: "#61dafb22", muted: "#61dafbaa" };
const W = 900, H = 340, L = 55, R = 30, T = 75, B = 55;
const pw = W - L - R, ph = H - T - B;

const max = Math.max(...values, 1);
const step = Math.max(1, Math.ceil(max / 5));
const nTicks = Math.ceil(max / step);
const top = step * nTicks;

const x = (i) => L + (i * pw) / (DAYS - 1);
const y = (v) => T + ph - (v / top) * ph;
const base = T + ph;

let line = `M${x(0)},${y(values[0])}`;
for (let i = 1; i < DAYS; i++) {
  const mx = (x(i - 1) + x(i)) / 2; // smooth curve that never overshoots
  line += ` C${mx},${y(values[i - 1])} ${mx},${y(values[i])} ${x(i)},${y(values[i])}`;
}
const area = `${line} L${x(DAYS - 1)},${base} L${x(0)},${base} Z`;

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const label = (d) => `${MONTHS[Number(d.slice(5, 7)) - 1]} ${Number(d.slice(8))}`;

let grid = "";
for (let t = 0; t <= nTicks; t++) {
  const v = t * step;
  grid += `<line x1="${L}" y1="${y(v)}" x2="${W - R}" y2="${y(v)}" stroke="${C.grid}"/>`;
  grid += `<text x="${L - 10}" y="${y(v) + 4}" text-anchor="end" fill="${C.muted}" font-size="12">${v}</text>`;
}
let xlabels = "";
for (let i = 0; i < DAYS; i++) {
  if (i % 5 === 0 || i === DAYS - 1) {
    xlabels += `<text x="${x(i)}" y="${base + 24}" text-anchor="middle" fill="${C.muted}" font-size="12">${label(days[i])}</text>`;
  }
}
const points = values
  .map(
    (v, i) =>
      `<circle cx="${x(i)}" cy="${y(v)}" r="3.5" fill="${C.fg}"><title>${label(days[i])}: ${v} commit${v === 1 ? "" : "s"}</title></circle>`
  )
  .join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="'Segoe UI', Ubuntu, sans-serif">
<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
<stop offset="0%" stop-color="${C.fg}" stop-opacity="0.45"/><stop offset="100%" stop-color="${C.fg}" stop-opacity="0.02"/>
</linearGradient></defs>
<rect width="${W}" height="${H}" rx="8" fill="${C.bg}"/>
<text x="${W / 2}" y="35" text-anchor="middle" fill="${C.fg}" font-size="20" font-weight="600">Commits in the last ${DAYS} days (${total} total)</text>
${grid}
<path d="${area}" fill="url(#g)"/>
<path d="${line}" fill="none" stroke="${C.fg}" stroke-width="2.5" stroke-linejoin="round"/>
${points}
${xlabels}
</svg>`;

await mkdir("dist", { recursive: true });
await writeFile("dist/activity-graph.svg", svg);
console.log(`Graph written: ${total} commits over ${DAYS} days`);
