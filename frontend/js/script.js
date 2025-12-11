// =============================================================
// CONFIG
// =============================================================

// Cargar API_URL desde config.js o fallback a Render
const BASE_URL = (window.__env && window.__env.API_URL)
  ? window.__env.API_URL
  : "https://chikaku-d-d-ptyl.onrender.com";

const API_PLAYERS = `${BASE_URL}/api/players`;

const PASS = "dragon";
let players = [];

// Backend NO usa campañas → siempre "default"
let currentCampaign = { name: "default" };

// Validaciones
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
// FETCH HELPER
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
// VALIDACIÓN + PREVIEW IMÁGENES
// =============================================================
function validateImage(file) {
  if (!file) return true;
  if (!ALLOWED_TYPES.includes(file.type)) {
    alert("Solo se permiten PNG, JPG, JPEG o WEBP.");
    return false;
  }
  if (file.size > MAX_IMAGE_SIZE) {
    alert("La imagen supera los 2 MB.");
    return false;
  }
  return true;
}

function addPreview(inputId, previewId) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  if (!input || !preview) return;

  input.onchange = () => {
    const file = input.files?.[0];
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
// REFRESH / RENDER LIST
// =============================================================
async function refreshPlayers() {
  try {
    players = await fetchJson(API_PLAYERS);
    renderPlayersList();
  } catch (e) {
    console.error("Error cargando jugadores:", e);
  }
}

// =============================================================
// NUEVO DISEÑO MODERNO DE TARJETAS
// =============================================================
function renderPlayersList() {
  const list = document.getElementById("playersList");
  list.innerHTML = "";

  players.forEach((p) => {
    const img = p.img
      ? `data:image/jpeg;base64,${p.img}`
      : "/placeholder.png";

    list.innerHTML += `
      <div class="bg-stone-800 border border-stone-700 rounded-2xl shadow-2xl p-4 w-72 transition transform hover:scale-105 hover:shadow-[0_0_20px_rgba(255,0,0,0.4)]">

        <!-- Imagen -->
        <img src="${img}"
             class="w-full h-44 object-cover rounded-xl border border-stone-600 shadow mb-3">

        <!-- Nombre y nivel -->
        <h3 class="text-2xl font-bold text-red-300 mb-1">${p.name}</h3>
        <p class="text-stone-300 text-sm mb-2">Nivel <span class="text-red-400 font-bold">${p.level}</span></p>

        <!-- Stats -->
        <div class="text-sm space-y-1 mb-3">
          <p>❤️ <span class="font-bold">${p.life}</span> Salud</p>
          <p>🌀 <span class="font-bold">${p.skill1}</span></p>
          <p>✨ <span class="font-bold">${p.skill2}</span></p>
          <p>🏆 <span class="font-bold">${p.milestones}</span></p>
          <p>📜 <span class="font-bold">${p.attributes}</span></p>
          <p>⭐ EXP Total: <span class="font-bold text-green-300">${p.exp}</span></p>
        </div>

        <!-- Objetos -->
        <h4 class="text-sm font-semibold text-blue-300 mb-1">Objetos:</h4>
        <div class="grid grid-cols-3 gap-2 mb-3">
          ${
            (p.items || [])
              .slice(0, 6)
              .map(img => `
                <img src="${img ? `data:image/jpeg;base64,${img}` : "/placeholder.png"}"
                     class="w-full h-16 object-cover rounded-lg border border-stone-700 shadow-sm bg-stone-900">
              `)
              .join("")
          }
        </div>

        <!-- Botones -->
        <div class="flex gap-3">
          <button onclick='openMasterPanel("${p._id}")'
                  class="flex-1 bg-green-600 hover:bg-green-700 p-2 rounded-xl shadow font-semibold">
            Editar
          </button>

          <button onclick='deletePlayer("${p._id}")'
                  class="flex-1 bg-red-600 hover:bg-red-700 p-2 rounded-xl shadow font-semibold">
            Eliminar
          </button>
        </div>

      </div>
    `;
  });
}

// =============================================================
// LOGIN
// =============================================================
function loginMaster() {
  const pass = document.getElementById("masterPass").value;

  if (pass === PASS) {
    document.getElementById("loginScreen").classList.add("hidden");
    document.getElementById("mainApp").classList.remove("hidden");
    refreshPlayers();
  } else {
    alert("Contraseña incorrecta");
  }
}

function toggleCreateCard() {
  document.getElementById("createCard").classList.toggle("hidden");
}

// =============================================================
// CREATE CHARACTER
// =============================================================
async function createCharacter() {
  const get = (id) => document.getElementById(id).value;

  const name = get("charNameInput");
  if (!name.trim()) return alert("El nombre es obligatorio.");

  const fd = new FormData();
  fd.append("name", name);
  fd.append("life", get("charLifeInput"));
  fd.append("skill1", get("charSkill1Input"));
  fd.append("skill2", get("charSkill2Input"));
  fd.append("milestones", get("charMilestonesInput"));
  fd.append("attributes", get("charAttributesInput"));
  fd.append("exp", get("charExpInput"));
  fd.append("level", get("charLevelInput"));

  const mainImg = document.getElementById("charImgInput").files?.[0];
  if (mainImg && validateImage(mainImg)) fd.append("charImg", mainImg);

  for (let i = 1; i <= 6; i++) {
    const input = document.getElementById(`item${i}Input`);
    const file = input?.files?.[0];
    if (file && validateImage(file)) fd.append("items", file);
  }

  await fetchJson(API_PLAYERS, { method: "POST", body: fd });

  alert("Personaje creado correctamente.");
  toggleCreateCard();
  refreshPlayers();
}

// =============================================================
// EDIT PLAYER — COMPLETO
// =============================================================
async function openMasterPanel(id) {
  const player = players.find((p) => p._id === id);
  if (!player) return alert("Jugador no encontrado");

  const modal = document.createElement("div");
  modal.className =
    "fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50";

  modal.innerHTML = `
    <div class='bg-stone-800 p-6 rounded-2xl shadow-2xl w-96 max-h-[90vh] overflow-y-auto border border-stone-700'>
      <h2 class='text-2xl font-bold mb-4 text-red-300'>Editar ${player.name}</h2>

      <label>Nombre:</label>
      <input id='editName' class='w-full p-2 rounded mb-2 text-black' value='${player.name}' />

      <label>Imagen principal:</label>
      <img id="previewEditMain" src="${player.img ? `data:image/jpeg;base64,${player.img}` : '/placeholder.png'}"
           class="w-full h-40 object-cover rounded-xl border border-stone-600 shadow mb-2" />
      <input id='editImg' type='file' accept='image/*'
             class='w-full p-2 rounded bg-white text-black mb-4' />

      <h3 class="text-xl font-bold text-blue-300 mb-2">Objetos</h3>

      <div class="grid grid-cols-2 gap-4 mb-4">
        ${[1,2,3,4,5,6].map(i => {
          const img = player.items?.[i-1] || null;
          return `
            <div>
              <img id="previewItemEdit${i}"
                   src="${img ? `data:image/jpeg;base64,${img}` : '/placeholder.png'}"
                   class="w-full h-24 object-cover rounded-lg border border-stone-600 shadow mb-1">
              <input id="editItem${i}" type="file" accept="image/*"
                     class="w-full bg-white text-black p-2 rounded"
                     data-current="${img || ''}">
            </div>
          `;
        }).join("")}
      </div>

      <label>Salud:</label><input id='editLife' type='number' value='${player.life}' class='w-full p-2 text-black mb-2' />
      <label>Habilidad 1:</label><input id='editSkill1' value='${player.skill1}' class='w-full p-2 text-black mb-2' />
      <label>Habilidad 2:</label><input id='editSkill2' value='${player.skill2}' class='w-full p-2 text-black mb-2' />
      <label>Hitos:</label><input id='editMilestones' value='${player.milestones}' class='w-full p-2 text-black mb-2' />
      <label>Características:</label><input id='editAttributes' value='${player.attributes}' class='w-full p-2 text-black mb-2' />
      <label>Experiencia:</label><input id='editExp' type='number' value='${player.exp}' class='w-full p-2 text-black mb-2' />
      <label>Nivel:</label><input id='editLevel' type='number' value='${player.level}' class='w-full p-2 text-black mb-4' />

      <button id='saveEditBtn'
              class='bg-green-600 hover:bg-green-700 p-2 rounded-xl w-full mt-2 shadow font-bold'>
        Guardar
      </button>

      <button id='closeEdit'
              class='bg-red-600 hover:bg-red-700 p-2 rounded-xl w-full mt-2 shadow font-bold'>
        Cerrar
      </button>
    </div>
  `;

  document.body.appendChild(modal);

  addPreview("editImg", "previewEditMain");

  for (let i = 1; i <= 6; i++) {
    addPreview(`editItem${i}`, `previewItemEdit${i}`);
  }

  document.getElementById("closeEdit").onclick = () => modal.remove();

  document.getElementById("saveEditBtn").onclick = async () => {
    const fd = new FormData();

    fd.append("name", document.getElementById("editName").value);
    fd.append("life", document.getElementById("editLife").value);
    fd.append("skill1", document.getElementById("editSkill1").value);
    fd.append("skill2", document.getElementById("editSkill2").value);
    fd.append("milestones", document.getElementById("editMilestones").value);
    fd.append("attributes", document.getElementById("editAttributes").value);
    fd.append("exp", document.getElementById("editExp").value);
    fd.append("level", document.getElementById("editLevel").value);

    const newMain = document.getElementById("editImg").files?.[0];
    if (newMain && validateImage(newMain)) fd.append("charImg", newMain);

    const keepItems = [];

    for (let i = 1; i <= 6; i++) {
      const input = document.getElementById(`editItem${i}`);
      const file = input.files?.[0];
      if (file && validateImage(file)) {
        fd.append("items", file);
      } else {
        keepItems.push(input.dataset.current || null);
      }
    }

    fd.append("keepItems", JSON.stringify(keepItems));

    await fetchJson(`${API_PLAYERS}/${player._id}`, {
      method: "PUT",
      body: fd
    });

    modal.remove();
    refreshPlayers();
  };
}

// =============================================================
// DELETE PLAYER
// =============================================================
async function deletePlayer(id) {
  if (!confirm("¿Seguro que deseas eliminar este personaje?")) return;
  await fetchJson(`${API_PLAYERS}/${id}`, { method: "DELETE" });
  alert("Jugador eliminado.");
  refreshPlayers();
}

// =============================================================
// OPEN PLAYER BOARD
// =============================================================
function openPlayerBoard() {
  window.open("../Player/player_view.html", "_blank");
}

// =============================================================
// INIT
// =============================================================
window.addEventListener("load", () => {
  refreshPlayers();

  addPreview("charImgInput", "previewCharMain");
  for (let i = 1; i <= 6; i++) {
    addPreview(`item${i}Input`, `previewItem${i}`);
  }
});
