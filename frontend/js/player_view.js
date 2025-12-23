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
let sseConnected = false;

const playerBoard = document.getElementById("playerBoard");

// =============================================================
// IMAGE NORMALIZER (Cloudinary SAFE)
// =============================================================

function resolveImage(img) {
  if (!img) return "/placeholder.png";
  if (typeof img === "string" && img.startsWith("http")) return img;
  if (typeof img === "object") return img.secure_url || img.url || "/placeholder.png";
  return "/placeholder.png";
}

// =============================================================
// TOAST SYSTEM
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
    ${colors[type] || colors.info}
    text-white px-4 py-3 rounded-xl shadow-xl
  `;
  toast.textContent = message;

  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
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

function expDetails(level, totalExp) {
  let expBefore = 0;

  for (let i = 1; i < level; i++) {
    expBefore += expNeededForLevel(i);
  }

  const required = expNeededForLevel(level);
  const current = Math.max(0, totalExp - expBefore);

  return {
    current,
    required,
    remaining: Math.max(0, required - current),
  };
}
function roundExp(value) {
  return Math.max(0, Math.round(value));
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
  } catch (err) {
    console.error("Error cargando jugadores:", err);
    showToast("❌ Error cargando jugadores", "error");
  }
}

// =============================================================
// SKILLS MODAL
// =============================================================

function openSkillsModal(skills = []) {
  if (!skills.length) return;

  let modal = document.getElementById("skillsModal");

  if (!modal) {
    modal = document.createElement("div");
    modal.id = "skillsModal";
    modal.className =
      "fixed inset-0 bg-black/80 z-50 flex items-center justify-center";
    modal.innerHTML = `
      <div class="bg-stone-800 border border-stone-600 rounded-xl p-6 max-w-sm w-full relative">
        <button
          onclick="document.getElementById('skillsModal').remove()"
          class="absolute top-2 right-2 text-xl text-white">✕</button>
        <h3 class="text-lg font-bold mb-4 text-center">Habilidades</h3>
        <ul id="skillsList" class="space-y-2"></ul>
      </div>
    `;
    document.body.appendChild(modal);
  }

  const list = modal.querySelector("#skillsList");
  list.innerHTML = "";

  skills.forEach(s => {
    const li = document.createElement("li");
    li.className = "bg-stone-700 rounded px-3 py-2 text-sm";
    li.textContent = s;
    list.appendChild(li);
  });
}

// =============================================================
// OBJECT MODAL
// =============================================================

function openItemModal(img, description) {
  const modal = document.getElementById("objectModal");
  const modalImg = document.getElementById("objectModalImg");
  const modalDesc = document.getElementById("objectModalDesc");

  modalImg.src = img || "/placeholder.png";
  modalDesc.textContent = description || "Sin descripción";

  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeObjectModal() {
  const modal = document.getElementById("objectModal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

// =============================================================
// RENDER
// =============================================================

function renderPlayerBoard(list = players) {
  playerBoard.innerHTML = "";
  playerBoard.className =
    "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6";

  list.forEach((p, playerIndex) => {
    const level = safeLevel(p.level);
    const exp = safeExp(p.exp);
    const percent = expProgress(level, exp);
    const expInfo = expDetails(level, exp);
    const skills = Array.isArray(p.skills) ? p.skills : [];

    const card = document.createElement("div");
    card.className =
      "bg-stone-800 rounded-xl shadow-xl p-4 flex flex-col h-[440px]";

    card.innerHTML = `
      <h2 class="text-lg font-bold mb-2 text-white truncate">
        ${p.name || "Sin nombre"} (Nivel ${level})
      </h2>

      <img
        src="${resolveImage(p.img)}"
        class="w-full h-44 object-cover rounded mb-3"
        loading="lazy"
      />

      <p class="text-sm text-white">❤️ Salud: ${p.life}</p>
      <p class="text-sm text-white">🏆 ${p.milestones || "-"}</p>

      ${skills.length ? `
        <button
          class="mt-2 bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded text-xs text-white skills-btn">
          Ver habilidades (${skills.length})
        </button>
      ` : ""}

      <div class="mt-auto">
        <div class="bg-stone-600 h-3 rounded mt-2 overflow-hidden">
          <div class="bg-green-500 h-3" style="width:${percent}%"></div>
        </div>

        <p class="text-xs text-stone-300 mt-1 text-center">
          ${roundExp(expInfo.current)} / ${roundExp(expInfo.required)} EXP
          · faltan ${roundExp(expInfo.remaining)}
        </p>

        <div class="grid grid-cols-6 gap-1 mt-3">
          ${(p.items || []).slice(0, 6).map((item, i) => `
            <img
              src="${resolveImage(item)}"
              class="w-10 h-10 object-cover rounded border cursor-pointer item-img"
              data-player="${playerIndex}"
              data-item="${i}"
              loading="lazy"
            />
          `).join("")}
        </div>
      </div>
    `;

    // 🔥 eventos seguros (sin strings rotos)
    card.querySelectorAll(".item-img").forEach(img => {
      img.addEventListener("click", e => {
        const pIndex = e.target.dataset.player;
        const iIndex = e.target.dataset.item;
        openItemModal(
          resolveImage(players[pIndex].items[iIndex]),
          players[pIndex].itemDescriptions?.[iIndex] || "Sin descripción"
        );
      });
    });

    const skillsBtn = card.querySelector(".skills-btn");
    if (skillsBtn) {
      skillsBtn.addEventListener("click", () => {
        openSkillsModal(skills);
      });
    }

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
    showToast("⚠️ Conexión tiempo real perdida, usando polling", "warning");
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
