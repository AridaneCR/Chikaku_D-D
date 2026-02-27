// =============================================================
// STATE
// =============================================================
let formMode = "create"; // "create" | "edit"
let editingPlayerId = null;
let lastSignature = "";

// 🔥 NUEVO → objetos a borrar
let itemsToDelete = [];
let totalItemSlots = 6;
const MAX_ITEM_SLOTS = 100;

// =============================================================
// XP SYSTEM (ACUMULATIVO)
// =============================================================
// =============================================================
// XP SYSTEM (ACUMULATIVO BASE 100 +40 POR NIVEL)
// =============================================================

const BASE_EXP = 100;
const EXP_STEP = 40;
const charGoldInput = document.getElementById("charGoldInput");

function resolveImage(img) {
  if (!img)
    return "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRZKJPFi4auwgPfdm7iTiWRDOe0hLdofEy4Zw&s";

  // imagen nueva (string)
  if (typeof img === "string") return img;

  // imagen antigua (Cloudinary object)
  if (typeof img === "object") {
    return (
      img.url ||
      img.secure_url ||
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRZKJPFi4auwgPfdm7iTiWRDOe0hLdofEy4Zw&s"
    );
  }

  return "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRZKJPFi4auwgPfdm7iTiWRDOe0hLdofEy4Zw&s";
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
    : "https://chikaku-d-d-1.onrender.com";

const API_PLAYERS = `${BASE_URL}/api/players`;
let players = [];

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

// =============================================================
// 🧙 CLASE / SUBCLASE (DEPENDIENTES)
// =============================================================

const charClassInput = document.getElementById("charClassInput");
const charSubclassInput = document.getElementById("charSubclassInput");

const SUBCLASSES_BY_CLASS = {
  Guerrero: ["Explorador", "Luchador"],
  Mago: ["Arcano", "Elemental"],
  Apoyo: ["Sanador", "Monje"],
};

function updateSubclassOptions(selectedClass, selectedSubclass = "") {
  charSubclassInput.innerHTML = `<option value="">— Selecciona subclase —</option>`;

  if (!selectedClass || !SUBCLASSES_BY_CLASS[selectedClass]) {
    charSubclassInput.disabled = true;
    return;
  }

  SUBCLASSES_BY_CLASS[selectedClass].forEach((sub) => {
    const opt = document.createElement("option");
    opt.value = sub;
    opt.textContent = sub;
    if (sub === selectedSubclass) opt.selected = true;
    charSubclassInput.appendChild(opt);
  });

  charSubclassInput.disabled = false;
}

// Evento cuando cambia la clase
charClassInput?.addEventListener("change", () => {
  updateSubclassOptions(charClassInput.value);
});

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
  totalItemSlots = 6;

  for (let i = 1; i <= 6; i++) {
    const div = document.createElement("div");
    div.className = "object-card";
    div.innerHTML = `
      <label class="label-sm">Objeto ${i}</label>
      <input id="item${i}Input" type="file" class="file" />
      <textarea id="item${i}Desc"
        class="input mt-2 resize-none"
        rows="2"
        placeholder="Descripción del objeto..."></textarea>

      <img id="previewItem${i}" class="preview mt-3 hidden" />

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

function addItemSlot() {
  if (totalItemSlots >= MAX_ITEM_SLOTS) {
    alert("Máximo 100 objetos");
    return;
  }

  totalItemSlots++;
  const i = totalItemSlots;

  const container = document.getElementById("objectsContainer");

  const div = document.createElement("div");
  div.className = "object-card";
  div.innerHTML = `
    <label class="label-sm">Objeto ${i}</label>
    <input id="item${i}Input" type="file" class="file" />
    <textarea id="item${i}Desc" class="input mt-2 resize-none"
      rows="2" placeholder="Descripción del objeto..."></textarea>

    <img id="previewItem${i}" class="preview mt-3 hidden" />

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
// 🪙 GOLD (MASTER)
// =============================================================
async function updateGold(playerId, amount, mode = "add") {
  try {
    await fetchJson(
      `${API_PLAYERS}/${playerId}/gold`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          mode,
        }),
      },
      true,
    );

    refreshPlayers(true);
  } catch (err) {
    console.error("❌ Error actualizando oro:", err);
    alert("Error actualizando el oro");
  }
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
    <img src="${resolveImage(p.img)}"
    class="w-full h-40 object-cover rounded mb-2">


      <h3 class="font-bold text-lg">
        ${p.name} (Nivel ${p.level})
      </h3>

      <p>❤️ Vida: ${p.life}</p>
      <p>⭐ EXP: ${p.exp}</p>

      <div class="mt-auto space-y-2">

  <!-- 🪙 ORO -->
  <div class="flex gap-2">
    <button
      onclick="updateGold('${p._id}', -10)"
      class="flex-1 bg-yellow-700 hover:bg-yellow-800 p-1 rounded text-sm">
      −10
    </button>

    <button
      onclick="updateGold('${p._id}', 10)"
      class="flex-1 bg-yellow-600 hover:bg-yellow-700 p-1 rounded text-sm">
      +10
    </button>
  </div>

  <button onclick="editPlayer('${p._id}')"
    class="w-full bg-green-600 p-2 rounded">
    Editar
  </button>

  <button onclick="deletePlayer('${p._id}')"
    class="w-full bg-red-600 p-2 rounded">
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
  itemsToDelete = [];

  toggleCreateCard(true);
  submitCharacterBtn.textContent = "✏️ Guardar cambios";

  charNameInput.value = player.name || "";
  charLifeInput.value = player.life ?? 10;
  charMilestonesInput.value = player.milestones || "";
  charAttributesInput.value = player.attributes || "";
  charExpInput.value = player.exp ?? 0;
  charGoldInput.value = player.gold ?? 0;
  charClassInput.value = player.class || "";
  updateSubclassOptions(player.class, player.subclass || "");

  skillsContainer.innerHTML = "";
  (player.skills || []).forEach(addSkillInput);

  charImgInput.value = "";
  if (player.img) {
    previewCharMain.src = resolveImage(player.img);
    previewCharMain.classList.remove("hidden");
  } else {
    previewCharMain.classList.add("hidden");
  }

  initItems();

  (player.items || []).forEach((img, i) => {
    if (i >= 6) addItemSlot();

    const preview = document.getElementById(`previewItem${i + 1}`);
    const btn = document.getElementById(`deleteItemBtn${i + 1}`);

    if (preview && img) {
      preview.src = resolveImage(img);
      preview.classList.remove("hidden");
      btn?.classList.remove("hidden");
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

  // =============================
  // SKILLS
  // =============================
  const skills = [...document.querySelectorAll("#skillsContainer input")]
    .map((i) => i.value.trim())
    .filter(Boolean);

  // =============================
  // DESCRIPCIONES (DINÁMICAS)
  // =============================
  const itemDescriptions = [];
  for (let i = 1; i <= totalItemSlots; i++) {
    itemDescriptions.push(
      document.getElementById(`item${i}Desc`)?.value.trim() || "",
    );
  }

  // =============================
  // EXP / LEVEL
  // =============================
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
  fd.append("class", charClassInput.value);
  fd.append("subclass", charSubclassInput.value);

  if (formMode === "create") {
    fd.append("gold", Number(charGoldInput.value) || 0);
  }

  // =============================
  // LIMPIEZA ITEMS A BORRAR
  // =============================
  const indicesWithNewImages = [];

  for (let i = 1; i <= totalItemSlots; i++) {
    const input = document.getElementById(`item${i}Input`);
    if (input?.files?.[0]) {
      indicesWithNewImages.push(i - 1);
    }
  }

  itemsToDelete = itemsToDelete.filter(
    (i) => !indicesWithNewImages.includes(i),
  );
  fd.append("itemsToDelete", JSON.stringify(itemsToDelete));

  // =============================
  // IMAGEN PRINCIPAL
  // =============================
  if (charImgInput.files[0] && validateImage(charImgInput.files[0])) {
    fd.append("charImg", charImgInput.files[0]);
  }

  // =============================
  // 🔥 IMÁGENES DE OBJETOS (CLAVE)
  // SOLO si existe archivo
  // =============================
  for (let i = 1; i <= totalItemSlots; i++) {
    const input = document.getElementById(`item${i}Input`);
    const file = input?.files?.[0];

    if (file && validateImage(file)) {
      fd.append("items", file);
      fd.append("itemsIndex", String(i - 1));
    }
  }

  // =============================
  // FETCH
  // =============================
  try {
    if (formMode === "create") {
      await fetchJson(API_PLAYERS, { method: "POST", body: fd }, true);
    } else {
      await fetchJson(
        `${API_PLAYERS}/${editingPlayerId}`,
        { method: "PUT", body: fd },
        true,
      );

      await updateGold(
        editingPlayerId,
        Number(charGoldInput.value) || 0,
        "set",
      );
    }

    // =============================
    // RESET
    // =============================
    itemsToDelete = [];
    resetForm();
    toggleCreateCard();
    refreshPlayers(true);
  } catch (err) {
    console.error("❌ Error submitCharacter:", err);
    alert("Error guardando el personaje");
  }
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
  totalItemSlots = 6;

  skillsContainer.innerHTML = "";
  charImgInput.value = "";
  previewCharMain.classList.add("hidden");
  charClassInput.value = "";
  updateSubclassOptions("");

  initItems();
}


// =============================================================
// ⚡ PANEL RÁPIDO MASTER COMPLETO
// =============================================================

const quickActionSearch = document.getElementById("quickActionSearch");
const quickActionDropdown = document.getElementById("quickActionDropdown");
const quickActionType = document.getElementById("quickActionType");
const quickActionMode = document.getElementById("quickActionMode");
const quickActionAmount = document.getElementById("quickActionAmount");
const quickActionFeedback = document.getElementById("quickActionFeedback");

let selectedQuickPlayerId = null;

// Mostrar / ocultar modo según tipo
quickActionType.addEventListener("change", () => {
  if (quickActionType.value === "gold" || quickActionType.value === "life") {
    quickActionMode.classList.remove("hidden");
  } else {
    quickActionMode.classList.add("hidden");
  }
});

// Render dropdown
function renderQuickDropdown(list = players) {
  quickActionDropdown.innerHTML = "";

  if (!list.length) {
    quickActionDropdown.innerHTML =
      `<div class="px-3 py-2 text-sm text-zinc-400">Sin resultados</div>`;
    return;
  }

  list.forEach((p) => {
    const div = document.createElement("div");
    div.className =
      "px-3 py-2 cursor-pointer hover:bg-indigo-600 hover:text-white text-sm";
    div.textContent = `${p.name} (Nivel ${p.level})`;

    div.onclick = () => {
      selectedQuickPlayerId = p._id;
      quickActionSearch.value = p.name;
      quickActionDropdown.classList.add("hidden");
    };

    quickActionDropdown.appendChild(div);
  });
}

quickActionSearch?.addEventListener("input", () => {
  const query = quickActionSearch.value.trim().toLowerCase();
  selectedQuickPlayerId = null;

  const filtered = players.filter((p) =>
    p.name.toLowerCase().includes(query)
  );

  renderQuickDropdown(filtered);
  quickActionDropdown.classList.remove("hidden");
});

quickActionSearch?.addEventListener("focus", () => {
  renderQuickDropdown(players);
  quickActionDropdown.classList.remove("hidden");
});

document.addEventListener("click", (e) => {
  if (
    !quickActionSearch.contains(e.target) &&
    !quickActionDropdown.contains(e.target)
  ) {
    quickActionDropdown.classList.add("hidden");
  }
});

// =============================================================
// APLICAR MODIFICACIÓN
// =============================================================
async function quickModifyPlayer() {
  const rawValue = quickActionAmount.value.trim();
  const type = quickActionType.value;
  const mode = quickActionMode.value;

  quickActionFeedback.textContent = "";
  quickActionFeedback.className = "mt-3 text-sm font-semibold";

  if (!selectedQuickPlayerId) {
    quickActionFeedback.textContent = "Selecciona un personaje.";
    quickActionFeedback.classList.add("text-red-400");
    return;
  }

  if (rawValue === "") {
    quickActionFeedback.textContent = "Introduce una cantidad.";
    quickActionFeedback.classList.add("text-red-400");
    return;
  }

  const amount = Number(rawValue);

  if (isNaN(amount) || amount <= 0) {
    quickActionFeedback.textContent = "La cantidad debe ser mayor que 0.";
    quickActionFeedback.classList.add("text-red-400");
    return;
  }

  try {
    const player = players.find(
      (p) => p._id === selectedQuickPlayerId
    );

    if (!player) return;

    let newValue;
    let fd = new FormData();

    // ================= EXP =================
    if (type === "exp") {

      newValue = (Number(player.exp) || 0) + amount;
      const newLevel = calculateLevelFromExp(newValue);

      fd.append("exp", newValue);
      fd.append("level", newLevel);

      await fetchJson(
        `${API_PLAYERS}/${player._id}`,
        { method: "PUT", body: fd },
        true
      );

      quickActionFeedback.textContent =
        `✅ ${player.name} recibió ${amount} EXP.`;

    }

    // ================= ORO =================
    else if (type === "gold") {

      const finalAmount = mode === "subtract" ? -amount : amount;

      await fetchJson(
        `${API_PLAYERS}/${player._id}/gold`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: finalAmount,
            mode: "add",
          }),
        },
        true
      );

      quickActionFeedback.textContent =
        `✅ ${mode === "subtract" ? "Se restaron" : "Se añadieron"} ${amount} de oro.`;

    }

    // ================= VIDA =================
    else if (type === "life") {

      const currentLife = Number(player.life) || 0;

      newValue =
        mode === "subtract"
          ? Math.max(0, currentLife - amount)
          : currentLife + amount;

      fd.append("life", newValue);

      await fetchJson(
        `${API_PLAYERS}/${player._id}`,
        { method: "PUT", body: fd },
        true
      );

      quickActionFeedback.textContent =
        `✅ ${mode === "subtract" ? "Se restaron" : "Se añadieron"} ${amount} puntos de vida.`;

    }

    // 🔥 AQUÍ REFRESCAMOS
    quickActionFeedback.classList.add("text-green-400");
    quickActionAmount.value = "";

    await refreshPlayers(true);

  } catch (err) {
    console.error(err);
    quickActionFeedback.textContent =
      "Error aplicando modificación.";
    quickActionFeedback.classList.add("text-red-400");
  }
}
 



// =============================================================
// INIT
// =============================================================
window.addEventListener("load", () => {
   refreshPlayers(true);
  initItems();
  addPreview("charImgInput", "previewCharMain");
});
