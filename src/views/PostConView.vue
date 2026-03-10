<script setup>
import { computed, ref } from 'vue';
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

function restartSteps() {
  hasProcessed.value = false;
  currentStage.value = 0;
  resetPreview();
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
  <div class="card spacious quantity-card tool-card step-card postcon-stepper-card">
    <div class="hero postcon-hero">
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

    <div class="postcon-step-shell">
      <div v-if="currentStage === 0" class="postcon-panel intro-panel">
        <p class="postcon-copy">
          This walkthrough keeps the quantity update process in sequence so you can move through it one action at a time.
        </p>
        <button class="btn" type="button" @click="goNext">Start Steps</button>
      </div>

      <div v-else-if="currentStage === 1" class="postcon-panel">
        <div class="postcon-step-number">01</div>
        <p class="postcon-copy">
          Export the Square inventory CSV so you have the most recent quantity values ready for the update.
        </p>
        <div class="postcon-visual-card" aria-label="Step 1 visual guide">
          <InfiniteCarousel
            :slides="stepVisuals[1]"
            label="Step 1 visual guide"
            dot-label-prefix="Show step 1 image"
          />
        </div>
      </div>

      <div v-else-if="currentStage === 2" class="postcon-panel">
        <div class="postcon-step-number">02</div>
        <p class="postcon-copy">
          Export the Shopify inventory CSV so the Square quantities can be matched back to the correct Shopify SKUs.
        </p>
        <div class="postcon-visual-card" aria-label="Step 2 visual guide">
          <InfiniteCarousel
            :slides="stepVisuals[2]"
            label="Step 2 visual guide"
            dot-label-prefix="Show step 2 image"
          />
        </div>
      </div>

      <div v-else-if="currentStage === 3" class="postcon-panel">
        <div class="postcon-step-number">03</div>
        <div class="function-block postcon-function-block">
          <p class="postcon-copy postcon-convert-copy">
            Upload both CSV files, review the preview if needed, then click <strong>Download Updated Shopify CSV</strong>.
          </p>

          <div class="function-callout">
            <strong>What this function does:</strong>
            <br>
            Matches <strong>Variant SKU</strong> in Shopify to SKU in Square, then updates <strong>Variant Inventory Qty</strong> using Square's current quantity values.
          </div>

          <p class="postcon-status" :class="{ 'is-ready': hasProcessed }">
            {{ hasProcessed ? 'Updated Shopify CSV created. Continue with the final import step.' : 'Generate the updated Shopify CSV to complete this step.' }}
          </p>

          <div class="note-container note-quantity postcon-upload-row postcon-upload-grid">
            <div class="postcon-upload-column postcon-upload-files">
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
            </div>

            <div class="postcon-upload-column postcon-upload-actions">
              <div class="action-row action-row-quantity">
                <button class="btn" type="button" :disabled="isProcessing" @click="onProcess">
                  {{ isProcessing ? 'Processing…' : 'Download Updated Shopify CSV' }}
                </button>
                <button class="btn secondary" type="button" :disabled="isPreviewLoading" @click="onPreview">
                  {{ isPreviewLoading ? 'Loading preview…' : 'Preview First 5 Rows' }}
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      <div v-else class="postcon-panel">
        <div class="postcon-step-number">04</div>
        <p class="postcon-copy">
          Import the newly created CSV into Shopify, then review the import summary and fix any issues before completing the update.
        </p>
        <div class="postcon-visual-card" aria-label="Step 4 visual guide">
          <InfiniteCarousel
            :slides="stepVisuals[4]"
            label="Step 4 visual guide"
            dot-label-prefix="Show step 4 image"
          />
        </div>
        <button class="btn" type="button" @click="restartSteps">Start Over</button>
      </div>
    </div>

    <p v-if="currentStage === 3" class="postcon-disclaimer">
      Make sure you download the updated Shopify CSV before clicking Next Step.
    </p>

    <div v-if="currentStage > 0" class="postcon-actions">
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
.postcon-stepper-card {
  display: flex;
  flex-direction: column;
  gap: 26px;
}

.postcon-hero {
  padding-bottom: 0;
}

.postcon-subtitle {
  max-width: 680px;
}

.stepper-progress {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 760px;
  margin: 0 auto;
  margin-top: -10px;
  width: 100%;
}

.stepper-progress-meta {
  display: flex;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #0b63d6;
}

.stepper-track-wrap {
  --stepper-circle-size: 36px;
  --stepper-track-height: 6px;
  --stepper-track-offset: 4px;
  position: relative;
  padding: var(--stepper-track-offset) 4px 0;
}

.stepper-track,
.stepper-track-fill {
  position: absolute;
  top: calc(var(--stepper-track-offset) + (var(--stepper-circle-size) - var(--stepper-track-height)) / 2);
  left: 18px;
  right: 18px;
  height: var(--stepper-track-height);
  border-radius: 999px;
}

.stepper-track {
  background: rgba(18, 58, 138, 0.12);
}

.stepper-track-fill {
  right: auto;
  background: linear-gradient(90deg, #123a8a, #0ea5ff);
  transition: width 0.22s ease;
}

.stepper-checkpoints {
  position: relative;
  display: grid;
  gap: 16px;
}

.stepper-checkpoint {
  display: flex;
  justify-content: center;
  align-items: center;
}

.stepper-circle {
  position: relative;
  width: 36px;
  height: 36px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #fff;
  border: 3px solid rgba(18, 58, 138, 0.18);
  color: #6b7280;
  line-height: 1;
  font-weight: 800;
  box-shadow: 0 8px 22px rgba(14, 42, 99, 0.12);
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease, color 0.18s ease;
}

.stepper-circle.is-active {
  border-color: #0b63d6;
  color: #0b63d6;
  transform: translateY(-2px);
}

.stepper-circle.is-complete {
  background: linear-gradient(135deg, #123a8a, #0ea5ff);
  border-color: #0b63d6;
  color: #fff;
}

.stepper-checkmark {
  position: relative;
  width: 10px;
  height: 18px;
  border-right: 3px solid currentColor;
  border-bottom: 3px solid currentColor;
  transform: rotate(45deg) translate(-1px, -2px);
}

.postcon-step-shell {
  max-width: 760px;
  width: 100%;
  margin: 0 auto;
}

.postcon-panel {
  min-height: 280px;
  padding: 34px 30px;
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(243, 249, 255, 0.96));
  border: 1px solid rgba(11, 99, 214, 0.12);
  box-shadow: 0 20px 44px rgba(14, 42, 99, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  text-align: center;
}

.intro-panel {
  min-height: 240px;
}

.postcon-step-number {
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #0b63d6;
}

.postcon-copy {
  margin: 0;
  max-width: 560px;
  font-size: 18px;
  line-height: 1.65;
  color: #0f1f46;
}

.postcon-visual-card {
  width: min(100%, 420px);
  margin-top: 8px;
  padding: 12px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(11, 99, 214, 0.14);
  box-shadow: 0 14px 32px rgba(14, 42, 99, 0.08);
}

.postcon-visual-frame-wrap {
  position: relative;
}

.postcon-visual-frame {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  scrollbar-width: none;
  touch-action: pan-x pinch-zoom;
  aspect-ratio: 4 / 3;
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(240, 247, 255, 0.95), rgba(227, 238, 252, 0.9));
  border: 1px solid rgba(18, 58, 138, 0.08);
}

.postcon-visual-frame::-webkit-scrollbar {
  display: none;
}

.postcon-visual-image {
  display: block;
  width: 100%;
  height: 100%;
  min-width: 100%;
  object-fit: cover;
  object-position: top center;
  scroll-snap-align: center;
}

.postcon-visual-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 12px;
}

.postcon-visual-nav {
  position: absolute;
  top: 50%;
  z-index: 1;
  width: 36px;
  height: 36px;
  aspect-ratio: 1 / 1;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.44);
  border-radius: 999px;
  background: rgba(10, 24, 55, 0.22);
  backdrop-filter: blur(6px);
  color: #123a8a;
  font-size: 20px;
  font-weight: 800;
  line-height: 1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transform: translateY(-50%);
}

