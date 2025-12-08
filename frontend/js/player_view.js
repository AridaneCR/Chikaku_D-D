// =============================================================
// CONFIG
// =============================================================

// Toma API_URL desde config.js (Render) o fallback
const BASE_URL = (window.__env && window.__env.API_URL)
  ? window.__env.API_URL
  : "https://chikaku-d-d-ptyl.onrender.com";

const API_PLAYERS = `${BASE_URL}/api/players`;

let players = [];
let isFiltering = false;

const playerBoard = document.getElementById("playerBoard");

// =============================================================
// EXP SYSTEM (PROGRESIVO 5% POR NIVEL)
// =============================================================

// Exp mínima del nivel 1
const BASE_EXP = 100;

// Exp necesaria para subir del nivel actual al siguiente
function expNeededForLevel(level) {
  return BASE_EXP * Math.pow(1.05, level - 1);
}

// Calcula cuánta EXP le sobra para esta barra
function expProgress(level, totalExp) {
  let required = 0;
  let remaining = totalExp;

  // Restar exp necesaria de niveles anteriores
  for (let i = 1; i < level; i++) {
    const need = expNeededForLevel(i);
    remaining -= need;
    if (remaining < 0) remaining = 0;
  }

  // EXP necesaria para este nivel
  required = expNeededForLevel(level);

  // Porcentaje final
  return Math.min(100, (remaining / required) * 100);
}

// =============================================================
// FETCH HELPERS
// =============================================================
async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function loadPlayers() {
  try {
    players = await fetchJson(API_PLAYERS);
    if (!isFiltering) renderPlayerBoard(players);
  } catch (err) {
    console.error("Error cargando jugadores:", err);
  }
}

// =============================================================
// RENDER
// =============================================================
function renderPlayerBoard(list) {
  if (!list) list = players;

  playerBoard.innerHTML = "";

  list.forEach((p) => {
    // Calculamos porcentaje real usando exp total
    const expPercent = expProgress(p.level, p.exp || 0);

    const card = document.createElement("div");
    card.className =
      "inline-block bg-stone-800 p-4 rounded-xl shadow-2xl w-80 text-stone-100 m-2 align-top";

    card.innerHTML = `
      <h2 class='text-2xl font-bold mb-2'>${p.name} (Nivel ${p.level})</h2>

      <img 
        src="${p.img ? `data:image/jpeg;base64,${p.img}` : '/placeholder.png'}"
        class="w-full h-48 object-cover rounded mb-3"
      />

      <p>❤️ Salud: ${p.life}</p>
      <p>🌀 Habilidad 1: ${p.skill1}</p>
      <p>✨ Habilidad 2: ${p.skill2}</p>
      <p>🏆 Hitos: ${p.milestones}</p>
      <p>📜 Características: ${p.attributes}</p>
      <p>⭐ EXP Total: ${p.exp}</p>

      <div class="grid grid-cols-6 gap-1 mt-3">
        ${(p.items || [])
          .slice(0, 6)
          .map((item) => `
            <img src="${
              item ? `data:image/jpeg;base64,${item}` : "/placeholder.png"
            }" 
            class="w-10 h-10 object-cover rounded border border-stone-700 bg-stone-900" />
          `)
          .join("")}
      </div>

      <div class='bg-stone-600 h-5 rounded mt-3'>
        <div class='bg-green-500 h-5 rounded exp-bar' style='width:${expPercent}%;'></div>
      </div>

      <p class='mt-1 text-xs text-stone-300'>
        Progreso nivel: ${expPercent.toFixed(1)}%
      </p>
    `;

    playerBoard.appendChild(card);
  });
}

// =============================================================
// SEARCH
// =============================================================
function searchPlayer() {
  const nameQuery = document.getElementById("searchName")?.value.toLowerCase() || "";
  const levelQuery = document.getElementById("searchLevel")?.value || "";

  const results = players.filter((p) => {
    const matchName = nameQuery ? p.name.toLowerCase().includes(nameQuery) : true;
    const matchLevel = levelQuery ? p.level == levelQuery : true;
    return matchName && matchLevel;
  });

  isFiltering = true;
  renderPlayerBoard(results);
}

function clearSearch() {
  document.getElementById("searchName").value = "";
  document.getElementById("searchLevel").value = "";
  isFiltering = false;
  renderPlayerBoard(players);
}

// =============================================================
// AUTO UPDATE
// =============================================================
setInterval(() => {
  if (!isFiltering) loadPlayers();
}, 2000);

// =============================================================
// INIT
// =============================================================
window.addEventListener("load", () => {
  loadPlayers();
});
