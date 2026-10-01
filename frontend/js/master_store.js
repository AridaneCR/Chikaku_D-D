const BASE_URL =
  window.__env && window.__env.API_URL
    ? window.__env.API_URL
    : "https://chikaku-d-d-1.onrender.com";

const API_PRODUCTS = `${BASE_URL}/api/products`;
const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
let products = [];
let editingProductId = null;

const $ = (id) => document.getElementById(id);

function logoutMaster() {
  sessionStorage.removeItem("masterToken");
  window.location.href = "../index.html";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setFeedback(message, type = "info") {
  const el = $("formFeedback");
  el.textContent = message;
  el.className = "mt-4 text-sm font-semibold " +
    (type === "error" ? "text-red-400" : type === "success" ? "text-emerald-400" : "text-zinc-300");
}

function eurosFromCents(cents) {
  return (Number(cents || 0) / 100).toFixed(2) + " €";
}

function validateImage(file) {
  if (!file) return true;
  const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
  if (!allowed.includes(file.type)) {
    alert("La imagen debe ser PNG, JPG o WEBP.");
    return false;
  }
  if (file.size > MAX_IMAGE_SIZE) {
    alert("La imagen no puede superar los 2 MB.");
    return false;
  }
  return true;
}

$("productImage")?.addEventListener("change", () => {
  const file = $("productImage").files[0];
  const preview = $("productImagePreview");
  if (!file) {
    preview.src = "";
    preview.classList.add("hidden");
    return;
  }
  if (!validateImage(file)) {
    $("productImage").value = "";
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    preview.src = reader.result;
    preview.classList.remove("hidden");
  };
  reader.readAsDataURL(file);
});

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    cache: "no-store",
    headers: {
      ...(options.headers || {}),
      "Cache-Control": "no-cache",
    },
  });

  let data = null;
  try { data = await response.json(); } catch (_) {}

  if (!response.ok) {
    throw new Error(data?.error || `Error HTTP ${response.status}`);
  }
  return data;
}

async function loadProducts() {
  const grid = $("productsGrid");
  grid.innerHTML = `<div class="col-span-full text-center text-zinc-400 py-12">Cargando productos...</div>`;

  try {
    products = await request(API_PRODUCTS);
    renderProducts();
  } catch (error) {
    console.error(error);
    grid.innerHTML = `<div class="col-span-full bg-red-950/50 border border-red-800 rounded-xl p-5 text-red-300">❌ ${escapeHtml(error.message)}</div>`;
  }
}

function renderProducts() {
  const grid = $("productsGrid");
  $("productCount").textContent = `${products.length} producto${products.length === 1 ? "" : "s"} registrado${products.length === 1 ? "" : "s"}`;

  if (!products.length) {
    grid.innerHTML = `<div class="col-span-full text-center border border-dashed border-zinc-700 rounded-2xl py-16 text-zinc-500">No hay productos todavía.</div>`;
    return;
  }

  grid.innerHTML = products.map((product) => {
    const image = product.image
      ? `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" class="w-full h-44 object-contain bg-zinc-950 rounded-xl border border-zinc-800">`
      : `<div class="w-full h-44 rounded-xl border border-zinc-800 bg-zinc-950 flex items-center justify-center text-5xl">📦</div>`;

    const statusClass = product.active
      ? "bg-emerald-900/60 text-emerald-300 border-emerald-800"
      : "bg-zinc-800 text-zinc-400 border-zinc-700";

    return `
      <article class="bg-zinc-900 border border-zinc-700 rounded-2xl p-4 shadow-lg flex flex-col">
        ${image}
        <div class="mt-4 flex-1">
          <div class="flex justify-between gap-2 items-start">
            <h3 class="font-bold text-lg">${escapeHtml(product.name)}</h3>
            <span class="text-xs px-2 py-1 rounded-full border ${statusClass}">${product.active ? "Activo" : "Inactivo"}</span>
          </div>
          <p class="text-sm text-zinc-400 mt-1 min-h-10">${escapeHtml(product.description || "Sin descripción")}</p>
          <div class="mt-3 space-y-1 text-sm">
            <p>🪙 <strong>${Number(product.chikacoinPrice || 0)}</strong> Chikacoins</p>
            <p>💶 ${eurosFromCents(product.priceCents)}</p>
            <p>🏷️ ${escapeHtml(product.barcode)}</p>
            <p>🎲 Campaña: ${escapeHtml(product.campaign || "default")}</p>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2 mt-4">
          <button onclick="editProduct('${product._id}')" class="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 font-semibold">Editar</button>
          <button onclick="toggleProduct('${product._id}', ${!product.active})" class="px-3 py-2 rounded-lg ${product.active ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"} font-semibold">${product.active ? "Desactivar" : "Activar"}</button>
          <button onclick="deleteProduct('${product._id}')" class="col-span-2 px-3 py-2 rounded-lg bg-red-700 hover:bg-red-800 font-semibold">🗑️ Eliminar</button>
        </div>
      </article>
    `;
  }).join("");
}

