import Papa from 'papaparse';
import * as XLSX from 'xlsx';

function normalizeCell(value) {
    if (value === null || value === undefined) return '';
    return String(value).trim();
}

function parseCsvFile(file) {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => resolve(results),
            error: (error) => reject(error),
        });
    });
}

async function parseExcelFile(file) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', raw: false, cellDates: false });
    const firstSheetName = workbook.SheetNames?.[0];

    if (!firstSheetName) {
        throw new Error('The Excel file has no worksheets.');
    }

    const sheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: '',
        raw: false,
        blankrows: false,
    });

    if (!rows.length) {
        throw new Error('The selected Excel sheet appears empty.');
    }

    const fields = (rows[0] || []).map((header) => normalizeCell(header));
    const hasAnyHeader = fields.some((header) => header);

    if (!hasAnyHeader) {
        throw new Error('Could not detect headers in the first row of the Excel sheet.');
    }

    const data = rows
        .slice(1)
        .map((rowValues) => {
            const row = {};
            fields.forEach((field, index) => {
                row[field] = normalizeCell(rowValues[index]);
            });
            return row;
        })
        .filter((row) => Object.values(row).some((value) => normalizeCell(value)));

    return {
        data,
        meta: {
            fields,
        },
    };
}

export async function parseUploadedTable(file) {
    if (!file) {
        throw new Error('No file was provided.');
    }

    const fileName = (file.name || '').toLowerCase();

    if (fileName.endsWith('.csv')) {
        return parseCsvFile(file);
    }

    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        return parseExcelFile(file);
    }

    throw new Error('Unsupported file type. Please upload a CSV, XLSX, or XLS file.');
}
