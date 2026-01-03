// =============================================================
// STATE
// =============================================================
let formMode = "create"; // "create" | "edit"
let editingPlayerId = null;
let lastSignature = "";

// 🔥 NUEVO → objetos a borrar
let itemsToDelete = [];

// =============================================================
// XP SYSTEM (ACUMULATIVO)
// =============================================================
// =============================================================
// XP SYSTEM (ACUMULATIVO BASE 100 +40 POR NIVEL)
// =============================================================

const BASE_EXP = 100;
const EXP_STEP = 40;

function resolveImg(img) {
  if (!img) return "/placeholder.png";
  if (typeof img === "string") return img;
  if (typeof img === "object" && img.url) return img.url;
  return "/placeholder.png";
}


// Calcula el nivel a partir de la EXP TOTAL acumulada
function calculateLevelFromExp(totalExp) {
  totalExp = Number(totalExp) || 0;

  let level = 1;
  let expUsed = 0;

  while (true) {
    const expForNextLevel = BASE_EXP + (level - 1) * EXP_STEP;

    if (totalExp < expUsed + expForNextLevel) {
      return level;
    }

    expUsed += expForNextLevel;
    level++;
  }
}

// =============================================================
// UI ACTIONS
// =============================================================
function toggleCreateCard(forceOpen = false) {
  const card = document.getElementById("createCard");
  if (!card) return;

  if (forceOpen) {
    card.classList.remove("hidden");
    card.scrollIntoView({ behavior: "smooth" });
  } else {
    card.classList.toggle("hidden");
  }
}

function openCreateForm() {
  resetForm();
  toggleCreateCard(true);
}

function openPlayerBoard() {
  window.open("../Player/player_view.html", "_blank");
}

// =============================================================
// CONFIG
// =============================================================
const BASE_URL =
  window.__env && window.__env.API_URL
    ? window.__env.API_URL
    : "https://chikaku-d-d-ptyl.onrender.com";

const API_PLAYERS = `${BASE_URL}/api/players`;
let players = [];

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

// =============================================================
// LOADER
// =============================================================
function showLoader() {
  document.getElementById("loader")?.classList.remove("hidden");
}
function hideLoader() {
  document.getElementById("loader")?.classList.add("hidden");
}

// =============================================================
// FETCH
// =============================================================

async function fetchJson(url, opts = {}, showLoading = false) {
  if (showLoading) showLoader();

  try {
    const res = await fetch(url, {
      ...opts,
      cache: "no-store",
      headers: {
        ...(opts.headers || {}),
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });

    if (!res.ok) throw new Error(await res.text());
    return await res.json();
  } finally {
    if (showLoading) hideLoader();
  }
}

// =============================================================
// IMÁGENES
// =============================================================
function validateImage(file) {
  if (!file) return true;
  if (!ALLOWED_TYPES.includes(file.type)) return false;
  if (file.size > MAX_IMAGE_SIZE) return false;
  return true;
}

function addPreview(inputId, previewId, index = null) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  if (!input || !preview) return;

  input.onchange = () => {
    const file = input.files[0];

    console.log("📂 Archivo seleccionado:", {
      inputId,
      name: file?.name,
      size: file?.size,
      type: file?.type,
    });

    if (!validateImage(file)) {
      console.warn("❌ Imagen no válida");
      input.value = "";
      preview.classList.add("hidden");
      return;
    }

    // 🔥 SI SE SELECCIONA NUEVA IMAGEN → DESMARCAR BORRADO
    if (index !== null) {
      itemsToDelete = itemsToDelete.filter((i) => i !== index);

      const btn = document.getElementById(`deleteItemBtn${index + 1}`);
      btn?.classList.remove("hidden");
    }

    const reader = new FileReader();
    reader.onload = () => {
      preview.src = reader.result;
      preview.classList.remove("hidden");
    };
    reader.readAsDataURL(file);
  };
}

// =============================================================
// SKILLS
// =============================================================
function addSkillInput(value = "") {
  const container = document.getElementById("skillsContainer");
  if (!container) return;
  if (container.children.length >= 8) return;

  const div = document.createElement("div");
  div.className = "relative";
  div.innerHTML = `
    <input class="input pr-10" value="${value}">
    <button type="button"
      onclick="this.parentElement.remove()"
      class="absolute right-2 top-1/2 -translate-y-1/2
             px-2 py-1 rounded bg-red-600 hover:bg-red-700 font-bold">
      ✕
    </button>
  `;
  container.appendChild(div);
}

