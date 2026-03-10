<script setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import InfiniteCarousel from '../components/InfiniteCarousel.vue';
import { buildUpdatedShopifyInventoryData, updateShopifyInventoryCsv } from '../lib/updateInventoryFromSquare';
import { downloadCsv } from '../lib/downloadCsv';
import postConStep1ImageA from '../../assets/post-con-step1.png';
import postConStep1ImageB from '../../assets/post-con-step1-pt2.png';
import preConStep1ImageA from '../../assets/pre-con_step1.png';
import preConStep1ImageB from '../../assets/pre-con_step1_pt2.png';
import postConStep4ImageA from '../../assets/post-con-step4.png';
import postConStep4ImageB from '../../assets/post-con-step4-pt2.png';
import postConStep4ImageC from '../../assets/post-con-step4-pt3.png';

const shopifyFile = ref(null);
const squareFile = ref(null);
const shopifyName = ref('No file chosen');
const squareName = ref('No file chosen');
const isProcessing = ref(false);
const currentStage = ref(0);
const hasProcessed = ref(false);
const isPreviewLoading = ref(false);
const previewHeaders = ref([]);
const previewRows = ref([]);
const hasPreview = ref(false);
const router = useRouter();

const stepVisuals = {
  1: [
    {
      src: postConStep1ImageA,
      alt: 'Square export screen for post-conversion step 1.'
    },
    {
      src: postConStep1ImageB,
      alt: 'Additional Square export example for post-conversion step 1.'
    }
  ],
  2: [
    {
      src: preConStep1ImageA,
      alt: 'Shopify export screen for post-conversion step 2.'
    },
    {
      src: preConStep1ImageB,
      alt: 'Additional Shopify export example for post-conversion step 2.'
    }
  ],
  4: [
    {
      src: postConStep4ImageA,
      alt: 'Shopify import screen for post-conversion step 4.'
    },
    {
      src: postConStep4ImageB,
      alt: 'Additional Shopify import example for post-conversion step 4.'
    },
    {
      src: postConStep4ImageC,
      alt: 'Final Shopify import example for post-conversion step 4.'
    }
  ]
};

