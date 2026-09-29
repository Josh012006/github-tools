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
