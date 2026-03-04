// parseCSV: Lightweight CSV parser that returns an array of rows (each row is an array of cells).
// - Handles quoted fields, escaped double-quotes (""), commas inside quotes, and CR/LF line endings.
// - Not a full CSV library but sufficient for typical exports where headers and values are comma-separated.
function parseCSV(text) {
  const rows = [];
  let cur = '';
  let row = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const nxt = text[i+1];
    if (ch === '"') {
      if (inQuotes && nxt === '"') { cur += '"'; i++; } else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      row.push(cur); cur = '';
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && nxt === '\n') continue;
      row.push(cur); cur = '';
      if (!(row.length === 1 && row[0] === '')) rows.push(row);
      row = [];
    } else {
      cur += ch;
    }
  }
  if (cur !== '' || row.length) {
    row.push(cur);
    rows.push(row);
  }
  return rows;
}

// rowsToObjects: Convert parsed CSV rows (array-of-arrays) into an object form:
// { headers: [...], rows: [ { headerName: value, ... }, ... ] }
function rowsToObjects(rows) {
  const headers = rows[0] || [];
  const objs = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const o = {};
    for (let j = 0; j < headers.length; j++) {
      o[headers[j] || `col${j}`] = r[j] !== undefined ? r[j] : '';
    }
    objs.push(o);
  }
  return { headers, rows: objs };
}

// buildCSV: Convert a headers array and an array of row objects back into CSV text.
function buildCSV(headers, rows) {
  function quoteIfNeeded(s){
    if (s === null || s === undefined) s = '';
    const str = String(s);
    if (str.includes('"')) return '"' + str.replace(/"/g, '""') + '"';
    if (str.includes(',') || str.includes('\n') || str.includes('\r')) return '"' + str + '"';
    return str;
  }
  const lines = [];
  lines.push(headers.map(quoteIfNeeded).join(','));
  for (const r of rows) {
    const line = headers.map(h => quoteIfNeeded(r[h] !== undefined ? r[h] : '')).join(',');
    lines.push(line);
  }
  return lines.join('\r\n');
}

// readFileText: Helper to read a File object as text using FileReader and return a Promise.
async function readFileText(file){
  return await new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = e => res(e.target.result);
    fr.onerror = e => rej(e);
    fr.readAsText(file);
  });
}

// Wire up filename display for the two file inputs on the Update Quantity page.
(function(){
  const shopInput = document.getElementById('shopifyFile');
  const shopNameSpan = document.getElementById('shopifyName');
  if (shopInput && shopNameSpan) {
    shopInput.addEventListener('change', () => {
      const f = shopInput.files[0];
      shopNameSpan.textContent = f ? f.name : 'No file chosen';
    });
  }

  const squareInput = document.getElementById('squareFile');
  const squareNameSpan = document.getElementById('squareName');
  if (squareInput && squareNameSpan) {
    squareInput.addEventListener('change', () => {
      const f = squareInput.files[0];
      squareNameSpan.textContent = f ? f.name : 'No file chosen';
    });
  }
})();

// Main button handler: read both files, parse CSVs, build a map of Square SKU -> quantity,
// update matching Shopify rows' `Variant Inventory Qty`, and trigger a download of the updated CSV.
document.getElementById('processBtn').addEventListener('click', async ()=>{
  const shopifyFile = document.getElementById('shopifyFile').files[0];
  const squareFile = document.getElementById('squareFile').files[0];
  if (!shopifyFile || !squareFile) { alert('Please select both Shopify and Square CSV files.'); return; }
  try {
    const [shopText, sqText] = await Promise.all([readFileText(shopifyFile), readFileText(squareFile)]);
    const shopRows = parseCSV(shopText);
    const sqRows = parseCSV(sqText);
    if (shopRows.length === 0 || sqRows.length === 0) { alert('One of the files appears empty or unparseable.'); return; }
    const shop = rowsToObjects(shopRows);
    const sq = rowsToObjects(sqRows);
    const shopHeaders = shop.headers;
    const shopVariantSkuHeader = shopHeaders.find(h => h.toLowerCase() === 'variant sku') || shopHeaders.find(h => h.toLowerCase().includes('variant sku'));
    const shopQtyHeader = shopHeaders.find(h => h.toLowerCase() === 'variant inventory qty');
    if (!shopVariantSkuHeader || !shopQtyHeader) { alert('Could not find `Variant SKU` or `Variant Inventory Qty` headers in the Shopify CSV.'); return; }
    const sqHeaders = sq.headers;
    const sqSkuHeader = sqHeaders.find(h => h && h.toLowerCase().includes('sku'));
    const sqQtyHeader = sqHeaders.find(h => h && h.toLowerCase().includes('current quantity'));
    if (!sqSkuHeader || !sqQtyHeader) { alert('Could not find SKU or Current Quantity header in Square CSV (looked for header containing "sku" and header containing "current quantity").'); return; }
    const qtyMap = new Map();
    for (const row of sq.rows) {
      const sku = (row[sqSkuHeader] || '').trim();
      const qty = (row[sqQtyHeader] || '').trim();
      if (sku !== '') qtyMap.set(sku, qty);
    }
    const updatedRows = [];
    for (const row of shop.rows) {
      const variantSku = (row[shopVariantSkuHeader] || '').trim();
      if (variantSku && qtyMap.has(variantSku)) {
        row[shopQtyHeader] = qtyMap.get(variantSku);
      }
      updatedRows.push(row);
    }
    const outCSV = buildCSV(shop.headers, updatedRows);
    const blob = new Blob([outCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = shopifyFile.name.replace(/\.csv$/i, '') + '-updated-quantities.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error(err);
    alert('Error processing files: ' + (err && err.message ? err.message : err));
  }
});
