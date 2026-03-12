<script setup>
import { Html5Qrcode } from "html5-qrcode";
import QRCode from "qrcode";
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import { hasSupabaseConfig, supabase } from "../lib/supabase";
import ShopifyExportVariations from '../components/ShopifyExportVariations.vue';
import { createBin, updateBinName, binHasItems, deleteBin } from "../lib/binCrud";
import BinFormModal from "../components/BinFormModal.vue";
import ConfirmModal from "../components/ConfirmModal.vue";

const router = useRouter();
const searchTerm = ref("");
const bins = ref([]);
const totalVariations = ref(null);
const isLoading = ref(true);
const errorMessage = ref("");
const isScanning = ref(false);
const scannerError = ref("");
const qrPrintError = ref("");
const printingBinId = ref("");

let scannerInstance = null;
let hasHandledDecode = false;

const showCreateModal = ref(false);
const showEditModal = ref(false);
const editingBin = ref(null);
const isSaving = ref(false);
const modalError = ref("");
const showDeleteConfirm = ref(false);
const deletingBin = ref(null);
const isDeleting = ref(false);
const deleteError = ref("");
const deleteConfirmMessage = ref("");

function normalizeQuantityTotal(value, fallback = 0) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

async function fetchBinsWithTotals() {
  const withTotalsResult = await supabase
    .from("bins")
    .select("id, name, total_quantity")
    .order("id", { ascending: true });

  if (
    withTotalsResult.error &&
    /total_quantity|column/i.test(withTotalsResult.error.message || "")
  ) {
    const fallbackResult = await supabase
      .from("bins")
      .select("id, name")
      .order("id", { ascending: true });

    return { ...fallbackResult, includesTotals: false };
  }

  return { ...withTotalsResult, includesTotals: true };
}

async function fetchItemsWithTotals() {
  const withTotalsResult = await supabase
    .from("items")
    .select("id, name, bin_id, total_quantity")
    .order("name", { ascending: true });

  if (
    withTotalsResult.error &&
    /total_quantity|column/i.test(withTotalsResult.error.message || "")
  ) {
    const fallbackResult = await supabase
      .from("items")
      .select("id, name, bin_id")
      .order("name", { ascending: true });

    return { ...fallbackResult, includesTotals: false };
  }

  return { ...withTotalsResult, includesTotals: true };
}

function normalizeValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

async function stopScan() {
  if (!scannerInstance) {
    isScanning.value = false;
    hasHandledDecode = false;
    return;
  }

  try {
    await scannerInstance.stop();
  } catch {
    // Ignore stop errors when scanner is already inactive.
  }

  try {
    await scannerInstance.clear();
  } catch {
    // Ignore clear errors if scanner did not fully initialize.
  }

  scannerInstance = null;
  isScanning.value = false;
  hasHandledDecode = false;
}

async function handleDecodedText(decodedText) {
  if (hasHandledDecode) {
    return;
  }

  hasHandledDecode = true;
  const scannedValue = String(decodedText || "").trim();

  if (!scannedValue) {
    hasHandledDecode = false;
    return;
  }

  searchTerm.value = scannedValue;
  await stopScan();

  const matchedBin = bins.value.find(
    (bin) => normalizeValue(bin.id) === normalizeValue(scannedValue)
  );

  if (matchedBin) {
    router.push(`/search-inventory/${matchedBin.id}`);
  }
}