.postcon-visual-nav:hover {
  background: rgba(10, 24, 55, 0.32);
}

.postcon-visual-nav span {
  color: #fff;
  transform: translateY(-1px);
}

.postcon-visual-nav.is-left {
  left: 10px;
}

.postcon-visual-nav.is-right {
  right: 10px;
}

.postcon-visual-dots {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.postcon-visual-dot {
  width: 10px;
  height: 10px;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: rgba(18, 58, 138, 0.18);
  cursor: pointer;
  transition: transform 0.18s ease, background 0.18s ease;
}

.postcon-visual-dot.is-active {
  background: #0b63d6;
  transform: scale(1.15);
}

.postcon-convert-copy {
  max-width: 100%;
  margin-bottom: 6px;
}

.postcon-status {
  margin: 14px 0 0;
  color: #6b7280;
  text-align: center;
  font-weight: 600;
}

.postcon-status.is-ready {
  color: #0b63d6;
}

.postcon-disclaimer {
  margin: 10px 0 0;
  color: #7c5b12;
  text-align: center;
  font-size: 14px;
  line-height: 1.5;
}

.postcon-function-block {
  width: 100%;
  margin: 0;
  text-align: left;
}

.postcon-upload-grid {
  --postcon-control-width: 320px;
  --postcon-middle-gap: clamp(24px, 4vw, 44px);
  margin-top: 16px;
  width: min(100%, calc((2 * var(--postcon-control-width)) + var(--postcon-middle-gap)));
  display: grid;
  grid-template-columns: var(--postcon-control-width) var(--postcon-middle-gap) var(--postcon-control-width);
  align-items: center;
  justify-content: center;
  row-gap: 14px;
}

.postcon-upload-column {
  min-width: 0;
}

.postcon-upload-files {
  grid-column: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.postcon-upload-actions {
  grid-column: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100%;
}

.postcon-upload-grid .quantity-row {
  display: grid;
  justify-items: stretch;
  gap: 6px;
  width: 100%;
  max-width: none;
  margin: 0;
}

.postcon-upload-grid .quantity-row > label:first-child {
  min-width: 0;
  width: 100%;
  text-align: left;
}

.postcon-upload-grid .file-control,
.postcon-upload-grid .action-row {
  width: 100%;
  max-width: none;
  min-width: 0;
  margin: 0;
}

.postcon-upload-grid .action-row {
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
}

.postcon-upload-grid .action-row .btn {
  flex: 0 0 auto;
  width: 100%;
  max-width: none;
}

.postcon-upload-grid .file-name {
  max-width: calc(100% - 110px);
}

.postcon-actions {
  display: flex;
  justify-content: center;
  gap: 14px;
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

  .postcon-upload-files,
  .postcon-upload-actions {
    grid-column: auto;
  }
}

@media (max-width: 640px) {
  .stepper-track-wrap {
    --stepper-circle-size: 30px;
  }

  .stepper-track,
  .stepper-track-fill {
    left: 12px;
    right: 12px;
  }

  .stepper-checkpoints {
    gap: 8px;
  }

  .stepper-circle {
    width: 30px;
    height: 30px;
    font-size: 12px;
  }

  .stepper-checkmark {
    width: 8px;
    height: 14px;
    border-right-width: 2px;
    border-bottom-width: 2px;
  }

  .postcon-panel {
    min-height: 0;
    padding: 24px 18px;
  }

  .postcon-copy {
    font-size: 16px;
  }

  .postcon-visual-card {
    padding: 12px;
  }

  .postcon-visual-frame {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .postcon-visual-nav {
    width: 32px;
    height: 32px;
    font-size: 20px;
  }

  .postcon-actions {
    flex-direction: column;
    align-items: center;
  }

  .postcon-actions .btn {
    width: min(100%, 220px);
  }

  .postcon-upload-grid {
    gap: 4px;
  }

  .postcon-upload-grid .file-control {
    padding-top: 6px;
    padding-bottom: 6px;
  }

  .postcon-upload-grid .action-row {
    display: grid;
    margin-top: 0;
  }
}
</style>
