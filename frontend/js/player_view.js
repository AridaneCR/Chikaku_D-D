// =============================================================
// CONFIG
// =============================================================
const BASE_URL =
  window.__env && window.__env.API_URL
    ? window.__env.API_URL
    : "https://chikaku-d-d-backend-pbe.onrender.com";

const API_PLAYERS = `${BASE_URL}/api/players`;
const SSE_URL = `${API_PLAYERS}/stream`;

const playerBoard = document.getElementById("playerBoard");

// =============================================================
// STATE
// =============================================================
let players = [];
let isFiltering = false;
let lastSignature = "";
let firstLoad = true;
let eventSource = null;

// =============================================================
// EXP SYSTEM
// =============================================================
const BASE_EXP = 100;

const safeLevel = l => (!l || l < 1 ? 1 : Number(l));
const safeExp = e => (!e || e < 0 ? 0 : Number(e));

const expNeededForLevel = lvl =>
  BASE_EXP * Math.pow(1.05, lvl - 1);

function expProgress(level, totalExp) {
  let expBefore = 0;
  for (let i = 1; i < level; i++) {
    expBefore += expNeededForLevel(i);
  }
  let current = totalExp - expBefore;
  if (current < 0) current = 0;
  return Math.min(100, (current / expNeededForLevel(level)) * 100);
}

// =============================================================
// UI HELPERS
// =============================================================
function showToast(text) {
  const toast = document.createElement("div");
  toast.className =
    "fixed bottom-6 right-6 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-xl z-50 animate-fade-in";
  toast.textContent = text;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("opacity-0");
    setTimeout(() => toast.remove(), 500);
  }, 2500);
}

// =============================================================
// SKELETON
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
    `;
    playerBoard.appendChild(sk);
  }
}

// =============================================================
// FETCH
// =============================================================
async function fetchPlayers() {
  const res = await fetch(API_PLAYERS, { cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function buildSignature(list) {
  return list
    .map(p => `${p._id}:${p.updatedAt}`)
    .join("|");
}

// =============================================================
// LOAD + RENDER
// =============================================================
async function loadPlayers(force = false) {
  try {
    if (firstLoad) showSkeleton();

    const data = await fetchPlayers();
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

function renderPlayerBoard(list) {
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

      <img
        loading="lazy"
        src="${p.img || "/placeholder.png"}"
        class="w-full h-44 object-cover rounded mb-3"
      />

      <p class="text-sm">❤️ Salud: ${p.life}</p>
      <p class="text-sm">🏆 ${p.milestones || "-"}</p>

      ${
        skills.length
          ? `<button
              onclick='alert(${JSON.stringify(skills.join(", "))})'
              class="mt-2 bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded text-xs">
              Ver habilidades (${skills.length})
            </button>`
          : ""
      }

      <div class="mt-auto">
        <div class="bg-stone-600 h-3 rounded mt-2 overflow-hidden">
          <div class="bg-green-500 h-3 exp-bar" style="width:${percent}%;"></div>
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

  renderPlayerBoard(
    players.filter(p =>
      (!name || p.name.toLowerCase().includes(name)) &&
      (!lvl || p.level == lvl)
    )
  );
}

function clearSearch() {
  isFiltering = false;
  renderPlayerBoard(players);
}

// =============================================================
// SSE
// =============================================================
function initSSE() {
  if (eventSource) eventSource.close();

  eventSource = new EventSource(SSE_URL);

  eventSource.addEventListener("playersUpdated", () => {
    console.log("🔄 Actualización recibida por SSE");
    loadPlayers(true);
    showToast("Jugadores actualizados");
  });

  eventSource.onerror = err => {
    console.warn("⚠️ SSE desconectado, reintentando…", err);
    eventSource.close();
    setTimeout(initSSE, 3000);
  };
}

// =============================================================
// INIT
// =============================================================
window.addEventListener("load", () => {
  loadPlayers();
  initSSE();
});
