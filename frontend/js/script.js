// =============================================================
// STATE
// =============================================================
let formMode = "create";
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
// DOM
// =============================================================
const objectsContainer = document.getElementById("objectsContainer");
const charGoldInput = document.getElementById("charGoldInput");
const charClassInput = document.getElementById("charClassInput");
const charSubclassInput = document.getElementById("charSubclassInput");

// =============================================================
// CLASE / SUBCLASE
// =============================================================
const SUBCLASSES_BY_CLASS = {
  Guerrero: ["Explorador", "Luchador"],
  Mago: ["Arcano", "Elemental"],
  Apoyo: ["Sanador", "Monje"],
};

function updateSubclassOptions(selectedClass, selectedSubclass = "") {
  charSubclassInput.innerHTML =
    `<option value="">— Selecciona subclase —</option>`;

  if (!SUBCLASSES_BY_CLASS[selectedClass]) {
    charSubclassInput.disabled = true;
    return;
  }

  SUBCLASSES_BY_CLASS[selectedClass].forEach((sub) => {
    const opt = document.createElement("option");
    opt.value = sub;
    opt.textContent = sub;
    if (sub === selectedSubclass) opt.selected = true;
    charSubclassInput.appendChild(opt);
  });

  charSubclassInput.disabled = false;
}

charClassInput.addEventListener("change", () => {
  updateSubclassOptions(charClassInput.value);
});

// =============================================================
// HELPERS
// =============================================================
function validateImage(file) {
  if (!file) return true;
  if (!ALLOWED_TYPES.includes(file.type)) return false;
  if (file.size > MAX_IMAGE_SIZE) return false;
  return true;
}

function resolveImage(img) {
  if (!img) return "";
  if (typeof img === "string") return img;
  if (typeof img === "object") return img.url || img.secure_url || "";
  return "";
}

// =============================================================
// OBJETOS INFINITOS
// =============================================================
function addItemSlot(img = "", desc = "") {
  const div = document.createElement("div");
  div.className = "object-card";

  div.innerHTML = `
    <input type="file" class="file item-img" />
    <textarea class="input mt-2 resize-none item-desc"
      rows="2"
      placeholder="Descripción del objeto...">${desc}</textarea>

    <img class="preview mt-3 ${img ? "" : "hidden"}" src="${img}" />

    <button type="button"
      class="mt-2 w-full bg-red-600 hover:bg-red-700 text-sm rounded p-1">
      🗑️ Eliminar objeto
    </button>
  `;

  const input = div.querySelector(".item-img");
  const preview = div.querySelector("img");
  const removeBtn = div.querySelector("button");

  input.addEventListener("change", () => {
    const file = input.files[0];
    if (!validateImage(file)) {
      input.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      preview.src = reader.result;
      preview.classList.remove("hidden");
    };
    reader.readAsDataURL(file);
  });

  removeBtn.addEventListener("click", () => div.remove());
  objectsContainer.appendChild(div);
}

function clearItems() {
  objectsContainer.innerHTML = "";
}

// =============================================================
// FETCH
// =============================================================
async function fetchJson(url, opts = {}, showLoading = false) {
  if (showLoading) document.getElementById("loader")?.classList.remove("hidden");

  try {
    const res = await fetch(url, {
      ...opts,
      cache: "no-store",
    });

    if (!res.ok) throw new Error(await res.text());
    return await res.json();
  } finally {
    if (showLoading)
      document.getElementById("loader")?.classList.add("hidden");
  }
}

// =============================================================
// PLAYERS
// =============================================================
async function refreshPlayers(force = false) {
  const data = await fetchJson(API_PLAYERS);
  const signature = data.map((p) => `${p._id}:${p.updatedAt}`).join("|");

  if (!force && signature === lastSignature) return;
  lastSignature = signature;
  players = data;
  renderPlayersList();
}

function renderPlayersList() {
  const list = document.getElementById("playersList");
  list.innerHTML = "";

  players.forEach((p) => {
    const card = document.createElement("div");
    card.className =
      "bg-zinc-900 border border-zinc-700 rounded-xl p-4 shadow flex flex-col";

    card.innerHTML = `
      <img src="${resolveImage(p.img)}"
        class="w-full h-40 object-cover rounded mb-2">

      <h3 class="font-bold text-lg">${p.name} (Nivel ${p.level})</h3>
      <p>❤️ Vida: ${p.life}</p>
      <p>⭐ EXP: ${p.exp}</p>
      <p class="text-yellow-400">🪙 Oro: ${p.gold ?? 0}</p>

      <div class="mt-auto space-y-2">
        <button onclick="editPlayer('${p._id}')"
          class="w-full bg-green-600 p-2 rounded">Editar</button>

        <button onclick="deletePlayer('${p._id}')"
          class="w-full bg-red-600 p-2 rounded">Eliminar</button>
      </div>
    `;
    list.appendChild(card);
  });
}

// =============================================================
// EDIT
// =============================================================
function editPlayer(id) {
  const p = players.find((x) => x._id === id);
  if (!p) return;

  formMode = "edit";
  editingPlayerId = id;
  toggleCreateCard(true);

  charNameInput.value = p.name;
  charLifeInput.value = p.life;
  charExpInput.value = p.exp;
  charGoldInput.value = p.gold ?? 0;
  charClassInput.value = p.class || "";
  updateSubclassOptions(p.class, p.subclass);

  clearItems();
  (p.items || []).forEach((item, i) => {
    addItemSlot(resolveImage(item), p.itemDescriptions?.[i] || "");
  });
}

// =============================================================
// CREATE / UPDATE
// =============================================================
async function submitCharacter() {
  const fd = new FormData();

  fd.append("name", charNameInput.value);
  fd.append("life", charLifeInput.value);
  fd.append("exp", charExpInput.value);
  fd.append("class", charClassInput.value);
  fd.append("subclass", charSubclassInput.value);

  const descriptions = [];
  document.querySelectorAll(".object-card").forEach((card) => {
    const file = card.querySelector(".item-img").files[0];
    const desc = card.querySelector(".item-desc").value;

    if (file && validateImage(file)) {
      fd.append("items", file);
      descriptions.push(desc);
    }
  });

  fd.append("itemDescriptions", JSON.stringify(descriptions));

  if (formMode === "create") {
    fd.append("gold", charGoldInput.value);
    await fetchJson(API_PLAYERS, { method: "POST", body: fd }, true);
  } else {
    await fetchJson(`${API_PLAYERS}/${editingPlayerId}`, {
      method: "PUT",
      body: fd,
    }, true);

    await fetchJson(`${API_PLAYERS}/${editingPlayerId}/gold`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: charGoldInput.value, mode: "set" }),
    });
  }

  resetForm();
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

  charNameInput.value = "";
  charLifeInput.value = 10;
  charExpInput.value = 0;
  charGoldInput.value = 0;
  charClassInput.value = "";
  updateSubclassOptions("");
  clearItems();
}

// =============================================================
// INIT
// =============================================================
window.addEventListener("load", () => {
  refreshPlayers(true);
});