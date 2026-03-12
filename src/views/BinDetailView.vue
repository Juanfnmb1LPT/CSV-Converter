<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { hasSupabaseConfig, supabase } from '../lib/supabase';

const route = useRoute();
const bin = ref(null);
const items = ref([]);
const variationsByItemId = ref({});
const expandedItems = ref({});
const isLoading = ref(true);
const errorMessage = ref('');

const binId = computed(() => route.params.id);

async function loadBinDetail() {
  if (!hasSupabaseConfig || !supabase) {
    errorMessage.value = 'Add VITE_SUPABASE_ANON_KEY to load bin data from Supabase.';
    isLoading.value = false;
    return;
  }

  isLoading.value = true;
  errorMessage.value = '';

  const [{ data: binData, error: binError }, { data: itemData, error: itemError }] = await Promise.all([
    supabase.from('bins').select('id, name').eq('id', binId.value).maybeSingle(),
    supabase.from('items').select('id, name, bin_id').eq('bin_id', binId.value).order('name', { ascending: true })
  ]);

  if (binError || itemError) {
    errorMessage.value = binError?.message || itemError?.message || 'Unable to load bin data.';
    bin.value = null;
    items.value = [];
    variationsByItemId.value = {};
    expandedItems.value = {};
  } else {
    bin.value = binData;
    items.value = itemData || [];

    const itemIds = (itemData || []).map((item) => item.id);

    if (itemIds.length) {
      const { data: variationData, error: variationError } = await supabase
        .from('item_variations')
        .select('item_id, item_name, quantity, sku, color, style, size')
        .in('item_id', itemIds)
        .order('item_name', { ascending: true });

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
      }
    } else {
      variationsByItemId.value = {};
    }

    expandedItems.value = {};
  }

  isLoading.value = false;
}

function toggleItem(itemId) {
  expandedItems.value = {
    ...expandedItems.value,
    [itemId]: !expandedItems.value[itemId]
  };
}

function itemVariations(itemId) {
  return variationsByItemId.value[itemId] || [];
}

watch(binId, loadBinDetail);
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
        </div>

        <router-link class="btn secondary" to="/search-inventory">Back to Search</router-link>
      </div>

      <div class="inventory-detail-panel reveal-fade-up reveal-delay-1">
        <div class="inventory-detail-section-title">Inventory</div>

        <div v-if="items.length" class="inventory-item-list">
          <div v-for="item in items" :key="item.id" class="inventory-item-card">
            <button class="inventory-item-toggle" type="button" @click="toggleItem(item.id)">
              <span class="inventory-item-name">{{ item.name }}</span>
              <span class="inventory-item-toggle-label">
                {{ expandedItems[item.id] ? 'Hide variations' : 'Show variations' }}
              </span>
            </button>

            <div v-if="expandedItems[item.id]" class="inventory-variation-panel">
              <div v-if="itemVariations(item.id).length" class="inventory-variation-list">
                <div v-for="variation in itemVariations(item.id)" :key="`${item.id}-${variation.sku}-${variation.size}-${variation.color}`" class="inventory-variation-card">
                  <div><strong>SKU:</strong> {{ variation.sku || '—' }}</div>
                  <div><strong>Quantity:</strong> {{ variation.quantity ?? '—' }}</div>
                  <div><strong>Color:</strong> {{ variation.color || '—' }}</div>
                  <div><strong>Style:</strong> {{ variation.style || '—' }}</div>
                  <div><strong>Size:</strong> {{ variation.size || '—' }}</div>
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

.inventory-item-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 18px;
  border: 0;
  background: transparent;
  color: #082145;
  text-align: left;
  cursor: pointer;
}

.inventory-item-name {
  font-size: 18px;
  font-weight: 700;
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
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 16px;
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(18, 58, 138, 0.08);
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

  .inventory-detail-header .btn {
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