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
  if (typeof img === "object")
    return img.secure_url || img.url || "/placeholder.png";
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
    container.className = "fixed top-4 right-4 z-50 flex flex-col gap-3";
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
// 🔥 EXP SYSTEM (BASE 100 +40 POR NIVEL)
// =============================================================

const BASE_EXP = 100;
const EXP_STEP = 40;

// EXP necesaria para subir un nivel concreto
function expForLevel(level) {
  return BASE_EXP + (level - 1) * EXP_STEP;
}

// Calcula nivel y progreso desde EXP TOTAL acumulada
function expProgress(totalExp) {
  totalExp = Number(totalExp) || 0;

  let level = 1;
  let usedExp = 0;

  while (true) {
    const required = expForLevel(level);

    if (totalExp < usedExp + required) {
      const current = totalExp - usedExp;

      return {
        level,
        current,
        required,
        remaining: required - current,
        percent: Math.round((current / required) * 100),
      };
    }

    usedExp += required;
    level++;
  }
}


// =============================================================
// FETCH
// =============================================================

async function fetchJson(url, realtime = false) {
  const res = await fetch(url, {
    cache: "no-store",
    headers: realtime
      ? { "x-realtime": "1" } // 🔥 fuerza invalidar cache en backend
      : {},
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// =============================================================
// LOAD PLAYERS
// =============================================================

async function loadPlayers(fromRealtime = false) {
  try {
    const data = await fetchJson(API_PLAYERS, fromRealtime);

    // 🔥 SI VIENE DE SSE, FORZAMOS RENDER
    if (!fromRealtime) {
      const signature = buildSignature(data);
      if (signature === lastSignature) return;
      lastSignature = signature;
    } else {
      // 🔥 invalida firma para próximos fetch
      lastSignature = "";
    }

    players = data;
    renderPlayerBoard(players);

    if (fromRealtime) {
      showToast("⚡ Jugadores actualizados", "success");
    }
  } catch (err) {
    console.error("Error cargando jugadores:", err);
  }
}


// =============================================================
// SIGNATURE (CACHE / CAMBIOS)
// =============================================================

function buildSignature(list = []) {
  return list
    .map(p => `${p._id}:${p.updatedAt}`)
    .join("|");
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

  skills.forEach((s) => {
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

  list.forEach((p) => {
    const totalExp = Number(p.exp) || 0;
    const exp = expProgress(totalExp);
    const skills = Array.isArray(p.skills) ? p.skills : [];

    const card = document.createElement("div");
    card.className =
      "bg-stone-800 rounded-xl shadow-xl p-4 flex flex-col h-[460px]";

    card.innerHTML = `
      <!-- NOMBRE -->
      <h2 class="text-lg font-bold mb-2 truncate text-white">
        ${p.name} (Nivel ${exp.level})
      </h2>

      <!-- IMAGEN -->
      <img
        src="${resolveImage(p.img)}"
        class="w-full h-44 object-cover rounded mb-3"
        loading="lazy"
      />

      <!-- INFO -->
      <p class="text-sm">❤️ Salud: ${p.life}</p>

      <!-- HITOS (🔥 RESTAURADO) -->
      <p class="text-sm">🏆 ${p.milestones || "-"}</p>

      <p class="text-sm">⭐ EXP total: ${totalExp}</p>

      <!-- HABILIDADES -->
      ${
        skills.length
          ? `
        <button
          onclick='openSkillsModal(${JSON.stringify(skills)})'
          class="mt-2 bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded text-xs">
          Ver habilidades (${skills.length})
        </button>
      `
          : ""
      }

      <!-- EXP -->
      <div class="mt-auto">
        <div class="bg-stone-600 h-3 rounded mt-3 overflow-hidden">
          <div
            class="bg-green-500 h-3 transition-all"
            style="width:${exp.percent}%">
          </div>
        </div>

        <p class="text-xs text-stone-300 mt-1 text-center">
          ${Math.round(exp.current)} / ${Math.round(exp.required)}
          · faltan ${Math.round(exp.remaining)}
        </p>

        <!-- OBJETOS -->
        <div class="grid grid-cols-6 gap-1 mt-3" data-items>
          ${(p.items || [])
            .slice(0, 6)
            .map(
              (item, i) => `
            <img
              src="${resolveImage(item)}"
              data-img="${resolveImage(item)}"
              data-desc="${(
                p.itemDescriptions?.[i] || "Sin descripción"
              ).replace(/"/g, "&quot;")}"
              class="w-10 h-10 object-cover rounded border cursor-pointer"
              loading="lazy"
            />
          `
            )
            .join("")}
        </div>
      </div>
    `;

    // 🔥 FIX DEFINITIVO: binding de clicks por JS (no inline)
    const itemImgs = card.querySelectorAll("[data-img]");
    itemImgs.forEach((imgEl) => {
      imgEl.addEventListener("click", () => {
        openItemModal(imgEl.dataset.img, imgEl.dataset.desc);
      });
    });

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
  console.log("🔥 SSE RECIBIDO", new Date().toISOString());
  loadPlayers(true);
});


  source.onerror = () => {
    sseConnected = false;
    source.close();
    showToast("⚠️ Conexión tiempo real perdida, usando polling", "warning");
  };
}


// =============================================================
// INIT
// =============================================================

window.addEventListener("load", () => {
  loadPlayers();
  initSSE();
});
