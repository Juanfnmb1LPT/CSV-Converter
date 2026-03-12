import { hasSupabaseConfig, supabase } from './supabase';

function normalizeName(name) {
    return String(name || '').trim();
}

function normalizeId(value) {
    return String(value || '').trim();
}

function validateItemInput(name, binId) {
    const normalizedName = normalizeName(name);
    const normalizedBinId = normalizeId(binId);

    if (!normalizedName) {
        return { ok: false, error: 'Item name is required.' };
    }

    if (!normalizedBinId) {
        return { ok: false, error: 'A bin is required.' };
    }

    return {
        ok: true,
        normalizedName,
        normalizedBinId,
    };
}

export async function createItem({ name, binId }) {
    const validation = validateItemInput(name, binId);

    if (!validation.ok) {
        return validation;
    }

    if (!hasSupabaseConfig || !supabase) {
        return { ok: false, error: 'Supabase is not configured.' };
    }

    const generatedId = crypto.randomUUID();

    const { data, error } = await supabase
        .from('items')
        .insert({
            id: generatedId,
            name: validation.normalizedName,
            bin_id: validation.normalizedBinId,
        })
        .select('id, name, bin_id')
        .maybeSingle();

    if (error) {
        return { ok: false, error: error.message };
    }

    return { ok: true, data };
}

export async function updateItem({ id, name, binId }) {
    const normalizedId = normalizeId(id);
    const validation = validateItemInput(name, binId);

    if (!normalizedId) {
        return { ok: false, error: 'Item id is required.' };
    }

    if (!validation.ok) {
        return validation;
    }

    if (!hasSupabaseConfig || !supabase) {
        return { ok: false, error: 'Supabase is not configured.' };
    }

    const { data, error } = await supabase
        .from('items')
        .update({
            name: validation.normalizedName,
            bin_id: validation.normalizedBinId,
        })
        .eq('id', normalizedId)
        .select('id, name, bin_id')
        .maybeSingle();

    if (error) {
        return { ok: false, error: error.message };
    }

    const { error: variationError } = await supabase
        .from('item_variations')
        .update({ item_name: validation.normalizedName })
        .eq('item_id', normalizedId);

    if (variationError) {
        return { ok: false, error: variationError.message };
    }

    return { ok: true, data };
}

export async function itemHasVariations(id) {
    const normalizedId = normalizeId(id);

    if (!normalizedId) {
        return { ok: false, error: 'Item id is required.' };
    }

    if (!hasSupabaseConfig || !supabase) {
        return { ok: false, error: 'Supabase is not configured.' };
    }

    const { count, error } = await supabase
        .from('item_variations')
        .select('id', { count: 'exact', head: true })
        .eq('item_id', normalizedId);

    if (error) {
        return { ok: false, error: error.message };
    }

    return { ok: true, hasVariations: (count ?? 0) > 0 };
}

export async function deleteItem(id) {
    const normalizedId = normalizeId(id);

    if (!normalizedId) {
        return { ok: false, error: 'Item id is required.' };
    }

    if (!hasSupabaseConfig || !supabase) {
        return { ok: false, error: 'Supabase is not configured.' };
    }

    const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', normalizedId);

    if (error) {
        return { ok: false, error: error.message };
    }

    return { ok: true };
}