// =============================================================
// CONFIG
// =============================================================

const BASE_URL = (window.__env && window.__env.API_URL)
  ? window.__env.API_URL
  : "https://chikaku-d-d-ptyl.onrender.com";

const API_PLAYERS = `${BASE_URL}/api/players`;

let players = [];
let isFiltering = false;
let lastPayload = ""; // 🔥 evita renders innecesarios

const playerBoard = document.getElementById("playerBoard");

// =============================================================
// EXP SYSTEM (5% MÁS DIFÍCIL POR NIVEL)
// =============================================================

const BASE_EXP = 100;

function safeLevel(level) {
  level = Number(level);
  return (!level || level < 1) ? 1 : level;
}

function safeExp(exp) {
  exp = Number(exp);
  return (!exp || exp < 0) ? 0 : exp;
}

function expNeededForLevel(level) {
  level = safeLevel(level);
  return BASE_EXP * Math.pow(1.05, level - 1);
}

function expProgress(level, totalExp) {
  level = safeLevel(level);
  totalExp = safeExp(totalExp);

  let expBefore = 0;
  for (let i = 1; i < level; i++) {
    expBefore += expNeededForLevel(i);
  }

  let current = totalExp - expBefore;
  if (current < 0) current = 0;

  const required = expNeededForLevel(level);
  if (current >= required) current = 0;

  return Math.min(100, (current / required) * 100);
}

// =============================================================
// FETCH
// =============================================================

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function loadPlayers() {
  try {
    const data = await fetchJson(API_PLAYERS);
    const payload = JSON.stringify(data);

    // 🔥 NO volver a renderizar si no hay cambios
    if (payload === lastPayload) return;

    lastPayload = payload;
    players = data;

    if (!isFiltering) renderPlayerBoard(players);
  } catch (err) {
    console.error("Error cargando jugadores:", err);
  }
}

// =============================================================
// RENDER
// =============================================================

function renderPlayerBoard(list = players) {
  playerBoard.innerHTML = "";

  list.forEach((p) => {
    const level = safeLevel(p.level);
    const exp = safeExp(p.exp);
    const percent = expProgress(level, exp);
    const needed = Math.round(expNeededForLevel(level));

    const skills = Array.isArray(p.skills)
      ? p.skills
      : [];

    const card = document.createElement("div");
    card.className =
      "inline-block bg-stone-800 p-4 rounded-xl shadow-2xl w-80 text-stone-100 m-2 align-top";

    card.innerHTML = `
      <h2 class="text-2xl font-bold mb-2">${p.name} (Nivel ${level})</h2>

      <img
        loading="lazy"
        src="${p.img ? `data:image/jpeg;base64,${p.img}` : '/placeholder.png'}"
        class="w-full h-48 object-cover rounded mb-3"
      />

      <p>❤️ Salud: ${p.life}</p>

      ${
        skills.length
          ? `<div class="mt-2 flex flex-wrap gap-1">
              ${skills.map(s =>
                `<span class="px-2 py-1 bg-stone-700 rounded text-xs">${s}</span>`
              ).join("")}
            </div>`
          : ""
      }

      <p class="mt-2">🏆 Hitos: ${p.milestones || "-"}</p>
      <p>📜 Características: ${p.attributes || "-"}</p>

      <p class="mt-2">⭐ EXP Total: ${exp}</p>
      <p class="text-xs text-stone-300">
        EXP necesaria para subir: ${needed}
      </p>

      <div class="bg-stone-600 h-4 rounded mt-2 overflow-hidden">
        <div class="bg-green-500 h-4 exp-bar" style="width:${percent}%;"></div>
      </div>

      <p class="mt-1 text-xs text-stone-400">
        Progreso del nivel actual: ${percent.toFixed(1)}%
      </p>

      <div class="grid grid-cols-6 gap-1 mt-3">
        ${(p.items || []).slice(0, 6).map((item, i) => `
          <img
            loading="lazy"
            src="${item ? `data:image/jpeg;base64,${item}` : '/placeholder.png'}"
            class="w-10 h-10 object-cover rounded border border-stone-700 bg-stone-900 cursor-pointer"
            title="${p.itemDescriptions?.[i] || ""}"
            onclick="openItemModal('${p.itemDescriptions?.[i] || "Sin descripción"}')"
          />
        `).join("")}
      </div>
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
// AUTO UPDATE (🔥 OPTIMIZADO)
// =============================================================

setInterval(() => {
  if (!isFiltering) loadPlayers();
}, 8000); // ⏱️ antes 2000

// =============================================================
// INIT
// =============================================================

window.addEventListener("load", () => {
  loadPlayers();
});
