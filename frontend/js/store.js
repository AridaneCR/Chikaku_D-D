// =============================================================
// 🛒 TIENDA DEL JUGADOR - SOLO CHIKACOINS
// =============================================================

const STORE_BASE_URL =
  window.__env && window.__env.API_URL
    ? window.__env.API_URL
    : "https://chikaku-d-d-1.onrender.com";

const STORE_API_PLAYERS = `${STORE_BASE_URL}/api/players`;
const STORE_API_PRODUCTS = `${STORE_BASE_URL}/api/products`;
const STORE_API_PURCHASE = `${STORE_BASE_URL}/api/store/purchase`;

let storeState = {
  players: [],
  products: [],
  playerId: "",
};

function storeEscapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function storeToast(message, type = "info") {
  if (typeof showToast === "function") {
    showToast(message, type);
  } else {
    alert(message);
  }
}

async function storeFetchJson(url, options = {}) {
  const response = await fetch(url, {
    cache: "no-store",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text || "Respuesta inválida del servidor" };
  }

  if (!response.ok) {
    const error = new Error(data.error || "Error en la petición");
    error.status = response.status;
    error.code = data.code;
    error.balance = data.balance;
    error.price = data.price;
    throw error;
  }

  return data;
}

async function openStore() {
  const modal = document.getElementById("storeModal");
  if (!modal) return;

  modal.classList.remove("hidden");
  modal.classList.add("flex");

  await loadStorePlayers();
  await loadStoreProducts();
}

