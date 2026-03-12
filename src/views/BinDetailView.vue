<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { hasSupabaseConfig, supabase } from '../lib/supabase';
import { updateBinName, deleteBin } from '../lib/binCrud';
import { createItem, updateItem, deleteItem } from '../lib/itemCrud';
import { createVariation, updateVariation, deleteVariation } from '../lib/variationCrud';
import BinFormModal from '../components/BinFormModal.vue';
import ConfirmModal from '../components/ConfirmModal.vue';
import ItemFormModal from '../components/ItemFormModal.vue';
import VariationFormModal from '../components/VariationFormModal.vue';

const route = useRoute();
const router = useRouter();
const bin = ref(null);
const items = ref([]);
const availableBins = ref([]);
const variationsByItemId = ref({});
const expandedItems = ref({});
const isLoading = ref(true);
const errorMessage = ref('');

const showEditModal = ref(false);
const isSaving = ref(false);
const modalError = ref('');
const showDeleteConfirm = ref(false);
const isDeleting = ref(false);
const deleteError = ref('');
const deleteConfirmMessage = ref('');

const showCreateItemModal = ref(false);
const showEditItemModal = ref(false);
const editingItem = ref(null);
const isItemSaving = ref(false);
const itemModalError = ref('');
const showDeleteItemConfirm = ref(false);
const deletingItem = ref(null);
const isItemDeleting = ref(false);
const itemDeleteError = ref('');
const itemDeleteMessage = ref('');

const showCreateVariationModal = ref(false);
const showEditVariationModal = ref(false);
const selectedVariationItem = ref(null);
const editingVariation = ref(null);
const isVariationSaving = ref(false);
const variationModalError = ref('');
const showDeleteVariationConfirm = ref(false);
const deletingVariation = ref(null);
const deletingVariationItem = ref(null);
const isVariationDeleting = ref(false);
const variationDeleteError = ref('');
const variationDeleteMessage = ref('');

const binId = computed(() => route.params.id);

const sizeOrder = { XXS: 0, XS: 1, S: 2, M: 3, L: 4, XL: 5, XXL: 6 };

function sortVariations(variations) {
  return [...variations].sort((a, b) => {
    const aSize = a.size || '';
    const bSize = b.size || '';
    const aSizeIndex = sizeOrder[aSize] ?? 999;
    const bSizeIndex = sizeOrder[bSize] ?? 999;

    if (aSizeIndex !== bSizeIndex) {
      return aSizeIndex - bSizeIndex;
    }

    const aSku = a.sku || '';
    const bSku = b.sku || '';
    return aSku.localeCompare(bSku);
  });
}

function normalizeQuantityTotal(value, fallback = 0) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

async function fetchBinRecord() {
  const withTotalsResult = await supabase
    .from('bins')
    .select('id, name, total_quantity')
    .eq('id', binId.value)
    .maybeSingle();

  if (withTotalsResult.error && /total_quantity|column/i.test(withTotalsResult.error.message || '')) {
    return supabase.from('bins').select('id, name').eq('id', binId.value).maybeSingle();
  }

  return withTotalsResult;
}

async function fetchItemsForBin() {
  const withTotalsResult = await supabase
    .from('items')
    .select('id, name, bin_id, total_quantity')
    .eq('bin_id', binId.value)
    .order('name', { ascending: true });

  if (withTotalsResult.error && /total_quantity|column/i.test(withTotalsResult.error.message || '')) {
    return supabase
      .from('items')
      .select('id, name, bin_id')
      .eq('bin_id', binId.value)
      .order('name', { ascending: true });
  }

  return withTotalsResult;
}

