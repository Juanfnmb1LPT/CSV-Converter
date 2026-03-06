<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps({
  slides: {
    type: Array,
    required: true
  },
  label: {
    type: String,
    default: 'Image carousel'
  },
  dotLabelPrefix: {
    type: String,
    default: 'Show image'
  },
  autoplayMs: {
    type: Number,
    default: 3200
  },
  swipeThreshold: {
    type: Number,
    default: 56
  }
});

const viewportElement = ref(null);
const currentIndex = ref(0);
const isAnimating = ref(false);
const isDragging = ref(false);
const dragOffsetPx = ref(0);

let autoplayTimer = null;
let activePointerId = null;
let dragStartX = 0;

const hasMultipleSlides = computed(() => props.slides.length > 1);

const renderedSlides = computed(() => {
  if (!hasMultipleSlides.value) {
    return props.slides;
  }

  const [firstSlide] = props.slides;
  const lastSlide = props.slides[props.slides.length - 1];

  return [lastSlide, ...props.slides, firstSlide];
});

const activeDotIndex = computed(() => {
  if (!props.slides.length) {
    return 0;
  }

  return ((currentIndex.value % props.slides.length) + props.slides.length) % props.slides.length;
});

const trackStyle = computed(() => {
  const viewportWidth = viewportElement.value?.clientWidth || 1;
  const baseOffset = hasMultipleSlides.value ? currentIndex.value + 1 : currentIndex.value;
  const dragOffsetPercent = isDragging.value ? (dragOffsetPx.value / viewportWidth) * 100 : 0;
  const translatePercent = -100 * baseOffset + dragOffsetPercent;

  return {
    transform: `translate3d(${translatePercent}%, 0, 0)`,
    transition: isDragging.value || !isAnimating.value ? 'none' : 'transform 420ms ease'
  };
});

function clearAutoplay() {
  if (!autoplayTimer) {
    return;
  }

  window.clearInterval(autoplayTimer);
  autoplayTimer = null;
}

function startAutoplay() {
  clearAutoplay();

  if (!hasMultipleSlides.value || props.autoplayMs <= 0) {
    return;
  }

  autoplayTimer = window.setInterval(() => {
    step(1);
  }, props.autoplayMs);
}

function restartAutoplay() {
  startAutoplay();
}

function setIndex(index) {
  if (!hasMultipleSlides.value || isAnimating.value || index === currentIndex.value) {
    restartAutoplay();
    return;
  }

  currentIndex.value = index;
  isAnimating.value = true;
  restartAutoplay();
}

function step(direction) {
  if (!hasMultipleSlides.value || isAnimating.value || isDragging.value) {
    return;
  }

  currentIndex.value += direction;
  isAnimating.value = true;
}

function onNavMouseDown(event) {
  event.preventDefault();
}

function onNavClick(direction, event) {
  event.currentTarget?.blur?.();
  step(direction);
  restartAutoplay();
}

function onTransitionEnd() {
  if (!hasMultipleSlides.value) {
    return;
  }

  if (currentIndex.value < 0) {
    isAnimating.value = false;
    currentIndex.value = props.slides.length - 1;
    return;
  }

  if (currentIndex.value >= props.slides.length) {
    isAnimating.value = false;
    currentIndex.value = 0;
    return;
  }

  isAnimating.value = false;
}

function onPointerDown(event) {
  if (!hasMultipleSlides.value || isAnimating.value) {
    return;
  }

  if (event.pointerType === 'mouse' && event.button !== 0) {
    return;
  }

  activePointerId = event.pointerId;
  dragStartX = event.clientX;
  dragOffsetPx.value = 0;
  isDragging.value = true;
  clearAutoplay();
  viewportElement.value?.setPointerCapture?.(event.pointerId);
}

function onPointerMove(event) {
  if (!isDragging.value || activePointerId !== event.pointerId) {
    return;
  }

  dragOffsetPx.value = event.clientX - dragStartX;
}

function finishDrag(event) {
  if (!isDragging.value || activePointerId !== event.pointerId) {
    return;
  }

  viewportElement.value?.releasePointerCapture?.(event.pointerId);

  const shouldAdvance = Math.abs(dragOffsetPx.value) >= props.swipeThreshold;
  const direction = dragOffsetPx.value < 0 ? 1 : -1;

  isDragging.value = false;
  activePointerId = null;

  if (shouldAdvance) {
    dragOffsetPx.value = 0;
    currentIndex.value += direction;
    isAnimating.value = true;
    restartAutoplay();
    return;
  }

  dragOffsetPx.value = 0;
  isAnimating.value = true;
  window.setTimeout(() => {
    isAnimating.value = false;
  }, 220);
  restartAutoplay();
}

function onPointerCancel(event) {
  finishDrag(event);
}

