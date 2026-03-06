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
    window.alert('Please select both Shopify and Square files (CSV or Excel).');
    return;
  }

  isProcessing.value = true;
  try {
    const outCsv = await updateShopifyInventoryCsv(shopifyFile.value, squareFile.value);
    const baseName = shopifyFile.value.name.replace(/\.[^/.]+$/i, '');
    downloadCsv(outCsv, `${baseName}-updated-quantities.csv`);
  } catch (error) {
    window.alert(`Error processing files: ${error?.message || error}`);
  } finally {
    isProcessing.value = false;
  }
}
</script>

<template>
  <div class="card spacious quantity-card tool-card">
    <div class="hero">
      <div class="hero-title">Update Shopify Quantity</div>
      <div class="hero-sub">Upload Shopify and Square files to update quantities. Files are processed locally.</div>
    </div>

    <div class="note instruction-panel">
      <strong>Post-Con Steps</strong>
      <ol>
        <li>Export the latest inventory file from Square so you have the new quantity values.</li>
        <li>Export the current inventory file from Shopify so quantities can be updated by SKU.</li>
        <li>Upload both files and click <strong>Download Updated Shopify CSV</strong>.</li>
        <li>Import the updated Shopify CSV back into Shopify and review import results.</li>
      </ol>
    </div>

    <div class="note-container note-quantity tool-panel">
      <div class="quantity-row">
        <label>Shopify file (old quantities):</label>
        <label class="file-control">
          <span class="file-btn">Choose File</span>
          <span class="file-name">{{ shopifyName }}</span>
          <input type="file" accept=".csv,.xlsx,.xls" @change="onShopifyChange" />
        </label>
      </div>

      <div class="quantity-row">
        <label>Square file (new quantities):</label>
        <label class="file-control">
          <span class="file-btn">Choose File</span>
          <span class="file-name">{{ squareName }}</span>
          <input type="file" accept=".csv,.xlsx,.xls" @change="onSquareChange" />
        </label>
      </div>

      <div>
        <button class="btn" type="button" :disabled="isProcessing" @click="onProcess">
          {{ isProcessing ? 'Processing…' : 'Download Updated Shopify CSV' }}
        </button>
      </div>
    </div>

    <p class="note function-panel">
      <strong>What this function does:</strong><br>
      Matches <strong>Variant SKU</strong> in Shopify to SKU in Square, then updates <strong>Variant Inventory Qty</strong> using Square current quantity values.
    </p>

    <p class="note">Uploads are processed locally. The script matches `Variant SKU` from Shopify to the SKU field in the Square file and replaces `Variant Inventory Qty` with the Square "current quantity" value (header containing the words "current quantity").</p>
  </div>
</template>