async function loadBinDetail(options = {}) {
  const expandedItemIds = Array.isArray(options.expandedItemIds) ? options.expandedItemIds : [];

  if (!hasSupabaseConfig || !supabase) {
    errorMessage.value = 'Add VITE_SUPABASE_ANON_KEY to load bin data from Supabase.';
    isLoading.value = false;
    return;
  }

  isLoading.value = true;
  errorMessage.value = '';

  const [
    { data: binOptionsData, error: binOptionsError },
    { data: binData, error: binError },
    { data: itemData, error: itemError }
  ] = await Promise.all([
    supabase.from('bins').select('id, name').order('name', { ascending: true }),
    fetchBinRecord(),
    fetchItemsForBin(),
  ]);

  if (binOptionsError || binError || itemError) {
    errorMessage.value = binOptionsError?.message || binError?.message || itemError?.message || 'Unable to load bin data.';
    bin.value = null;
    items.value = [];
    availableBins.value = [];
    variationsByItemId.value = {};
    expandedItems.value = {};
  } else {
    bin.value = binData ? { ...binData } : null;
    items.value = (itemData || []).map((item) => ({
      ...item,
      total_quantity: normalizeQuantityTotal(item.total_quantity),
    }));
    availableBins.value = binOptionsData || [];

    const itemIds = (itemData || []).map((item) => item.id);

    if (itemIds.length) {
      const { data: variationData, error: variationError } = await supabase
        .from('item_variations')
        .select('id, item_id, item_name, quantity, price, sku, color, style, size')
        .in('item_id', itemIds);

      if (variationError) {
        errorMessage.value = variationError.message;
        variationsByItemId.value = {};
      } else {
        variationsByItemId.value = (variationData || []).reduce((groupedVariations, variation) => {
          if (!groupedVariations[variation.item_id]) {
            groupedVariations[variation.item_id] = [];
          }

          groupedVariations[variation.item_id].push(variation);
          return groupedVariations;
        }, {});

        const itemTotalsById = (variationData || []).reduce((groupedTotals, variation) => {
          const previousTotal = groupedTotals[variation.item_id] || 0;
          groupedTotals[variation.item_id] = previousTotal + normalizeQuantityTotal(variation.quantity);
          return groupedTotals;
        }, {});

        items.value = items.value.map((item) => ({
          ...item,
          total_quantity: itemTotalsById[item.id] ?? normalizeQuantityTotal(item.total_quantity),
        }));
      }

        Object.keys(variationsByItemId.value).forEach((itemId) => {
          variationsByItemId.value[itemId] = sortVariations(variationsByItemId.value[itemId]);
        });
    } else {
      variationsByItemId.value = {};
    }

    const computedBinTotal = items.value.reduce(
      (runningTotal, item) => runningTotal + normalizeQuantityTotal(item.total_quantity),
      0,
    );

    if (bin.value) {
      bin.value = {
        ...bin.value,
        total_quantity: normalizeQuantityTotal(bin.value.total_quantity, computedBinTotal),
      };
    }

    expandedItems.value = expandedItemIds.reduce((groupedExpandedItems, itemId) => {
      groupedExpandedItems[itemId] = true;
      return groupedExpandedItems;
    }, {});
  }

  isLoading.value = false;
}

function toggleItem(itemId) {
  expandedItems.value = {
    ...expandedItems.value,
    [itemId]: !expandedItems.value[itemId]
  };
}

function formatPrice(value) {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return n.toFixed(2);
}

function itemVariations(itemId) {
  return variationsByItemId.value[itemId] || [];
}

function formatVariationPrice(value) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return '—';
  }

  return `$${numericValue.toFixed(2)}`;
}

function openCreateItem() {
  itemModalError.value = '';
  editingItem.value = null;
  showCreateItemModal.value = true;
}

function openEditItem(item) {
  itemModalError.value = '';
  editingItem.value = item;
  showEditItemModal.value = true;
}

function openDeleteItem(item) {
  itemDeleteError.value = '';
  deletingItem.value = item;
  itemDeleteMessage.value = `Delete "${item.name}" and all variations in it? This action cannot be undone.`;
  showDeleteItemConfirm.value = true;
}

function closeItemModal() {
  showCreateItemModal.value = false;
  showEditItemModal.value = false;
  editingItem.value = null;
  itemModalError.value = '';
}

function closeItemDeleteConfirm() {
  showDeleteItemConfirm.value = false;
  deletingItem.value = null;
  itemDeleteError.value = '';
  itemDeleteMessage.value = '';
}

