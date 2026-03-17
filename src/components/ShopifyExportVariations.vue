<script setup>
import { ref } from 'vue';
const props = defineProps({ compact: { type: Boolean, default: false } });
import { hasSupabaseConfig, supabase } from '../lib/supabase';
import { downloadCsv } from '../lib/downloadCsv';

const isProcessing = ref(false);
const error = ref('');
const defaultLocation = '1400 S International Pkwy, Lake Mary, Florida, 32746';

function slugify(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function escapeCsvValue(value) {
  return `"${String(value || '').replace(/"/g, '""')}"`;
}

async function exportShopifyFromVariations() {
  error.value = '';
  if (!hasSupabaseConfig || !supabase) {
    error.value = 'Supabase not configured. Add VITE_SUPABASE_ANON_KEY to use export.';
    return;
  }

  isProcessing.value = true;
  try {
    const { data, error: fetchError } = await supabase
      .from('item_variations')
      .select('*')
      .order('item_id', { ascending: true })
      .order('item_name', { ascending: true });

    if (fetchError) throw fetchError;
    if (!data || !data.length) throw new Error('No item_variations found.');

    // Group by item_id to set Title on the first variation only
    const groups = data.reduce((g, v) => {
      const id = v.item_id ?? 'no-id';
      if (!g[id]) g[id] = [];
      g[id].push(v);
      return g;
    }, {});

    // Updated Shopify header set (minimal) — user requested mapping to these columns
    const headers = [
      'Handle', 'Title',
      'Option1 Name', 'Option1 Value',
      'Option2 Name', 'Option2 Value',
      'Option3 Name', 'Option3 Value',
      'Location', 'SKU', 'On hand (new)', 'Variant Price'
    ];

    const rows = [headers];

    Object.keys(groups).forEach((itemId) => {
      const group = groups[itemId] || [];

      // Sort variations by size when available: XXS, XS, S, M, L, XL, XXL
      const sizeOrder = ['xxs', 'xs', 's', 'm', 'l', 'xl', 'xxl'];
      const sizeIndex = (v) => {
        const s = (v.size || '').toString().trim().toLowerCase();
        const normalized = s.replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
        const idx = sizeOrder.indexOf(normalized);
        return idx === -1 ? 999 : idx;
      };

      group.sort((a, b) => {
        const ia = sizeIndex(a);
        const ib = sizeIndex(b);
        if (ia !== ib) return ia - ib;
        // fallbacks for stable ordering
        const ca = (a.color || '').localeCompare(b.color || '');
        if (ca !== 0) return ca;
        const sa = (a.style || '').localeCompare(b.style || '');
        if (sa !== 0) return sa;
        return (a.sku || '').localeCompare(b.sku || '');
      });

      group.forEach((variation, idx) => {
        const itemName = (variation.item_name || '').toString().trim();
        const handle = slugify(itemName || itemId);
        const title = idx === 0 ? itemName : '';

        // Normalize option fields and build ordered options array in priority Size > Color > Style
        const sizeVal = (variation.size || '').toString().trim();
        const colorVal = (variation.color || '').toString().trim();
        const styleVal = (variation.style || '').toString().trim();

        const optionPairs = [];
        if (sizeVal) optionPairs.push({ name: 'Size', value: sizeVal });
        if (colorVal) optionPairs.push({ name: 'Color', value: colorVal });
        if (styleVal) optionPairs.push({ name: 'Style', value: styleVal });

        const opt1 = optionPairs[0] || { name: '', value: '' };
        const opt2 = optionPairs[1] || { name: '', value: '' };
        const opt3 = optionPairs[2] || { name: '', value: '' };

        const row = [
          handle, // Handle
          title, // Title only for first variant in group
          opt1.name, // Option1 Name
          opt1.value, // Option1 Value
          opt2.name, // Option2 Name
          opt2.value, // Option2 Value
          opt3.name, // Option3 Name
          opt3.value, // Option3 Value
          defaultLocation, // Location (set default per request)
          variation.sku || '', // SKU
          variation.quantity != null ? String(variation.quantity) : '', // On hand (new)
          variation.price != null ? String(variation.price) : '', // Variant Price (from DB.price)
        ];

        rows.push(row);
      });
    });

    const csvText = rows.map((r) => r.map((v) => escapeCsvValue(v)).join(',')).join('\r\n');
    downloadCsv(csvText, 'shopify_item_variations_export.csv');
  } catch (err) {
    error.value = err?.message || String(err);
  } finally {
    isProcessing.value = false;
  }
}
</script>

<template>
  <div v-if="!props.compact" class="card spacious tool-card export-shopify-card reveal-fade-up">
    <div class="export-header">
      <div class="export-title">Export item_variations → Shopify CSV</div>
      <div class="export-sub">Exports the `item_variations` table with minimal Shopify fields for testing.</div>
    </div>

    <div class="export-actions">
      <button class="btn" :disabled="isProcessing" @click="exportShopifyFromVariations">
        {{ isProcessing ? 'Exporting…' : 'Export Shopify CSV' }}
      </button>
      <div v-if="error" class="export-error">{{ error }}</div>
    </div>
  </div>

  <button v-else class="btn" :disabled="isProcessing" @click="exportShopifyFromVariations">
    {{ isProcessing ? 'Exporting…' : 'Export Shopify CSV' }}
  </button>
</template>

<style scoped>
.export-shopify-card { padding: 18px; border-radius: 12px; border: 1px solid rgba(18,58,138,0.08); background: rgba(255,255,255,0.9); }
.export-header { margin-bottom: 12px; }
.export-title { font-weight: 800; font-size: 15px; }
.export-sub { font-size: 13px; color: #374151; }
.export-actions { display:flex; gap:12px; align-items:center; }
.export-error { color: #b91c1c; font-size: 13px; }

.export-compact { display: inline-flex; align-items: center; }
.export-compact .btn { min-height: 40px; padding: 8px 12px; }
</style>
