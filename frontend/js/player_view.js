// =============================================================
// CONFIG
// =============================================================

const BASE_URL = (window.__env && window.__env.API_URL)
  ? window.__env.API_URL
  : "https://chikaku-d-d-backend-pbe.onrender.com";

const API_PLAYERS = `${BASE_URL}/api/players`;

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
const safeExp   = e => (!e || e < 0) ? 0 : Number(e);

const expNeededForLevel = lvl =>
  BASE_EXP * Math.pow(1.05, lvl - 1);

function expProgress(level, totalExp) {
  let expBefore = 0;
  for (let i = 1; i < level; i++) {
    expBefore += expNeededForLevel(i);
  }
  let current = totalExp - expBefore;
  if (current < 0) current = 0;
  const required = expNeededForLevel(level);
  return Math.min(100, (current / required) * 100);
}

// =============================================================
// SKELETON LOADER (solo primera carga)
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
// IMAGE PRELOAD
// =============================================================

function preloadImages(list) {
  list.forEach(p => {
    if (p.img) {
      const img = new Image();
      img.src = `data:image/jpeg;base64,${p.img}`;
    }

    (p.items || []).forEach(item => {
      if (item) {
        const img = new Image();
        img.src = `data:image/jpeg;base64,${item}`;
      }
    });
  });
}

// =============================================================
// FETCH (ETag compatible)
// =============================================================

async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-cache" });

  // 🔥 Backend: 304 Not Modified
  if (res.status === 304) return null;

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function buildSignature(list) {
  return list
    .map(p => `${p._id}:${p.updatedAt}`)
    .join("|");
}

// =============================================================
// LOAD PLAYERS
// =============================================================

async function loadPlayers() {
  try {
    if (firstLoad) showSkeleton();

    const data = await fetchJson(API_PLAYERS);
    if (!data) return;

    const signature = buildSignature(data);
    if (signature === lastSignature) return;

    lastSignature = signature;
    players = data;

    preloadImages(players);

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
    const level   = safeLevel(p.level);
    const exp     = safeExp(p.exp);
    const percent = expProgress(level, exp);
    const skills  = Array.isArray(p.skills) ? p.skills : [];

    const card = document.createElement("div");
    card.className =
      "bg-stone-800 rounded-xl shadow-xl p-4 flex flex-col h-[420px]";

    card.innerHTML = `
      <h2 class="text-lg font-bold mb-2 truncate">
        ${p.name} (Nivel ${level})
      </h2>

      <img
        loading="lazy"
        src="${p.img ? `data:image/jpeg;base64,${p.img}` : '/placeholder.png'}"
        class="w-full h-44 object-cover object-center rounded mb-3"
      />

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
            <img
              loading="lazy"
              src="${item ? `data:image/jpeg;base64,${item}` : '/placeholder.png'}"
              class="w-10 h-10 object-cover rounded border cursor-pointer"
              onclick="openItemModal('${p.itemDescriptions?.[i] || "Sin descripción"}')"
            />
          `).join("")}
        </div>
      </div>
    `;

    frag.appendChild(card);
  });

  playerBoard.appendChild(frag);
}

// =============================================================
// MODALS
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
  const lvl  = document.getElementById("searchLevel").value;

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
}, 10000);

// =============================================================
// INIT
// =============================================================

window.addEventListener("load", loadPlayers);