const stages = [
  {
    title: 'Post-Con Steps',
    description: 'Follow these steps to update the Shopify inventory using the latest quantity values from Square.'
  },
  {
    title: 'Step 1',
    description: 'Export the latest inventory CSV from Square so you have the new quantity values.'
  },
  {
    title: 'Step 2',
    description: 'Export the current inventory CSV from Shopify so the quantities can be updated correctly.'
  },
  {
    title: 'Step 3',
    description: 'Upload both CSV files, preview the first five updated rows, and create the new Shopify import file.'
  },
  {
    title: 'Step 4',
    description: 'Import the updated Shopify CSV back into Shopify and review the import results before finishing.'
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

function onShopifyChange(event) {
  const file = event.target.files?.[0] || null;
  shopifyFile.value = file;
  shopifyName.value = file ? file.name : 'No file chosen';
  hasProcessed.value = false;
  resetPreview();
}

function onSquareChange(event) {
  const file = event.target.files?.[0] || null;
  squareFile.value = file;
  squareName.value = file ? file.name : 'No file chosen';
  hasProcessed.value = false;
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
    hasProcessed.value = true;
    currentStage.value = stages.length - 1;
  } catch (error) {
    window.alert(`Error processing files: ${error?.message || error}`);
  } finally {
    isProcessing.value = false;
  }
}

async function onPreview() {
  if (!shopifyFile.value || !squareFile.value) {
    window.alert('Please select both Shopify and Square CSV files.');
    return;
  }

  isPreviewLoading.value = true;
  try {
    const { headers, rows } = await buildUpdatedShopifyInventoryData(shopifyFile.value, squareFile.value);
    previewHeaders.value = headers;
    previewRows.value = rows.slice(0, 5).map((row) => headers.map((header) => row[header] ?? ''));
    hasPreview.value = true;
  } catch (error) {
    window.alert(`Error processing files: ${error?.message || error}`);
  } finally {
    isPreviewLoading.value = false;
  }
}

function closePreview() {
  resetPreview();
}
</script>

<template>
  <div class="card spacious quantity-card tool-card step-card guided-stepper-card postcon-stepper-card">
    <div class="hero guided-step-hero postcon-hero">
      <div class="hero-title">{{ currentContent.title }}</div>
      <div v-if="currentStage === 0" class="hero-sub postcon-subtitle">{{ currentContent.description }}</div>
    </div>

    <div class="stepper-progress" aria-label="Post-conversion progress">
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

    <div class="guided-step-shell postcon-step-shell">
      <div v-if="currentStage === 0" class="postcon-panel guided-step-panel intro-panel">
        <p class="postcon-copy guided-step-copy">
          This walkthrough keeps the quantity update process in sequence so you can move through it one action at a time.
        </p>
        <button class="btn" type="button" @click="goNext">Start Steps</button>
      </div>

      <div v-else-if="currentStage === 1" class="postcon-panel guided-step-panel">
        <div class="postcon-step-number">01</div>
        <p class="postcon-copy guided-step-copy">
          Export the Square inventory CSV so you have the most recent quantity values ready for the update.
        </p>
        <div class="postcon-visual-card guided-visual-card" aria-label="Step 1 visual guide">
          <InfiniteCarousel
            :slides="stepVisuals[1]"
            label="Step 1 visual guide"
            dot-label-prefix="Show step 1 image"
          />
        </div>
      </div>

      <div v-else-if="currentStage === 2" class="postcon-panel guided-step-panel">
        <div class="postcon-step-number">02</div>
        <p class="postcon-copy guided-step-copy">
          Export the Shopify inventory CSV so the Square quantities can be matched back to the correct Shopify SKUs.
        </p>
        <div class="postcon-visual-card guided-visual-card" aria-label="Step 2 visual guide">
          <InfiniteCarousel
            :slides="stepVisuals[2]"
            label="Step 2 visual guide"
            dot-label-prefix="Show step 2 image"
          />
        </div>
      </div>

      <div v-else-if="currentStage === 3" class="postcon-panel guided-step-panel">
        <div class="postcon-step-number">03</div>
        <div class="function-block guided-function-block postcon-function-block">
          <p class="postcon-copy guided-step-copy postcon-convert-copy">
            Upload both CSV files, review the preview if needed, then click <strong>Download Updated Shopify CSV</strong>.
          </p>

          <div class="function-callout">
            <strong>What this function does:</strong>
            <br>
            Matches <strong>Variant SKU</strong> in Shopify to SKU in Square, then updates <strong>Variant Inventory Qty</strong> using Square's current quantity values.
          </div>

          <p class="postcon-status guided-step-status" :class="{ 'is-ready': hasProcessed }">
            {{ hasProcessed ? 'Updated Shopify CSV created. Continue with the final import step.' : 'Generate the updated Shopify CSV to complete this step.' }}
          </p>

          <div class="note-container postcon-upload-row postcon-upload-grid">
            <div class="quantity-row postcon-upload-input-row">
              <label>Shopify CSV (old quantities):</label>
              <label class="file-control">
                <span class="file-btn">Choose File</span>
                <span class="file-name">{{ shopifyName }}</span>
                <input type="file" accept=".csv" @change="onShopifyChange" />
              </label>
            </div>

            <button class="btn postcon-upload-button postcon-upload-button-download" type="button" :disabled="isProcessing" @click="onProcess">
              {{ isProcessing ? 'Processing…' : 'Download Updated Shopify CSV' }}
            </button>

            <div class="quantity-row postcon-upload-input-row">
              <label>Square CSV (new quantities):</label>
              <label class="file-control">
                <span class="file-btn">Choose File</span>
                <span class="file-name">{{ squareName }}</span>
                <input type="file" accept=".csv" @change="onSquareChange" />
              </label>
            </div>

            <button class="btn secondary postcon-upload-button postcon-upload-button-preview" type="button" :disabled="isPreviewLoading" @click="onPreview">
              {{ isPreviewLoading ? 'Loading preview…' : 'Preview First 5 Rows' }}
            </button>
          </div>

        </div>
      </div>

      <div v-else class="postcon-panel guided-step-panel">
        <div class="postcon-step-number">04</div>
        <p class="postcon-copy guided-step-copy">
          Import the newly created CSV into Shopify, then review the import summary and fix any issues before completing the update.
        </p>
        <div class="postcon-visual-card guided-visual-card" aria-label="Step 4 visual guide">
          <InfiniteCarousel
            :slides="stepVisuals[4]"
            label="Step 4 visual guide"
            dot-label-prefix="Show step 4 image"
          />
        </div>
        <button class="btn" type="button" @click="goHome">Go to Home</button>
      </div>
    </div>

    <p v-if="currentStage === 3" class="postcon-disclaimer guided-step-disclaimer">
      Make sure you download the updated Shopify CSV before clicking Next Step.
    </p>

    <div v-if="currentStage > 0" class="postcon-actions guided-step-actions">
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

    <div v-if="hasPreview" class="preview-overlay" role="dialog" aria-modal="true" aria-labelledby="postcon-preview-title" @click.self="closePreview">
      <div class="preview-panel preview-dialog">
        <div class="preview-header">
          <strong id="postcon-preview-title">Updated Shopify CSV Preview</strong>
          <span>Showing the first {{ previewRows.length }} updated rows.</span>
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
          No updated Shopify rows were found in these files.
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.postcon-subtitle {
  max-width: 680px;
}

.postcon-step-number {
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #0b63d6;
}

.postcon-convert-copy {
  max-width: 100%;
  margin-bottom: 6px;
}

.postcon-upload-grid {
  --postcon-control-width: 320px;
  --postcon-middle-gap: clamp(24px, 4vw, 44px);
  width: min(100%, calc((2 * var(--postcon-control-width)) + var(--postcon-middle-gap)));
  max-width: 100%;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, var(--postcon-control-width)));
  align-items: start;
  justify-content: center;
  column-gap: var(--postcon-middle-gap);
  row-gap: 10px;
  padding-left: 8px;
  padding-right: 8px;
  box-sizing: border-box;
}

