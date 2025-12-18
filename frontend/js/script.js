// =============================================================
// STATE
// =============================================================
let formMode = "create";
let editingPlayerId = null;
let players = [];
let lastPlayersHash = "";

// =============================================================
// CONFIG
// =============================================================
const BASE_URL = (window.__env && window.__env.API_URL)
  ? window.__env.API_URL
  : "https://chikaku-d-d-backend-pbe2.onrender.com";

const API_PLAYERS = `${BASE_URL}/api/players`;

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
// FETCH (OPTIMIZADO)
// =============================================================
async function fetchJson(url, opts = {}) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// =============================================================
// REFRESH PLAYERS (CACHE)
// =============================================================
async function refreshPlayers() {
  try {
    showLoader();
    const data = await fetchJson(API_PLAYERS);
    const hash = JSON.stringify(data);

    if (hash === lastPlayersHash) return;

    lastPlayersHash = hash;
    players = data;

    requestAnimationFrame(renderPlayersList);
  } catch (e) {
    console.error("Error cargando jugadores:", e);
  } finally {
    hideLoader();
  }
}

// =============================================================
// RENDER LIST (OPTIMIZADO)
// =============================================================
function renderPlayersList() {
  const list = document.getElementById("playersList");
  list.innerHTML = "";

  const fragment = document.createDocumentFragment();

  players.forEach(p => {
    const skills = Array.isArray(p.skills) && p.skills.length
      ? p.skills
      : [];

    const card = document.createElement("div");
    card.className = "bg-zinc-900 border border-zinc-700 rounded-xl p-4 shadow";

    card.innerHTML = `
      <img loading="lazy"
        src="${p.img ? `data:image/jpeg;base64,${p.img}` : "/placeholder.png"}"
        class="w-full h-40 object-cover rounded mb-2">

      <h3 class="font-bold text-lg">${p.name} (Nivel ${p.level})</h3>
      <p>Vida: ${p.life}</p>
      <p>EXP: ${p.exp}</p>

      ${skills.length ? `
        <div class="flex flex-wrap gap-1 mt-2">
          ${skills.map(s => `
            <span class="px-2 py-1 bg-zinc-800 rounded text-xs">${s}</span>
          `).join("")}
        </div>
      ` : ""}

      <div class="grid grid-cols-6 gap-1 mt-3">
        ${(p.items || []).map((item, i) => `
          <img loading="lazy"
            src="${item ? `data:image/jpeg;base64,${item}` : "/placeholder.png"}"
            title="${p.itemDescriptions?.[i] || ""}"
            class="w-10 h-10 object-cover rounded border cursor-pointer"
          />
        `).join("")}
      </div>

      <button onclick="editPlayer('${p._id}')"
        class="mt-4 w-full bg-green-600 p-2 rounded">
        Editar
      </button>

      <button onclick="deletePlayer('${p._id}')"
        class="mt-2 w-full bg-red-600 p-2 rounded">
        Eliminar
      </button>
    `;

    fragment.appendChild(card);
  });

  list.appendChild(fragment);
}

// =============================================================
// SUBMIT CHARACTER (LIMPIO)
// =============================================================
async function submitCharacter() {
  const name = charNameInput.value.trim();
  if (!name) return alert("Nombre obligatorio");

  const skills = [...document.querySelectorAll("#skillsContainer input")]
    .map(i => i.value.trim())
    .filter(Boolean);

  const itemDescriptions = Array.from({ length: 6 }, (_, i) =>
    document.getElementById(`item${i + 1}Desc`)?.value.trim() || ""
  );

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

  await fetchJson(
    formMode === "create"
      ? API_PLAYERS
      : `${API_PLAYERS}/${editingPlayerId}`,
    { method: formMode === "create" ? "POST" : "PUT", body: fd }
  );

  resetForm();
  toggleCreateCard();
  refreshPlayers();
}

// =============================================================
// INIT
// =============================================================
window.addEventListener("load", refreshPlayers);
