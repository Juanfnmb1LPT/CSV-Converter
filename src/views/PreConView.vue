<script setup>
import { computed, ref } from 'vue';
import { convertShopifyToSquareCsv } from '../lib/convertShopToSquare';
import { downloadCsv } from '../lib/downloadCsv';

const csvFile = ref(null);
const fileName = ref('No file chosen');
const isProcessing = ref(false);
const currentStage = ref(0);
const hasConverted = ref(false);

const stages = [
  {
    title: 'Pre-Con Steps',
    description: 'Follow these steps to successfully import a Shopify inventory into Square.'
  },
  {
    title: 'Step 1',
    description: 'Export the inventory CSV from Shopify so you have the source file for conversion.'
  },
  {
    title: 'Step 2',
    description: 'Upload the Shopify CSV and run the conversion to generate the Square-ready file.'
  },
  {
    title: 'Step 3',
    description: 'Upload the generated Square CSV into Square and review any import warnings or errors before finishing.'
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

function onFileChange(event) {
  const file = event.target.files?.[0] || null;
  csvFile.value = file;
  fileName.value = file ? file.name : 'No file chosen';
  hasConverted.value = false;
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
  hasConverted.value = false;
  currentStage.value = 0;
}

async function onConvert() {
  if (!csvFile.value) {
    window.alert('Upload a Shopify CSV first.');
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
</script>

<template>
  <div class="card spacious tool-card step-card precon-stepper-card">
    <div class="hero precon-hero">
      <div class="hero-title">{{ currentContent.title }}</div>
      <div class="hero-sub precon-subtitle">{{ currentContent.description }}</div>
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

    <div class="precon-step-shell">
      <div v-if="currentStage === 0" class="precon-panel intro-panel">
        <p class="precon-copy">
          This walkthrough breaks the process into one action at a time so you can move through the conversion in order.
        </p>
        <button class="btn" type="button" @click="goNext">Start Steps</button>
      </div>

      <div v-else-if="currentStage === 1" class="precon-panel">
        <div class="precon-step-number">01</div>
        <p class="precon-copy">
          In Shopify, export your inventory CSV so you have the latest catalog data ready for conversion.
        </p>
      </div>

      <div v-else-if="currentStage === 2" class="precon-panel">
        <div class="precon-step-number">02</div>
        <div class="function-block precon-function-block">
          <p class="precon-copy precon-convert-copy">
            Upload the Shopify export CSV, then click <strong>Download Square Ready CSV</strong>
          </p>

          <div class="function-callout">
            <strong>What this function does:</strong>
            <br>
            Reads the Shopify CSV and creates a Square-ready CSV mapped by key fields such as <strong>SKU</strong>, <strong>Handle</strong>, and other import-ready columns.
          </div>

          <p class="precon-status" :class="{ 'is-ready': hasConverted }">
            {{ hasConverted ? 'Square-ready CSV created. Continue with the final import step.' : 'Generate the Square-ready CSV to complete this step.' }}
          </p>

          <div class="note-container precon-upload-row">
            <label class="file-control">
              <span class="file-btn">Choose File</span>
              <span class="file-name">{{ fileName }}</span>
              <input type="file" accept=".csv" @change="onFileChange" />
            </label>
            <button class="btn" type="button" :disabled="isProcessing" @click="onConvert">
              {{ isProcessing ? 'Processing…' : 'Download Square Ready CSV' }}
            </button>
          </div>
        </div>
      </div>

      <div v-else class="precon-panel">
        <div class="precon-step-number">03</div>
        <p class="precon-copy">
          Import the generated CSV into Square, then review the import results and resolve any warnings before you move on.
        </p>
        <button class="btn secondary" type="button" @click="restartSteps">Start Over</button>
      </div>
    </div>

    <p v-if="currentStage === 2" class="precon-disclaimer">
      Make sure you download the Square CSV before clicking Next Step.
    </p>

    <div v-if="currentStage > 0" class="precon-actions">
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
.precon-stepper-card {
  display: flex;
  flex-direction: column;
  gap: 26px;
}

.precon-hero {
  padding-bottom: 0;
}

.precon-subtitle {
  max-width: 620px;
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
  grid-template-columns: repeat(4, minmax(0, 1fr));
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

.precon-step-shell {
  max-width: 760px;
  width: 100%;
  margin: 0 auto;
}

.precon-panel {
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

.precon-step-number {
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #0b63d6;
}

.precon-copy {
  margin: 0;
  max-width: 560px;
  font-size: 18px;
  line-height: 1.65;
  color: #0f1f46;
}

.precon-convert-copy {
  max-width: 100%;
  margin-bottom: 6px;
}

.precon-status {
  margin: 14px 0 0;
  color: #6b7280;
  text-align: center;
  font-weight: 600;
}

.precon-status.is-ready {
  color: #0b63d6;
}

.precon-disclaimer {
  margin: 10px 0 0;
  color: #7c5b12;
  text-align: center;
  font-size: 14px;
  line-height: 1.5;
}

.precon-function-block {
  width: 100%;
  margin: 0;
  text-align: left;
}

.precon-upload-row {
  margin-top: 16px;
}

.precon-actions {
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

  .precon-panel {
    min-height: 0;
    padding: 24px 18px;
  }

  .precon-copy {
    font-size: 16px;
  }

  .precon-actions {
    flex-direction: column;
  }
}
</style>