.postcon-function-block .postcon-status + .postcon-upload-grid.note-container {
  margin-top: 10px;
}

.postcon-upload-grid .quantity-row {
  display: grid;
  justify-items: stretch;
  gap: 6px;
  width: 100%;
  max-width: none;
  margin: 0;
}

.postcon-upload-input-row {
  min-width: 0;
}

.postcon-upload-grid .quantity-row > label:first-child {
  min-width: 0;
  width: 100%;
  text-align: left;
}

.postcon-upload-grid .file-control,
.postcon-upload-button {
  width: 100%;
  max-width: none;
  min-width: 0;
  margin: 0;
}

.postcon-upload-button {
  align-self: end;
  min-height: 40px;
  height: 40px;
  padding: 8px 14px;
  font-size: 13px;
  line-height: 1;
}

.postcon-upload-grid .file-name {
  max-width: calc(100% - 110px);
}

@media (max-width: 760px) {
  .postcon-upload-grid {
    --postcon-control-width: min(320px, 100%);
    grid-template-columns: 1fr;
    justify-items: center;
  }

  .postcon-upload-grid .quantity-row > label:first-child {
    text-align: center;
  }
}

@media (max-width: 1200px) {
  .postcon-function-block {
    padding-left: 10px;
    padding-right: 10px;
  }

  .postcon-function-block .postcon-status + .postcon-upload-grid.note-container {
    margin-top: 10px;
  }

  .postcon-upload-grid {
    width: min(100%, 420px);
    grid-template-columns: 1fr;
    justify-items: center;
    row-gap: 10px;
  }

  .postcon-upload-grid .postcon-upload-input-row:first-child {
    order: 1;
  }

  .postcon-upload-grid .postcon-upload-input-row:last-of-type {
    order: 2;
  }

  .postcon-upload-button-download {
    order: 3;
  }

  .postcon-upload-button-preview {
    order: 4;
  }

  .postcon-upload-grid .quantity-row > label:first-child {
    text-align: center;
  }

  .postcon-upload-grid .file-control,
  .postcon-upload-button {
    width: 100%;
    max-width: 320px;
    margin-left: auto;
    margin-right: auto;
  }
}

@media (max-width: 640px) {
  .postcon-upload-grid {
    gap: 4px;
  }

  .postcon-upload-grid .file-control {
    padding-top: 6px;
    padding-bottom: 6px;
  }
}
</style>
