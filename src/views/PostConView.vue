<script setup>
import { ref } from 'vue';
import { updateShopifyInventoryCsv } from '../lib/updateInventoryFromSquare';
import { downloadCsv } from '../lib/downloadCsv';

const shopifyFile = ref(null);
const squareFile = ref(null);
const shopifyName = ref('No file chosen');
const squareName = ref('No file chosen');
const isProcessing = ref(false);

function onShopifyChange(event) {
  const file = event.target.files?.[0] || null;
  shopifyFile.value = file;
  shopifyName.value = file ? file.name : 'No file chosen';
}

function onSquareChange(event) {
  const file = event.target.files?.[0] || null;
  squareFile.value = file;
  squareName.value = file ? file.name : 'No file chosen';
}

async function onProcess() {
  if (!shopifyFile.value || !squareFile.value) {
    window.alert('Please select both Shopify and Square CSV files.');
    return;
  }

  isProcessing.value = true;
  try {
    const outCsv = await updateShopifyInventoryCsv(shopifyFile.value, squareFile.value);
    const baseName = shopifyFile.value.name.replace(/\.csv$/i, '');
    downloadCsv(outCsv, `${baseName}-updated-quantities.csv`);
  } catch (error) {
    window.alert(`Error processing files: ${error?.message || error}`);
  } finally {
    isProcessing.value = false;
  }
}
</script>

<template>
  <div class="card spacious quantity-card tool-card step-card">
    <div class="hero">
      <div class="hero-title">Post-Con Steps</div>
      <div class="hero-sub">Follow this sequence after conversion.</div>
    </div>

    <ol class="step-list">
      <li>Export CSV from Square.</li>
      <li>Export CSV from Shopify.</li>
      <li>Upload both CSVs below.</li>
      <li>Click <strong>Download Updated Shopify CSV</strong> to create the new Shopify file.</li>
    </ol>

    <div class="function-block">
      <div class="function-callout">
        <strong>What this function does:</strong>
        <br>
        Matches <strong>Variant SKU</strong> in Shopify to SKU in Square, then updates <strong>Variant Inventory Qty</strong> using Square's current quantity values.
      </div>

      <div class="note-container note-quantity">
        <div class="quantity-row">
          <label>Shopify CSV (old quantities):</label>
          <label class="file-control">
            <span class="file-btn">Choose File</span>
            <span class="file-name">{{ shopifyName }}</span>
            <input type="file" accept=".csv" @change="onShopifyChange" />
          </label>
        </div>

        <div class="quantity-row">
          <label>Square CSV (new quantities):</label>
          <label class="file-control">
            <span class="file-btn">Choose File</span>
            <span class="file-name">{{ squareName }}</span>
            <input type="file" accept=".csv" @change="onSquareChange" />
          </label>
        </div>

        <div>
          <button class="btn" type="button" :disabled="isProcessing" @click="onProcess">
            {{ isProcessing ? 'Processing…' : 'Download Updated Shopify CSV' }}
          </button>
        </div>
      </div>

      <p class="note">Output file name: <strong>&lt;shopify-file&gt;-updated-quantities.csv</strong>.</p>
    </div>

    <ol class="step-list" start="5">
      <li>Import the newly created CSV into Shopify.</li>
    </ol>
  </div>
</template>
