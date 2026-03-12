<script setup>
import { computed, nextTick, onMounted, ref } from 'vue';

const props = defineProps({
    mode: { type: String, required: true },
    itemName: { type: String, default: '' },
    initialVariation: { type: Object, default: null },
    isSaving: { type: Boolean, default: false },
    errorMessage: { type: String, default: '' },
});

const emit = defineEmits(['submit', 'cancel']);

const formSku = ref('');
const formQuantity = ref('0');
const formPrice = ref('0');
const formColor = ref('');
const formStyle = ref('');
const formSize = ref('');
const validationError = ref('');
const skuInput = ref(null);

const dialogTitle = computed(() => (props.mode === 'create' ? 'Create Variation' : 'Edit Variation'));
const submitLabel = computed(() => {
    if (props.isSaving) {
        return 'Saving...';
    }

    return props.mode === 'create' ? 'Create Variation' : 'Save Changes';
});

onMounted(async () => {
    if (props.initialVariation) {
        formSku.value = props.initialVariation.sku ?? '';
        formQuantity.value = String(props.initialVariation.quantity ?? 0);
        formPrice.value = props.initialVariation.price === null || props.initialVariation.price === undefined
            ? '0'
            : String(props.initialVariation.price);
        formColor.value = props.initialVariation.color ?? '';
        formStyle.value = props.initialVariation.style ?? '';
        formSize.value = props.initialVariation.size ?? '';
    }

    await nextTick();
    skuInput.value?.focus();
});

function onSubmit() {
    validationError.value = '';

    if (formQuantity.value === '' || Number.isNaN(Number(formQuantity.value))) {
        validationError.value = 'Quantity must be a number.';
        return;
    }

    if (formPrice.value !== '' && Number.isNaN(Number(formPrice.value))) {
        validationError.value = 'Price must be a number.';
        return;
    }

    emit('submit', {
        sku: formSku.value.trim(),
        quantity: Number(formQuantity.value),
        price: formPrice.value === '' ? 0 : Number(formPrice.value),
        color: formColor.value.trim(),
        style: formStyle.value.trim(),
        size: formSize.value.trim(),
    });
}
</script>

<template>
    <Teleport to="body">
        <div class="entity-modal-backdrop" @click.self="emit('cancel')">
            <div class="entity-modal-dialog" role="dialog" :aria-label="dialogTitle">
                <div class="entity-modal-header">
                    <div>
                        <div class="entity-modal-title">{{ dialogTitle }}</div>
                        <p class="entity-modal-subtitle">{{ itemName || 'Variation details' }}</p>
                    </div>
                    <button class="entity-modal-close" type="button" aria-label="Close" @click="emit('cancel')">
                        X
                    </button>
                </div>

                <form class="entity-modal-form" @submit.prevent="onSubmit">
                    <label class="entity-modal-label" for="variation-form-sku">SKU</label>
                    <input
                        id="variation-form-sku"
                        ref="skuInput"
                        v-model="formSku"
                        class="entity-modal-input"
                        type="text"
                        autocomplete="off"
                        placeholder="e.g. TSHIRT-BLK-M"
                        :disabled="isSaving"
                    />

                    <label class="entity-modal-label" for="variation-form-quantity">Quantity</label>
                    <input
                        id="variation-form-quantity"
                        v-model="formQuantity"
                        class="entity-modal-input"
                        type="number"
                        inputmode="numeric"
                        :disabled="isSaving"
                    />

                    <label class="entity-modal-label" for="variation-form-price">Price</label>
                    <input
                        id="variation-form-price"
                        v-model="formPrice"
                        class="entity-modal-input"
                        type="number"
                        inputmode="decimal"
                        min="0"
                        step="0.01"
                        placeholder="e.g. 24.99"
                        :disabled="isSaving"
                    />

                    <label class="entity-modal-label" for="variation-form-color">Color</label>
                    <input
                        id="variation-form-color"
                        v-model="formColor"
                        class="entity-modal-input"
                        type="text"
                        autocomplete="off"
                        :disabled="isSaving"
                    />

                    <label class="entity-modal-label" for="variation-form-style">Style</label>
                    <input
                        id="variation-form-style"
                        v-model="formStyle"
                        class="entity-modal-input"
                        type="text"
                        autocomplete="off"
                        :disabled="isSaving"
                    />

                    <label class="entity-modal-label" for="variation-form-size">Size</label>
                    <input
                        id="variation-form-size"
                        v-model="formSize"
                        class="entity-modal-input"
                        type="text"
                        autocomplete="off"
                        :disabled="isSaving"
                    />

                    <p v-if="validationError" class="entity-modal-error" role="alert">{{ validationError }}</p>
                    <p v-if="errorMessage" class="entity-modal-error" role="alert">{{ errorMessage }}</p>

                    <div class="entity-modal-actions">
                        <button class="btn secondary" type="button" :disabled="isSaving" @click="emit('cancel')">
                            Cancel
                        </button>
                        <button class="btn" type="submit" :disabled="isSaving">
                            {{ submitLabel }}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </Teleport>
</template>

<style scoped>
.entity-modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 200;
    background: rgba(8, 33, 69, 0.45);
    backdrop-filter: blur(2px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
}

.entity-modal-dialog {
    width: 100%;
    max-width: 500px;
    padding: 28px 28px 24px;
    border-radius: 20px;
    background: #ffffff;
    box-shadow: 0 24px 60px rgba(14, 42, 99, 0.18);
    display: flex;
    flex-direction: column;
}

.entity-modal-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 20px;
}

.entity-modal-title {
    font-size: 20px;
    font-weight: 800;
    color: #082145;
}

.entity-modal-subtitle {
    margin: 6px 0 0;
    color: #4b5563;
    font-size: 14px;
}

.entity-modal-close {
    width: 32px;
    height: 32px;
    border: 0;
    border-radius: 8px;
    background: rgba(18, 58, 138, 0.06);
    color: #4b5563;
    font-size: 14px;
    cursor: pointer;
}

.entity-modal-form {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px 12px;
}

.entity-modal-label {
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: #0b63d6;
}

.entity-modal-label:nth-of-type(1),
.entity-modal-input:nth-of-type(1),
.entity-modal-label:nth-of-type(2),
.entity-modal-input:nth-of-type(2),
.entity-modal-label:nth-of-type(3),
.entity-modal-input:nth-of-type(3),
.entity-modal-error,
.entity-modal-actions {
    grid-column: 1 / -1;
}

.entity-modal-input {
    min-height: 46px;
    padding: 10px 14px;
    border: 1px solid rgba(18, 58, 138, 0.2);
    border-radius: 12px;
    background: rgba(244, 248, 255, 0.96);
    color: #082145;
    font: inherit;
    font-size: 15px;
}

.entity-modal-input:focus {
    outline: 2px solid rgba(14, 165, 255, 0.22);
    border-color: rgba(37, 99, 235, 0.28);
}

.entity-modal-error {
    margin: 4px 0 0;
    color: #b91c1c;
    font-size: 14px;
    font-weight: 600;
}

.entity-modal-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    margin-top: 10px;
}

@media (max-width: 640px) {
    .entity-modal-form {
        grid-template-columns: 1fr;
    }
}
</style>