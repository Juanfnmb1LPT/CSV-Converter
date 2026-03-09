<script setup>
import { ref } from 'vue';
import { buildShopifyToSquareRows, convertShopifyToSquareCsv } from '../lib/convertShopToSquare';
import { downloadCsv } from '../lib/downloadCsv';

const csvFile = ref(null);
const fileName = ref('No file chosen');
const isProcessing = ref(false);
const isPreviewLoading = ref(false);
const previewHeaders = ref([]);
const previewRows = ref([]);
const hasPreview = ref(false);

function resetPreview() {
  hasPreview.value = false;
  previewHeaders.value = [];
  previewRows.value = [];
}

function onFileChange(event) {
  const file = event.target.files?.[0] || null;
  csvFile.value = file;
  fileName.value = file ? file.name : 'No file chosen';
  resetPreview();
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

async function onPreview() {
  if (!csvFile.value) {
    window.alert('Upload a Shopify CSV or Excel file first.');
    return;
  }

  isPreviewLoading.value = true;
  try {
    const rows = await buildShopifyToSquareRows(csvFile.value);
    previewHeaders.value = rows[0] || [];
    previewRows.value = rows.slice(1, 6);
    hasPreview.value = true;
  } catch (error) {
    window.alert(`Error processing file: ${error?.message || error}`);
  } finally {
    isPreviewLoading.value = false;
  }
}

function closePreview() {
  resetPreview();
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

    <div class="note-container tool-panel shopifytosquare-upload-row">
      <label class="file-control">
        <span class="file-btn">Choose File</span>
        <span class="file-name">{{ fileName }}</span>
        <input type="file" accept=".csv,.xlsx,.xls" @change="onFileChange" />
      </label>
      <div class="action-row">
        <button class="btn" type="button" :disabled="isProcessing" @click="onConvert">
          {{ isProcessing ? 'Processing…' : 'Download Square Ready CSV' }}
        </button>
        <button class="btn secondary" type="button" :disabled="isPreviewLoading" @click="onPreview">
          {{ isPreviewLoading ? 'Loading preview…' : 'Preview First 5 Rows' }}
        </button>
      </div>
    </div>

    <div class="note function-panel">
      <strong>What this function does:</strong><br>
      Reads the Shopify file and creates a Square-ready CSV mapped by key fields such as <strong>SKU</strong>, <strong>Handle</strong>, and other import-ready columns.
    </div>

    <div class="note">
      Select a Shopify CSV or Excel file exported from your store. The download will be a CSV file ready to import to Square.
    </div>

    <div v-if="hasPreview" class="preview-overlay" role="dialog" aria-modal="true" aria-labelledby="shopify-preview-title" @click.self="closePreview">
      <div class="preview-panel preview-dialog">
        <div class="preview-header">
          <strong id="shopify-preview-title">Square Ready CSV Preview</strong>
          <span>Showing the first {{ previewRows.length }} converted rows.</span>
          <button class="btn secondary preview-close-btn" type="button" @click="closePreview">
            Close Preview
          </button>
        </div>

        <div v-if="previewRows.length" class="preview-table-wrap">
          <table class="preview-table">
            <thead>
              <tr>
                <th v-for="header in previewHeaders" :key="header">{{ header }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, rowIndex) in previewRows" :key="rowIndex">
                <td v-for="(cell, cellIndex) in row" :key="`${rowIndex}-${cellIndex}`">{{ cell || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else class="preview-empty">
          No converted product rows were found in this file.
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.shopifytosquare-upload-row {
  margin-top: 16px;
  width: 100%;
}

.shopifytosquare-upload-row .file-control,
.shopifytosquare-upload-row .action-row {
  width: 100%;
  max-width: 320px;
  margin-left: auto;
  margin-right: auto;
}

.shopifytosquare-upload-row .action-row {
  flex-direction: column;
  align-items: stretch;
}

.shopifytosquare-upload-row .action-row .btn {
  flex: 0 0 auto;
  max-width: none;
  width: 100%;
}

@media (max-width: 640px) {
  .shopifytosquare-upload-row {
    display: grid;
    justify-items: center;
    gap: 4px;
  }

  .shopifytosquare-upload-row > * {
    margin: 0;
    min-width: 0;
    flex: 0 0 auto;
  }

  .shopifytosquare-upload-row .file-control {
    min-width: 0;
    width: 100%;
    max-width: 320px;
    margin-bottom: 0;
    padding-top: 6px;
    padding-bottom: 6px;
  }

  .shopifytosquare-upload-row .file-name {
    max-width: calc(100% - 110px);
  }

  .shopifytosquare-upload-row .action-row {
    display: grid;
    max-width: 320px;
    margin-top: 0;
    gap: 6px;
  }
}
</style>
