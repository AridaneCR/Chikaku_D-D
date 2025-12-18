// =============================================================
// CONFIG
// =============================================================

const BASE_URL = (window.__env && window.__env.API_URL)
  ? window.__env.API_URL
  : "https://chikaku-d-d-ptyl.onrender.com";

const API_PLAYERS = `${BASE_URL}/api/players`;

let players = [];
let isFiltering = false;
let lastPayload = "";

const playerBoard = document.getElementById("playerBoard");

// =============================================================
// EXP SYSTEM
// =============================================================

const BASE_EXP = 100;

const safeLevel = l => (!l || l < 1) ? 1 : Number(l);
const safeExp = e => (!e || e < 0) ? 0 : Number(e);

function expNeededForLevel(level) {
  return BASE_EXP * Math.pow(1.05, level - 1);
}

function expProgress(level, totalExp) {
  let expBefore = 0;
  for (let i = 1; i < level; i++) expBefore += expNeededForLevel(i);
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
  const data = await fetchJson(API_PLAYERS);
  const payload = JSON.stringify(data);
  if (payload === lastPayload) return;
  lastPayload = payload;
  players = data;
  if (!isFiltering) renderPlayerBoard(players);
}

// =============================================================
// RENDER
// =============================================================

function renderPlayerBoard(list = players) {
  playerBoard.innerHTML = "";

  list.forEach(p => {
    const level = safeLevel(p.level);
    const exp = safeExp(p.exp);
    const percent = expProgress(level, exp);
    const needed = Math.round(expNeededForLevel(level));
    const skills = Array.isArray(p.skills) ? p.skills : [];

    const card = document.createElement("div");
    card.className =
      "inline-block bg-stone-800 p-4 rounded-xl shadow-2xl w-80 text-stone-100 m-2 align-top";

    card.innerHTML = `
      <h2 class="text-2xl font-bold mb-2">${p.name} (Nivel ${level})</h2>

      <img loading="lazy"
        src="${p.img ? `data:image/jpeg;base64,${p.img}` : '/placeholder.png'}"
        class="w-full h-48 object-cover rounded mb-3"/>

      <p>❤️ Salud: ${p.life}</p>
      <p>🏆 Hitos: ${p.milestones || "-"}</p>
      <p>📜 Características: ${p.attributes || "-"}</p>

      ${
        skills.length
          ? `<button
              onclick='openSkillsModal(${JSON.stringify(skills)})'
              class="mt-3 w-full bg-indigo-600 hover:bg-indigo-700 px-3 py-2 rounded text-sm font-semibold">
              Ver habilidades (${skills.length})
            </button>`
          : ""
      }

      <p class="mt-3 text-sm">⭐ EXP: ${exp}</p>
      <p class="text-xs text-stone-400">Necesaria: ${needed}</p>

      <div class="bg-stone-600 h-4 rounded mt-2 overflow-hidden">
        <div class="bg-green-500 h-4 exp-bar" style="width:${percent}%;"></div>
      </div>

      <div class="grid grid-cols-6 gap-1 mt-3">
        ${(p.items || []).slice(0, 6).map((item, i) => `
          <img loading="lazy"
            src="${item ? `data:image/jpeg;base64,${item}` : '/placeholder.png'}"
            class="w-10 h-10 object-cover rounded border cursor-pointer"
            onclick="openItemModal('${p.itemDescriptions?.[i] || "Sin descripción"}')"/>
        `).join("")}
      </div>
    `;

    playerBoard.appendChild(card);
  });
}

// =============================================================
// MODAL HABILIDADES
// =============================================================

function openSkillsModal(skills) {
  closeModal();

  const modal = document.createElement("div");
  modal.id = "modal";
  modal.className =
    "fixed inset-0 bg-black/70 flex items-center justify-center z-50";

  modal.innerHTML = `
    <div class="bg-zinc-900 rounded-xl p-6 w-96 relative">
      <button onclick="closeModal()"
        class="absolute top-2 right-2 text-zinc-400 hover:text-white">✕</button>

      <h3 class="text-xl font-bold mb-4 text-indigo-400">Habilidades</h3>

      <ul class="space-y-2">
        ${skills.map(s => `
          <li class="bg-zinc-800 px-3 py-2 rounded">${s}</li>
        `).join("")}
      </ul>
    </div>
  `;

  modal.addEventListener("click", e => {
    if (e.target === modal) closeModal();
  });

  document.body.appendChild(modal);
}

// =============================================================
// MODAL ITEMS
// =============================================================

function openItemModal(text) {
  closeModal();

  const modal = document.createElement("div");
  modal.id = "modal";
  modal.className =
    "fixed inset-0 bg-black/70 flex items-center justify-center z-50";

  modal.innerHTML = `
    <div class="bg-zinc-900 rounded-xl p-6 w-96 relative">
      <button onclick="closeModal()"
        class="absolute top-2 right-2 text-zinc-400 hover:text-white">✕</button>
      <h3 class="text-xl font-bold mb-2 text-emerald-400">Objeto</h3>
      <p>${text}</p>
    </div>
  `;

  modal.addEventListener("click", e => {
    if (e.target === modal) closeModal();
  });

  document.body.appendChild(modal);
}

function closeModal() {
  document.getElementById("modal")?.remove();
}

// =============================================================
// SEARCH
// =============================================================

function searchPlayer() {
  const name = document.getElementById("searchName").value.toLowerCase();
  const lvl = document.getElementById("searchLevel").value;
  isFiltering = true;
  renderPlayerBoard(players.filter(p =>
    (!name || p.name.toLowerCase().includes(name)) &&
    (!lvl || p.level == lvl)
  ));
}

function clearSearch() {
  isFiltering = false;
  renderPlayerBoard(players);
}

// =============================================================
// AUTO UPDATE
// =============================================================

setInterval(() => {
  if (!isFiltering) loadPlayers();
}, 8000);

// =============================================================
// INIT
// =============================================================

window.addEventListener("load", loadPlayers);
