// =============================================================
// STATE
// =============================================================
let formMode = "create"; // "create" | "edit"
let editingPlayerId = null;
let lastSignature = "";

// 🔥 objetos a borrar
let itemsToDelete = [];


// =============================================================
// XP SYSTEM (BASE 100 +40 POR NIVEL)
// =============================================================
const BASE_EXP = 100;
const EXP_STEP = 40;

function calculateLevelFromExp(totalExp) {
  totalExp = Number(totalExp) || 0;

  let level = 1;
  let expUsed = 0;

  while (true) {
    const expForNextLevel = BASE_EXP + (level - 1) * EXP_STEP;
    if (totalExp < expUsed + expForNextLevel) return level;
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
    : "https://chikaku-d-d-backend-pbe.onrender.com";

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

function addPreview(inputId, previewId) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  if (!input || !preview) return;

  input.onchange = () => {
    const file = input.files[0];
    if (!validateImage(file)) {
      input.value = "";
      preview.removeAttribute("src");
      preview.classList.add("hidden");
      return;
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
  if (!container || container.children.length >= 8) return;

  const div = document.createElement("div");
  div.className = "relative";
  div.innerHTML = `
    <input class="input pr-10" value="${value}">
    <button type="button"
      onclick="this.parentElement.remove()"
      class="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded bg-red-600">
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
      <label>Objeto ${i}</label>
      <input id="item${i}Input" type="file">
      <textarea id="item${i}Desc" rows="2"></textarea>
      <img id="previewItem${i}" class="hidden">
      <button id="deleteItemBtn${i}"
        type="button"
        onclick="deleteItemImage(${i})"
        class="hidden bg-red-600 mt-1">
        🗑️ Eliminar imagen
      </button>
    `;
    container.appendChild(div);
    addPreview(`item${i}Input`, `previewItem${i}`);
  }
}


// =============================================================
// BORRAR IMAGEN DE OBJETO
// =============================================================
function deleteItemImage(index) {
  const preview = document.getElementById(`previewItem${index}`);
  const input = document.getElementById(`item${index}Input`);
  const btn = document.getElementById(`deleteItemBtn${index}`);

  preview?.removeAttribute("src");
  preview?.classList.add("hidden");
  if (input) input.value = "";

  if (!itemsToDelete.includes(index - 1)) {
    itemsToDelete.push(index - 1);
  }

  btn?.classList.add("hidden");
}


// =============================================================
// PLAYERS LIST
// =============================================================
async function refreshPlayers(force = false) {
  const data = await fetchJson(API_PLAYERS);
  const signature = data.map(p => `${p._id}:${p.updatedAt}`).join("|");
  if (!force && signature === lastSignature) return;

  lastSignature = signature;
  players = data;
  renderPlayersList();
}

function renderPlayersList() {
  const list = document.getElementById("playersList");
  list.innerHTML = "";

  players.forEach(p => {
    const card = document.createElement("div");
    card.innerHTML = `
      <img src="${p.img || "/placeholder.png"}">
      <h3>${p.name}</h3>
      <button onclick="editPlayer('${p._id}')">Editar</button>
      <button onclick="deletePlayer('${p._id}')">Eliminar</button>
    `;
    list.appendChild(card);
  });
}


// =============================================================
// EDIT PLAYER
// =============================================================
function editPlayer(id) {
  const player = players.find(p => p._id === id);
  if (!player) return;

  formMode = "edit";
  editingPlayerId = id;
  itemsToDelete = [];

  toggleCreateCard(true);
  submitCharacterBtn.textContent = "✏️ Guardar cambios";

  charNameInput.value = player.name || "";
  charLifeInput.value = player.life ?? 10;
  charExpInput.value = player.exp ?? 0;

  skillsContainer.innerHTML = "";
  (player.skills || []).forEach(addSkillInput);

  initItems();

  // 🔥 limpiar inputs file SIEMPRE
  for (let i = 1; i <= 6; i++) {
    const input = document.getElementById(`item${i}Input`);
    if (input) input.value = "";
  }

  (player.items || []).forEach((img, i) => {
    const p = document.getElementById(`previewItem${i + 1}`);
    const btn = document.getElementById(`deleteItemBtn${i + 1}`);
    if (p && img) {
      p.src = img;
      p.classList.remove("hidden");
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
  const fd = new FormData();

  fd.append("name", charNameInput.value);
  fd.append("life", charLifeInput.value);
  fd.append("exp", charExpInput.value);
  fd.append("level", calculateLevelFromExp(charExpInput.value));

  const skills = [...document.querySelectorAll("#skillsContainer input")]
    .map(i => i.value.trim()).filter(Boolean);
  fd.append("skills", JSON.stringify(skills));

  const itemDescriptions = [];
  for (let i = 1; i <= 6; i++) {
    itemDescriptions.push(
      document.getElementById(`item${i}Desc`)?.value.trim() || ""
    );
  }
  fd.append("itemDescriptions", JSON.stringify(itemDescriptions.slice(0, 6)));
  fd.append("itemsToDelete", JSON.stringify(itemsToDelete));

  if (charImgInput.files[0] && validateImage(charImgInput.files[0])) {
    fd.append("charImg", charImgInput.files[0]);
  }

  for (let i = 1; i <= 6; i++) {
    const f = document.getElementById(`item${i}Input`)?.files[0];
    if (f && validateImage(f)) fd.append("items", f);
  }

  const url = formMode === "create"
    ? API_PLAYERS
    : `${API_PLAYERS}/${editingPlayerId}`;

  await fetchJson(url, { method: formMode === "create" ? "POST" : "PUT", body: fd }, true);

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
  itemsToDelete = [];
  submitCharacterBtn.textContent = "🐉 Crear personaje";
  skillsContainer.innerHTML = "";
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
