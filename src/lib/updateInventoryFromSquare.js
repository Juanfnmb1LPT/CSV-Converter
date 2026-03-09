import Papa from 'papaparse';
import { parseUploadedTable } from './parseUploadedTable';

export async function buildUpdatedShopifyInventoryData(shopifyFile, squareFile) {
    const [shopifyResults, squareResults] = await Promise.all([
        parseUploadedTable(shopifyFile),
        parseUploadedTable(squareFile),
    ]);

    const shopHeaders = shopifyResults.meta?.fields || [];
    const squareHeaders = squareResults.meta?.fields || [];

    if (shopifyResults.data.length === 0 || squareResults.data.length === 0) {
        throw new Error('One of the files appears empty or unparseable.');
    }

    const shopVariantSkuHeader =
        shopHeaders.find((header) => header?.toLowerCase() === 'variant sku')
        || shopHeaders.find((header) => header?.toLowerCase().includes('variant sku'));
    const shopQtyHeader = shopHeaders.find((header) => header?.toLowerCase() === 'variant inventory qty');

    if (!shopVariantSkuHeader || !shopQtyHeader) {
        throw new Error('Could not find `Variant SKU` or `Variant Inventory Qty` headers in the Shopify CSV.');
    }

    const squareSkuHeader = squareHeaders.find((header) => header && header.toLowerCase().includes('sku'));
    const squareQtyHeader = squareHeaders.find((header) => header && header.toLowerCase().includes('current quantity'));

    if (!squareSkuHeader || !squareQtyHeader) {
        throw new Error('Could not find SKU or Current Quantity header in Square CSV (looked for header containing "sku" and "current quantity").');
    }

    const quantityMap = new Map();
    squareResults.data.forEach((row) => {
        const sku = (row[squareSkuHeader] || '').trim();
        const qty = (row[squareQtyHeader] || '').trim();
        if (sku) quantityMap.set(sku, qty);
    });

    const updatedRows = shopifyResults.data.map((row) => {
        const nextRow = { ...row };
        const variantSku = (nextRow[shopVariantSkuHeader] || '').trim();
        if (variantSku && quantityMap.has(variantSku)) {
            nextRow[shopQtyHeader] = quantityMap.get(variantSku);
        }
        return nextRow;
    });

    return {
        headers: shopHeaders,
        rows: updatedRows,
    };
}

export async function updateShopifyInventoryCsv(shopifyFile, squareFile) {
    const { headers, rows } = await buildUpdatedShopifyInventoryData(shopifyFile, squareFile);
    return Papa.unparse({ fields: headers, data: rows });
}
