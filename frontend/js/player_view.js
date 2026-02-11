// =============================================================
// CONFIG
// =============================================================

const BASE_URL =
  window.__env && window.__env.API_URL
    ? window.__env.API_URL
    : "https://chikaku-d-d-ptyl.onrender.com";

const API_PLAYERS = `${BASE_URL}/api/players`;
const SSE_URL = `${BASE_URL}/api/players/stream`;

// =============================================================
// STATE
// =============================================================

let players = [];
let lastSignature = "";
let isFiltering = false;
let sseConnected = false;

// 🧊 cold start
let coldStartChecked = false;
const COLD_START_THRESHOLD = 900; // ms

const playerBoard = document.getElementById("playerBoard");

// =============================================================
// LOADER (GLOBAL)
// =============================================================

function showLoader(text = "Cargando jugadores…") {
  const loader = document.getElementById("globalLoader");
  if (!loader) return;
  loader.querySelector("span").textContent = text;
  loader.classList.remove("hidden");
}

function hideLoader() {
  document.getElementById("globalLoader")?.classList.add("hidden");
}

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
    explained: "bg-purple-600",
    warning: "bg-yellow-600",
    error: "bg-red-600",
  };

  const toast = document.createElement("div");
  toast.className = `
    ${colors[type] || colors.info}
    text-white px-4 py-3 rounded-xl shadow-xl
    animate-fade-in
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

function expForLevel(level) {
  return BASE_EXP + (level - 1) * EXP_STEP;
}

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
// FETCH (con medición de tiempo)
// =============================================================

async function fetchJson(url, realtime = false) {
  const start = performance.now();

  const res = await fetch(url, {
    cache: "no-store",
    headers: realtime ? { "x-realtime": "1" } : {},
  });

  const duration = performance.now() - start;

  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();

  return { data, duration };
}

// =============================================================
// SIGNATURE (CACHE / CAMBIOS)
// =============================================================

function buildSignature(list = []) {
  return list.map((p) => `${p._id}:${p.updatedAt}`).join("|");
}

// =============================================================
// LOAD PLAYERS
// =============================================================

async function loadPlayers(fromRealtime = false) {
  try {
    showLoader(
      fromRealtime ? "Actualizando jugadores…" : "Cargando jugadores…",
    );

    const { data, duration } = await fetchJson(API_PLAYERS, fromRealtime);

    // 🧊 detección de cold start SOLO en primera carga
    if (!fromRealtime && !coldStartChecked) {
      coldStartChecked = true;

      if (duration > COLD_START_THRESHOLD) {
        showToast("🧙‍♂️ Despertando al servidor…", "explained");
      }
    }

    if (!fromRealtime) {
      const signature = buildSignature(data);
      if (signature === lastSignature) {
        hideLoader();
        return;
      }
      lastSignature = signature;
    } else {
      lastSignature = "";
    }

    players = data;
    renderPlayerBoard(players);
    populateClassFilters(players);

    if (fromRealtime) {
      showToast("⚡ Jugadores actualizados", "success");
    }
  } catch (err) {
    console.error("Error cargando jugadores:", err);
    showToast("❌ Error cargando jugadores", "error");
  } finally {
    hideLoader();
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

  skills.forEach((s) => {
    const li = document.createElement("li");
    li.className = "bg-stone-700 rounded px-3 py-2 text-sm";
    li.textContent = s;
    list.appendChild(li);
  });
}

// =============================================================
// 🧮 CALCULADORA
// =============================================================

let calcValue = "";

function openCalc() {
  const modal = document.getElementById("calcModal");
  if (!modal) return;
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeCalc() {
  const modal = document.getElementById("calcModal");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

function calcInput(value) {
  calcValue += value;
  document.getElementById("calcDisplay").value = calcValue;
}

function calcClear() {
  calcValue = "";
  document.getElementById("calcDisplay").value = "";
}

function calcResult() {
  try {
    calcValue = eval(calcValue).toString();
    document.getElementById("calcDisplay").value = calcValue;
  } catch {
    document.getElementById("calcDisplay").value = "Error";
    calcValue = "";
  }
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
// RENDER (TU LÓGICA, NO TOCADA)
// =============================================================

function renderPlayerBoard(list = players) {
  playerBoard.innerHTML = "";
  playerBoard.className =
    "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6";

  list.forEach((p) => {
    const totalExp = Number(p.exp) || 0;
    const exp = expProgress(totalExp);
    const skills = Array.isArray(p.skills) ? p.skills : [];
    const visibleItems = (p.items || []).slice(0, 6);

    const card = document.createElement("div");
    card.className =
      "bg-stone-800 rounded-xl shadow-xl p-5 flex flex-col h-[580px]";
    card.innerHTML = `
  <h2
    class="text-lg font-bold text-white mb-2
         line-clamp-2 min-h-[3rem] leading-tight">
    ${p.name} (Nivel ${exp.level})
  </h2>

  <img
    src="${resolveImage(p.img)}"
    class="w-full h-44 object-cover rounded mb-3"
    loading="lazy"
  />

  <p class="text-sm">
    ❤️ Salud: <span class="font-semibold">${p.life}</span>
  </p>

  ${p.class
        ? `
        <div class="flex flex-wrap gap-2 mt-1 mb-1">
          <span class="bg-indigo-600 text-white text-xs px-2 py-1 rounded">
            🧙 ${p.class}
          </span>
          ${p.subclass
          ? `<span class="bg-purple-600 text-white text-xs px-2 py-1 rounded">
                   ✨ ${p.subclass}
                 </span>`
          : ""
        }
        </div>
      `
        : ""
      }

  <p class="text-sm">🏆 ${p.milestones || "-"}</p>
  <p class="text-sm">⭐ EXP total: ${totalExp}</p>

  <p class="text-sm text-yellow-400 font-bold">
    🪙 Oro: ${p.gold ?? 0}
  </p>

  ${skills.length
        ? `<button
          onclick='openSkillsModal(${JSON.stringify(skills)})'
          class="mt-2 bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded text-xs">
          Ver habilidades (${skills.length})
        </button>`
        : ""
      }

  <div class="mt-auto">
    <div class="bg-stone-600 h-3 rounded mt-3 overflow-hidden">
      <div class="bg-green-500 h-3" style="width:${exp.percent}%"></div>
    </div>

    <p class="text-xs text-stone-300 mt-1 text-center">
      ${exp.current} / ${exp.required} · faltan ${exp.remaining}
    </p>

    <!-- OBJETOS VISIBLES (máx 6) -->
    <div class="grid grid-cols-6 gap-1 mt-3">
      ${visibleItems
        .map(
          (item, i) => `
            <img
              src="${resolveImage(item)}"
              data-img="${resolveImage(item)}"
              data-desc="${(p.itemDescriptions?.[i] || "Sin descripción").replace(/"/g, "&quot;")}"
              class="w-10 h-10 object-cover rounded border cursor-pointer"
            />
          `,
        )
        .join("")}
    </div>

    <!-- BOTÓN INVENTARIO -->
    ${(p.items?.length || 0) > 6
        ? `<button
            class="mt-2 w-full bg-zinc-700 hover:bg-zinc-600 text-xs rounded p-1"
            onclick='openInventoryModal(
              ${JSON.stringify(p.items)},
              ${JSON.stringify(p.itemDescriptions || [])}
            )'>
            📦 Ver inventario (${p.items.length})
          </button>`
        : ""
      }
  </div>
    `;

    card.querySelectorAll("[data-img]").forEach((el) => {
      el.addEventListener("click", () => {
        openItemModal(el.dataset.img, el.dataset.desc);
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
    loadPlayers(true);
  });

  source.onerror = () => {
    sseConnected = false;
    source.close();
    showToast("⚠️ Conexión tiempo real perdida", "warning");
  };
}


// =============================================================
// INVENTARIO
// =============================================================
function openInventoryModal(items = [], descriptions = []) {
  let modal = document.getElementById("inventoryModal");

  if (!modal) {
    modal = document.createElement("div");
    modal.id = "inventoryModal";
    modal.className =
      "fixed inset-0 bg-black/80 z-50 flex items-center justify-center";

    modal.innerHTML = `
      <div class="bg-stone-800 border border-stone-600 rounded-xl p-6 max-w-2xl w-full relative">
        <button
          onclick="document.getElementById('inventoryModal').remove()"
          class="absolute top-2 right-2 text-xl text-white">✕</button>

        <h3 class="text-lg font-bold mb-4 text-center">
          📦 Inventario
        </h3>

        <div id="inventoryGrid"
          class="grid grid-cols-6 gap-2 max-h-[60vh] overflow-y-auto">
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  const grid = modal.querySelector("#inventoryGrid");
  grid.innerHTML = "";

  items.forEach((item, i) => {
    const img = document.createElement("img");
    img.src = resolveImage(item);
    img.className =
      "w-12 h-12 object-cover rounded border cursor-pointer";
    img.onclick = () =>
      openItemModal(
        resolveImage(item),
        descriptions[i] || "Sin descripción"
      );
    grid.appendChild(img);
  });
}

