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

function findOptionValueByName(row, nameNeedle) {
    const normalizedNeedle = nameNeedle.toLowerCase();
    for (let index = 1; index <= 3; index += 1) {
        const optionName = (row[`Option${index} Name`] || '').toLowerCase();
        if (optionName.includes(normalizedNeedle)) {
            return row[`Option${index} Value`] || '';
        }
    }
    return '';
}

function findOptionValueByNameUsingProductNames(row, productRow, nameNeedle) {
    const normalizedNeedle = nameNeedle.toLowerCase();
    for (let index = 1; index <= 3; index += 1) {
        const rowOptionName = (row[`Option${index} Name`] || '').toLowerCase();
        const productOptionName = (productRow ? productRow[`Option${index} Name`] : '' || '').toLowerCase();
        if (rowOptionName.includes(normalizedNeedle) || productOptionName.includes(normalizedNeedle)) {
            return row[`Option${index} Value`] || (productRow ? productRow[`Option${index} Value`] : '') || '';
        }
    }
    return '';
}

function hasOptionName(row, nameNeedle) {
    const normalizedNeedle = nameNeedle.toLowerCase();
    for (let index = 1; index <= 3; index += 1) {
        const optionName = (row[`Option${index} Name`] || '').toLowerCase();
        if (optionName.includes(normalizedNeedle)) {
            return true;
        }
    }
    return false;
}

function normalizeGenderValue(rawGender) {
    const value = (rawGender || '').toLowerCase().trim();
    if (!value) return '';

    if (value.includes('womens') || value.includes('women') || value.includes('woman') || value.includes('ladies') || value.includes('lady') || value.includes('female')) {
        return 'Womens';
    }

    if (value.includes('mens') || value.includes('men') || value.includes('male')) {
        return 'Mens';
    }

    return '';
}

function detectMensOrWomens(row, productRow) {
    const explicitGender = normalizeGenderValue(findOptionValueByName(row, 'gender'))
        || (productRow ? normalizeGenderValue(findOptionValueByName(productRow, 'gender')) : '');
    if (explicitGender) return explicitGender;

    const searchableText = [
        row.Title,
        productRow ? productRow.Title : '',
        row.Handle,
        productRow ? productRow.Handle : '',
        row.Tags,
        productRow ? productRow.Tags : '',
        row['Variant SKU'],
        row['Image Src'],
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

    const hasWomenSignal = /\bwomens\b|\bwomen\b|\bwoman\b|\bladies\b|\blady\b|\bfemale\b/.test(searchableText);
    return hasWomenSignal ? 'Womens' : 'Mens';
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

        group.forEach((row) => {
            const sku = row['Variant SKU'];
            if (!sku) return;

            const finalTitle = row.Title || base.title || '';
            const finalDescription = stripHtml(row['Body (HTML)']) || base.description || '';
            const finalCategory = row.Type || base.category || '';
            const price = row['Variant Price'] || '';
            const barcode = row['Variant Barcode'] || '';
            const inventoryQty = row['Variant Inventory Qty'] || '0';

            const sizeValue = findOptionValueByName(row, 'size')
                || findOptionValueByNameUsingProductNames(row, productRow, 'size')
                || (productRow ? findOptionValueByName(productRow, 'size') : '')
                || row['Option1 Value']
                || 'Size';
            const genderValue = detectMensOrWomens(row, productRow);
            const hasStyle = hasOptionName(row, 'style') || (productRow ? hasOptionName(productRow, 'style') : false);

            const variationName = sizeValue || 'Size';
            const optionName = hasStyle ? 'Style' : '';
            const optionValue = hasStyle ? genderValue : '';

            output.push([
                handle, '', finalTitle, finalTitle, variationName,
                sku, finalDescription, finalCategory, '', barcode,
                'Physical good', ' ', '', '',
                price, '', groupArchived, '', 'N', ' ',
                'N', optionName, optionValue,
                '0', inventoryQty, 'TRUE', '',
            ]);
        });
    });

    return output
        .map((row) => row.map((value) => `"${(value || '').toString().replace(/"/g, '""')}"`).join(','))
        .join('\r\n');
}
