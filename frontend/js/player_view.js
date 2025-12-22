// =============================================================
// CONFIG
// =============================================================

const BASE_URL = (window.__env && window.__env.API_URL)
  ? window.__env.API_URL
  : "https://chikaku-d-d-backend-pbe.onrender.com";

const API_PLAYERS = `${BASE_URL}/api/players`;

// =============================================================
// STATE
// =============================================================

let players = [];
let isFiltering = false;
let lastSignature = "";
let firstLoad = true;

const playerBoard = document.getElementById("playerBoard");

// =============================================================
// EXP SYSTEM
// =============================================================

const BASE_EXP = 100;

const safeLevel = l => (!l || l < 1) ? 1 : Number(l);
const safeExp = e => (!e || e < 0) ? 0 : Number(e);

const expNeededForLevel = lvl =>
  BASE_EXP * Math.pow(1.05, lvl - 1);

function expProgress(level, totalExp) {
  let expBefore = 0;
  for (let i = 1; i < level; i++) expBefore += expNeededForLevel(i);
  let current = totalExp - expBefore;
  if (current < 0) current = 0;
  const required = expNeededForLevel(level);
  return Math.min(100, (current / required) * 100);
}

// =============================================================
// SKELETON (solo primera carga)
// =============================================================

function showSkeleton(count = 8) {
  playerBoard.innerHTML = "";
  playerBoard.className =
    "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6";

  for (let i = 0; i < count; i++) {
    const sk = document.createElement("div");
    sk.className =
      "animate-pulse bg-stone-800 rounded-xl p-4 h-[420px]";
    sk.innerHTML = `
      <div class="h-6 bg-stone-700 rounded mb-3"></div>
      <div class="h-44 bg-stone-700 rounded mb-3"></div>
      <div class="h-4 bg-stone-700 rounded mb-2"></div>
      <div class="h-4 bg-stone-700 rounded mb-2"></div>
      <div class="grid grid-cols-6 gap-1 mt-4">
        ${"<div class='h-10 bg-stone-700 rounded'></div>".repeat(6)}
      </div>
    `;
    playerBoard.appendChild(sk);
  }
}

// =============================================================
// FETCH
// =============================================================

async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function buildSignature(list) {
  // 🔥 SOLO datos ligeros (NO base64)
  return list.map(p => `${p._id}:${p.updatedAt}`).join("|");
}

async function loadPlayers(force = false) {
  try {
    if (firstLoad) showSkeleton();

    const data = await fetchJson(API_PLAYERS);
    const signature = buildSignature(data);

    if (!force && signature === lastSignature) return;

    lastSignature = signature;
    players = data;

    if (!isFiltering) renderPlayerBoard(players);
    firstLoad = false;
  } catch (err) {
    console.error("Error cargando jugadores:", err);
  }
}

// =============================================================
// RENDER
// =============================================================

function renderPlayerBoard(list = players) {
  playerBoard.innerHTML = "";
  playerBoard.className =
    "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6";

  const frag = document.createDocumentFragment();

  list.forEach(p => {
    const level = safeLevel(p.level);
    const exp = safeExp(p.exp);
    const percent = expProgress(level, exp);
    const skills = Array.isArray(p.skills) ? p.skills : [];

    const card = document.createElement("div");
    card.className =
      "bg-stone-800 rounded-xl shadow-xl p-4 flex flex-col h-[420px]";

    card.innerHTML = `
      <h2 class="text-lg font-bold mb-2 truncate">
        ${p.name} (Nivel ${level})
      </h2>

      <img loading="lazy"
        src="${p.img ? `data:image/jpeg;base64,${p.img}` : '/placeholder.png'}"
        class="w-full h-44 object-cover rounded mb-3"/>

      <p class="text-sm">❤️ Salud: ${p.life}</p>
      <p class="text-sm">🏆 ${p.milestones || "-"}</p>

      ${
        skills.length
          ? `<button
              onclick='openSkillsModal(${JSON.stringify(skills)})'
              class="mt-2 bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded text-xs">
              Ver habilidades (${skills.length})
            </button>`
          : ""
      }

      <div class="mt-auto">
        <div class="bg-stone-600 h-3 rounded mt-2 overflow-hidden">
          <div class="bg-green-500 h-3 exp-bar" style="width:${percent}%;"></div>
        </div>

        <div class="grid grid-cols-6 gap-1 mt-3">
          ${(p.items || []).slice(0, 6).map((item, i) => `
            <img loading="lazy"
              src="${item ? `data:image/jpeg;base64,${item}` : '/placeholder.png'}"
              class="w-10 h-10 object-cover rounded border cursor-pointer"
              onclick="openItemModal('${p.itemDescriptions?.[i] || "Sin descripción"}')"/>
          `).join("")}
        </div>
      </div>
    `;

    frag.appendChild(card);
  });

  playerBoard.appendChild(frag);
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
// 🔥 REAL-TIME SYNC (MASTER → PLAYER)
// =============================================================

window.addEventListener("storage", (e) => {
  if (e.key === "players_updated") {
    console.log("🔄 Actualización recibida desde Master");
    loadPlayers(true);
  }
});

// =============================================================
// AUTO UPDATE (fallback)
// =============================================================

setInterval(() => {
  if (!isFiltering) loadPlayers();
}, 15000);

// =============================================================
// INIT
// =============================================================

window.addEventListener("load", loadPlayers);
