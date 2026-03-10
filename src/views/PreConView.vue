<script setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import InfiniteCarousel from '../components/InfiniteCarousel.vue';
import { buildShopifyToSquareRows, convertShopifyToSquareCsv } from '../lib/convertShopToSquare';
import { downloadCsv } from '../lib/downloadCsv';
import preConStep1ImageA from '../../assets/pre-con_step1.png';
import preConStep1ImageB from '../../assets/pre-con_step1_pt2.png';
import preConStep3ImageA from '../../assets/pre-con_step3.png';
import preConStep3ImageB from '../../assets/pre-con_step3_pt2.png';

const csvFile = ref(null);
const fileName = ref('No file chosen');
const isProcessing = ref(false);
const currentStage = ref(0);
const hasConverted = ref(false);
const isPreviewLoading = ref(false);
const previewHeaders = ref([]);
const previewRows = ref([]);
const hasPreview = ref(false);
const router = useRouter();

const stepVisuals = {
  1: [
    {
      src: preConStep1ImageA,
      alt: 'Shopify export screen for pre-conversion step 1.'
    },
    {
      src: preConStep1ImageB,
      alt: 'Additional Shopify export example for pre-conversion step 1.'
    }
  ],
  3: [
    {
      src: preConStep3ImageA,
      alt: 'Square import screen for pre-conversion step 3.'
    },
    {
      src: preConStep3ImageB,
      alt: 'Additional Square import example for pre-conversion step 3.'
    }
  ]
};

const stages = [
  {
    title: 'Pre-Con Steps',
    description: 'Follow these steps to successfully import a Shopify inventory into Square.'
  },
  {
    title: 'Step 1',
    description: 'Export Shopify inventory CSV.'
  },
  {
    title: 'Step 2',
    description: 'Upload it to the tool, preview the first five converted rows, and download the Square-ready CSV.'
  },
  {
    title: 'Step 3',
    description: 'Import the downloaded CSV into Square and review any import warnings or errors before finishing.'
  }
];

const totalSteps = stages.length - 1;

const currentStepNumber = computed(() => Math.max(currentStage.value, 0));

const progressPercentage = computed(() => {
  if (currentStage.value <= 1) {
    return 0;
  }

  return ((currentStage.value - 1) / (totalSteps - 1)) * 100;
});

const currentContent = computed(() => stages[currentStage.value]);

function resetPreview() {
  hasPreview.value = false;
  previewHeaders.value = [];
  previewRows.value = [];
}

function onFileChange(event) {
  const file = event.target.files?.[0] || null;
  csvFile.value = file;
  fileName.value = file ? file.name : 'No file chosen';
  hasConverted.value = false;
  resetPreview();
}

function goNext() {
  if (currentStage.value < stages.length - 1) {
    currentStage.value += 1;
  }
}

function goBack() {
  if (currentStage.value > 0) {
    currentStage.value -= 1;
  }
}