// =============================================================
// 🔍 FILTROS (BUSCADOR + ORDEN + NIVEL + CLASE + SUBCLASE)
// =============================================================

const searchInput = document.getElementById("searchInput");
const sortAlphabet = document.getElementById("sortAlphabet");
const filterLevel = document.getElementById("filterLevel");
const filterClass = document.getElementById("filterClass");
const filterSubclass = document.getElementById("filterSubclass");

function applyFilters() {
  let result = [...players];

  // 🔍 BUSCADOR POR NOMBRE
  const query = searchInput?.value?.trim()?.toLowerCase() || "";
  if (query) {
    result = result.filter((p) =>
      (p.name || "").toLowerCase().includes(query)
    );
  }

  // 🎚️ FILTRO POR NIVEL
  const levelFilter = filterLevel?.value;
  if (levelFilter) {
    result = result.filter((p) => {
      const lvl = Number(p.level) || 1;

      switch (levelFilter) {
        case "1-3":
          return lvl >= 1 && lvl <= 3;
        case "4-6":
          return lvl >= 4 && lvl <= 6;
        case "7-9":
          return lvl >= 7 && lvl <= 9;
        case "10+":
          return lvl >= 10;
        default:
          return true;
      }
    });
  }

  // 🔤 ORDEN ALFABÉTICO
  const sort = sortAlphabet?.value;
  if (sort === "az") {
    result.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  } else if (sort === "za") {
    result.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
  }

  // 🧙 FILTRO POR CLASE (NORMALIZADO)
  const selectedClass = filterClass?.value;
  if (selectedClass) {
    result = result.filter(
      (p) => p.class?.trim().toLowerCase() === selectedClass
    );
  }

  // ✨ FILTRO POR SUBCLASE (NORMALIZADO)
  const selectedSubclass = filterSubclass?.value;
  if (selectedSubclass) {
    result = result.filter(
      (p) => p.subclass?.trim().toLowerCase() === selectedSubclass
    );
  }

  renderPlayerBoard(result);
}

