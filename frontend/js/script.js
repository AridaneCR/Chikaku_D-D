// =============================================================
// STATE
// =============================================================
let formMode = "create"; // "create" | "edit"
let editingPlayerId = null;
let lastSignature = "";

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
// DOM REFERENCES (CRÍTICO)
// =============================================================
const charNameInput = document.getElementById("charNameInput");
const charLifeInput = document.getElementById("charLifeInput");
const charMilestonesInput = document.getElementById("charMilestonesInput");
const charAttributesInput = document.getElementById("charAttributesInput");
const charExpInput = document.getElementById("charExpInput");
const charLevelInput = document.getElementById("charLevelInput");

const charImgInput = document.getElementById("charImgInput");
const previewCharMain = document.getElementById("previewCharMain");

const skillsContainer = document.getElementById("skillsContainer");
const submitCharacterBtn = document.getElementById("submitCharacterBtn");

const playersList = document.getElementById("playersList");
const createCard = document.getElementById("createCard");

// =============================================================
// UI ACTIONS
// =============================================================
function toggleCreateCard(forceOpen = false) {
  if (!createCard) return;
  if (forceOpen) {
    createCard.classList.remove("hidden");
    createCard.scrollIntoView({ behavior: "smooth" });
  } else {
    createCard.classList.toggle("hidden");
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
// FETCH
// =============================================================
async function fetchJson(url, opts = {}) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// =============================================================
// IMÁGENES
// =============================================================
function validateImage(file) {
  if (!file) return true;
  if (!ALLOWED_TYPES.includes(file.type)) {
    alert("Solo PNG, JPG, JPEG o WEBP");
    return false;
  }
  if (file.size > MAX_IMAGE_SIZE) {
    alert("Máx 2MB");
    return false;
  }
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
  if (!skillsContainer) return;
  if (skillsContainer.children.length >= 8) {
    alert("Máximo 8 habilidades");
    return;
  }

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
  skillsContainer.appendChild(div);
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
      <textarea id="item${i}Desc"
        class="input mt-2 resize-none"
        rows="2"
        placeholder="Descripción del objeto..."></textarea>
      <img id="previewItem${i}" class="preview mt-3 hidden" />
    `;

    container.appendChild(div);
    addPreview(`item${i}Input`, `previewItem${i}`);
  }
}

// =============================================================
// PLAYERS LIST (OPTIMIZADA)
// =============================================================
async function refreshPlayers() {
  const data = await fetchJson(API_PLAYERS);
  if (!Array.isArray(data)) return;

  const signature = data.map(p => `${p._id}:${p.updatedAt}`).join("|");
  if (signature === lastSignature) return;

  lastSignature = signature;
  players = data;
  renderPlayersList();
}

function renderPlayersList() {
  playersList.innerHTML = "";
  const frag = document.createDocumentFragment();

  players.forEach(p => {
    const skills = Array.isArray(p.skills) ? p.skills : [];

    const card = document.createElement("div");
    card.className =
      "bg-zinc-900 border border-zinc-700 rounded-xl p-4 shadow flex flex-col";

    card.innerHTML = `
      <img loading="lazy"
        src="${p.img ? "data:image/jpeg;base64," + p.img : "/placeholder.png"}"
        class="w-full h-40 object-cover rounded mb-2">

      <h3 class="font-bold text-lg truncate">
        ${p.name} (Nivel ${p.level})
      </h3>

      <p>❤️ Vida: ${p.life}</p>
      <p>⭐ EXP: ${p.exp}</p>

      ${
        skills.length
          ? `<div class="flex flex-wrap gap-1 mt-2">
              ${skills.map(s =>
                `<span class="px-2 py-1 bg-zinc-800 rounded text-xs">${s}</span>`
              ).join("")}
            </div>`
          : ""
      }

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

    frag.appendChild(card);
  });

  playersList.appendChild(frag);
}

// =============================================================
// EDIT PLAYER  ✅ FIX DEFINITIVO
// =============================================================
function editPlayer(id) {
  const player = players.find(p => p._id === id);
  if (!player) return;

  formMode = "edit";
  editingPlayerId = id;
  toggleCreateCard(true);

  submitCharacterBtn.innerText = "💾 Guardar cambios";

  charNameInput.value = player.name || "";
  charLifeInput.value = player.life ?? 10;
  charMilestonesInput.value = player.milestones || "";
  charAttributesInput.value = player.attributes || "";
  charExpInput.value = player.exp ?? 0;
  charLevelInput.value = player.level ?? 1;

  skillsContainer.innerHTML = "";
  (player.skills || []).forEach(s => addSkillInput(s));

  initItems();

  (player.items || []).forEach((img, i) => {
    const p = document.getElementById(`previewItem${i + 1}`);
    if (p && img) {
      p.src = "data:image/jpeg;base64," + img;
      p.classList.remove("hidden");
    }
  });

  (player.itemDescriptions || []).forEach((d, i) => {
    const t = document.getElementById(`item${i + 1}Desc`);
    if (t) t.value = d;
  });

  if (player.img) {
    previewCharMain.src = "data:image/jpeg;base64," + player.img;
    previewCharMain.classList.remove("hidden");
  }
}

// =============================================================
// CREATE / UPDATE
// =============================================================
async function submitCharacter() {
  const name = charNameInput.value.trim();
  if (!name) return alert("Nombre obligatorio");

  const skills = [...skillsContainer.querySelectorAll("input")]
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
  fd.append("exp", charExpInput.value);
  fd.append("level", charLevelInput.value);
  fd.append("skills", JSON.stringify(skills));
  fd.append("itemDescriptions", JSON.stringify(itemDescriptions));

  if (charImgInput.files[0] && validateImage(charImgInput.files[0])) {
    fd.append("charImg", charImgInput.files[0]);
  }

  for (let i = 1; i <= 6; i++) {
    const f = document.getElementById(`item${i}Input`)?.files[0];
    if (f && validateImage(f)) fd.append("items", f);
  }

  if (formMode === "create") {
    await fetchJson(API_PLAYERS, { method: "POST", body: fd });
  } else {
    await fetchJson(`${API_PLAYERS}/${editingPlayerId}`, {
      method: "PUT",
      body: fd
    });
  }

  resetForm();
  toggleCreateCard();
  refreshPlayers();
}

// =============================================================
// RESET / DELETE
// =============================================================
function resetForm() {
  formMode = "create";
  editingPlayerId = null;

  charNameInput.value = "";
  charLifeInput.value = 10;
  charMilestonesInput.value = "";
  charAttributesInput.value = "";
  charExpInput.value = 0;
  charLevelInput.value = 1;

  skillsContainer.innerHTML = "";
  charImgInput.value = "";
  previewCharMain.classList.add("hidden");

  initItems();
}

async function deletePlayer(id) {
  if (!confirm("¿Eliminar personaje?")) return;
  await fetchJson(`${API_PLAYERS}/${id}`, { method: "DELETE" });
  refreshPlayers();
}

// =============================================================
// INIT
// =============================================================
window.addEventListener("load", () => {
  refreshPlayers();
  initItems();
  addPreview("charImgInput", "previewCharMain");
});
