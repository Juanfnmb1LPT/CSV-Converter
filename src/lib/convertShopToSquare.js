import Papa from 'papaparse';

function stripHtml(html) {
    const div = document.createElement('div');
    div.innerHTML = html || '';
    return div.textContent || div.innerText || '';
}

function parseFile(file) {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => resolve(results.data || []),
            error: (error) => reject(error),
        });
    });
}

export async function convertShopifyToSquareCsv(file) {
    const data = await parseFile(file);

    const squareHeaders = [
        'Reference Handle', 'Token', 'Item Name', 'Customer-facing Name', 'Variation Name',
        'SKU', 'Description', 'Categories', 'Reporting Category', 'GTIN',
        'Item Type', 'Weight (lb)', 'Social Media Link Title', 'Social Media Link Description',
        'Price', 'Online Sale Price', 'Archived', 'Sellable', 'Contains Alcohol', 'Stockable',
        'Skip Detail Screen in POS', 'Option Name 1', 'Option Value 1',
        'Current Quantity LPT Realty, LLC', 'New Quantity LPT Realty, LLC',
        'Stock Alert Enabled LPT Realty, LLC', 'Stock Alert Count LPT Realty, LLC',
    ];

    const output = [squareHeaders];
    const groups = {};

    data.forEach((row) => {
        const handle = row.Handle || '';
        if (!groups[handle]) groups[handle] = [];
        groups[handle].push(row);
    });

    Object.keys(groups).forEach((handle) => {
        const group = groups[handle];
        const productRow = group.find((row) => row.Title);
        const base = {
            title: productRow ? productRow.Title : '',
            description: productRow ? stripHtml(productRow['Body (HTML)']) : '',
            category: productRow ? productRow.Type : '',
        };

        const groupArchived = group.some((row) => {
            const status = (row.Status || '').toLowerCase();
            return status === 'archived' || status === 'draft';
        }) ? 'Y' : 'N';

        const groupOptionName = productRow
            ? (productRow['Option1 Name'] || productRow['Option1 Value'] || 'Title')
            : 'Title';
        const groupOptionValue = productRow ? (productRow['Option1 Value'] || '') : '';

        group.forEach((row) => {
            const sku = row['Variant SKU'];
            if (!sku) return;

            const finalTitle = row.Title || base.title || '';
            const finalDescription = stripHtml(row['Body (HTML)']) || base.description || '';
            const finalCategory = row.Type || base.category || '';
            const price = row['Variant Price'] || '';
            const barcode = row['Variant Barcode'] || '';
            const inventoryQty = row['Variant Inventory Qty'] || '0';
            const optionValue = row['Option1 Value'] || groupOptionValue || 'Default';

            output.push([
                handle, '', finalTitle, finalTitle, optionValue,
                sku, finalDescription, finalCategory, '', barcode,
                'Physical good', ' ', '', '',
                price, '', groupArchived, '', 'N', ' ',
                'N', groupOptionName, optionValue,
                '0', inventoryQty, 'TRUE', '',
            ]);
        });
    });

    return output
        .map((row) => row.map((value) => `"${(value || '').toString().replace(/"/g, '""')}"`).join(','))
        .join('\r\n');
}