// =============================================================
// 🔥 GENERAR FILTROS SIN DUPLICADOS
// =============================================================

function populateClassFilters(players = []) {
  const classes = new Map();
  const subclassesByClass = {};

  players.forEach((p) => {
    if (!p.class) return;

    const normalizedClass = p.class.trim().toLowerCase();
    const displayClass =
      p.class.trim().charAt(0).toUpperCase() +
      p.class.trim().slice(1).toLowerCase();

    classes.set(normalizedClass, displayClass);

    if (!subclassesByClass[normalizedClass]) {
      subclassesByClass[normalizedClass] = new Map();
    }

    if (p.subclass) {
      const normalizedSub = p.subclass.trim().toLowerCase();
      const displaySub =
        p.subclass.trim().charAt(0).toUpperCase() +
        p.subclass.trim().slice(1).toLowerCase();

      subclassesByClass[normalizedClass].set(
        normalizedSub,
        displaySub
      );
    }
  });

  // ---- CLASES ----
  filterClass.innerHTML = `<option value="">Todas las clases</option>`;

  [...classes.entries()]
    .sort((a, b) => a[1].localeCompare(b[1]))
    .forEach(([value, label]) => {
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = label;
      filterClass.appendChild(opt);
    });

  // ---- SUBCLASES ----
  filterSubclass.innerHTML = `<option value="">Todas las subclases</option>`;

  filterClass.onchange = () => {
    const selectedClass = filterClass.value;

    filterSubclass.innerHTML =
      `<option value="">Todas las subclases</option>`;

    if (!selectedClass || !subclassesByClass[selectedClass]) {
      applyFilters();
      return;
    }

    [...subclassesByClass[selectedClass].entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .forEach(([value, label]) => {
        const opt = document.createElement("option");
        opt.value = value;
        opt.textContent = label;
        filterSubclass.appendChild(opt);
      });

    applyFilters();
  };
}

// =============================================================
// 🎧 EVENTOS
// =============================================================

searchInput?.addEventListener("input", applyFilters);
sortAlphabet?.addEventListener("change", applyFilters);
filterLevel?.addEventListener("change", applyFilters);
filterClass?.addEventListener("change", applyFilters);
filterSubclass?.addEventListener("change", applyFilters);


// =============================================================
// 🎧 EVENTOS
// =============================================================

searchInput?.addEventListener("input", applyFilters);
sortAlphabet?.addEventListener("change", applyFilters);
filterLevel?.addEventListener("change", applyFilters);
filterClass?.addEventListener("change", applyFilters);
filterSubclass?.addEventListener("change", applyFilters);

// =============================================================
// 🔧 COMPATIBILIDAD HTML LEGACY
// =============================================================

function searchPlayer() {
  applyFilters();
}

// =============================================================
// INIT
// =============================================================

window.addEventListener("load", () => {
  loadPlayers(false);
  initSSE();
});
