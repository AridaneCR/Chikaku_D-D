// =============================================================
// STATE
// =============================================================
let formMode = "create"; // "create" | "edit"
let editingPlayerId = null;
let lastSignature = "";

// =============================================================
// XP SYSTEM (ACUMULATIVO REAL)
// =============================================================

const BASE_EXP = 100;
const EXP_GROWTH = 1.08;

function expForLevel(level) {
  return BASE_EXP * Math.pow(EXP_GROWTH, level - 1);
}

function calculateLevelFromExp(totalExp) {
  let level = 1;
  let accumulated = 0;

  while (true) {
    const needed = expForLevel(level);
    if (totalExp < accumulated + needed) break;
    accumulated += needed;
    level++;
  }

  return level;
}

function expProgressPercent(totalExp) {
  let level = calculateLevelFromExp(totalExp);
  let accumulated = 0;

  for (let i = 1; i < level; i++) {
    accumulated += expForLevel(i);
  }

  const current = totalExp - accumulated;
  const needed = expForLevel(level);

  return Math.min(100, (current / needed) * 100);
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
    const res = await fetch(url, opts);
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
      class="absolute right-2 top-1/2 -translate-y-1/2
             px-2 py-1 rounded bg-red-600 hover:bg-red-700 font-bold">✕</button>
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
      <img id="previewItem${i}" class="preview mt-3" />
    `;
    container.appendChild(div);
    addPreview(`item${i}Input`, `previewItem${i}`);
  }
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
    const level = calculateLevelFromExp(p.exp);
    const percent = expProgressPercent(p.exp);

    const card = document.createElement("div");
    card.className =
      "bg-zinc-900 border border-zinc-700 rounded-xl p-4 shadow flex flex-col";

    card.innerHTML = `
      <img src="${p.img || "/placeholder.png"}"
        class="w-full h-40 object-cover rounded mb-2">

      <h3 class="font-bold text-lg">
        ${p.name} (Nivel ${level})
      </h3>

      <p>⭐ EXP total: ${Math.floor(p.exp)}</p>

      <div class="bg-zinc-700 h-2 rounded mt-2 overflow-hidden">
        <div class="bg-green-500 h-2" style="width:${percent}%"></div>
      </div>

      <div class="mt-auto">
        <button onclick="editPlayer('${p._id}')"
          class="mt-3 w-full bg-green-600 p-2 rounded">Editar</button>
        <button onclick="deletePlayer('${p._id}')"
          class="mt-2 w-full bg-red-600 p-2 rounded">Eliminar</button>
      </div>
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
  toggleCreateCard(true);
  submitCharacterBtn.textContent = "✏️ Guardar cambios";

  charNameInput.value = player.name || "";
  charLifeInput.value = player.life ?? 10;
  charMilestonesInput.value = player.milestones || "";
  charAttributesInput.value = player.attributes || "";
  charExpInput.value = player.exp ?? 0;

  skillsContainer.innerHTML = "";
  (player.skills || []).forEach(addSkillInput);

  initItems();
}

// =============================================================
// CREATE / EDIT
// =============================================================

async function submitCharacter() {
  const name = charNameInput.value.trim();
  if (!name) return;

  const skills = [...document.querySelectorAll("#skillsContainer input")]
    .map(i => i.value.trim()).filter(Boolean);

  const itemDescriptions = [];
  for (let i = 1; i <= 6; i++) {
    itemDescriptions.push(
      document.getElementById(`item${i}Desc`)?.value.trim() || ""
    );
  }

  const fd = new FormData();
  fd.append("name", name);
  fd.append("life", charLifeInput.value);
  fd.append("milestones", charMilestonesInput.value);
  fd.append("attributes", charAttributesInput.value);
  fd.append("exp", charExpInput.value); // 🔥 SOLO EXP
  fd.append("skills", JSON.stringify(skills));
  fd.append("itemDescriptions", JSON.stringify(itemDescriptions));

  if (charImgInput.files[0] && validateImage(charImgInput.files[0])) {
    fd.append("charImg", charImgInput.files[0]);
  }

  for (let i = 1; i <= 6; i++) {
    const f = document.getElementById(`item${i}Input`)?.files[0];
    if (f && validateImage(f)) fd.append("items", f);
  }

  let updatedPlayer;

  if (formMode === "create") {
    updatedPlayer = await fetchJson(API_PLAYERS, { method: "POST", body: fd }, true);
    players.unshift(updatedPlayer);
  } else {
    updatedPlayer = await fetchJson(
      `${API_PLAYERS}/${editingPlayerId}`,
      { method: "PUT", body: fd },
      true
    );
    const i = players.findIndex(p => p._id === editingPlayerId);
    if (i !== -1) players[i] = updatedPlayer;
  }

  renderPlayersList();
  resetForm();
  toggleCreateCard();

  setTimeout(() => {
    lastSignature = "";
    refreshPlayers(true);
  }, 1500);
}

// =============================================================
// DELETE
// =============================================================

async function deletePlayer(id) {
  if (!confirm("¿Eliminar personaje?")) return;
  await fetchJson(`${API_PLAYERS}/${id}`, { method: "DELETE" }, true);
  lastSignature = "";
  refreshPlayers(true);
}

// =============================================================
// RESET
// =============================================================

function resetForm() {
  formMode = "create";
  editingPlayerId = null;
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