async function startScan() {
  scannerError.value = "";

  if (isScanning.value) {
    return;
  }

  if (!window.isSecureContext) {
    scannerError.value = "Camera scanning requires HTTPS or localhost.";
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    scannerError.value =
      "This browser does not support camera access for scanning.";
    return;
  }

  const scannerTargetId = "qr-reader";
  isScanning.value = true;
  hasHandledDecode = false;
  await nextTick();

  scannerInstance = new Html5Qrcode(scannerTargetId);

  try {
    await scannerInstance.start(
      { facingMode: "environment" },
      {
        fps: 10,
        qrbox: { width: 260, height: 260 },
      },
      (decodedText) => {
        handleDecodedText(decodedText);
      }
    );
  } catch (error) {
    scannerError.value = error?.message || "Unable to start camera scanning.";
    await stopScan();
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function printBinQr(bin) {
  qrPrintError.value = "";
  printingBinId.value = String(bin.id || "");

  try {
    const qrDataUrl = await QRCode.toDataURL(String(bin.id || ""), {
      width: 320,
      margin: 1,
      errorCorrectionLevel: "M",
    });

    const printWindow = window.open("", "_blank", "width=540,height=700");

    if (!printWindow) {
      throw new Error("Popup blocked. Allow popups to print QR labels.");
    }

    const safeName = escapeHtml(bin.name || bin.id);
    const safeId = escapeHtml(bin.id);

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Bin QR - ${safeId}</title>
          <style>
            body {
              margin: 0;
              padding: 24px;
              font-family: Arial, sans-serif;
              color: #0f172a;
            }
            .label {
              border: 2px solid #0f172a;
              border-radius: 12px;
              max-width: 420px;
              margin: 0 auto;
              padding: 20px;
              text-align: center;
            }
            .title {
              font-size: 48px;
              font-weight: 800;
              line-height: 1.05;
              margin-bottom: 18px;
            }
            img {
              width: 300px;
              height: 300px;
              display: block;
              margin: 0 auto;
            }
          </style>
        </head>
        <body>
          <main class="label">
            <div class="title">${safeName}</div>
            <img src="${qrDataUrl}" alt="QR code for ${safeId}" />
          </main>
          <script>
            window.onload = function () {
              window.print();
            };
          <\/script>
        </body>
      </html>
    `);

    printWindow.document.close();
  } catch (error) {
    qrPrintError.value =
      error?.message || "Unable to generate printable QR label.";
  } finally {
    printingBinId.value = "";
  }
}

const filteredBins = computed(() => {
  const normalizedQuery = searchTerm.value.trim().toLowerCase();

  if (!normalizedQuery) {
    return bins.value;
  }

  return bins.value.filter((bin) => {
    const haystack = [bin.id, bin.name, ...bin.items.map((item) => item.name)]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
});

function openCreate() {
  modalError.value = "";
  showCreateModal.value = true;
}

function openEdit(bin) {
  editingBin.value = bin;
  modalError.value = "";
  showEditModal.value = true;
}

function openDelete(bin) {
  deletingBin.value = bin;
  deleteError.value = "";
  deleteConfirmMessage.value = `Delete "${bin.name}"? This action cannot be undone.`;
  showDeleteConfirm.value = true;
}

async function onCreateSubmit({ name }) {
  isSaving.value = true;
  modalError.value = "";
  const result = await createBin(name);
  isSaving.value = false;
  if (!result.ok) {
    modalError.value = result.error;
    return;
  }
  showCreateModal.value = false;
  await loadBins();
}

async function onEditSubmit({ name }) {
  isSaving.value = true;
  modalError.value = "";
  const result = await updateBinName(editingBin.value.id, name);
  isSaving.value = false;
  if (!result.ok) {
    modalError.value = result.error;
    return;
  }
  showEditModal.value = false;
  editingBin.value = null;
  await loadBins();
}

async function onDeleteConfirm() {
  deleteError.value = "";
  isDeleting.value = true;
  const checkResult = await binHasItems(deletingBin.value.id);
  if (!checkResult.ok) {
    deleteError.value = checkResult.error;
    isDeleting.value = false;
    return;
  }
  if (checkResult.hasItems) {
    deleteError.value = `"${deletingBin.value.name}" still has items attached. Remove all items before deleting this bin.`;
    isDeleting.value = false;
    return;
  }
  const deleteResult = await deleteBin(deletingBin.value.id);
  isDeleting.value = false;
  if (!deleteResult.ok) {
    deleteError.value = deleteResult.error;
    return;
  }
  showDeleteConfirm.value = false;
  deletingBin.value = null;
  deleteConfirmMessage.value = "";
  await loadBins();
}

async function loadBins() {
  if (!hasSupabaseConfig || !supabase) {
    errorMessage.value =
      "Add VITE_SUPABASE_ANON_KEY to load bins from Supabase.";
    isLoading.value = false;
    return;
  }

  isLoading.value = true;
  errorMessage.value = "";

  const [
    { data: binData, error: binError, includesTotals: binsIncludeTotals },
    { data: itemData, error: itemError, includesTotals: itemsIncludeTotals },
  ] = await Promise.all([fetchBinsWithTotals(), fetchItemsWithTotals()]);

  if (binError || itemError) {
    errorMessage.value =
      binError?.message || itemError?.message || "Unable to load bins.";
    bins.value = [];
  } else {
    let variationTotalsByItemId = {};

    if (!binsIncludeTotals || !itemsIncludeTotals) {
      const { data: variationData, error: variationError } = await supabase
        .from("item_variations")
        .select("item_id, quantity");

      if (variationError) {
        errorMessage.value = variationError.message;
        bins.value = [];
        isLoading.value = false;
        return;
      }

      variationTotalsByItemId = (variationData || []).reduce((groupedTotals, variation) => {
        const previousTotal = groupedTotals[variation.item_id] || 0;
        groupedTotals[variation.item_id] =
          previousTotal + normalizeQuantityTotal(variation.quantity);
        return groupedTotals;
      }, {});
    }

    const normalizedItems = (itemData || []).map((item) => ({
      ...item,
      total_quantity: itemsIncludeTotals
        ? normalizeQuantityTotal(item.total_quantity)
        : normalizeQuantityTotal(variationTotalsByItemId[item.id]),
    }));

    const itemsByBinId = normalizedItems.reduce((groupedItems, item) => {
      if (!groupedItems[item.bin_id]) {
        groupedItems[item.bin_id] = [];
      }

      groupedItems[item.bin_id].push(item);
      return groupedItems;
    }, {});

    bins.value = (binData || []).map((bin) => ({
      ...bin,
      items: itemsByBinId[bin.id] || [],
    }));

    // Fetch total item_variations count for display
    try {
      const { data: _d, error: countError, count } = await supabase
        .from('item_variations')
        .select('id', { count: 'exact', head: true });
      totalVariations.value = countError ? null : (count ?? 0);
    } catch (e) {
      totalVariations.value = null;
    }
    bins.value = (binData || []).map((bin) => {
      const groupedItems = itemsByBinId[bin.id] || [];
      const computedBinTotal = groupedItems.reduce(
        (runningTotal, item) => runningTotal + normalizeQuantityTotal(item.total_quantity),
        0,
      );

      return {
        ...bin,
        total_quantity: binsIncludeTotals
          ? normalizeQuantityTotal(bin.total_quantity)
          : computedBinTotal,
        items: groupedItems,
      };
    });
  }

  isLoading.value = false;
}

onMounted(loadBins);
onUnmounted(stopScan);
</script>

<template>
  <div class="card spacious tool-card inventory-card reveal-fade-up">
    <div class="hero inventory-hero">
      <div class="hero-title reveal-fade-up">Search Inventory</div>
      <div class="hero-sub reveal-fade-up reveal-delay-1">
        Search bins by ID or name from Supabase inventory data.
      </div>
      <button class="btn reveal-fade-up reveal-delay-2" type="button" @click="openCreate">
        + Create Bin
      </button>
    </div>
<div class="inventory-total">Total item types: {{ totalVariations === null ? '—' : totalVariations }}</div>
    <div class="inventory-search-panel reveal-fade-up reveal-delay-1">
      <label class="inventory-search-label" for="inventory-search-input"
        >Search bins</label
      >

      <div class="inventory-search-row">
        <input
          id="inventory-search-input"
          v-model="searchTerm"
          class="inventory-search-input"
          type="search"
          placeholder="Try bin-1 or Bin 1"
        />

        <button
          class="inventory-scan-button"
          type="button"
          :aria-label="isScanning ? 'Stop QR scanner' : 'Start QR scanner'"
          @click="isScanning ? stopScan() : startScan()"
        >
          <span class="inventory-scan-icon" aria-hidden="true">CAM</span>
          <span>{{ isScanning ? "Stop" : "Scan" }}</span>
        </button>
      </div>

      <p class="inventory-search-help">
        Scan a printed bin QR code to jump directly to that bin.
      </p>

      <p v-if="scannerError" class="inventory-scan-error">{{ scannerError }}</p>
      <p v-if="qrPrintError" class="inventory-scan-error">{{ qrPrintError }}</p>

      <div v-if="isScanning" class="inventory-scanner-panel">
        <div id="qr-reader" class="inventory-scanner-reader"></div>
      </div>
    </div>

    <div class="inventory-grid reveal-fade-up reveal-delay-2">
      <ShopifyExportVariations />
      <div v-if="isLoading" class="inventory-empty-state">Loading bins...</div>

      <div v-else-if="errorMessage" class="inventory-empty-state">
        {{ errorMessage }}
      </div>

      <article
        v-for="bin in filteredBins"
        :key="bin.id"
        class="inventory-bin-card"
      >
        <router-link
          class="inventory-bin-link"
          :to="`/search-inventory/${bin.id}`"
        >
          <div class="inventory-bin-name">{{ bin.name }}</div>
          <div class="inventory-bin-total">Total quantity: {{ bin.total_quantity ?? 0 }}</div>

          <div class="inventory-bin-summary">Items: {{ bin.items.length }}</div>

          <ul class="inventory-preview-list">
            <li v-for="item in bin.items" :key="item.id">{{ item.name }}</li>
            <li v-if="!bin.items.length" class="inventory-preview-empty">
              No items in this bin.
            </li>
          </ul>
        </router-link>

        <div class="inventory-bin-actions">
          <button
            class="inventory-print-button"
            type="button"
            :disabled="printingBinId === String(bin.id)"
            @click="printBinQr(bin)"
          >
            {{
              printingBinId === String(bin.id)
                ? "Preparing label..."
                : "Print QR Label"
            }}
          </button>
          <button class="inventory-print-button" type="button" @click="openEdit(bin)">
            Edit
          </button>
          <button class="inventory-delete-btn" type="button" @click="openDelete(bin)">
            Delete
          </button>
        </div>
      </article>

      <div
        v-if="!isLoading && !errorMessage && !filteredBins.length"
        class="inventory-empty-state"
      >
        No bins matched that search.
      </div>
    </div>

    <BinFormModal
      v-if="showCreateModal"
      mode="create"
      :is-saving="isSaving"
      :error-message="modalError"
      @submit="onCreateSubmit"
      @cancel="showCreateModal = false; modalError = ''"
    />

    <BinFormModal
      v-if="showEditModal"
      mode="edit"
      :initial-bin="editingBin"
      :is-saving="isSaving"
      :error-message="modalError"
      @submit="onEditSubmit"
      @cancel="showEditModal = false; editingBin = null; modalError = ''"
    />

    <ConfirmModal
      v-if="showDeleteConfirm"
      title="Delete Bin"
      :message="deleteConfirmMessage"
      confirm-label="Delete"
      :is-loading="isDeleting"
      :error-message="deleteError"
      @confirm="onDeleteConfirm"
      @cancel="showDeleteConfirm = false; deletingBin = null; deleteError = ''; deleteConfirmMessage = ''"
    />
  </div>
</template>

<style scoped>
.inventory-card {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.inventory-search-panel {
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
  padding: 18px;
  border: 1px solid rgba(18, 58, 138, 0.1);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 14px 30px rgba(14, 42, 99, 0.06);
}

.inventory-search-label {
  display: block;
  margin-bottom: 10px;
  text-align: left;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #0b63d6;
}

.inventory-search-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.inventory-total {  
  text-align: center;
  font-weight: bold;
}

.inventory-search-input {
  flex: 1;
  min-height: 50px;
  padding: 12px 16px;
  border: 1px solid rgba(18, 58, 138, 0.12);
  border-radius: 14px;
  background: rgba(244, 248, 255, 0.96);
  color: #082145;
  font: inherit;
}

.inventory-scan-button {
  min-height: 50px;
  padding: 0 16px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(18, 58, 138, 0.18);
  border-radius: 14px;
  background: rgba(233, 241, 255, 0.9);
  color: #0a2b67;
  font-weight: 700;
  cursor: pointer;
}

.inventory-scan-icon {
  font-size: 11px;
  letter-spacing: 0.06em;
}

.inventory-scan-button:hover {
  border-color: rgba(37, 99, 235, 0.32);
  background: rgba(215, 230, 255, 0.95);
}

.inventory-search-help {
  margin: 10px 0 0;
  text-align: left;
  color: #4b5563;
  font-size: 14px;
}

.inventory-scan-error {
  margin: 10px 0 0;
  text-align: left;
  color: #b91c1c;
  font-weight: 600;
}

.inventory-scanner-panel {
  margin-top: 14px;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid rgba(18, 58, 138, 0.12);
  background: rgba(244, 248, 255, 0.78);
}

.inventory-scanner-reader {
  width: 100%;
}

:deep(#qr-reader) {
  border: 0 !important;
}

:deep(#qr-reader__dashboard) {
  padding: 8px 0 0;
}

:deep(#qr-reader__status_span) {
  color: #082145;
  font-weight: 600;
}

.inventory-search-input:focus {
  outline: 2px solid rgba(14, 165, 255, 0.22);
  border-color: rgba(37, 99, 235, 0.28);
}

.inventory-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.inventory-bin-card,
.inventory-empty-state {
  min-height: 180px;
  padding: 22px 20px;
  border-radius: 18px;
  border: 1px solid rgba(18, 58, 138, 0.1);
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 16px 34px rgba(14, 42, 99, 0.08);
}

.inventory-bin-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.inventory-bin-link {
  display: flex;
  flex-direction: column;
  gap: 12px;
  color: inherit;
  text-decoration: none;
  transition: transform 0.16s ease, border-color 0.16s ease,
    box-shadow 0.16s ease, background-color 0.16s ease;
}

.inventory-bin-link:hover {
  transform: translateY(-4px);
  border-color: rgba(37, 99, 235, 0.2);
  background: rgba(231, 239, 255, 0.92);
  box-shadow: 0 20px 38px rgba(14, 42, 99, 0.1);
}

.inventory-bin-actions {
  margin-top: auto;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.inventory-delete-btn {
  min-height: 40px;
  padding: 0 14px;
  border-radius: 12px;
  border: 1px solid rgba(220, 38, 38, 0.2);
  background: rgba(255, 238, 238, 0.95);
  color: #991b1b;
  font-weight: 700;
  cursor: pointer;
}

.inventory-delete-btn:hover {
  background: rgba(255, 220, 220, 0.95);
  border-color: rgba(220, 38, 38, 0.35);
}

.inventory-print-button {
  min-height: 40px;
  padding: 0 14px;
  border-radius: 12px;
  border: 1px solid rgba(18, 58, 138, 0.2);
  background: rgba(230, 240, 255, 0.95);
  color: #0a2b67;
  font-weight: 700;
  cursor: pointer;
}

.inventory-print-button:disabled {
  opacity: 0.7;
  cursor: wait;
}

.inventory-bin-name {
  font-size: 22px;
  font-weight: 800;
  color: #082145;
}

.inventory-bin-summary {
  color: #4b5563;
}

.inventory-bin-total {
  font-weight: 700;
  color: #0f1f46;
}

.inventory-preview-list {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 8px;
  color: #0f1f46;
  text-align: left;
}

.inventory-preview-empty {
  color: #6b7280;
}

.inventory-empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  grid-column: 1 / -1;
  color: #4b5563;
  text-align: center;
}

@media (max-width: 900px) {
  .inventory-search-row {
    flex-direction: column;
    align-items: stretch;
  }

  .inventory-scan-button {
    justify-content: center;
  }

  .inventory-grid {
    grid-template-columns: 1fr;
  }
}
</style>