function goHome() {
  router.push('/');
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
    hasConverted.value = true;
    currentStage.value = stages.length - 1;
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
  <div class="card spacious tool-card step-card guided-stepper-card precon-stepper-card">
    <div class="hero guided-step-hero precon-hero">
      <div class="hero-title">{{ currentContent.title }}</div>
      <div v-if="currentStage === 0" class="hero-sub precon-subtitle">{{ currentContent.description }}</div>
    </div>

    <div class="stepper-progress" aria-label="Pre-conversion progress">
      <div class="stepper-progress-meta">
        <span v-if="currentStage === 0">Introduction</span>
        <span v-else>Step {{ currentStepNumber }} of {{ totalSteps }}</span>
      </div>

      <div class="stepper-track-wrap">
        <div class="stepper-track"></div>
        <div class="stepper-track-fill" :style="{ width: `${progressPercentage}%` }"></div>

        <div class="stepper-checkpoints" :style="{ gridTemplateColumns: `repeat(${totalSteps}, minmax(0, 1fr))` }">
          <div
            v-for="step in totalSteps"
            :key="step"
            class="stepper-checkpoint"
            :class="{
              'is-active': currentStage === step,
              'is-complete': currentStage > step
            }"
          >
            <span
              class="stepper-circle"
              :class="{
                'is-active': currentStage === step,
                'is-complete': currentStage > step
              }"
            >
              <span v-if="currentStage > step" class="stepper-checkmark" aria-hidden="true"></span>
              <template v-else>{{ step }}</template>
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="guided-step-shell precon-step-shell">
      <div v-if="currentStage === 0" class="precon-panel guided-step-panel intro-panel">
        <p class="precon-copy guided-step-copy">
          This walkthrough breaks the process into one action at a time so you can move through the conversion in order.
        </p>
        <button class="btn" type="button" @click="goNext">Start Steps</button>
      </div>

      <div v-else-if="currentStage === 1" class="precon-panel guided-step-panel precon-panel-step1">
        <div class="precon-step-number">01</div>
        <p class="precon-copy guided-step-copy">
          Export Shopify inventory CSV.
        </p>
        <div class="precon-visual-card guided-visual-card" aria-label="Step 1 visual guide">
          <InfiniteCarousel
            :slides="stepVisuals[1]"
            label="Step 1 visual guide"
            dot-label-prefix="Show step 1 image"
          />
        </div>
      </div>

      <div v-else-if="currentStage === 2" class="precon-panel guided-step-panel">
        <div class="precon-step-number">02</div>
        <div class="function-block guided-function-block precon-function-block">
          <p class="precon-copy guided-step-copy precon-convert-copy">
            Upload it to the tool here, review the preview if needed, then click <strong>Download Square Ready CSV</strong>.
          </p>

          <div class="function-callout">
            <strong>What this function does:</strong>
            <br>
            Reads the Shopify CSV and creates a Square-ready CSV mapped by key fields such as <strong>SKU</strong>, <strong>Handle</strong>, and other import-ready columns.
          </div>

          <p class="precon-status guided-step-status" :class="{ 'is-ready': hasConverted }">
            {{ hasConverted ? 'Square-ready CSV created. Continue with the final import step.' : 'Generate the Square-ready CSV to complete this step.' }}
          </p>

          <div class="note-container precon-upload-row">
            <label class="file-control precon-file-control">
              <span class="file-btn">Choose File</span>
              <span class="file-name">{{ fileName }}</span>
              <input type="file" accept=".csv,.xlsx,.xls" @change="onFileChange" />
            </label>
            <div class="action-row precon-action-row">
              <button class="btn precon-action-btn" type="button" :disabled="isProcessing" @click="onConvert">
                {{ isProcessing ? 'Processing…' : 'Download Square Ready CSV' }}
              </button>
              <button class="btn secondary precon-action-btn" type="button" :disabled="isPreviewLoading" @click="onPreview">
                {{ isPreviewLoading ? 'Loading preview…' : 'Preview First 5 Rows' }}
              </button>
            </div>
          </div>

        </div>
      </div>

      <div v-else class="precon-panel guided-step-panel">
        <div class="precon-step-number">03</div>
        <p class="precon-copy guided-step-copy">
          Import the downloaded CSV into Square, then review the import results and resolve any warnings before you move on.
        </p>
        <div class="precon-visual-card guided-visual-card" aria-label="Step 3 visual guide">
          <InfiniteCarousel
            :slides="stepVisuals[3]"
            label="Step 3 visual guide"
            dot-label-prefix="Show step 3 image"
          />
        </div>
        <button class="btn" type="button" @click="goHome">Go to Home</button>
      </div>
    </div>

    <p v-if="currentStage === 2" class="precon-disclaimer guided-step-disclaimer">
      Make sure you download the Square CSV before clicking Next Step.
    </p>

    <div v-if="currentStage > 0" class="precon-actions guided-step-actions">
      <button class="btn secondary" type="button" :disabled="currentStage === 0" @click="goBack">
        Back
      </button>
      <button
        v-if="currentStage < stages.length - 1"
        class="btn"
        type="button"
        @click="goNext"
      >
        Next Step
      </button>
    </div>

    <div v-if="hasPreview" class="preview-overlay" role="dialog" aria-modal="true" aria-labelledby="precon-preview-title" @click.self="closePreview">
      <div class="preview-panel preview-dialog">
        <div class="preview-header">
          <strong id="precon-preview-title">Square Ready CSV Preview</strong>
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
.precon-subtitle {
  max-width: 620px;
}

.precon-step-number {
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #0b63d6;
}

.precon-convert-copy {
  max-width: 100%;
  margin-bottom: 6px;
}

.precon-upload-row {
  --precon-control-width: 320px;
  margin-top: 24px;
  width: 100%;
  max-width: 840px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, var(--precon-control-width)));
  align-items: center;
  justify-content: center;
  column-gap: 28px;
  row-gap: 10px;
}

.precon-upload-row > * {
  min-width: 0;
  margin: 0;
}

.precon-upload-row .file-control,
.precon-upload-row .action-row {
  width: min(100%, var(--precon-control-width));
  max-width: min(100%, var(--precon-control-width));
  margin: 0;
}

.precon-upload-row .precon-file-control {
  min-height: 40px;
  padding-top: 4px;
  padding-bottom: 4px;
  box-sizing: border-box;
}

.precon-upload-row .precon-file-control .file-btn {
  height: 24px;
}

.precon-upload-row .action-row {
  flex-direction: column;
  align-items: stretch;
  margin-top: 10px;
  gap: 10px;
  padding-top: 6px;
  padding-bottom: 6px;
}

.precon-upload-row .action-row .btn {
  flex: 0 0 auto;
  max-width: none;
  width: 100%;
  min-height: 44px;
}

@media (max-width: 760px) {
  .precon-panel-step1 {
    gap: 12px;
    padding-top: 20px;
    padding-bottom: 20px;
  }
}

@media (max-width: 640px) {
  .precon-upload-row {
    width: 100%;
    margin-top: 32px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .precon-upload-row .precon-file-control,
  .precon-upload-row .precon-action-btn {
    min-width: 0;
    width: min(100%, var(--precon-control-width)) !important;
    max-width: min(100%, var(--precon-control-width)) !important;
    box-sizing: border-box;
    margin: 0 auto;
  }

  .precon-upload-row .file-name {
    max-width: calc(100% - 110px);
  }

  .precon-upload-row .precon-file-control {
    padding-top: 6px;
    padding-bottom: 6px;
  }

  .precon-upload-row .precon-action-row {
    width: min(100%, var(--precon-control-width));
    max-width: min(100%, var(--precon-control-width));
    margin-top: 0;
    gap: 8px;
  }

  .precon-upload-row .precon-action-btn {
    min-width: 0;
    flex: 0 0 auto;
  }
}
</style>
