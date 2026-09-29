import { mkdir, writeFile } from "node:fs/promises";
import { gql, USER, C, fmtDate } from "./lib.mjs";

// ---------- 1. Fetch the whole contribution history, year by year ----------
const { user } = await gql(`query($login: String!) { user(login: $login) { createdAt } }`, { login: USER });
const created = new Date(user.createdAt);
const now = new Date();
const todayStr = now.toISOString().slice(0, 10);

const Q = `
query($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      totalCommitContributions
      contributionCalendar {
        weeks { contributionDays { date contributionCount } }
      }
    }
  }
}`;

const counts = new Map(); // "YYYY-MM-DD" -> contributions that day
let totalCommits = 0;

for (let y = created.getUTCFullYear(); y <= now.getUTCFullYear(); y++) {
  const from = y === created.getUTCFullYear() ? created : new Date(Date.UTC(y, 0, 1));
  const to = y === now.getUTCFullYear() ? now : new Date(Date.UTC(y, 11, 31, 23, 59, 59));
  const data = await gql(Q, { login: USER, from: from.toISOString(), to: to.toISOString() });
  const col = data.user.contributionsCollection;
  totalCommits += col.totalCommitContributions;
  for (const w of col.contributionCalendar.weeks)
    for (const d of w.contributionDays)
      // weeks at year boundaries appear in two queries: keep the real value
      counts.set(d.date, Math.max(counts.get(d.date) ?? 0, d.contributionCount));
}

// ---------- 2. Streaks (a "streak day" = at least one contribution) ----------
const dates = [...counts.keys()].filter((d) => d <= todayStr).sort();
const totalContrib = dates.reduce((a, d) => a + counts.get(d), 0);

let longest = { len: 0, start: null, end: null };
let run = 0, runStart = null;
for (const d of dates) {
  if (counts.get(d) > 0) {
    if (run === 0) runStart = d;
    run++;
    if (run > longest.len) longest = { len: run, start: runStart, end: d };
  } else run = 0;
}

let i = dates.length - 1;
if (i >= 0 && counts.get(dates[i]) === 0) i--; // today isn't over yet: don't break the streak
const curEnd = dates[i];
let cur = 0;
while (i >= 0 && counts.get(dates[i]) > 0) { cur++; i--; }
const curStart = cur ? dates[i + 1] : null;

// ---------- 3. Draw the SVG ----------
const W = 900, H = 200;
const cols = [
  { big: totalCommits, label: "Total commits", sub: `since ${fmtDate(user.createdAt)}` },
  { big: totalContrib, label: "Total contributions", sub: "commits, PRs, issues, reviews" },
  { big: cur, label: "Current streak (days)", sub: cur ? `${fmtDate(curStart)} – ${fmtDate(curEnd)}` : "no active streak" },
  { big: longest.len, label: "Longest streak (days)", sub: longest.len ? `${fmtDate(longest.start)} – ${fmtDate(longest.end)}` : "-" },
];
const cw = W / cols.length;

let body = "";
cols.forEach((c, k) => {
  const cx = cw * k + cw / 2;
  if (k > 0) body += `<line x1="${cw * k}" y1="70" x2="${cw * k}" y2="170" stroke="${C.grid}"/>`;
  body += `<text x="${cx}" y="115" text-anchor="middle" fill="${C.fg}" font-size="40" font-weight="700">${c.big}</text>`;
  body += `<text x="${cx}" y="142" text-anchor="middle" fill="${C.fg}" font-size="14" font-weight="600">${c.label}</text>`;
  body += `<text x="${cx}" y="164" text-anchor="middle" fill="${C.muted}" font-size="12">${c.sub}</text>`;
});

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="'Segoe UI', Ubuntu, sans-serif">
<rect width="${W}" height="${H}" rx="8" fill="${C.bg}"/>
<text x="${W / 2}" y="35" text-anchor="middle" fill="${C.fg}" font-size="20" font-weight="600">Commit stats</text>
${body}
</svg>`;

await mkdir("dist", { recursive: true });
await writeFile("dist/streak-stats.svg", svg);
console.log(`Stats written: ${totalCommits} commits, streak ${cur}, longest ${longest.len}`);
