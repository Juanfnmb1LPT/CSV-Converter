# Deployed site

The main branch is deployed via GitHub Pages at:

- https://juanfnmb1lpt.github.io/CSV-Converter/

# Running the project (live view)

For the best experience when developing locally, run the project with a live-reloading dev server so your browser refreshes automatically when you save changes:

- In VS Code, install the **Live Server** extension (by Ritwick Dey).
- Open this folder in VS Code.
- Right‑click `index.html` and choose **Open with Live Server**.

Or via Node.js:

- Open a terminal in this folder.
- Run: `npx live-server`
- Your default browser will open; it will auto‑reload on file save.

# CSV Shopify & Square Converter

A small, browser-based toolset for working with ecommerce CSV files. It runs entirely in the browser — no data is sent to any server.

There are two main flows:

- **Shopify → Square CSV Converter** (`shopify-to-square.html`)
- **Update Shopify Quantity from Square** (`update-quantity.html`)

## 1. Shopify → Square CSV Converter

**Goal:** Take a standard Shopify product export CSV and generate a new CSV ready to import into Square.

**How it works:**
- Uses PapaParse in the browser to read the uploaded Shopify CSV.
- For each variant row with a `Variant SKU`, it:
  - Inherits product-level details (description, type, vendor, options) when needed.
  - Strips HTML from the `Body (HTML)` field so descriptions are plain text.
  - Maps Shopify fields into a Square-friendly header set.
- Builds a new CSV and automatically downloads `square_import.csv`.

**Steps to use:**
1. Open `shopify-to-square.html` in a modern browser (Chrome, Edge, Safari, etc.).
2. Click **Choose File** and select a Shopify product export CSV.
3. Click **Convert & Download**.
4. Import the resulting `square_import.csv` into Square.

## 2. Update Shopify Quantity from Square

**Goal:** Take an existing Shopify product CSV and a Square inventory CSV, then overwrite Shopify variant quantities with the values from Square.

**How it works:**
- A lightweight in-browser CSV parser reads both files (no external libraries required).
- The script:
  - Parses the Shopify CSV and finds the `Variant SKU` and `Variant Inventory Qty` columns.
  - Parses the Square CSV and looks for a SKU column (header containing `sku`) and a quantity column (header containing `current quantity`).
  - Builds a `SKU → quantity` map from the Square file.
  - For each Shopify row, if the `Variant SKU` exists in the map, it replaces `Variant Inventory Qty` with the Square quantity.
- Outputs a new CSV named like `<original>-updated-quantities.csv` and triggers a download.

**Steps to use:**
1. Open `update-quantity.html` in a modern browser.
2. Under **Shopify CSV (old quantities)**, choose your Shopify export.
3. Under **Square CSV (new quantities)**, choose your Square inventory CSV.
4. Click **Download Updated Shopify CSV**.
5. Import the resulting file back into Shopify.

## Data & privacy

- All parsing and processing happens **locally in your browser**.
- Files are never uploaded to any server.
- You can use this tool completely offline after the first load (the only external dependency is the PapaParse CDN on the Shopify → Square page).

## File overview

- `index.html` – Landing page with navigation to both tools.
- `shopify-to-square.html` – UI for converting Shopify CSVs into a Square import CSV.
- `update-quantity.html` – UI for updating Shopify variant quantities using Square CSV data.
- `shop_to_square.js` – Logic for the Shopify → Square conversion (uses PapaParse).
- `update_quantity.js` – Logic for syncing quantities from Square into a Shopify CSV.
- `styles.css` – Shared styling, including the animated logo treatment and responsive layout.

## Notes for reviewers

- The code is intentionally client-side and dependency-light for easy distribution.
- Error messages are user-focused (e.g. missing required headers, empty files) to make failures clear during demos.
- CSV parsing in `update_quantity.js` is purpose-built for this workflow and handles typical quoted fields, commas in values, and CR/LF line endings.
