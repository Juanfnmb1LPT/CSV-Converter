import { hasSupabaseConfig, supabase } from './supabase';

export async function createBin(name) {
    const normalizedName = String(name || '').trim();

    if (!normalizedName) {
        return { ok: false, error: 'Bin name is required.' };
    }

    if (!hasSupabaseConfig || !supabase) {
        return { ok: false, error: 'Supabase is not configured.' };
    }

    const generatedId = crypto.randomUUID();

    const { data, error } = await supabase
        .from('bins')
        .insert({ id: generatedId, name: normalizedName })
        .select('id, name')
        .maybeSingle();

    if (error) {
        return { ok: false, error: error.message };
    }

    return { ok: true, data };
}

export async function updateBinName(id, name) {
    const normalizedName = String(name || '').trim();

    if (!normalizedName) {
        return { ok: false, error: 'Bin name is required.' };
    }

    if (!hasSupabaseConfig || !supabase) {
        return { ok: false, error: 'Supabase is not configured.' };
    }

    const { data, error } = await supabase
        .from('bins')
        .update({ name: normalizedName })
        .eq('id', id)
        .select('id, name')
        .maybeSingle();

    if (error) {
        return { ok: false, error: error.message };
    }

    return { ok: true, data };
}

export async function binHasItems(id) {
    if (!hasSupabaseConfig || !supabase) {
        return { ok: false, error: 'Supabase is not configured.' };
    }

    const { count, error } = await supabase
        .from('items')
        .select('id', { count: 'exact', head: true })
        .eq('bin_id', id);

    if (error) {
        return { ok: false, error: error.message };
    }

    return { ok: true, hasItems: (count ?? 0) > 0 };
}

export async function deleteBin(id) {
    if (!hasSupabaseConfig || !supabase) {
        return { ok: false, error: 'Supabase is not configured.' };
    }

    const { data: itemsInBin, error: fetchItemsError } = await supabase
        .from('items')
        .select('id')
        .eq('bin_id', id);

    if (fetchItemsError) {
        return { ok: false, error: fetchItemsError.message };
    }

    const itemIds = (itemsInBin || []).map((item) => item.id).filter(Boolean);

    if (itemIds.length) {
        const { error: deleteVariationsError } = await supabase
            .from('item_variations')
            .delete()
            .in('item_id', itemIds);

        if (deleteVariationsError) {
            return { ok: false, error: deleteVariationsError.message };
        }

        const { error: deleteItemsError } = await supabase
            .from('items')
            .delete()
            .eq('bin_id', id);

        if (deleteItemsError) {
            return { ok: false, error: deleteItemsError.message };
        }
    }

    const { error } = await supabase
        .from('bins')
        .delete()
        .eq('id', id);

    if (error) {
        return { ok: false, error: error.message };
    }

    return { ok: true };
}
