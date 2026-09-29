export const TOKEN = process.env.GH_TOKEN;
export const USER = process.env.GH_USERNAME || "Josh012006";

if (!TOKEN) {
  console.error("Missing GH_TOKEN");
  process.exit(1);
}

// react-dark theme
export const C = { bg: "#20232a", fg: "#61dafb", grid: "#61dafb22", muted: "#61dafbaa" };

export async function gql(query, variables) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) {
    console.error(JSON.stringify(json.errors || json, null, 2));
    process.exit(1);
  }
  return json.data;
}

export const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
export const fmtDate = (d) => `${MONTHS[Number(d.slice(5, 7)) - 1]} ${Number(d.slice(8, 10))}, ${d.slice(0, 4)}`;

// Horizontal bar chart shared by the language charts. rows: [{ name, color, pct }]
export function barChartSvg(title, rows, emptyMsg = "No language data") {
  const W = 900, T = 75, RH = 34, BX = 190, BW = 560;
  const H = T + Math.max(rows.length, 1) * RH + 25;
  const maxPct = Math.max(...rows.map((r) => r.pct), 1);

  let body = "";
  if (rows.length === 0) {
    body = `<text x="${W / 2}" y="${T + 20}" text-anchor="middle" fill="${C.muted}" font-size="14">${esc(emptyMsg)}</text>`;
  }
  rows.forEach((r, k) => {
    const y = T + k * RH;
    const w = Math.max(4, (r.pct / maxPct) * BW);
    body += `<text x="40" y="${y + 13}" fill="${C.fg}" font-size="14">${esc(r.name)}</text>`;
    body += `<rect x="${BX}" y="${y}" width="${BW}" height="16" rx="8" fill="${C.grid}"/>`;
    body += `<rect x="${BX}" y="${y}" width="${w.toFixed(1)}" height="16" rx="8" fill="${esc(r.color)}"/>`;
    body += `<text x="${W - 40}" y="${y + 13}" text-anchor="end" fill="${C.muted}" font-size="13">${r.pct.toFixed(1)}%</text>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="'Segoe UI', Ubuntu, sans-serif">
<rect width="${W}" height="${H}" rx="8" fill="${C.bg}"/>
<text x="${W / 2}" y="35" text-anchor="middle" fill="${C.fg}" font-size="20" font-weight="600">${esc(title)}</text>
${body}
</svg>`;
}
