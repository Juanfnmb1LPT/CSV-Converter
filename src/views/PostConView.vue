<script setup>
import { computed, ref } from 'vue';
import { updateShopifyInventoryCsv } from '../lib/updateInventoryFromSquare';
import { downloadCsv } from '../lib/downloadCsv';

const shopifyFile = ref(null);
const squareFile = ref(null);
const shopifyName = ref('No file chosen');
const squareName = ref('No file chosen');
const isProcessing = ref(false);
const currentStage = ref(0);
const hasProcessed = ref(false);

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
    description: 'Upload both CSV files and run the quantity update to create the new Shopify import file.'
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

function onShopifyChange(event) {
  const file = event.target.files?.[0] || null;
  shopifyFile.value = file;
  shopifyName.value = file ? file.name : 'No file chosen';
  hasProcessed.value = false;
}

function onSquareChange(event) {
  const file = event.target.files?.[0] || null;
  squareFile.value = file;
  squareName.value = file ? file.name : 'No file chosen';
  hasProcessed.value = false;
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
</script>

<template>
  <div class="card spacious quantity-card tool-card step-card postcon-stepper-card">
    <div class="hero postcon-hero">
      <div class="hero-title">{{ currentContent.title }}</div>
      <div class="hero-sub postcon-subtitle">{{ currentContent.description }}</div>
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
      </div>

      <div v-else-if="currentStage === 2" class="postcon-panel">
        <div class="postcon-step-number">02</div>
        <p class="postcon-copy">
          Export the Shopify inventory CSV so the Square quantities can be matched back to the correct Shopify SKUs.
        </p>
      </div>

      <div v-else-if="currentStage === 3" class="postcon-panel">
        <div class="postcon-step-number">03</div>
        <div class="function-block postcon-function-block">
          <p class="postcon-copy postcon-convert-copy">
            Upload both CSV files, then click <strong>Download Updated Shopify CSV</strong>.
          </p>

          <div class="function-callout">
            <strong>What this function does:</strong>
            <br>
            Matches <strong>Variant SKU</strong> in Shopify to SKU in Square, then updates <strong>Variant Inventory Qty</strong> using Square's current quantity values.
          </div>

          <p class="postcon-status" :class="{ 'is-ready': hasProcessed }">
            {{ hasProcessed ? 'Updated Shopify CSV created. Continue with the final import step.' : 'Generate the updated Shopify CSV to complete this step.' }}
          </p>

          <div class="note-container note-quantity postcon-upload-row">
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
        </div>
      </div>

      <div v-else class="postcon-panel">
        <div class="postcon-step-number">04</div>
        <p class="postcon-copy">
          Import the newly created CSV into Shopify, then review the import summary and fix any issues before completing the update.
        </p>
        <button class="btn secondary" type="button" @click="restartSteps">Start Over</button>
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
  gap: 14px;
  max-width: 760px;
  margin: 0 auto;
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
  position: relative;
  padding: 8px 4px 0;
}

.stepper-track,
.stepper-track-fill {
  position: absolute;
  top: 24px;
  left: 18px;
  right: 18px;
  height: 6px;
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

.postcon-upload-row {
  margin-top: 16px;
}

.postcon-actions {
  display: flex;
  justify-content: center;
  gap: 14px;
}

@media (max-width: 640px) {
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

  .postcon-actions {
    flex-direction: column;
  }
}
</style>
