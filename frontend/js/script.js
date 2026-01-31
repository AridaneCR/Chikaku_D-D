// =============================================================
// STATE
// =============================================================
let formMode = "create"; // "create" | "edit"
let editingPlayerId = null;
let lastSignature = "";

// =============================================================
// XP SYSTEM
// =============================================================
const BASE_EXP = 100;
const EXP_STEP = 40;

function calculateLevelFromExp(totalExp) {
  totalExp = Number(totalExp) || 0;
  let level = 1;
  let used = 0;

  while (true) {
    const need = BASE_EXP + (level - 1) * EXP_STEP;
    if (totalExp < used + need) return level;
    used += need;
    level++;
  }
}

// =============================================================
// CONFIG
// =============================================================
const BASE_URL =
  window.__env?.API_URL ||
  "https://chikaku-d-d-backend-pbe.onrender.com";

const API_PLAYERS = `${BASE_URL}/api/players`;

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

let players = [];

// =============================================================
// HELPERS
// =============================================================
function resolveImage(img) {
  if (!img) return "";
  if (typeof img === "string") return img;
  return img.url || img.secure_url || "";
}

function validateImage(file) {
  if (!file) return true;
  if (!ALLOWED_TYPES.includes(file.type)) return false;
  if (file.size > MAX_IMAGE_SIZE) return false;
  return true;
}

// =============================================================
// CLASE / SUBCLASE
// =============================================================
const charClassInput = document.getElementById("charClassInput");
const charSubclassInput = document.getElementById("charSubclassInput");

const SUBCLASSES_BY_CLASS = {
  Guerrero: ["Explorador", "Luchador"],
  Mago: ["Arcano", "Elemental"],
  Apoyo: ["Sanador", "Monje"],
};

function updateSubclassOptions(cls, selected = "") {
  charSubclassInput.innerHTML =
    `<option value="">— Selecciona subclase —</option>`;

  if (!SUBCLASSES_BY_CLASS[cls]) {
    charSubclassInput.disabled = true;
    return;
  }

  SUBCLASSES_BY_CLASS[cls].forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    if (s === selected) opt.selected = true;
    charSubclassInput.appendChild(opt);
  });

  charSubclassInput.disabled = false;
}

charClassInput?.addEventListener("change", () =>
  updateSubclassOptions(charClassInput.value),
);

// =============================================================
// OBJETOS – SISTEMA INFINITO
// =============================================================
function addItemSlot(img = "", desc = "") {
  const container = document.getElementById("objectsContainer");
  const index = container.children.length + 1;

  const card = document.createElement("div");
  card.className = "object-card";
  card.innerHTML = `
    <label class="label-sm">Objeto ${index}</label>

    <input type="file" class="file mb-2" />

    <textarea class="input resize-none" rows="2"
      placeholder="Descripción del objeto...">${desc}</textarea>

    <img class="preview mt-2 ${img ? "" : "hidden"}"
      src="${img}" />

    <button type="button"
      class="mt-2 w-full bg-red-600 hover:bg-red-700 rounded p-1 text-sm">
      🗑️ Eliminar objeto
    </button>
  `;

  const fileInput = card.querySelector("input");
  const preview = card.querySelector("img");
  const removeBtn = card.querySelector("button");

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!validateImage(file)) {
      fileInput.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      preview.src = reader.result;
      preview.classList.remove("hidden");
    };
    reader.readAsDataURL(file);
  });

  removeBtn.onclick = () => card.remove();
  container.appendChild(card);
}

