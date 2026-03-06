# CSV Shopify & Square Converter (Vue)

Browser-based CSV tools for ecommerce workflows, now implemented as a Vue 3 single-page app with Vite.

All parsing and processing runs locally in the browser. No file data is uploaded to a server.

## Features

- Shopify → Square conversion (`square_import.csv` output)
- Update Shopify variant quantities from a Square inventory file
- Upload input supports CSV, XLSX, and XLS files
- Excel uploads use the first sheet and first row as headers, then flatten to row-based data
- Client-side parsing via PapaParse (CSV) and SheetJS (Excel)

## Run locally

Requirements:

- Node.js 18+

Commands:

```bash
npm install
npm run dev
```

Open the URL shown by Vite (usually `http://localhost:5173`).

## Build

```bash
npm run build
npm run preview
```

The production build is generated in `dist/`.

## GitHub Pages deployment

This Vue app works on GitHub Pages.

If deploying as a project site (`https://<user>.github.io/CSV-Converter/`), build with:

```bash
npm run build:gh-pages
```

Then publish the `dist/` contents to your Pages branch.

Routing uses hash mode (`/#/`) so direct page refresh works on GitHub Pages without server rewrites.

## App routes

- `/` Home page with step page options
- `/#/pre-con` Pre-Con step page
- `/#/post-con` Post-Con step page
- `/#/shopify-to-square` Shopify → Square tool
- `/#/update-quantity` Update Shopify quantity tool

The app uses a persistent left dashboard for navigation between all pages.

## Project structure

- `src/views/HomeView.vue` Home page with step options
- `src/views/PreConView.vue` Pre-conversion checklist page
- `src/views/PostConView.vue` Post-conversion checklist page
- `src/views/ShopifyToSquareView.vue` Shopify → Square UI
- `src/views/UpdateQuantityView.vue` Quantity update UI
- `src/lib/convertShopToSquare.js` Shopify → Square transformation logic
- `src/lib/updateInventoryFromSquare.js` Quantity sync logic
- `src/lib/downloadCsv.js` Browser CSV download helper
- `src/router/index.js` Vue Router setup
- `styles.css` Shared styling

## Test data

Sample CSV files are in `assets/`:

- `shopify_test.csv`
- `shopify_large_test.csv`
- `square_new_quantities.csv`
