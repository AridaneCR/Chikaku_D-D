// =============================================================
// CONFIG
// =============================================================

const BASE_URL = (window.__env && window.__env.API_URL)
  ? window.__env.API_URL
  : "https://chikaku-d-d-ptyl.onrender.com";

const API_PLAYERS = `${BASE_URL}/api/players`;
const PASS = "dragon";
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
// VALIDACIÓN IMÁGENES
// =============================================================
function validateImage(file) {
  if (!file) return true;
  if (!ALLOWED_TYPES.includes(file.type)) {
    alert("Solo PNG, JPG, JPEG o WEBP.");
    return false;
  }
  if (file.size > MAX_IMAGE_SIZE) {
    alert("Máx 2 MB.");
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
// SKILLS DINÁMICAS (MÁX 8)
// =============================================================
function addSkillInput(value = "") {
  const container = document.getElementById("skillsContainer");
  if (!container) return;

  if (container.children.length >= 8) {
    alert("Máximo 8 habilidades");
    return;
  }

  const div = document.createElement("div");
  div.className = "flex gap-2";

  div.innerHTML = `
    <input type="text"
      value="${value}"
      placeholder="Habilidad"
      class="w-full px-3 py-2 rounded bg-zinc-800 border border-zinc-700 text-white">
    <button type="button"
      onclick="this.parentElement.remove()"
      class="px-3 rounded bg-red-600 hover:bg-red-700 font-bold">
      ✕
    </button>
  `;

  container.appendChild(div);
}

function addEditSkillInput(value = "") {
  const container = document.getElementById("editSkillsContainer");
  if (!container || container.children.length >= 8) return;

  const div = document.createElement("div");
  div.className = "flex gap-2";

  div.innerHTML = `
    <input type="text"
      value="${value}"
      class="w-full px-3 py-2 rounded bg-zinc-800 border border-zinc-700 text-white">
    <button type="button"
      onclick="this.parentElement.remove()"
      class="px-3 rounded bg-red-600 hover:bg-red-700 font-bold">
      ✕
    </button>
  `;

  container.appendChild(div);
}

// =============================================================
// PLAYERS LIST
// =============================================================
async function refreshPlayers() {
  players = await fetchJson(API_PLAYERS);
  renderPlayersList();
}

function renderPlayersList() {
  const list = document.getElementById("playersList");
  list.innerHTML = "";

  players.forEach(p => {
    list.innerHTML += `
      <div class="bg-stone-700 p-4 rounded-xl w-64 shadow">
        <img src="${p.img ? "data:image/jpeg;base64," + p.img : "/placeholder.png"}"
          class="w-full h-40 object-cover rounded mb-2">

        <h3 class="font-bold text-lg">${p.name} (Nivel ${p.level})</h3>
        <p>Vida: ${p.life}</p>
        <p>EXP: ${p.exp}</p>

        <div class="mt-2 flex flex-wrap gap-1">
          ${(p.skills || []).map(s => `
            <span class="px-2 py-1 bg-zinc-800 rounded text-xs">${s}</span>
          `).join("")}
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
  const name = document.getElementById("charNameInput").value.trim();
  if (!name) return alert("Nombre obligatorio");

  const skills = Array.from(
    document.querySelectorAll("#skillsContainer input")
  ).map(i => i.value.trim()).filter(Boolean);

  const fd = new FormData();
  fd.append("name", name);
  fd.append("life", charLifeInput.value);
  fd.append("milestones", charMilestonesInput.value);
  fd.append("attributes", charAttributesInput.value);
  fd.append("exp", charExpInput.value);
  fd.append("level", charLevelInput.value);
  fd.append("skills", JSON.stringify(skills));

  const img = charImgInput.files[0];
  if (img && validateImage(img)) fd.append("charImg", img);

  for (let i = 1; i <= 6; i++) {
    const f = document.getElementById(`item${i}Input`)?.files[0];
    if (f && validateImage(f)) fd.append("items", f);
  }

  await fetchJson(API_PLAYERS, { method: "POST", body: fd });
  alert("Personaje creado");
  toggleCreateCard();
  refreshPlayers();
}

// =============================================================
// EDIT PLAYER
// =============================================================
async function openMasterPanel(id) {
  const player = players.find(p => p._id === id);
  if (!player) return;

  const modal = document.createElement("div");
  modal.className = "fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50";

  modal.innerHTML = `
    <div class="bg-stone-900 p-6 rounded-xl w-[480px] max-h-[90vh] overflow-y-auto">
      <h2 class="text-2xl font-bold mb-3 text-center">Editar ${player.name}</h2>

      <input id="editName" value="${player.name}" class="w-full p-2 rounded text-black mb-2">
      <input id="editLevel" type="number" value="${player.level}" class="w-full p-2 rounded text-black mb-2">
      <input id="editLife" type="number" value="${player.life}" class="w-full p-2 rounded text-black mb-2">
      <input id="editExp" type="number" value="${player.exp}" class="w-full p-2 rounded text-black mb-2">

      <h3 class="font-bold mt-3">Habilidades</h3>
      <div id="editSkillsContainer" class="space-y-2 mb-2"></div>
      <button id="addEditSkillBtn" class="bg-zinc-800 px-3 py-2 rounded">
        ➕ Añadir habilidad
      </button>

      <button id="saveEditBtn"
        class="mt-4 w-full bg-green-600 p-2 rounded">
        Guardar
      </button>

      <button onclick="this.closest('.fixed').remove()"
        class="mt-2 w-full bg-red-600 p-2 rounded">
        Cerrar
      </button>
    </div>
  `;

  document.body.appendChild(modal);

  (player.skills || []).forEach(s => addEditSkillInput(s));
  document.getElementById("addEditSkillBtn").onclick = () => addEditSkillInput();

  document.getElementById("saveEditBtn").onclick = async () => {
    const skills = Array.from(
      document.querySelectorAll("#editSkillsContainer input")
    ).map(i => i.value.trim()).filter(Boolean);

    const fd = new FormData();
    fd.append("name", editName.value);
    fd.append("life", editLife.value);
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
  addSkillInput(); // primera habilidad por defecto
});