function closeStore() {
  const modal = document.getElementById("storeModal");
  if (!modal) return;

  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

async function loadStorePlayers() {
  const select = document.getElementById("storePlayerSelect");
  if (!select) return;

  try {
    storeState.players = await storeFetchJson(STORE_API_PLAYERS);

    select.innerHTML =
      '<option value="">Selecciona tu personaje</option>';

    storeState.players.forEach((player) => {
      const option = document.createElement("option");
      option.value = player._id;
      option.textContent = player.name;
      select.appendChild(option);
    });

    if (storeState.playerId) {
      const exists = storeState.players.some(
        (player) => player._id === storeState.playerId,
      );

      if (exists) select.value = storeState.playerId;
    }

    select.onchange = async () => {
      storeState.playerId = select.value;
      updateStoreWallet();

      if (storeState.playerId) {
        await loadStoreProducts();
      } else {
        document.getElementById("storeWallet")?.classList.add("hidden");
      }
    };

    updateStoreWallet();
  } catch (error) {
    console.error("Error cargando jugadores de la tienda:", error);
    storeToast("❌ No se pudieron cargar los personajes", "error");
  }
}

async function loadStoreProducts() {
  const container = document.getElementById("storeProducts");
  if (!container) return;

  if (!storeState.playerId) {
    container.innerHTML =
      '<div class="col-span-full text-center text-zinc-400 py-10">Selecciona tu personaje para cargar la tienda.</div>';
    return;
  }

  container.innerHTML =
    '<div class="col-span-full text-center text-zinc-400 py-10">Cargando tienda…</div>';

  try {
    storeState.products = await storeFetchJson(STORE_API_PRODUCTS);

    if (!storeState.products.length) {
      container.innerHTML =
        '<div class="col-span-full text-center text-zinc-400 py-10">No hay productos disponibles.</div>';
      return;
    }

    container.innerHTML = "";

    storeState.products.forEach((product) => {
      const card = document.createElement("article");
      card.className =
        "bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden flex flex-col";

      const image = product.image
        ? storeEscapeHtml(product.image)
        : "/placeholder.png";

      const price = Math.max(0, Number(product.chikacoinPrice) || 0);

      card.innerHTML = `
        <img src="${image}"
          class="w-full h-44 object-cover bg-zinc-950"
          onerror="this.src='/placeholder.png'">

        <div class="p-4 flex flex-col flex-1">
          <h3 class="font-bold text-white text-lg">
            ${storeEscapeHtml(product.name)}
          </h3>

          <p class="text-sm text-zinc-400 mt-2 flex-1">
            ${storeEscapeHtml(product.description || "Sin descripción")}
          </p>

          <div class="bg-zinc-900 rounded-lg p-3 mt-4 border border-zinc-700">
            <div class="text-[11px] text-zinc-500">Precio</div>
            <div class="font-bold text-yellow-400 text-lg">
              🪙 ${price} Chikacoins
            </div>
          </div>

          <button
            type="button"
            data-product-id="${storeEscapeHtml(product._id)}"
            class="store-buy-button mt-3 w-full bg-amber-600 hover:bg-amber-500
                   text-white font-bold py-2 rounded-lg">
            Comprar
          </button>
        </div>
      `;

      card.querySelector(".store-buy-button")?.addEventListener("click", () => {
        openPurchaseModal(product._id);
      });

      container.appendChild(card);
    });
  } catch (error) {
    console.error("Error cargando tienda:", error);
    container.innerHTML =
      '<div class="col-span-full text-center text-red-400 py-10">No se pudo cargar la tienda.</div>';
  }
}

function updateStoreWallet(balanceOverride = null) {
  const wallet = document.getElementById("storeWallet");
  const balanceElement = document.getElementById("storeChikacoins");
  if (!wallet || !balanceElement) return;

  const player = storeState.players.find(
    (item) => item._id === storeState.playerId,
  );

  if (!player && balanceOverride === null) {
    wallet.classList.add("hidden");
    return;
  }

  const balance =
    balanceOverride !== null
      ? Number(balanceOverride) || 0
      : Number(player?.chikacoins) || 0;

  wallet.classList.remove("hidden");
  balanceElement.textContent = balance;
}

function openPurchaseModal(productId) {
  const product = storeState.products.find((item) => item._id === productId);

  if (!product) {
    storeToast("❌ Producto no encontrado", "error");
    return;
  }

  if (!storeState.playerId) {
    storeToast("Selecciona primero tu personaje", "warning");
    return;
  }

  let modal = document.getElementById("purchaseModal");

  if (!modal) {
    modal = document.createElement("div");
    modal.id = "purchaseModal";
    modal.className =
      "fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4";

    modal.innerHTML = `
      <div class="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md">
        <div class="flex justify-between items-center mb-5">
          <h3 id="purchaseTitle" class="text-xl font-bold text-amber-400"></h3>
          <button type="button" id="purchaseClose"
            class="text-zinc-400 hover:text-white text-xl">✕</button>
        </div>

        <p id="purchaseDescription" class="text-sm text-zinc-400 mb-5"></p>

        <button id="buyCoinButton" type="button"
          class="w-full bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50
                 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl">
        </button>

        <p class="text-xs text-zinc-500 mt-4 text-center">
          El servidor comprobará el saldo antes de realizar la compra.
        </p>
      </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector("#purchaseClose").onclick = () => modal.remove();
  }

  const price = Math.max(0, Number(product.chikacoinPrice) || 0);

  modal.querySelector("#purchaseTitle").textContent = product.name;
  modal.querySelector("#purchaseDescription").textContent =
    `🪙 ${price} Chikacoins`;

  const button = modal.querySelector("#buyCoinButton");
  button.disabled = false;
  button.textContent = `🪙 Comprar por ${price} Chikacoins`;
  button.onclick = () => attemptPurchase(product);
}

async function attemptPurchase(product) {
  if (!storeState.playerId) {
    storeToast("Selecciona primero tu personaje", "warning");
    return;
  }

  const button = document.getElementById("buyCoinButton");
  if (button) {
    button.disabled = true;
    button.textContent = "⏳ Comprando…";
  }

  try {
    const result = await storeFetchJson(STORE_API_PURCHASE, {
      method: "POST",
      body: JSON.stringify({
        playerId: storeState.playerId,
        productId: product._id,
      }),
    });

    const player = storeState.players.find(
      (item) => item._id === storeState.playerId,
    );

    if (player) {
      player.chikacoins = result.chikacoins;
      player.items = result.player?.items || player.items;
      player.itemDescriptions =
        result.player?.itemDescriptions || player.itemDescriptions;
    }

    updateStoreWallet(result.chikacoins);

    document.getElementById("purchaseModal")?.remove();

    storeToast(`✅ Has comprado ${product.name}`, "success");

    // Actualiza inmediatamente el tablero del jugador.
    if (typeof loadPlayers === "function") {
      await loadPlayers(true);
    }
  } catch (error) {
    console.error("Error realizando compra:", error);

    if (error.code === "INSUFFICIENT_CHIKACOINS") {
      storeToast(
        `❌ No tienes suficientes Chikacoins. Necesitas ${error.price} y tienes ${error.balance}.`,
        "warning",
      );
    } else {
      storeToast(`❌ ${error.message || "No se pudo realizar la compra"}`, "error");
    }

    if (button) {
      button.disabled = false;
      button.textContent = `🪙 Comprar por ${Math.max(0, Number(product.chikacoinPrice) || 0)} Chikacoins`;
    }
  }
}
