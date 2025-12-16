// =============================================================
// UI ACTIONS
// =============================================================
function toggleCreateCard() {
  const card = document.getElementById("createCard");
  if (!card) return;
  card.classList.toggle("hidden");
}

function openPlayerBoard() {
  window.open("/player/player_view.html", "_blank");
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
async function fetchJson(url, opts = {}) {
  showLoader();
  try {
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
  } finally {
    hideLoader();
  }
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
// SKILLS DINÁMICAS (CREATE)
// =============================================================
function addSkillInput(value = "") {
  const container = document.getElementById("skillsContainer");
  if (!container) return;

  if (container.children.length >= 8) {
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

  container.appendChild(div);
}

// =============================================================
// OBJETOS DINÁMICOS (CREATE)
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
      <img id="previewItem${i}" class="preview mt-3" />
    `;

    container.appendChild(div);
    addPreview(`item${i}Input`, `previewItem${i}`);
  }
}

// =============================================================
// LOAD PLAYERS
// =============================================================
async function refreshPlayers() {
  players = await fetchJson(API_PLAYERS);
  renderPlayersList();
}

function renderPlayersList() {
  const list = document.getElementById("playersList");
  list.innerHTML = "";

  players.forEach((p) => {
    list.innerHTML += `
      <div class="bg-zinc-900 border border-zinc-700 rounded-xl p-4 shadow">
        <img src="${p.img ? "data:image/jpeg;base64," + p.img : "/placeholder.png"}"
          class="w-full h-40 object-cover rounded mb-2">

        <h3 class="font-bold text-lg">${p.name} (Nivel ${p.level})</h3>
        <p>Vida: ${p.life}</p>
        <p>EXP: ${p.exp}</p>

        <div class="flex flex-wrap gap-1 mt-2">
          ${(p.skills || []).map(s =>
            `<span class="px-2 py-1 bg-zinc-800 rounded text-xs">${s}</span>`
          ).join("")}
        </div>

        <button onclick="openMasterPanel('${p._id}')"
          class="mt-3 w-full bg-green-600 p-2 rounded">
          Editar
        </button>

        <button onclick="deletePlayer('${p._id}')"
          class="mt-2 w-full bg-red-600 p-2 rounded">
          Eliminar
        </button>
      </div>
    `;
  });
}

// =============================================================
// CREATE CHARACTER
// =============================================================
async function createCharacter() {
  const name = charNameInput.value.trim();
  if (!name) return alert("Nombre obligatorio");

  const skills = [...document.querySelectorAll("#skillsContainer input")]
    .map(i => i.value.trim()).filter(Boolean);

  const fd = new FormData();
  fd.append("name", name);
  fd.append("life", charLifeInput.value);
  fd.append("milestones", charMilestonesInput.value);
  fd.append("attributes", charAttributesInput.value);
  fd.append("exp", charExpInput.value);
  fd.append("level", charLevelInput.value);
  fd.append("skills", JSON.stringify(skills));

  if (charImgInput.files[0] && validateImage(charImgInput.files[0])) {
    fd.append("charImg", charImgInput.files[0]);
  }

  for (let i = 1; i <= 6; i++) {
    const f = document.getElementById(`item${i}Input`)?.files[0];
    if (f && validateImage(f)) fd.append("items", f);
  }

  await fetchJson(API_PLAYERS, { method: "POST", body: fd });
  toggleCreateCard();
  refreshPlayers();
}

// =============================================================
// EDIT PLAYER (MISMO DISEÑO)
// =============================================================
async function openMasterPanel(id) {
  const player = players.find(p => p._id === id);
  if (!player) return;

  const modal = document.createElement("div");
  modal.className =
    "fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4";

  modal.innerHTML = `
    <div class="bg-zinc-900 border border-zinc-700 rounded-3xl shadow-2xl
                w-full max-w-4xl p-8 overflow-y-auto">

      <h2 class="text-2xl font-bold text-amber-400 mb-6 text-center">
        Editar personaje
      </h2>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div><label class="label">Nombre</label><input id="editName" class="input" value="${player.name}"></div>
        <div><label class="label">Salud</label><input id="editLife" type="number" class="input" value="${player.life}"></div>
        <div><label class="label">Hitos</label><input id="editMilestones" class="input" value="${player.milestones || ""}"></div>
        <div><label class="label">Características</label><input id="editAttributes" class="input" value="${player.attributes || ""}"></div>
        <div><label class="label">Experiencia</label><input id="editExp" type="number" class="input" value="${player.exp}"></div>
        <div><label class="label">Nivel</label><input id="editLevel" type="number" class="input" value="${player.level}"></div>
      </div>

      <div class="mt-8">
        <label class="label text-sky-400">Habilidades (máx. 8)</label>
        <div id="editSkillsContainer" class="space-y-2 mt-2"></div>
        <button id="addEditSkillBtn"
          class="mt-3 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700">
          ➕ Añadir habilidad
        </button>
      </div>

      <div class="mt-10 flex gap-4">
        <button id="saveEditBtn"
          class="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-700 font-bold">
          Guardar
        </button>
        <button id="closeEditBtn"
          class="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 font-bold">
          Cerrar
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const skillsContainer = document.getElementById("editSkillsContainer");
  (player.skills || []).forEach(s => addEditSkill(s));

  function addEditSkill(value = "") {
    if (skillsContainer.children.length >= 8) return;
    const div = document.createElement("div");
    div.className = "relative";
    div.innerHTML = `
      <input class="input pr-10" value="${value}">
      <button onclick="this.parentElement.remove()"
        class="absolute right-2 top-1/2 -translate-y-1/2
               px-2 py-1 rounded bg-red-600 hover:bg-red-700 font-bold">✕</button>
    `;
    skillsContainer.appendChild(div);
  }

  document.getElementById("addEditSkillBtn").onclick = () => addEditSkill();
  document.getElementById("closeEditBtn").onclick = () => modal.remove();

  document.getElementById("saveEditBtn").onclick = async () => {
    const skills = [...skillsContainer.querySelectorAll("input")]
      .map(i => i.value.trim()).filter(Boolean);

    const fd = new FormData();
    fd.append("name", editName.value);
    fd.append("life", editLife.value);
    fd.append("milestones", editMilestones.value);
    fd.append("attributes", editAttributes.value);
    fd.append("exp", editExp.value);
    fd.append("level", editLevel.value);
    fd.append("skills", JSON.stringify(skills));

    await fetchJson(`${API_PLAYERS}/${id}`, { method: "PUT", body: fd });
    modal.remove();
    refreshPlayers();
  };
}

// =============================================================
// DELETE
// =============================================================
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


