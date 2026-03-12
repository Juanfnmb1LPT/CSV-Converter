import { hasSupabaseConfig, supabase } from './supabase';

function normalizeId(value) {
    return String(value || '').trim();
}

function normalizeOptionalText(value) {
    return String(value || '').trim();
}

function normalizeQuantity(value) {
    if (value === '' || value === null || value === undefined) {
        return 0;
    }

    const parsedValue = Number(value);

    if (!Number.isFinite(parsedValue)) {
        return null;
    }

    return parsedValue;
}

function normalizePrice(value) {
    if (value === '' || value === null || value === undefined) {
        return 0;
    }

    const parsedValue = Number(value);

    if (!Number.isFinite(parsedValue)) {
        return null;
    }

    return Number(parsedValue.toFixed(2));
}

function validateVariationInput({ itemId, itemName, quantity, price }) {
    const normalizedItemId = normalizeId(itemId);
    const normalizedItemName = normalizeOptionalText(itemName);
    const normalizedQuantity = normalizeQuantity(quantity);
    const normalizedPrice = normalizePrice(price);

    if (!normalizedItemId) {
        return { ok: false, error: 'An item is required.' };
    }

    if (!normalizedItemName) {
        return { ok: false, error: 'Item name is required.' };
    }

    if (normalizedQuantity === null) {
        return { ok: false, error: 'Quantity must be a number.' };
    }

    if (normalizedPrice === null) {
        return { ok: false, error: 'Price must be a number.' };
    }

    return {
        ok: true,
        normalizedItemId,
        normalizedItemName,
        normalizedQuantity,
        normalizedPrice,
    };
}

function buildVariationPayload({ itemId, itemName, quantity, price, sku, color, style, size }) {
    const validation = validateVariationInput({ itemId, itemName, quantity, price });

    if (!validation.ok) {
        return validation;
    }

    return {
        ok: true,
        payload: {
            item_id: validation.normalizedItemId,
            item_name: validation.normalizedItemName,
            quantity: validation.normalizedQuantity,
            price: validation.normalizedPrice,
            sku: normalizeOptionalText(sku),
            color: normalizeOptionalText(color),
            style: normalizeOptionalText(style),
            size: normalizeOptionalText(size),
        },
    };
}

export async function createVariation({ itemId, itemName, quantity, price, sku, color, style, size }) {
    const payloadResult = buildVariationPayload({ itemId, itemName, quantity, price, sku, color, style, size });

    if (!payloadResult.ok) {
        return payloadResult;
    }

    if (!hasSupabaseConfig || !supabase) {
        return { ok: false, error: 'Supabase is not configured.' };
    }

    const generatedId = crypto.randomUUID();

    const { data, error } = await supabase
        .from('item_variations')
        .insert({
            id: generatedId,
            ...payloadResult.payload,
        })
        .select('id, item_id, item_name, quantity, price, sku, color, style, size')
        .maybeSingle();

    if (error) {
        return { ok: false, error: error.message };
    }

    return { ok: true, data };
}

export async function updateVariation({ id, itemId, itemName, quantity, price, sku, color, style, size }) {
    const normalizedId = normalizeId(id);
    const payloadResult = buildVariationPayload({ itemId, itemName, quantity, price, sku, color, style, size });

    if (!normalizedId) {
        return { ok: false, error: 'Variation id is required.' };
    }

    if (!payloadResult.ok) {
        return payloadResult;
    }

    if (!hasSupabaseConfig || !supabase) {
        return { ok: false, error: 'Supabase is not configured.' };
    }

    const { data, error } = await supabase
        .from('item_variations')
        .update(payloadResult.payload)
        .eq('id', normalizedId)
        .select('id, item_id, item_name, quantity, price, sku, color, style, size')
        .maybeSingle();

    if (error) {
        return { ok: false, error: error.message };
    }

    return { ok: true, data };
}

export async function deleteVariation(id) {
    const normalizedId = normalizeId(id);

    if (!normalizedId) {
        return { ok: false, error: 'Variation id is required.' };
    }

    if (!hasSupabaseConfig || !supabase) {
        return { ok: false, error: 'Supabase is not configured.' };
    }

    const { error } = await supabase
        .from('item_variations')
        .delete()
        .eq('id', normalizedId);

    if (error) {
        return { ok: false, error: error.message };
    }

    return { ok: true };
}