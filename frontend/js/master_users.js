const MASTER_USERS_BASE_URL =
  window.__env && window.__env.API_URL
    ? window.__env.API_URL
    : "https://chikaku-d-d-1.onrender.com";

const USERS_API = `${MASTER_USERS_BASE_URL}/api/users`;
const PLAYERS_API = `${MASTER_USERS_BASE_URL}/api/players`;

let masterUsers = [];
let masterPlayers = [];

async function masterFetch(url, options = {}) {
  const response = await fetch(url, {
    cache: "no-store",
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Error en la petición");
  return data;
}

async function loadMasterUsers() {
  try {
    [masterUsers, masterPlayers] = await Promise.all([
      masterFetch(USERS_API),
      masterFetch(PLAYERS_API),
    ]);
    renderMasterUsers();
  } catch (error) {
    console.error(error);
    alert(error.message);
  }
}

function renderMasterUsers() {
  const container = document.getElementById("usersList");
  if (!container) return;

  if (!masterUsers.length) {
    container.innerHTML = '<div class="col-span-full text-center text-zinc-400 py-10">Todavía no hay usuarios registrados.</div>';
    return;
  }

  container.innerHTML = masterUsers.map((user) => {
    const options = [
      '<option value="">— Sin personaje —</option>',
      ...masterPlayers.map((player) => {
        const assignedToOther = masterUsers.some(
          (other) => other._id !== user._id && other.player?._id === player._id,
        );
        const selected = user.player?._id === player._id ? "selected" : "";
        const disabled = assignedToOther && !selected ? "disabled" : "";
        return `<option value="${player._id}" ${selected} ${disabled}>${escapeHtml(player.name)}${assignedToOther && !selected ? " (asignado)" : ""}</option>`;
      }),
    ].join("");

    return `
      <article class="bg-zinc-900 border border-zinc-700 rounded-2xl p-5 shadow-xl">
        <div class="flex justify-between gap-3">
          <div>
            <h3 class="text-lg font-bold text-white">${escapeHtml(user.name)}</h3>
            <p class="text-sm text-zinc-400 break-all">${escapeHtml(user.email)}</p>
          </div>
          <span class="text-xs text-zinc-500">${new Date(user.createdAt).toLocaleDateString("es-ES")}</span>
        </div>

        <div class="mt-5 bg-zinc-800 rounded-xl p-4">
          <label class="block text-xs text-zinc-400 mb-2">Personaje asignado</label>
          <select id="player-${user._id}" class="w-full px-3 py-2 rounded text-black">${options}</select>
          <button onclick="assignPlayer('${user._id}')" class="w-full mt-3 bg-indigo-600 hover:bg-indigo-700 py-2 rounded font-bold">Guardar personaje</button>
        </div>

        <div class="flex gap-2 mt-4">
          <button onclick="openEditUser('${user._id}')" class="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded font-bold">Editar</button>
          <button onclick="deleteUser('${user._id}')" class="flex-1 bg-red-600 hover:bg-red-700 py-2 rounded font-bold">Eliminar</button>
        </div>
      </article>
    `;
  }).join("");
}

async function assignPlayer(userId) {
  const select = document.getElementById(`player-${userId}`);
  try {
    await masterFetch(`${USERS_API}/${userId}/player`, {
      method: "PATCH",
      body: JSON.stringify({ playerId: select.value || null }),
    });
    await loadMasterUsers();
    alert("Personaje asignado correctamente.");
  } catch (error) {
    alert(error.message);
  }
}

function openEditUser(userId) {
  const user = masterUsers.find((item) => item._id === userId);
  if (!user) return;
  document.getElementById("editUserId").value = user._id;
  document.getElementById("editUserName").value = user.name || "";
  document.getElementById("editUserEmail").value = user.email || "";
  document.getElementById("editUserPassword").value = "";
  const modal = document.getElementById("editModal");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeEditUser() {
  const modal = document.getElementById("editModal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

async function saveUser() {
  const userId = document.getElementById("editUserId").value;
  const body = {
    name: document.getElementById("editUserName").value.trim(),
    email: document.getElementById("editUserEmail").value.trim(),
  };
  const password = document.getElementById("editUserPassword").value;
  if (password) body.password = password;

  try {
    await masterFetch(`${USERS_API}/${userId}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
    closeEditUser();
    await loadMasterUsers();
    alert("Usuario actualizado correctamente.");
  } catch (error) {
    alert(error.message);
  }
}

async function deleteUser(userId) {
  const user = masterUsers.find((item) => item._id === userId);
  if (!user) return;
  if (!confirm(`¿Eliminar la cuenta de ${user.name}? Su personaje quedará sin usuario asignado.`)) return;

  try {
    await masterFetch(`${USERS_API}/${userId}`, { method: "DELETE" });
    await loadMasterUsers();
  } catch (error) {
    alert(error.message);
  }
}

function logoutMasterUsers() {
  sessionStorage.removeItem("masterToken");
  window.location.href = "../index.html";
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

document.addEventListener("DOMContentLoaded", loadMasterUsers);