// =============================================================
// OBJETOS
// =============================================================
function initItems() {
  const container = document.getElementById("objectsContainer");
  if (!container) return;

  container.innerHTML = "";
  for (let i = 1; i <= 6; i++) {
    const div = document.createElement("div");
    div.className = "object-card";
    div.innerHTML = `
      <label class="label-sm">Objeto ${i}</label>
      <input id="item${i}Input" type="file" class="file" />
      <textarea id="item${i}Desc" class="input mt-2 resize-none"
        rows="2" placeholder="Descripción del objeto..."></textarea>

      <img id="previewItem${i}" class="preview mt-3 hidden" />

      <!-- 🔥 NUEVO -->
      <button
        id="deleteItemBtn${i}"
        type="button"
        onclick="deleteItemImage(${i})"
        class="mt-2 w-full bg-red-600 hover:bg-red-700 text-sm rounded p-1 hidden">
        🗑️ Eliminar imagen
      </button>
    `;
    container.appendChild(div);
    addPreview(`item${i}Input`, `previewItem${i}`, i - 1);
  }
}

// =============================================================
// 🔥 NUEVO → BORRAR IMAGEN DE OBJETO
// =============================================================
function deleteItemImage(index) {
  const realIndex = index - 1;

  const preview = document.getElementById(`previewItem${index}`);
  const input = document.getElementById(`item${index}Input`);
  const btn = document.getElementById(`deleteItemBtn${index}`);

  if (preview) {
    preview.src = "";
    preview.classList.add("hidden");
  }

  if (input) input.value = "";

  if (!itemsToDelete.includes(realIndex)) {
    itemsToDelete.push(realIndex);
  }

  if (btn) btn.classList.add("hidden");

  console.log("🗑️ Item marcado para borrar:", realIndex);
}

// =============================================================
// PLAYERS LIST
// =============================================================
async function refreshPlayers(force = false) {
  const data = await fetchJson(API_PLAYERS);
  const signature = data.map((p) => `${p._id}:${p.updatedAt}`).join("|");

  if (!force && signature === lastSignature) return;

  lastSignature = signature;
  players = data;
  renderPlayersList();
}

function renderPlayersList() {
  const list = document.getElementById("playersList");
  list.innerHTML = "";

  players.forEach((p) => {
    const card = document.createElement("div");
    card.className =
      "bg-zinc-900 border border-zinc-700 rounded-xl p-4 shadow flex flex-col";

    card.innerHTML = `
      <img src="${p.img || "/placeholder.png"}"
        class="w-full h-40 object-cover rounded mb-2">

      <h3 class="font-bold text-lg">
        ${p.name} (Nivel ${p.level})
      </h3>

      <p>❤️ Vida: ${p.life}</p>
      <p>⭐ EXP: ${p.exp}</p>

      <div class="mt-auto">
        <button onclick="editPlayer('${p._id}')"
          class="mt-3 w-full bg-green-600 p-2 rounded">
          Editar
        </button>

        <button onclick="deletePlayer('${p._id}')"
          class="mt-2 w-full bg-red-600 p-2 rounded">
          Eliminar
        </button>
      </div>
    `;
    list.appendChild(card);
  });
}

// =============================================================
// EDIT PLAYER
// =============================================================
function editPlayer(id) {
  const player = players.find((p) => p._id === id);
  if (!player) return;

  formMode = "edit";
  editingPlayerId = id;
  itemsToDelete = []; // 🔥 NUEVO

  toggleCreateCard(true);
  submitCharacterBtn.textContent = "✏️ Guardar cambios";

  charNameInput.value = player.name || "";
  charLifeInput.value = player.life ?? 10;
  charMilestonesInput.value = player.milestones || "";
  charAttributesInput.value = player.attributes || "";
  charExpInput.value = player.exp ?? 0;

  skillsContainer.innerHTML = "";
  (player.skills || []).forEach(addSkillInput);

  charImgInput.value = "";
  if (player.img) {
    previewCharMain.src = player.img;
    previewCharMain.classList.remove("hidden");
  } else {
    previewCharMain.classList.add("hidden");
  }

  initItems();

  (player.items || []).forEach((img, i) => {
    const p = document.getElementById(`previewItem${i + 1}`);
    const btn = document.getElementById(`deleteItemBtn${i + 1}`);
    if (p && img) {
      p.src = img;
      p.classList.remove("hidden");
      btn?.classList.remove("hidden"); // 🔥 NUEVO
    }
  });

  (player.itemDescriptions || []).forEach((d, i) => {
    const t = document.getElementById(`item${i + 1}Desc`);
    if (t) t.value = d;
  });
}

