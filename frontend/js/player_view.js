// =============================================================
// CONFIG
// =============================================================

const BASE_URL =
  window.__env && window.__env.API_URL
    ? window.__env.API_URL
    : "https://chikaku-d-d-backend-pbe.onrender.com";

const API_PLAYERS = `${BASE_URL}/api/players`;
const SSE_URL = `${BASE_URL}/api/players/stream`;

// =============================================================
// STATE
// =============================================================

let players = [];
let lastSignature = "";
let isFiltering = false;
let firstLoad = true;
let sseConnected = false;

const playerBoard = document.getElementById("playerBoard");

// =============================================================
// IMAGE NORMALIZER (🔥 FIX REAL)
// =============================================================

function resolveImage(img) {
  if (!img) return "/placeholder.png";

  if (typeof img === "object") {
    return img.secure_url || img.url || "/placeholder.png";
  }

  if (typeof img === "string") {
    return img.startsWith("http") ? img : "/placeholder.png";
  }

  return "/placeholder.png";
}

// =============================================================
// TOAST
// =============================================================

function showToast(message, type = "info") {
  let container = document.getElementById("toastContainer");

  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.className =
      "fixed top-4 right-4 z-50 flex flex-col gap-3";
    document.body.appendChild(container);
  }

  const colors = {
    info: "bg-indigo-600",
    success: "bg-green-600",
    warning: "bg-yellow-600",
    error: "bg-red-600",
  };

  const toast = document.createElement("div");
  toast.className = `
    ${colors[type]}
    text-white px-4 py-3 rounded-xl shadow-xl
  `;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

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
// FETCH
// =============================================================

async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function buildSignature(list) {
  return list.map(p => `${p._id}:${p.updatedAt}`).join("|");
}

// =============================================================
// LOAD PLAYERS
// =============================================================

async function loadPlayers(fromRealtime = false) {
  try {
    const data = await fetchJson(API_PLAYERS);
    const signature = buildSignature(data);

    if (signature === lastSignature) return;

    lastSignature = signature;
    players = data;

    if (!isFiltering) renderPlayerBoard(players);

    if (fromRealtime) {
      showToast("⚡ Jugadores actualizados", "success");
    }

    firstLoad = false;
  } catch (err) {
    console.error(err);
    showToast("❌ Error cargando jugadores", "error");
  }
}

// =============================================================
// RENDER
// =============================================================

function renderPlayerBoard(list = players) {
  playerBoard.innerHTML = "";
  playerBoard.className =
    "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6";

  list.forEach(p => {
    const level = safeLevel(p.level);
    const exp = safeExp(p.exp);
    const percent = expProgress(level, exp);

    const card = document.createElement("div");
    card.className =
      "bg-stone-800 rounded-xl shadow-xl p-4 flex flex-col h-[420px]";

    card.innerHTML = `
      <h2 class="text-lg font-bold mb-2 truncate">
        ${p.name} (Nivel ${level})
      </h2>

      <img
        src="${resolveImage(p.img)}"
        class="w-full h-44 object-cover rounded mb-3"
        loading="lazy"
      />

      <p class="text-sm">❤️ Salud: ${p.life}</p>
      <p class="text-sm">🏆 ${p.milestones || "-"}</p>

      <div class="mt-auto">
        <div class="bg-stone-600 h-3 rounded mt-2 overflow-hidden">
          <div class="bg-green-500 h-3" style="width:${percent}%"></div>
        </div>

        <div class="grid grid-cols-6 gap-1 mt-3">
          ${(p.items || []).slice(0, 6).map((item, i) => `
            <img
              src="${resolveImage(item)}"
              class="w-10 h-10 object-cover rounded border cursor-pointer"
              loading="lazy"
            />
          `).join("")}
        </div>
      </div>
    `;

    playerBoard.appendChild(card);
  });
}

// =============================================================
// SSE
// =============================================================

function initSSE() {
  const source = new EventSource(SSE_URL);

  source.onopen = () => {
    sseConnected = true;
    showToast("🟢 Conectado en tiempo real");
  };

  source.addEventListener("playersUpdated", () => {
    loadPlayers(true);
  });

  source.onerror = () => {
    sseConnected = false;
    source.close();
    showToast("⚠️ SSE desconectado, usando polling", "warning");
  };
}

// =============================================================
// POLLING BACKUP
// =============================================================

setInterval(() => {
  if (!sseConnected && !isFiltering) {
    loadPlayers();
  }
}, 10000);

// =============================================================
// INIT
// =============================================================

window.addEventListener("load", () => {
  loadPlayers();
  initSSE();
});
