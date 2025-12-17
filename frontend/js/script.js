// =============================================================
// STATE
// =============================================================
let formMode = "create"; // "create" | "edit"
let editingPlayerId = null;

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
// SKILLS
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
// OBJETOS + DESCRIPCIÓN
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

      <textarea
        id="item${i}Desc"
        class="input mt-2 resize-none"
        rows="2"
        placeholder="Descripción del objeto..."></textarea>

      <img id="previewItem${i}" class="preview mt-3" />
    `;

    container.appendChild(div);
    addPreview(`item${i}Input`, `previewItem${i}`);
  }
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
    const skills = p.skills?.length
      ? p.skills
      : [p.skill1, p.skill2].filter(Boolean);

    list.innerHTML += `
      <div class="bg-zinc-900 border border-zinc-700 rounded-xl p-4 shadow">
        <img src="${p.img ? "data:image/jpeg;base64," + p.img : "/placeholder.png"}"
          class="w-full h-40 object-cover rounded mb-2">

        <h3 class="font-bold text-lg">${p.name} (Nivel ${p.level})</h3>
        <p>Vida: ${p.life}</p>
        <p>EXP: ${p.exp}</p>

        <div class="flex flex-wrap gap-1 mt-2">
          ${skills.map(s =>
            `<span class="px-2 py-1 bg-zinc-800 rounded text-xs">${s}</span>`
          ).join("")}
        </div>

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
  });
}

// =============================================================
// CREATE / EDIT SUBMIT
// =============================================================
async function submitCharacter() {
  const name = charNameInput.value.trim();
  if (!name) return alert("Nombre obligatorio");

  const skills = [...document.querySelectorAll("#skillsContainer input")]
    .map(i => i.value.trim())
    .filter(Boolean);

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
// EDIT PLAYER (🔥 FIX DEFINITIVO)
// =============================================================
function editPlayer(id) {
  const player = players.find(p => p._id === id);
  if (!player) return;

  formMode = "edit";
  editingPlayerId = id;

  toggleCreateCard(true);

  document.querySelector("#createCard h2").innerText = "Editar personaje";
  submitCharacterBtn.innerText = "💾 Guardar cambios";

  charNameInput.value = player.name;
  charLifeInput.value = player.life;
  charMilestonesInput.value = player.milestones || "";
  charAttributesInput.value = player.attributes || "";
  charExpInput.value = player.exp ?? 0;
  charLevelInput.value = player.level ?? 1;

  // ===== HABILIDADES (LEGACY + NUEVAS) =====
  skillsContainer.innerHTML = "";
  const skills = player.skills?.length
    ? player.skills
    : [player.skill1, player.skill2].filter(Boolean);

  skills.forEach(s => addSkillInput(s));

  // ===== OBJETOS =====
  initItems();

  if (Array.isArray(player.items)) {
    player.items.forEach((img, i) => {
      const preview = document.getElementById(`previewItem${i + 1}`);
      if (preview && img) {
        preview.src = "data:image/jpeg;base64," + img;
        preview.classList.remove("hidden");
      }
    });
  }

  if (Array.isArray(player.itemDescriptions)) {
    player.itemDescriptions.forEach((desc, i) => {
      const el = document.getElementById(`item${i + 1}Desc`);
      if (el) el.value = desc;
    });
  }

  if (player.img) {
    previewCharMain.src = "data:image/jpeg;base64," + player.img;
    previewCharMain.classList.remove("hidden");
  }
}

// =============================================================
// RESET FORM
// =============================================================
function resetForm() {
  formMode = "create";
  editingPlayerId = null;

  document.querySelector("#createCard h2").innerText = "Crear nuevo personaje";
  submitCharacterBtn.innerText = "🐉 Crear personaje";

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