// =============================================================
// CREATE / EDIT
// =============================================================
async function submitCharacter() {
  console.log("🚀 submitCharacter() ejecutado");

  const name = charNameInput.value.trim();
  if (!name) return;

  const skills = [...document.querySelectorAll("#skillsContainer input")]
    .map((i) => i.value.trim())
    .filter(Boolean);

  const itemDescriptions = [];
  for (let i = 1; i <= 6; i++) {
    itemDescriptions.push(
      document.getElementById(`item${i}Desc`)?.value.trim() || ""
    );
  }

  const totalExp = Number(charExpInput.value) || 0;
  const calculatedLevel = calculateLevelFromExp(totalExp);

  const fd = new FormData();

  // =============================
  // DATOS BÁSICOS
  // =============================
  fd.append("name", name);
  fd.append("life", charLifeInput.value);
  fd.append("milestones", charMilestonesInput.value);
  fd.append("attributes", charAttributesInput.value);
  fd.append("exp", totalExp);
  fd.append("level", calculatedLevel);
  fd.append("skills", JSON.stringify(skills));
  fd.append("itemDescriptions", JSON.stringify(itemDescriptions));
  // 🔥 LIMPIAR CONFLICTOS: no borrar slots con imagen nueva
  const indicesWithNewImages = [];

  for (let i = 1; i <= 6; i++) {
    const input = document.getElementById(`item${i}Input`);
    if (input?.files?.[0]) {
      indicesWithNewImages.push(i - 1);
    }
  }

  itemsToDelete = itemsToDelete.filter(
    (i) => !indicesWithNewImages.includes(i)
  );

  fd.append("itemsToDelete", JSON.stringify(itemsToDelete));

  // =============================
  // IMAGEN PRINCIPAL
  // =============================
  if (charImgInput.files[0] && validateImage(charImgInput.files[0])) {
    console.log("🖼️ Enviando imagen principal:", charImgInput.files[0].name);
    fd.append("charImg", charImgInput.files[0]);
  }

  // =============================
  // OBJETOS POR SLOT (CLAVE)
  // =============================
  for (let i = 1; i <= 6; i++) {
    const input = document.getElementById(`item${i}Input`);
    const file = input?.files?.[0];

    if (file && validateImage(file)) {
      console.log(`📦 Objeto slot ${i - 1}:`, file.name);
      fd.append("items", file);
      fd.append("itemsIndex", i - 1); // 🔥 CLAVE ABSOLUTA
    }
  }

  // =============================
  // DEBUG FINAL (MUY IMPORTANTE)
  // =============================
  console.group("📤 FormData enviado");
  for (const [key, value] of fd.entries()) {
    console.log(key, value);
  }
  console.groupEnd();

  // =============================
  // FETCH
  // =============================
  if (formMode === "create") {
    await fetchJson(API_PLAYERS, { method: "POST", body: fd }, true);
  } else {
    await fetchJson(
      `${API_PLAYERS}/${editingPlayerId}`,
      {
        method: "PUT",
        body: fd,
      },
      true
    );
  }

  // =============================
  // RESET
  // =============================
  itemsToDelete = [];
  resetForm();
  toggleCreateCard();
  refreshPlayers(true);
}

// =============================================================
// DELETE
// =============================================================
async function deletePlayer(id) {
  if (!confirm("¿Eliminar personaje?")) return;
  await fetchJson(`${API_PLAYERS}/${id}`, { method: "DELETE" }, true);
  refreshPlayers(true);
}

// =============================================================
// RESET
// =============================================================
function resetForm() {
  formMode = "create";
  editingPlayerId = null;
  itemsToDelete = []; // 🔥 NUEVO

  submitCharacterBtn.textContent = "🐉 Crear personaje";

  charNameInput.value = "";
  charLifeInput.value = 10;
  charMilestonesInput.value = "";
  charAttributesInput.value = "";
  charExpInput.value = 0;

  skillsContainer.innerHTML = "";
  charImgInput.value = "";
  previewCharMain.classList.add("hidden");

  initItems();
}

// =============================================================
// INIT
// =============================================================
window.addEventListener("load", () => {
  refreshPlayers(true);
  initItems();
  addPreview("charImgInput", "previewCharMain");
});
