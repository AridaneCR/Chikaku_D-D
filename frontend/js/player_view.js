// const API_URL = "http://localhost:3000/api/players";
const API_URL = "https://chikaku-d-d-ptyl.onrender.com/api/players";
const API_PLAYERS = `${BASE_URL}/api/players`;

let players = [];
let isFiltering = false;

const playerBoard = document.getElementById("playerBoard");

// Obtener campaña actual
const currentCampaign = JSON.parse(localStorage.getItem("currentCampaign") || "null");

// Si no existe, mostrar mensaje
if (!currentCampaign) {
  playerBoard.innerHTML = `
    <p class='text-center text-red-400 text-xl'>
      ⚠ No hay campaña seleccionada.<br>
      Vuelve al panel principal.
    </p>`;
}


// -------------------------------------------------------
// Cargar jugadores desde MongoDB
// -------------------------------------------------------
async function loadPlayers() {
  if (!currentCampaign) return;

  try {
    const res = await fetch(`${API_PLAYERS}/${encodeURIComponent(currentCampaign.name)}`);
    players = await res.json();
    renderPlayerBoard();
  } catch (err) {
    console.error("Error cargando jugadores:", err);
  }
}


// -------------------------------------------------------
// RENDER DEL TABLERO
// -------------------------------------------------------
function renderPlayerBoard(filtered = null) {
  if (isFiltering && !filtered) return;

  const list = filtered || players;
  playerBoard.innerHTML = "";

  list.forEach(p => {
    const expPercent = Math.min((p.level / 100) * 100, 100);

    const card = document.createElement("div");
    card.className = "inline-block bg-stone-800 p-4 rounded-xl shadow-2xl w-80 text-stone-100 m-2 align-top";

    card.innerHTML = `
      <img src='${p.img ? "data:image/jpeg;base64," + p.img : "/placeholder.png"}'
           class='w-full h-48 object-cover rounded mb-2' />

      <h2 class='text-2xl font-bold mb-2'>
        ${p.name} (Nivel ${p.level})
      </h2>

      <p>Salud: ${p.life}</p>
      <p>Habilidad 1: ${p.skill1}</p>
      <p>Habilidad 2: ${p.skill2}</p>
      <p>Hitos: ${p.milestones}</p>
      <p>Características: ${p.attributes}</p>
      <p>Experiencia: ${p.exp}</p>

      <div class='w-full grid grid-cols-6 gap-2 mt-3'>
        ${p.items.slice(0, 6).map(
          img => `
            <img src='${img ? "data:image/jpeg;base64," + img : "/placeholder.png"}'
                 class="w-10 h-10 object-cover rounded border border-stone-700 bg-stone-900" />
          `
        ).join("")}
      </div>

      <div class='bg-stone-600 h-5 rounded mt-4'>
        <div class='bg-green-500 h-5 rounded exp-bar' style='width:${expPercent}%'></div>
      </div>
    `;

    playerBoard.appendChild(card);
  });
}


// -------------------------------------------------------
// BUSCAR JUGADOR
// -------------------------------------------------------
function searchPlayer() {
  const nameQ = document.getElementById("searchName").value.toLowerCase();
  const levelQ = document.getElementById("searchLevel").value;

  const results = players.filter(p => {
    const matchName = nameQ ? p.name.toLowerCase().includes(nameQ) : true;
    const matchLevel = levelQ ? p.level == levelQ : true;
    return matchName && matchLevel;
  });

  isFiltering = true;
  renderPlayerBoard(results);
}

// LIMPIAR BÚSQUEDA
function clearSearch() {
  document.getElementById("searchName").value = "";
  document.getElementById("searchLevel").value = "";
  isFiltering = false;
  renderPlayerBoard();
}


// -------------------------------------------------------
// AUTO-REFRESH
// -------------------------------------------------------
setInterval(() => {
  if (!isFiltering) loadPlayers();
}, 2000);


// Iniciar
loadPlayers();
