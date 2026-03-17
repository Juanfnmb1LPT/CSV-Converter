import { parseUploadedTable } from './parseUploadedTable';
import { hasSupabaseConfig, supabase } from './supabase';

function findHeader(fields, candidates) {
  if (!fields || !fields.length) return null;
  const lower = (s) => String(s || '').toLowerCase();
  for (const candidate of candidates) {
    const exact = fields.find((h) => lower(h) === lower(candidate));
    if (exact) return exact;
  }

  // fallback: includes
  for (const candidate of candidates) {
    const found = fields.find((h) => lower(h).includes(lower(candidate)));
    if (found) return found;
  }

  return null;
}

export async function updateDatabaseFromShopifyFile(file) {
  if (!file) throw new Error('No file provided.');
  if (!hasSupabaseConfig || !supabase) throw new Error('Supabase is not configured.');

  const results = await parseUploadedTable(file);
  const fields = results.meta?.fields || [];
  const rows = results.data || [];

  if (!rows.length) throw new Error('The uploaded file appears empty.');

  const skuHeader = findHeader(fields, ['Variant SKU', 'SKU']);
  const variantQtyHeader = findHeader(fields, ['Variant Inventory Qty']);
  const onHandHeader = findHeader(fields, ['On hand (new)', 'On hand', 'On Hand']);

  const missing = [];
  if (!skuHeader) missing.push('Variant SKU');
  if (!variantQtyHeader && !onHandHeader) missing.push('Variant Inventory Qty or On hand (new)');
  if (missing.length) {
    throw new Error(`Missing required header(s): ${missing.join(', ')}`);
  }

  const notFound = new Set();
  const invalidQty = [];
  let updatedCount = 0;

  // iterate rows and update DB per SKU
  for (const row of rows) {
    const sku = String(row[skuHeader] || '').trim();
    if (!sku) continue;

    const rawQty = variantQtyHeader ? String(row[variantQtyHeader] || '').trim() : '';
    const altQty = onHandHeader ? String(row[onHandHeader] || '').trim() : '';
    const qtyStr = (rawQty !== '' ? rawQty : altQty);

    if (qtyStr === '') {
      invalidQty.push({ sku, reason: 'quantity column empty' });
      continue;
    }

    const qty = Number(qtyStr);
    if (!Number.isFinite(qty)) {
      invalidQty.push({ sku, reason: `invalid number: ${qtyStr}` });
      continue;
    }

    const { data, error } = await supabase
      .from('item_variations')
      .update({ quantity: qty })
      .eq('sku', sku)
      .select('id, sku, quantity');

    if (error) {
      throw new Error(`Database error while updating SKU ${sku}: ${error.message}`);
    }

    if (!data || (Array.isArray(data) && data.length === 0)) {
      notFound.add(sku);
      continue;
    }

    updatedCount += Array.isArray(data) ? data.length : 1;
  }

  return {
    updatedCount,
    notFound: Array.from(notFound),
    invalidQty,
  };
}
