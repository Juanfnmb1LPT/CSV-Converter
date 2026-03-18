<script setup>
import { ref } from 'vue';
import { updateDatabaseFromShopifyFile } from '../lib/updateInventoryFromShopify';
import { updateDatabaseFromSquareFile } from '../lib/updateInventoryFromSquare';

const shopifyFile = ref(null);
const shopifyName = ref('No file chosen');
const shopifyInput = ref(null);
const squareFile = ref(null);
const squareName = ref('No file chosen');
const squareInput = ref(null);
const isProcessingSquare = ref(false);
const resultMessageSquare = ref('');
const errorSquare = ref('');
const isProcessing = ref(false);
const resultMessage = ref('');
const error = ref('');

function onShopifyChange(e) {
  const file = e.target.files?.[0] || null;
  shopifyFile.value = file;
  shopifyName.value = file ? file.name : 'No file chosen';
}

function onSquareChange(e) {
  const file = e.target.files?.[0] || null;
  squareFile.value = file;
  squareName.value = file ? file.name : 'No file chosen';
}

async function onUpdateShopify() {
  error.value = '';
  resultMessage.value = '';
  if (!shopifyFile.value) {
    error.value = 'Please choose a Shopify CSV/XLSX file first.';
    return;
  }

  isProcessing.value = true;
  try {
    const res = await updateDatabaseFromShopifyFile(shopifyFile.value);
    const parts = [];
    parts.push(`Upload was a success. ${res.updatedCount} variation${res.updatedCount === 1 ? '' : 's'} matched`);
    if (res.notFound && res.notFound.length) parts.push(`${res.notFound.length} SKU${res.notFound.length === 1 ? '' : 's'} not found`);
    if (res.invalidQty && res.invalidQty.length) parts.push(`${res.invalidQty.length} invalid quantity rows`);
    resultMessage.value = parts.join(' — ');
    // clear the file input so the same file can be uploaded again if desired
    try {
      shopifyFile.value = null;
      shopifyName.value = 'No file chosen';
      if (shopifyInput && shopifyInput.value) shopifyInput.value.value = null;
    } catch (e) {
      // non-fatal
    }
  } catch (err) {
    error.value = err?.message || String(err);
  } finally {
    isProcessing.value = false;
  }
}

async function onUpdateSquare() {
  errorSquare.value = '';
  resultMessageSquare.value = '';
  if (!squareFile.value) {
    errorSquare.value = 'Please choose a Square CSV/XLSX file first.';
    return;
  }

  isProcessingSquare.value = true;
  try {
    const res = await updateDatabaseFromSquareFile(squareFile.value);
    const parts = [];
    parts.push(`Upload was a success. ${res.updatedCount} variation${res.updatedCount === 1 ? '' : 's'} matched`);
    if (res.notFound && res.notFound.length) parts.push(`${res.notFound.length} SKU${res.notFound.length === 1 ? '' : 's'} not found`);
    if (res.invalidQty && res.invalidQty.length) parts.push(`${res.invalidQty.length} invalid quantity rows`);
    resultMessageSquare.value = parts.join(' — ');

    // clear the file input
    try {
      squareFile.value = null;
      squareName.value = 'No file chosen';
      if (squareInput && squareInput.value) squareInput.value.value = null;
    } catch (e) {
      // non-fatal
    }
  } catch (err) {
    errorSquare.value = err?.message || String(err);
  } finally {
    isProcessingSquare.value = false;
  }
}
</script>

