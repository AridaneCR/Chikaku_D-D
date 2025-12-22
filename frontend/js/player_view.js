// =============================================================
// CONFIG
// =============================================================
const BASE_URL =
  window.__env && window.__env.API_URL
    ? window.__env.API_URL
    : "https://chikaku-d-d-backend-pbe.onrender.com";

const API_PLAYERS = `${BASE_URL}/api/players`;

let players = [];
let lastSignature = "";
let isFiltering = false;

const playerBoard = document.getElementById("playerBoard");

// =============================================================
// UTILIDADES
// =============================================================
function buildSignature(list) {
  return list.map(p => `${p._id}:${p.updatedAt}`).join("|");
}

// =============================================================
// FETCH
// =============================================================
async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// =============================================================
// LOAD PLAYERS
// =============================================================
async function loadPlayers(force = false) {
  try {
    const data = await fetchJson(API_PLAYERS);
    const signature = buildSignature(data);

    if (!force && signature === lastSignature) return;

    lastSignature = signature;
    players = data;

    if (!isFiltering) renderPlayerBoard(players);
  } catch (err) {
    console.error("Error cargando jugadores:", err);
  }
}

// =============================================================
// RENDER
// =============================================================
function renderPlayerBoard(list) {
  playerBoard.innerHTML = "";
  playerBoard.className =
    "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6";

  const frag = document.createDocumentFragment();

  list.forEach(p => {
    const card = document.createElement("div");
    card.className =
      "bg-stone-800 rounded-xl shadow-xl p-4 flex flex-col h-[420px]";

    card.innerHTML = `
      <h2 class="font-bold mb-2 truncate">${p.name} (Nivel ${p.level})</h2>

      <img loading="lazy"
        src="${p.img ? `data:image/jpeg;base64,${p.img}` : "/placeholder.png"}"
        class="w-full h-44 object-cover rounded mb-3"/>

      <p class="text-sm">❤️ Vida: ${p.life}</p>
      <p class="text-sm">🏆 ${p.milestones || "-"}</p>

      <div class="mt-auto">
        <div class="grid grid-cols-6 gap-1 mt-3">
          ${(p.items || []).slice(0, 6).map(i => `
            <img loading="lazy"
              src="${i ? `data:image/jpeg;base64,${i}` : "/placeholder.png"}"
              class="w-10 h-10 object-cover rounded border"/>
          `).join("")}
        </div>
      </div>
    `;

    frag.appendChild(card);
  });

  playerBoard.appendChild(frag);
}

// =============================================================
// 🔥 SINCRONIZACIÓN INSTANTÁNEA
// =============================================================
window.addEventListener("storage", e => {
  if (e.key === "players_updated") {
    loadPlayers(true);
  }
});

// =============================================================
// BACKUP POLLING (SEGURIDAD)
// =============================================================
setInterval(() => {
  if (!isFiltering) loadPlayers();
}, 3000);

// =============================================================
// INIT
// =============================================================
window.addEventListener("load", loadPlayers);
