<script setup>
import { ref } from 'vue';
import { convertShopifyToSquareCsv } from '../lib/convertShopToSquare';
import { downloadCsv } from '../lib/downloadCsv';

const csvFile = ref(null);
const fileName = ref('No file chosen');
const isProcessing = ref(false);

function onFileChange(event) {
  const file = event.target.files?.[0] || null;
  csvFile.value = file;
  fileName.value = file ? file.name : 'No file chosen';
}

async function onConvert() {
  if (!csvFile.value) {
    window.alert('Upload a Shopify CSV or Excel file first.');
    return;
  }

  isProcessing.value = true;
  try {
    const csvText = await convertShopifyToSquareCsv(csvFile.value);
    downloadCsv(csvText, 'square_import.csv');
  } catch (error) {
    window.alert(`Error processing file: ${error?.message || error}`);
  } finally {
    isProcessing.value = false;
  }
}
</script>

<template>
  <div class="card spacious tool-card">
    <div class="hero">
      <div class="hero-title">Shopify → Square CSV Converter</div>
      <div class="hero-sub">Files processed locally in your browser.</div>
    </div>

    <div class="note instruction-panel">
      <strong>Pre-Con Steps</strong>
      <ol>
        <li>Export Shopify inventory CSV.</li>
        <li>Upload it to the tool here.</li>
        <li>Download the Square-ready CSV from the tool here.</li>
        <li>Import the downloaded CSV into Square.</li>
      </ol>
    </div>

    <div class="note-container tool-panel">
      <label class="file-control">
        <span class="file-btn">Choose File</span>
        <span class="file-name">{{ fileName }}</span>
        <input type="file" accept=".csv,.xlsx,.xls" @change="onFileChange" />
      </label>
      <button class="btn" type="button" :disabled="isProcessing" @click="onConvert">
        {{ isProcessing ? 'Processing…' : 'Download Square Ready CSV' }}
      </button>
    </div>

    <div class="note function-panel">
      <strong>What this function does:</strong><br>
      Reads the Shopify file and creates a Square-ready CSV mapped by key fields such as <strong>SKU</strong>, <strong>Handle</strong>, and other import-ready columns.
    </div>

    <div class="note">
      Select a Shopify CSV or Excel file exported from your store. The download will be a CSV file ready to import to Square.
    </div>
  </div>
</template>
