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
// 🔥 EXP SYSTEM (ACUMULATIVO, EXACTO)
// =============================================================

const BASE_EXP = 100;
const EXP_GROWTH = 1.08;

// Tabla exacta de coste por nivel
function buildExpTable(max = 50) {
  let cost = BASE_EXP;
  return Array.from({ length: max }, () => {
    const value = Math.round(cost);
    cost *= EXP_GROWTH;
    return value;
  });
}

const EXP_TABLE = buildExpTable();

// Calcula nivel y progreso DESDE EXP TOTAL
function calculateExpState(totalExp) {
  let accumulated = 0;

  for (let lvl = 1; lvl <= EXP_TABLE.length; lvl++) {
    const required = EXP_TABLE[lvl - 1];

    if (totalExp < accumulated + required) {
      const current = totalExp - accumulated;
      return {
        level: lvl,
        current,
        required,
        remaining: required - current,
        percent: Math.round((current / required) * 100),
      };
    }

    accumulated += required;
  }

  return {
    level: EXP_TABLE.length + 1,
    current: 0,
    required: 0,
    remaining: 0,
    percent: 100,
  };
}

// =============================================================
// FETCH
// =============================================================

async function fetchJson(url) {
  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
  });

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

  list.forEach(p => {
    const level = safeLevel(p.level);
    const exp = safeExp(p.exp);

    const percent = expProgress(level, exp);
    const expInfo = expDetails(level, exp);
    const skills = Array.isArray(p.skills) ? p.skills : [];

    const card = document.createElement("div");
    card.className =
      "bg-stone-800 rounded-xl shadow-xl p-4 flex flex-col h-[440px]";

    card.innerHTML = `
      <!-- NOMBRE -->
      <h2 class="text-lg font-bold mb-2 truncate text-white">
        ${p.name} (Nivel ${level})
      </h2>

      <!-- IMAGEN -->
      <img
        src="${resolveImage(p.img)}"
        class="w-full h-44 object-cover rounded mb-3"
        loading="lazy"
      />

      <!-- INFO -->
      <p class="text-sm">❤️ Salud: ${p.life}</p>
      <p class="text-sm">🏆 ${p.milestones || "-"}</p>

      <!-- HABILIDADES -->
      ${skills.length ? `
        <button
          onclick='openSkillsModal(${JSON.stringify(skills)})'
          class="mt-2 bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded text-xs">
          Ver habilidades (${skills.length})
        </button>
      ` : ""}

      <!-- EXP -->
      <div class="mt-auto">
        <div class="bg-stone-600 h-3 rounded mt-3 overflow-hidden">
          <div
            class="bg-green-500 h-3 transition-all exp-bar"
            style="width:${percent}%">
          </div>
        </div>

        <p class="text-xs text-stone-300 mt-1 text-center">
          EXP total: ${Math.round(exp)}
        </p>

        <p class="text-xs text-stone-400 text-center">
          ${Math.round(expInfo.current)} / ${Math.round(expInfo.required)}
          · faltan ${Math.round(expInfo.remaining)}
        </p>

        <!-- OBJETOS -->
        <div class="grid grid-cols-6 gap-1 mt-3">
          ${(p.items || []).slice(0, 6).map((item, i) => `
            <img
              src="${resolveImage(item)}"
              data-img="${resolveImage(item)}"
              data-desc="${(p.itemDescriptions?.[i] || "Sin descripción")
                .replace(/"/g, "&quot;")}"
              class="w-10 h-10 object-cover rounded border cursor-pointer hover:scale-105 transition object-item"
              loading="lazy"
            />
          `).join("")}
        </div>
      </div>
    `;

    playerBoard.appendChild(card);

    // 🔥 NUEVO: listener seguro para objetos (sin romper nada)
    card.querySelectorAll(".object-item").forEach(img => {
      img.addEventListener("click", () => {
        openItemModal(
          img.dataset.img,
          img.dataset.desc
        );
      });
    });
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
    showToast("⚠️ Conexión perdida, usando polling", "warning");
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
