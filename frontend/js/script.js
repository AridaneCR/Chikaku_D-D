// =============================================================
// STATE
// =============================================================
let formMode = "create";
let editingPlayerId = null;
let lastSignature = "";

// =============================================================
// TOAST SYSTEM
// =============================================================
function showToast(message, type = "info") {
  const colors = {
    success: "bg-green-600",
    info: "bg-indigo-600",
    warning: "bg-yellow-600",
    error: "bg-red-600",
  };

  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.className =
      "fixed top-5 right-5 z-50 flex flex-col gap-3";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `
    ${colors[type] || colors.info}
    text-white px-4 py-3 rounded-xl shadow-xl
    font-semibold animate-fade-in
  `;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("opacity-0");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
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
  window.__env?.API_URL ||
  "https://chikaku-d-d-backend-pbe.onrender.com";

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
  if (!ALLOWED_TYPES.includes(file.type)) {
    showToast("Formato de imagen no válido", "warning");
    return false;
  }
  if (file.size > MAX_IMAGE_SIZE) {
    showToast("Imagen mayor de 2MB", "warning");
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
  if (!container || container.children.length >= 8) return;

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
  const data = await fetchJson(
    API_PLAYERS,
    force ? { headers: { "Cache-Control": "no-cache" } } : {}
  );

  const signature = data.map(p => `${p._id}:${p.updatedAt}`).join("|");
  if (signature === lastSignature) return;

  lastSignature = signature;
  players = data;
  renderPlayersList();
}

function renderPlayersList() {
  const list = document.getElementById("playersList");
  list.innerHTML = "";

  players.forEach(p => {
    list.innerHTML += `
      <div class="bg-zinc-900 border border-zinc-700 rounded-xl p-4 shadow flex flex-col">
        <img src="${p.img || "/placeholder.png"}"
          class="w-full h-40 object-cover rounded mb-2">

        <h3 class="font-bold text-lg">${p.name} (Nivel ${p.level})</h3>
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
      </div>
    `;
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
  charLevelInput.value = player.level ?? 1;

  skillsContainer.innerHTML = "";
  (player.skills || []).forEach(addSkillInput);

  charImgInput.value = "";
  if (player.img) {
    previewCharMain.src = player.img;
    previewCharMain.classList.remove("hidden");
  }

  initItems();
  (player.items || []).forEach((img, i) => {
    const p = document.getElementById(`previewItem${i + 1}`);
    if (p && img) {
      p.src = img;
      p.classList.remove("hidden");
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
  const name = charNameInput.value.trim();
  if (!name) return showToast("Nombre obligatorio", "warning");

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
    await fetchJson(API_PLAYERS, { method: "POST", body: fd }, true);
    showToast("Personaje creado", "success");
  } else {
    await fetchJson(`${API_PLAYERS}/${editingPlayerId}`, {
      method: "PUT",
      body: fd
    }, true);
    showToast("Personaje editado", "info");
  }

  resetForm();
  toggleCreateCard();
  lastSignature = "";
  refreshPlayers(true);
}

// =============================================================
// DELETE
// =============================================================
async function deletePlayer(id) {
  if (!confirm("¿Eliminar personaje?")) return;
  await fetchJson(`${API_PLAYERS}/${id}`, { method: "DELETE" }, true);
  showToast("Personaje eliminado", "error");
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
  charLevelInput.value = 1;

  skillsContainer.innerHTML = "";
  charImgInput.value = "";
  previewCharMain.classList.add("hidden");

  initItems();
}

// =============================================================
// INIT
// =============================================================
window.addEventListener("load", () => {
  refreshPlayers();
  initItems();
  addPreview("charImgInput", "previewCharMain");
});
