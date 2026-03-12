<script setup>
import { nextTick, onMounted, ref } from 'vue';

const props = defineProps({
    mode: { type: String, required: true }, // 'create' | 'edit'
    initialBin: { type: Object, default: null },
    isSaving: { type: Boolean, default: false },
    errorMessage: { type: String, default: '' },
});

const emit = defineEmits(['submit', 'cancel']);

const formName = ref('');
const validationError = ref('');
const nameInput = ref(null);

onMounted(async () => {
    if (props.initialBin) {
        formName.value = props.initialBin.name ?? '';
    }
    await nextTick();
    nameInput.value?.focus();
});

function onSubmit() {
    validationError.value = '';
    if (!formName.value.trim()) {
        validationError.value = 'Bin name is required.';
        return;
    }
    emit('submit', { name: formName.value.trim() });
}
</script>

<template>
    <Teleport to="body">
        <div class="bin-modal-backdrop" @click.self="emit('cancel')">
            <div
                class="bin-modal-dialog"
                role="dialog"
                :aria-label="mode === 'create' ? 'Create Bin' : 'Edit Bin'"
            >
                <div class="bin-modal-header">
                    <div class="bin-modal-title">{{ mode === 'create' ? 'Create Bin' : 'Edit Bin' }}</div>
                    <button class="bin-modal-close" type="button" aria-label="Close" @click="emit('cancel')">
                        ✕
                    </button>
                </div>

                <form class="bin-modal-form" @submit.prevent="onSubmit">
                    <label class="bin-modal-label" for="bin-form-name">Name</label>
                    <input
                        id="bin-form-name"
                        ref="nameInput"
                        v-model="formName"
                        class="bin-modal-input"
                        type="text"
                        autocomplete="off"
                        placeholder="e.g. Bin 1"
                        :disabled="isSaving"
                    />

                    <p v-if="validationError" class="bin-modal-error" role="alert">{{ validationError }}</p>
                    <p v-if="errorMessage" class="bin-modal-error" role="alert">{{ errorMessage }}</p>

                    <div class="bin-modal-actions">
                        <button class="btn secondary" type="button" :disabled="isSaving" @click="emit('cancel')">
                            Cancel
                        </button>
                        <button class="btn" type="submit" :disabled="isSaving">
                            {{ isSaving ? 'Saving...' : (mode === 'create' ? 'Create Bin' : 'Save Changes') }}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </Teleport>
</template>

<style scoped>
.bin-modal-backdrop {
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

.bin-modal-dialog {
    width: 100%;
    max-width: 440px;
    padding: 28px 28px 24px;
    border-radius: 20px;
    background: #ffffff;
    box-shadow: 0 24px 60px rgba(14, 42, 99, 0.18);
    display: flex;
    flex-direction: column;
    gap: 0;
}

.bin-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
}

.bin-modal-title {
    font-size: 20px;
    font-weight: 800;
    color: #082145;
}

.bin-modal-close {
    width: 32px;
    height: 32px;
    border: 0;
    border-radius: 8px;
    background: rgba(18, 58, 138, 0.06);
    color: #4b5563;
    font-size: 14px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
}

.bin-modal-close:hover {
    background: rgba(18, 58, 138, 0.12);
    color: #082145;
}

.bin-modal-form {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.bin-modal-label {
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: #0b63d6;
}

.bin-modal-input {
    height: 46px;
    padding: 10px 14px;
    border: 1px solid rgba(18, 58, 138, 0.2);
    border-radius: 12px;
    background: rgba(244, 248, 255, 0.96);
    color: #082145;
    font: inherit;
    font-size: 15px;
}

.bin-modal-input:focus {
    outline: 2px solid rgba(14, 165, 255, 0.22);
    border-color: rgba(37, 99, 235, 0.28);
}

.bin-modal-input:disabled {
    opacity: 0.7;
}

.bin-modal-id-display {
    height: 46px;
    padding: 10px 14px;
    border: 1px solid rgba(18, 58, 138, 0.1);
    border-radius: 12px;
    background: rgba(240, 244, 255, 0.6);
    color: #4b5563;
    font-size: 15px;
    font-weight: 600;
    display: flex;
    align-items: center;
}

.bin-modal-error {
    margin: 4px 0 0;
    color: #b91c1c;
    font-size: 14px;
    font-weight: 600;
}

.bin-modal-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    margin-top: 10px;
}
</style>