async function onCreateItemSubmit({ name, binId: targetBinId }) {
  isItemSaving.value = true;
  itemModalError.value = '';
  const result = await createItem({ name, binId: targetBinId });
  isItemSaving.value = false;

  if (!result.ok) {
    itemModalError.value = result.error;
    return;
  }

  closeItemModal();
  await loadBinDetail({
    expandedItemIds: targetBinId === binId.value && result.data?.id ? [result.data.id] : [],
  });
}

async function onEditItemSubmit({ name, binId: targetBinId }) {
  isItemSaving.value = true;
  itemModalError.value = '';
  const result = await updateItem({ id: editingItem.value?.id, name, binId: targetBinId });
  isItemSaving.value = false;

  if (!result.ok) {
    itemModalError.value = result.error;
    return;
  }

  closeItemModal();
  await loadBinDetail({
    expandedItemIds: targetBinId === binId.value && result.data?.id ? [result.data.id] : [],
  });
}

async function onDeleteItemConfirm() {
  itemDeleteError.value = '';
  isItemDeleting.value = true;

  const deleteResult = await deleteItem(deletingItem.value?.id);
  isItemDeleting.value = false;

  if (!deleteResult.ok) {
    itemDeleteError.value = deleteResult.error;
    return;
  }

  closeItemDeleteConfirm();
  await loadBinDetail();
}

function openCreateVariation(item) {
  variationModalError.value = '';
  selectedVariationItem.value = item;
  editingVariation.value = null;
  showCreateVariationModal.value = true;
}

function openEditVariation(item, variation) {
  variationModalError.value = '';
  selectedVariationItem.value = item;
  editingVariation.value = variation;
  showEditVariationModal.value = true;
}

function openDeleteVariation(item, variation) {
  variationDeleteError.value = '';
  deletingVariation.value = variation;
  deletingVariationItem.value = item;
  variationDeleteMessage.value = `Delete this variation from "${item.name}"? This action cannot be undone.`;
  showDeleteVariationConfirm.value = true;
}

function closeVariationModal() {
  showCreateVariationModal.value = false;
  showEditVariationModal.value = false;
  selectedVariationItem.value = null;
  editingVariation.value = null;
  variationModalError.value = '';
}

function closeVariationDeleteConfirm() {
  showDeleteVariationConfirm.value = false;
  deletingVariation.value = null;
  deletingVariationItem.value = null;
  variationDeleteError.value = '';
  variationDeleteMessage.value = '';
}

async function onCreateVariationSubmit(values) {
  isVariationSaving.value = true;
  variationModalError.value = '';

  const result = await createVariation({
    itemId: selectedVariationItem.value?.id,
    itemName: selectedVariationItem.value?.name,
    ...values,
  });

  isVariationSaving.value = false;

  if (!result.ok) {
    variationModalError.value = result.error;
    return;
  }

  const expandedItemId = selectedVariationItem.value?.id;
  closeVariationModal();
  await loadBinDetail({ expandedItemIds: expandedItemId ? [expandedItemId] : [] });
}

async function onEditVariationSubmit(values) {
  isVariationSaving.value = true;
  variationModalError.value = '';

  const result = await updateVariation({
    id: editingVariation.value?.id,
    itemId: selectedVariationItem.value?.id,
    itemName: selectedVariationItem.value?.name,
    ...values,
  });

  isVariationSaving.value = false;

  if (!result.ok) {
    variationModalError.value = result.error;
    return;
  }

  const expandedItemId = selectedVariationItem.value?.id;
  closeVariationModal();
  await loadBinDetail({ expandedItemIds: expandedItemId ? [expandedItemId] : [] });
}

async function onDeleteVariationConfirm() {
  variationDeleteError.value = '';
  isVariationDeleting.value = true;

  const deleteResult = await deleteVariation(deletingVariation.value?.id);
  isVariationDeleting.value = false;

  if (!deleteResult.ok) {
    variationDeleteError.value = deleteResult.error;
    return;
  }

  const expandedItemId = deletingVariationItem.value?.id;
  closeVariationDeleteConfirm();
  await loadBinDetail({ expandedItemIds: expandedItemId ? [expandedItemId] : [] });
}