<template>
  <div class="card spacious tool-card">
    <div class="hero">
      <div class="hero-title reveal-fade-up">Update Inventory </div>
      <div class="hero-sub reveal-fade-up reveal-delay-1">Update our database inventory from Shopify or Square. Choose a workflow to continue.</div>
    </div>

    <div class="note instruction-panel reveal-fade-up reveal-delay-1">
      <strong>Overview</strong>
      <p>Use the left workflow to update inventory from Shopify, or the right workflow to update from Square. Upload the exported CSV and click the update button. </p>
    </div>

    <div class="update-grid">
      <section class="update-column reveal-fade-up reveal-delay-1">
        <h3>Shopify → Database</h3>

        <div class="note">
          <ol>
            <li>Download the CSV export from Shopify containing current quantities.</li>
            <li>Upload the Shopify CSV file below.</li>
            <li>Click <strong>Update Inventory (From Shopify)</strong> to apply changes to the database.</li>
          </ol>
        </div>

        <label class="file-control">
          <span class="file-btn">Choose File</span>
          <span class="file-name">{{ shopifyName }}</span>
          <input ref="shopifyInput" type="file" accept=".csv,.xlsx,.xls" @change="onShopifyChange" />
        </label>

        <div class="action-row">
              <button class="btn" type="button" @click="onUpdateShopify" :disabled="isProcessing">{{ isProcessing ? 'Updating…' : 'Update Inventory (From Shopify)' }}</button>
            </div>
            <div v-if="resultMessage" class="note" style="margin-top:10px;">{{ resultMessage }}</div>
            <div v-if="error" class="note" style="margin-top:10px;color:#b91c1c">{{ error }}</div>
      </section>

      <section class="update-column reveal-fade-up reveal-delay-1">
        <h3>Square → Database</h3>

        <div class="note">
          <ol>
            <li>Export the inventory report from Square with current quantities.</li>
            <li>Upload the Square CSV file below.</li>
            <li>Click <strong>Update Inventory (From Square)</strong> to apply changes to the database.</li>
          </ol>
        </div>

        <label class="file-control">
          <span class="file-btn">Choose File</span>
          <span class="file-name">{{ squareName }}</span>
          <input ref="squareInput" type="file" accept=".csv,.xlsx,.xls" @change="onSquareChange" />
        </label>

        <div class="action-row">
          <button class="btn" type="button" @click="onUpdateSquare" :disabled="isProcessingSquare">{{ isProcessingSquare ? 'Updating…' : 'Update Inventory (From Square)' }}</button>
        </div>
        <div v-if="resultMessageSquare" class="note" style="margin-top:10px;">{{ resultMessageSquare }}</div>
        <div v-if="errorSquare" class="note" style="margin-top:10px;color:#b91c1c">{{ errorSquare }}</div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.update-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-top: 16px;
  width: 100%;
  max-width: 840px;
  margin-left: auto;
  margin-right: auto;
  box-sizing: border-box;
}

.update-column {
  background: var(--card-bg, #fff);
  border-radius: 12px;
  padding: 14px;
  box-shadow: var(--card-elev, none);
  border: 1px solid rgba(11, 99, 214, 0.18);
  min-width: 0;
}

.file-control {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 12px auto 0;
  justify-content: center;
  width: min(100%, 320px);
  max-width: 320px;
  min-width: 0;
}

.file-control .file-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  height: 26px;
  padding: 6px 10px;
  border-radius: 8px;
  background: linear-gradient(90deg, var(--accent-2), var(--accent));
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
}

.file-control input[type="file"] {
  display: inline-block;
  margin-left: 6px;
}

.file-name {
  font-size: 0.95rem;
  color: var(--muted, #666);
}

.action-row {
  margin: 14px auto 0;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  width: min(100%, 320px);
  max-width: 320px;
  min-width: 0;
}

.action-row .btn {
  flex: 0 0 auto;
  display: block;
  width: 100%;
}

.update-column h3 {
  text-align: center;
  margin-top: 0;
}

.update-column .note {
  text-align: center;
}

.update-column .note ol {
  margin: 6px 0 0;
  padding-left: 18px;
  list-style-position: outside;
  display: inline-block;
  text-align: left;
}

.update-column .note ol li {
  margin: 4px 0;
}

@media (max-width: 900px) {
  .update-grid {
    grid-template-columns: 1fr;
  }
  .update-column .note ol { padding-left: 14px; }
}
</style>
