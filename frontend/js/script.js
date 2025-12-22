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
// UI ACTIONS
// =============================================================
function openCreateForm() {
  document.getElementById("createCard")?.classList.remove("hidden");
}

function closeCreateForm() {
  document.getElementById("createCard")?.classList.add("hidden");
}

function openPlayerBoard() {
  window.open("/player/player_view.html", "_blank");
}

// 🔥 NOTIFICACIÓN GLOBAL (SINCRONIZA PLAYER)
function notifyPlayersUpdate() {
  localStorage.setItem("players_updated", Date.now().toString());
}

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
  } catch (err) {
    alert("❌ Error de comunicación con el servidor");
    throw err;
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
    alert("Solo PNG, JPG, JPEG o WEBP");
    return false;
  }
  if (file.size > MAX_IMAGE_SIZE) {
    alert("Máximo 2MB");
    return false;
  }
  return true;
}

// =============================================================
// HABILIDADES (CREATE)
// =============================================================
function addSkillInput(value = "") {
  const container = document.getElementById("skillsContainer");
  if (!container || container.children.length >= 8) return;

  const div = document.createElement("div");
  div.className = "flex gap-2";

  div.innerHTML = `
    <input class="input flex-1" value="${value}">
    <button onclick="this.parentElement.remove()"
      class="px-3 rounded bg-red-600 hover:bg-red-700 font-bold">✕</button>
  `;

  container.appendChild(div);
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

  players.forEach(p => {
    list.innerHTML += `
      <div class="bg-zinc-900 border border-zinc-700 rounded-xl p-4 shadow">
        <img src="${p.img ? `data:image/jpeg;base64,${p.img}` : "/placeholder.png"}"
          class="w-full h-40 object-cover rounded mb-2">

        <h3 class="font-bold text-lg">${p.name} (Nivel ${p.level})</h3>
        <p>❤️ Vida: ${p.life}</p>
        <p>⭐ EXP: ${p.exp}</p>

        <div class="flex flex-wrap gap-1 mt-2">
          ${(p.skills || []).map(s =>
            `<span class="px-2 py-1 bg-zinc-800 rounded text-xs">${s}</span>`
          ).join("")}
        </div>

        <button onclick="editPlayer('${p._id}')"
          class="mt-3 w-full bg-green-600 p-2 rounded">Editar</button>

        <button onclick="deletePlayer('${p._id}')"
          class="mt-2 w-full bg-red-600 p-2 rounded">Eliminar</button>
      </div>
    `;
  });
}

// =============================================================
// CREATE CHARACTER
// =============================================================
async function submitCharacter() {
  try {
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

    notifyPlayersUpdate();
    closeCreateForm();
    refreshPlayers();

    alert("✅ Personaje creado correctamente");
  } catch {}
}

// =============================================================
// DELETE PLAYER
// =============================================================
async function deletePlayer(id) {
  if (!confirm("¿Eliminar personaje?")) return;

  await fetchJson(`${API_PLAYERS}/${id}`, { method: "DELETE" });
  notifyPlayersUpdate();
  refreshPlayers();

  alert("🗑️ Personaje eliminado");
}

// =============================================================
// INIT
// =============================================================
window.addEventListener("load", () => {
  refreshPlayers();
  addSkillInput();
});