watch(
  () => props.slides,
  () => {
    currentIndex.value = 0;
    isAnimating.value = false;
    isDragging.value = false;
    dragOffsetPx.value = 0;
    startAutoplay();
  },
  { deep: true }
);

onMounted(() => {
  startAutoplay();
});

onBeforeUnmount(() => {
  clearAutoplay();
});
</script>

<template>
  <div class="carousel" :aria-label="label" aria-roledescription="carousel">
    <div class="carousel-frame-wrap">
      <button
        v-if="hasMultipleSlides"
        class="carousel-nav is-left"
        type="button"
        :aria-label="`Previous ${label.toLowerCase()}`"
        @mousedown="onNavMouseDown"
        @click="onNavClick(-1, $event)"
      >
        <span aria-hidden="true">&#8249;</span>
      </button>

      <div
        ref="viewportElement"
        class="carousel-frame"
        @mouseenter="clearAutoplay"
        @mouseleave="restartAutoplay"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="finishDrag"
        @pointercancel="onPointerCancel"
      >
        <div class="carousel-track" :style="trackStyle" @transitionend="onTransitionEnd">
          <div
            v-for="(slide, index) in renderedSlides"
            :key="`${slide.src}-${index}`"
            class="carousel-slide"
            :aria-hidden="hasMultipleSlides ? currentIndex !== ((index - 1 + slides.length) % slides.length) : false"
          >
            <img
              :src="slide.src"
              :alt="slide.alt"
              class="carousel-image"
              draggable="false"
            />
          </div>
        </div>
      </div>

      <button
        v-if="hasMultipleSlides"
        class="carousel-nav is-right"
        type="button"
        :aria-label="`Next ${label.toLowerCase()}`"
        @mousedown="onNavMouseDown"
        @click="onNavClick(1, $event)"
      >
        <span aria-hidden="true">&#8250;</span>
      </button>
    </div>

    <div v-if="hasMultipleSlides" class="carousel-controls">
      <div class="carousel-dots" :aria-label="`${label} slides`">
        <button
          v-for="(slide, index) in slides"
          :key="slide.src"
          class="carousel-dot"
          :class="{ 'is-active': activeDotIndex === index }"
          type="button"
          :aria-label="`${dotLabelPrefix} ${index + 1}`"
          @click="setIndex(index)"
        ></button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.carousel {
  width: 100%;
}

.carousel-frame-wrap {
  position: relative;
}

.carousel-frame {
  overflow: hidden;
  aspect-ratio: 4 / 3;
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(240, 247, 255, 0.95), rgba(227, 238, 252, 0.9));
  border: 1px solid rgba(18, 58, 138, 0.08);
  touch-action: pan-y pinch-zoom;
  user-select: none;
}

.carousel-track {
  display: flex;
  height: 100%;
  will-change: transform;
}

.carousel-slide {
  width: 100%;
  min-width: 100%;
  height: 100%;
}

.carousel-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  pointer-events: none;
}

.carousel-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 12px;
}

.carousel-nav {
  position: absolute;
  top: 50%;
  z-index: 1;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 999px;
  background-color: #4f596a;
  background-image: none;
  overflow: hidden;
  isolation: isolate;
  color: #123a8a;
  font-size: 20px;
  font-weight: 800;
  line-height: 1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transform: translateY(-50%);
  appearance: none;
  outline: none;
  box-shadow: none;
  -webkit-tap-highlight-color: transparent;
  transition: background-color 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
}

.carousel-nav:hover {
  background-color: #576275;
}

.carousel-nav:active {
  background-color: #495363;
  border-color: rgba(255, 255, 255, 0.52);
}

.carousel-nav:focus {
  outline: none;
  box-shadow: none;
}

.carousel-nav:focus:not(:focus-visible) {
  box-shadow: none;
}

.carousel-nav:focus-visible {
  box-shadow: 0 0 0 3px rgba(14, 165, 255, 0.28);
}

.carousel-nav span {
  color: #fff;
  transform: translateY(-1px);
}

.carousel-nav.is-left {
  left: 10px;
}

.carousel-nav.is-right {
  right: 10px;
}

.carousel-dots {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.carousel-dot {
  width: 10px;
  height: 10px;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: rgba(18, 58, 138, 0.18);
  cursor: pointer;
  appearance: none;
  outline: none;
  box-shadow: none;
  -webkit-tap-highlight-color: transparent;
}

.carousel-dot.is-active {
  background: #0b63d6;
}

.carousel-dot:focus {
  outline: none;
  box-shadow: none;
}

.carousel-dot:focus-visible {
  box-shadow: 0 0 0 3px rgba(14, 165, 255, 0.24);
}

@media (max-width: 640px) {
  .carousel-nav {
    width: 32px;
    height: 32px;
    font-size: 20px;
  }
}
</style>