function editProduct(id) {
  const product = products.find((item) => item._id === id);
  if (!product) return;

  editingProductId = id;
  $("formTitle").textContent = "✏️ Editar producto";
  $("saveProductBtn").textContent = "💾 Guardar cambios";
  $("cancelEditBtn").classList.remove("hidden");
  $("productName").value = product.name || "";
  $("productBarcode").value = product.barcode || "";
  $("productCampaign").value = product.campaign || "default";
  $("productDescription").value = product.description || "";
  $("productPrice").value = ((Number(product.priceCents || 0)) / 100).toFixed(2);
  $("productChikacoins").value = Number(product.chikacoinPrice || 0);
  $("productActive").checked = product.active !== false;
  $("productImage").value = "";

  const preview = $("productImagePreview");
  if (product.image) {
    preview.src = product.image;
    preview.classList.remove("hidden");
  } else {
    preview.src = "";
    preview.classList.add("hidden");
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetProductForm() {
  editingProductId = null;
  $("productForm").reset();
  $("productCampaign").value = "default";
  $("productPrice").value = "0";
  $("productChikacoins").value = "0";
  $("productActive").checked = true;
  $("formTitle").textContent = "➕ Crear producto";
  $("saveProductBtn").textContent = "💾 Crear producto";
  $("cancelEditBtn").classList.add("hidden");
  $("productImagePreview").src = "";
  $("productImagePreview").classList.add("hidden");
  setFeedback("");
}

async function saveProduct(event) {
  event.preventDefault();
  const image = $("productImage").files[0];
  if (image && !validateImage(image)) return;

  const name = $("productName").value.trim();
  const barcode = $("productBarcode").value.trim();
  const campaign = $("productCampaign").value.trim() || "default";
  const description = $("productDescription").value.trim();
  const price = Number($("productPrice").value || 0);
  const chikacoins = Number($("productChikacoins").value || 0);

  if (!name || !barcode || !Number.isFinite(price) || price < 0 || !Number.isInteger(chikacoins) || chikacoins < 0) {
    setFeedback("Completa correctamente los campos obligatorios.", "error");
    return;
  }

  const formData = new FormData();
  formData.append("campaign", campaign);
  formData.append("name", name);
  formData.append("description", description);
  formData.append("barcode", barcode);
  formData.append("priceCents", Math.round(price * 100));
  formData.append("chikacoinPrice", chikacoins);
  formData.append("active", $("productActive").checked ? "true" : "false");
  if (image) formData.append("image", image);

  const isEdit = Boolean(editingProductId);
  const url = isEdit ? `${API_PRODUCTS}/${editingProductId}` : API_PRODUCTS;

  try {
    $("saveProductBtn").disabled = true;
    $("saveProductBtn").textContent = isEdit ? "Guardando..." : "Creando...";
    await request(url, { method: isEdit ? "PUT" : "POST", body: formData });
    setFeedback(isEdit ? "Producto actualizado correctamente." : "Producto creado correctamente.", "success");
    resetProductForm();
    await loadProducts();
  } catch (error) {
    console.error(error);
    setFeedback(`❌ ${error.message}`, "error");
  } finally {
    $("saveProductBtn").disabled = false;
    $("saveProductBtn").textContent = editingProductId ? "💾 Guardar cambios" : "💾 Crear producto";
  }
}

async function toggleProduct(id, active) {
  try {
    await request(`${API_PRODUCTS}/${id}/active`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    await loadProducts();
  } catch (error) {
    alert(`No se pudo cambiar el estado: ${error.message}`);
  }
}

async function deleteProduct(id) {
  const product = products.find((item) => item._id === id);
  if (!product) return;
  if (!confirm(`¿Eliminar definitivamente "${product.name}"?`)) return;

  try {
    await request(`${API_PRODUCTS}/${id}`, { method: "DELETE" });
    if (editingProductId === id) resetProductForm();
    await loadProducts();
  } catch (error) {
    alert(`No se pudo eliminar el producto: ${error.message}`);
  }
}

$("productForm")?.addEventListener("submit", saveProduct);
loadProducts();
