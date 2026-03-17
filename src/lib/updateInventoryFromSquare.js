import Papa from 'papaparse';
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

function normalizeSku(value) {
  return String(value || '').trim();
}

function parseQuantity(rawValue) {
  const qty = Number(String(rawValue || '').trim());
  return Number.isFinite(qty) ? qty : null;
}

function findSquareQuantityHeader(fields) {
  return fields.find((h) => String(h || '').toLowerCase().includes('current quantity')) || null;
}

export async function buildUpdatedShopifyInventoryData(shopifyFile, squareFile) {
  if (!shopifyFile || !squareFile) {
    throw new Error('Please provide both Shopify and Square files.');
  }

  const shopifyResults = await parseUploadedTable(shopifyFile);
  const squareResults = await parseUploadedTable(squareFile);

  const shopifyFields = shopifyResults.meta?.fields || [];
  const squareFields = squareResults.meta?.fields || [];
  const shopifyRows = shopifyResults.data || [];
  const squareRows = squareResults.data || [];

  if (!shopifyRows.length) throw new Error('The Shopify file appears empty.');
  if (!squareRows.length) throw new Error('The Square file appears empty.');

  const shopifySkuHeader = findHeader(shopifyFields, ['Variant SKU', 'SKU']);
  const shopifyQtyHeader = findHeader(shopifyFields, ['Variant Inventory Qty', 'On hand (new)', 'On hand', 'On Hand']);
  const squareSkuHeader = findHeader(squareFields, ['SKU', 'sku']);
  const squareQtyHeader = findSquareQuantityHeader(squareFields);

  const missing = [];
  if (!shopifySkuHeader) missing.push('Shopify Variant SKU');
  if (!shopifyQtyHeader) missing.push('Shopify Variant Inventory Qty (or On hand)');
  if (!squareSkuHeader) missing.push('Square SKU');
  if (!squareQtyHeader) missing.push('Square header containing "Current Quantity"');
  if (missing.length) {
    throw new Error(`Missing required header(s): ${missing.join(', ')}`);
  }

  const squareQtyBySku = new Map();
  for (const row of squareRows) {
    const sku = normalizeSku(row[squareSkuHeader]);
    if (!sku) continue;

    const qty = parseQuantity(row[squareQtyHeader]);
    if (qty === null) continue;
    squareQtyBySku.set(sku, qty);
  }

  const updatedRows = [];
  const allRows = shopifyRows.map((row) => {
    const sku = normalizeSku(row[shopifySkuHeader]);
    if (!sku || !squareQtyBySku.has(sku)) return { ...row };

    const nextRow = { ...row, [shopifyQtyHeader]: String(squareQtyBySku.get(sku)) };
    updatedRows.push(nextRow);
    return nextRow;
  });

  return {
    headers: shopifyFields,
    rows: updatedRows,
    allRows,
  };
}

export async function updateShopifyInventoryCsv(shopifyFile, squareFile) {
  const { headers, allRows } = await buildUpdatedShopifyInventoryData(shopifyFile, squareFile);

  return Papa.unparse({
    fields: headers,
    data: allRows.map((row) => headers.map((header) => row[header] ?? '')),
  });
}

export async function updateDatabaseFromSquareFile(file) {
  if (!file) throw new Error('No file provided.');
  if (!hasSupabaseConfig || !supabase) throw new Error('Supabase is not configured.');

  const results = await parseUploadedTable(file);
  const fields = results.meta?.fields || [];
  const rows = results.data || [];

  if (!rows.length) throw new Error('The uploaded file appears empty.');

  const skuHeader = findHeader(fields, ['sku', 'SKU']);
  // We need to match headers that contain the words "current quantity" anywhere.
  const currentQtyHeader = findSquareQuantityHeader(fields);

  const missing = [];
  if (!skuHeader) missing.push('SKU');
  if (!currentQtyHeader) missing.push('Current Quantity (header containing "Current Quantity")');
  if (missing.length) {
    throw new Error(`Missing required header(s): ${missing.join(', ')}`);
  }

  const notFound = new Set();
  const invalidQty = [];
  let updatedCount = 0;

  for (const row of rows) {
    const sku = String(row[skuHeader] || '').trim();
    if (!sku) continue;

    const qtyStr = String(row[currentQtyHeader] || '').trim();
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