// =============================================================
// FETCH
// =============================================================
async function fetchJson(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// =============================================================
// PLAYERS LIST
// =============================================================
async function refreshPlayers(force = false) {
  const data = await fetchJson(API_PLAYERS);
  const sig = data.map(p => `${p._id}:${p.updatedAt}`).join("|");
  if (!force && sig === lastSignature) return;

  lastSignature = sig;
  players = data;
  renderPlayersList();
}

function renderPlayersList() {
  const list = document.getElementById("playersList");
  list.innerHTML = "";

  players.forEach(p => {
    const card = document.createElement("div");
    card.className =
      "bg-zinc-900 border border-zinc-700 rounded-xl p-4 flex flex-col";

    card.innerHTML = `
      <img src="${resolveImage(p.img)}"
        class="w-full h-40 object-cover rounded mb-2">

      <h3 class="font-bold text-lg">${p.name} (Nivel ${p.level})</h3>
      <p>❤️ Vida: ${p.life}</p>
      <p>⭐ EXP: ${p.exp}</p>
      <p class="text-yellow-400 font-bold">🪙 Oro: ${p.gold ?? 0}</p>

      <div class="mt-auto space-y-2">
        <button onclick="editPlayer('${p._id}')"
          class="w-full bg-green-600 p-2 rounded">
          Editar
        </button>

        <button onclick="deletePlayer('${p._id}')"
          class="w-full bg-red-600 p-2 rounded">
          Eliminar
        </button>
      </div>
    `;
    list.appendChild(card);
  });
}

// =============================================================
// EDIT PLAYER
// =============================================================
function editPlayer(id) {
  const p = players.find(x => x._id === id);
  if (!p) return;

  formMode = "edit";
  editingPlayerId = id;
  toggleCreateCard(true);

  charNameInput.value = p.name || "";
  charLifeInput.value = p.life ?? 10;
  charMilestonesInput.value = p.milestones || "";
  charAttributesInput.value = p.attributes || "";
  charExpInput.value = p.exp ?? 0;
  charGoldInput.value = p.gold ?? 0;

  charClassInput.value = p.class || "";
  updateSubclassOptions(p.class, p.subclass || "");

  skillsContainer.innerHTML = "";
  (p.skills || []).forEach(addSkillInput);

  previewCharMain.classList.toggle("hidden", !p.img);
  if (p.img) previewCharMain.src = resolveImage(p.img);

  const container = document.getElementById("objectsContainer");
  container.innerHTML = "";

  (p.items || []).forEach((img, i) =>
    addItemSlot(resolveImage(img), p.itemDescriptions?.[i] || ""),
  );
}

// =============================================================
// CREATE / UPDATE
// =============================================================
async function submitCharacter() {
  const name = charNameInput.value.trim();
  if (!name) return;

  const skills = [...skillsContainer.querySelectorAll("input")]
    .map(i => i.value.trim()).filter(Boolean);

  const itemCards = [
    ...document.querySelectorAll("#objectsContainer .object-card"),
  ];

  const itemDescriptions = [];
  const fd = new FormData();

  itemCards.forEach((card, i) => {
    const file = card.querySelector("input").files[0];
    const desc = card.querySelector("textarea").value.trim();

    itemDescriptions.push(desc);
    if (file && validateImage(file)) {
      fd.append("items", file);
      fd.append("itemsIndex", i);
    }
  });

  const totalExp = Number(charExpInput.value) || 0;

  fd.append("name", name);
  fd.append("life", charLifeInput.value);
  fd.append("milestones", charMilestonesInput.value);
  fd.append("attributes", charAttributesInput.value);
  fd.append("exp", totalExp);
  fd.append("level", calculateLevelFromExp(totalExp));
  fd.append("skills", JSON.stringify(skills));
  fd.append("itemDescriptions", JSON.stringify(itemDescriptions));
  fd.append("class", charClassInput.value);
  fd.append("subclass", charSubclassInput.value);
  fd.append("gold", Number(charGoldInput.value) || 0);

  if (charImgInput.files[0] && validateImage(charImgInput.files[0])) {
    fd.append("charImg", charImgInput.files[0]);
  }

  if (formMode === "create") {
    await fetchJson(API_PLAYERS, { method: "POST", body: fd });
  } else {
    await fetchJson(`${API_PLAYERS}/${editingPlayerId}`, {
      method: "PUT",
      body: fd,
    });
  }

  resetForm();
  toggleCreateCard();
  refreshPlayers(true);
}

// =============================================================
// DELETE
// =============================================================
async function deletePlayer(id) {
  if (!confirm("¿Eliminar personaje?")) return;
  await fetchJson(`${API_PLAYERS}/${id}`, { method: "DELETE" });
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
  charMilestonesInput.value = "";
  charAttributesInput.value = "";
  charExpInput.value = 0;
  charGoldInput.value = 0;

  charClassInput.value = "";
  updateSubclassOptions("");

  skillsContainer.innerHTML = "";
  previewCharMain.classList.add("hidden");
  charImgInput.value = "";

  document.getElementById("objectsContainer").innerHTML = "";
}

// =============================================================
// INIT
// =============================================================
window.addEventListener("load", () => {
  refreshPlayers(true);
});