function openEdit() {
  modalError.value = '';
  showEditModal.value = true;
}

function openDelete() {
  deleteError.value = '';
  deleteConfirmMessage.value = `Delete "${bin.value?.name}" and all items/variations in it? This action cannot be undone.`;
  showDeleteConfirm.value = true;
}

async function onEditSubmit({ name }) {
  isSaving.value = true;
  modalError.value = '';
  const result = await updateBinName(binId.value, name);
  isSaving.value = false;
  if (!result.ok) {
    modalError.value = result.error;
    return;
  }
  showEditModal.value = false;
  await loadBinDetail();
}

async function onDeleteConfirm() {
  deleteError.value = '';
  isDeleting.value = true;
  const deleteResult = await deleteBin(binId.value);
  isDeleting.value = false;
  if (!deleteResult.ok) {
    deleteError.value = deleteResult.error;
    return;
  }
  showDeleteConfirm.value = false;
  deleteError.value = '';
  deleteConfirmMessage.value = '';
  await router.push('/search-inventory');
}

watch(binId, () => {
  loadBinDetail();
});
onMounted(loadBinDetail);
</script>

<template>
  <div class="card spacious tool-card inventory-detail-card reveal-fade-up">
    <div v-if="isLoading" class="inventory-detail-empty reveal-fade-up">
      <div class="hero-title">Loading Bin...</div>
    </div>

    <div v-else-if="bin" class="inventory-detail-shell">
      <div class="inventory-detail-header reveal-fade-up">
        <div>
          <div class="inventory-detail-kicker">Search Inventory</div>
          <div class="hero-title inventory-detail-title">{{ bin.name }}</div>
          <div class="inventory-detail-qty">Total quantity: {{ bin.total_quantity ?? 0 }}</div>
        </div>

        <div class="inventory-detail-header-actions">
          <button class="btn secondary" type="button" @click="openEdit">Edit</button>
          <button class="inventory-action-delete-btn" type="button" @click="openDelete">Delete</button>
          <router-link class="btn secondary" to="/search-inventory">Back to Search</router-link>
        </div>
      </div>

      <div class="inventory-detail-panel reveal-fade-up reveal-delay-1">
        <div class="inventory-detail-section-header">
          <div>
            <div class="inventory-detail-section-title">Inventory</div>
            <div class="inventory-detail-subtitle">Manage items and their variations for this bin.</div>
          </div>

          <button class="btn" type="button" @click="openCreateItem">+ Add Item</button>
        </div>

        <div v-if="items.length" class="inventory-item-list">
          <div v-for="item in items" :key="item.id" class="inventory-item-card">
            <div class="inventory-item-header">
              <button class="inventory-item-toggle" type="button" @click="toggleItem(item.id)">
                <span class="inventory-item-name-shell">
                  <span class="inventory-item-name">{{ item.name }}</span>
                  <span class="inventory-item-total">Total: {{ item.total_quantity ?? 0 }}</span>
                </span>
                <span class="inventory-item-toggle-label">
                  {{ expandedItems[item.id] ? 'Hide variations' : 'Show variations' }}
                </span>
              </button>

              <div class="inventory-entity-actions">
                <button class="inventory-entity-button" type="button" @click="openCreateVariation(item)">
                  + Variation
                </button>
                <button class="inventory-entity-button" type="button" @click="openEditItem(item)">
                  Edit
                </button>
                <button class="inventory-entity-delete" type="button" @click="openDeleteItem(item)">
                  Delete
                </button>
              </div>
            </div>

            <div v-if="expandedItems[item.id]" class="inventory-variation-panel">
              <div v-if="itemVariations(item.id).length" class="inventory-variation-list">
                <div v-for="variation in itemVariations(item.id)" :key="variation.id" class="inventory-variation-card">
                  <div class="inventory-variation-fields">
                    <div><strong>SKU:</strong> {{ variation.sku || '—' }}</div>
                    <div><strong>Quantity:</strong> {{ variation.quantity ?? '—' }}</div>
                    <div><strong>Price:</strong> {{ formatVariationPrice(variation.price) }}</div>
                    <div><strong>Color:</strong> {{ variation.color || '—' }}</div>
                    <div><strong>Style:</strong> {{ variation.style || '—' }}</div>
                    <div><strong>Size:</strong> {{ variation.size || '—' }}</div>
                  </div>

                  <div class="inventory-variation-actions">
                    <button class="inventory-entity-button" type="button" @click="openEditVariation(item, variation)">
                      Edit
                    </button>
                    <button class="inventory-entity-delete" type="button" @click="openDeleteVariation(item, variation)">
                      Delete
                    </button>
                  </div>
                </div>
              </div>

              <div v-else class="inventory-detail-no-items inventory-detail-no-items-inline">
                No variations found for this item.
              </div>
            </div>
          </div>
        </div>

        <div v-else class="inventory-detail-no-items">
          No items are attached to this bin.
        </div>
      </div>
    </div>

    <div v-else class="inventory-detail-empty reveal-fade-up">
      <div class="hero-title">Bin Not Found</div>
      <div class="hero-sub">{{ errorMessage || 'That bin ID does not exist in Supabase.' }}</div>
      <router-link class="btn" to="/search-inventory">Back to Search</router-link>
    </div>

    <BinFormModal
      v-if="showEditModal"
      mode="edit"
      :initial-bin="bin"
      :is-saving="isSaving"
      :error-message="modalError"
      @submit="onEditSubmit"
      @cancel="showEditModal = false; modalError = ''"
    />

    <ItemFormModal
      v-if="showCreateItemModal"
      mode="create"
      :bins="availableBins"
      :default-bin-id="binId"
      :is-saving="isItemSaving"
      :error-message="itemModalError"
      @submit="onCreateItemSubmit"
      @cancel="closeItemModal"
    />

    <ItemFormModal
      v-if="showEditItemModal"
      mode="edit"
      :initial-item="editingItem"
      :bins="availableBins"
      :default-bin-id="binId"
      :is-saving="isItemSaving"
      :error-message="itemModalError"
      @submit="onEditItemSubmit"
      @cancel="closeItemModal"
    />

    <VariationFormModal
      v-if="showCreateVariationModal"
      mode="create"
      :item-name="selectedVariationItem?.name || ''"
      :is-saving="isVariationSaving"
      :error-message="variationModalError"
      @submit="onCreateVariationSubmit"
      @cancel="closeVariationModal"
    />

    <VariationFormModal
      v-if="showEditVariationModal"
      mode="edit"
      :item-name="selectedVariationItem?.name || ''"
      :initial-variation="editingVariation"
      :is-saving="isVariationSaving"
      :error-message="variationModalError"
      @submit="onEditVariationSubmit"
      @cancel="closeVariationModal"
    />

    <ConfirmModal
      v-if="showDeleteConfirm"
      title="Delete Bin"
      :message="deleteConfirmMessage"
      confirm-label="Delete"
      :is-loading="isDeleting"
      :error-message="deleteError"
      @confirm="onDeleteConfirm"
      @cancel="showDeleteConfirm = false; deleteError = ''; deleteConfirmMessage = ''"
    />

    <ConfirmModal
      v-if="showDeleteItemConfirm"
      title="Delete Item"
      :message="itemDeleteMessage"
      confirm-label="Delete"
      :is-loading="isItemDeleting"
      :error-message="itemDeleteError"
      @confirm="onDeleteItemConfirm"
      @cancel="closeItemDeleteConfirm"
    />

    <ConfirmModal
      v-if="showDeleteVariationConfirm"
      title="Delete Variation"
      :message="variationDeleteMessage"
      confirm-label="Delete"
      :is-loading="isVariationDeleting"
      :error-message="variationDeleteError"
      @confirm="onDeleteVariationConfirm"
      @cancel="closeVariationDeleteConfirm"
    />
  </div>
</template>

<style scoped>
.inventory-detail-card {
  display: flex;
  flex-direction: column;
}

.inventory-detail-shell,
.inventory-detail-empty {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.inventory-detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.inventory-detail-header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.inventory-action-delete-btn {
  min-height: 46px;
  padding: 0 18px;
  border-radius: 12px;
  border: 1px solid rgba(220, 38, 38, 0.2);
  background: rgba(255, 238, 238, 0.95);
  color: #991b1b;
  font-weight: 700;
  cursor: pointer;
}

.inventory-action-delete-btn:hover {
  background: rgba(255, 220, 220, 0.95);
  border-color: rgba(220, 38, 38, 0.35);
}

.inventory-detail-kicker,
.inventory-detail-section-title {
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #0b63d6;
}

.inventory-detail-title {
  text-align: left;
}

.inventory-detail-qty {
  margin-top: 6px;
  text-align: left;
  font-weight: 700;
  color: #0f1f46;
}

.inventory-detail-subtitle {
  text-align: left;
}

.inventory-detail-panel {
  padding: 22px;
  border-radius: 20px;
  border: 1px solid rgba(18, 58, 138, 0.1);
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 18px 36px rgba(14, 42, 99, 0.08);
}

.inventory-detail-section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.inventory-item-list {
  display: grid;
  gap: 14px;
  margin-top: 16px;
}

.inventory-item-card {
  border: 1px solid rgba(18, 58, 138, 0.08);
  border-radius: 16px;
  background: rgba(244, 248, 255, 0.72);
  overflow: hidden;
}

.inventory-item-header {
  display: flex;
  align-items: stretch;
  gap: 12px;
  padding: 14px 18px;
}

.inventory-item-toggle {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #082145;
  text-align: left;
  cursor: pointer;
}

.inventory-entity-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.inventory-entity-button,
.inventory-entity-delete {
  min-height: 38px;
  padding: 0 12px;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
}

.inventory-entity-button {
  border: 1px solid rgba(18, 58, 138, 0.18);
  background: rgba(230, 240, 255, 0.95);
  color: #0a2b67;
}

.inventory-entity-delete {
  border: 1px solid rgba(220, 38, 38, 0.2);
  background: rgba(255, 238, 238, 0.95);
  color: #991b1b;
}

.inventory-item-name {
  font-size: 18px;
  font-weight: 700;
}

.inventory-item-name-shell {
  display: inline-flex;
  align-items: baseline;
  gap: 10px;
}

.inventory-item-total {
  font-size: 13px;
  font-weight: 700;
  color: #33578f;
}

.inventory-item-toggle-label {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #0b63d6;
  flex-shrink: 0;
}

.inventory-variation-panel {
  padding: 0 18px 18px;
}

.inventory-variation-list {
  display: grid;
  gap: 10px;
}

.inventory-variation-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(18, 58, 138, 0.08);
}

.inventory-variation-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 16px;
  flex: 1;
}

.inventory-variation-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.inventory-detail-no-items {
  padding: 18px 0 4px;
  color: #4b5563;
  text-align: center;
}

.inventory-detail-no-items-inline {
  padding-bottom: 0;
}

.inventory-detail-empty {
  align-items: center;
  text-align: center;
}

@media (max-width: 640px) {
  .inventory-detail-header {
    flex-direction: column;
    align-items: stretch;
  }

  .inventory-detail-header-actions {
    justify-content: flex-start;
  }

  .inventory-detail-section-header,
  .inventory-item-header,
  .inventory-variation-card {
    flex-direction: column;
    align-items: stretch;
  }

  .inventory-entity-actions,
  .inventory-variation-actions {
    justify-content: flex-start;
  }

  .inventory-detail-header .btn,
  .inventory-action-delete-btn {
    width: 100%;
    max-width: 320px;
  }

  .inventory-item-toggle {
    flex-direction: column;
    align-items: flex-start;
  }

  .inventory-variation-card {
    grid-template-columns: 1fr;
  }
}
</style>