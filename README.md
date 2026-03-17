# CSV Shopify & Square Converter (Vue)
Live at https://juanfnmb1lpt.github.io/Shop-Squared/

Browser-based CSV tools for ecommerce workflows, now implemented as a Vue 3 single-page app with Vite.

All parsing and processing runs locally in the browser. No file data is uploaded to a server.

## Features

- Shopify → Square conversion (`square_import.csv` output)
- Update Shopify variant quantities from a Square inventory file
- Upload input supports CSV, XLSX, and XLS files
- Excel uploads use the first sheet and first row as headers, then flatten to row-based data
- Client-side parsing via PapaParse (CSV) and SheetJS (Excel)
- Search Inventory with QR scan support for bin lookup and auto-navigation
- Bin CRUD from Search Inventory
- Item and variation CRUD from the Bin Detail page

## Run locally

Requirements:

- Node.js 18+

Commands:

```bash
npm install
npm run dev
```

Open the URL shown by Vite (usually `http://localhost:5173`).

## Login

The app now requires login before accessing tools.

- Username: `admin`
- Password: `test`

Successful login is persisted in the browser, so users stay signed in across refresh/reopen until they click Logout.

## Build

```bash
npm run build
npm run preview
```

The production build is generated in `dist/`.

## GitHub Pages deployment

This Vue app works on GitHub Pages.

This repo also includes an automated Pages workflow at [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml) that builds and deploys from `main`.

Set these GitHub Actions secrets before deploying:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

In GitHub repo settings, set **Pages → Source** to **GitHub Actions** so the live site always matches the latest `main` build.

After enabling it, push to `main` (or run the workflow manually from the Actions tab) to publish the latest build.

Routing uses hash mode (`/#/`) so direct page refresh works on GitHub Pages without server rewrites.

## App routes

- `/#/login` Login page
- `/` Home page with step page options (requires login)
- `/#/pre-con` Pre-Con step page
- `/#/post-con` Post-Con step page
- `/#/shopify-to-square` Shopify → Square tool
- `/#/update-quantity` Update Shopify quantity tool
- `/#/search-inventory` Search inventory page
- `/#/search-inventory/:id` Bin detail and item/variation management page

The app uses a persistent left dashboard for navigation between all pages.

## Project structure

- `src/views/HomeView.vue` Home page with step options
- `src/views/PreConView.vue` Pre-conversion checklist page
- `src/views/PostConView.vue` Post-conversion checklist page
- `src/views/ShopifyToSquareView.vue` Shopify → Square UI
- `src/views/UpdateQuantityView.vue` Quantity update UI
- `src/views/SearchInventoryView.vue` Bin search and bin CRUD UI
- `src/views/BinDetailView.vue` Bin detail plus item and variation CRUD UI
- `src/lib/convertShopToSquare.js` Shopify → Square transformation logic
- `src/lib/updateInventoryFromSquare.js` Quantity sync logic
- `src/lib/downloadCsv.js` Browser CSV download helper
- `src/lib/binCrud.js` Bin CRUD helpers
- `src/lib/itemCrud.js` Item CRUD helpers
- `src/lib/variationCrud.js` Variation CRUD helpers
- `src/router/index.js` Vue Router setup
- `styles.css` Shared styling

## Test data

Sample CSV files are in `assets/`:

- `shopify_test.csv`
- `shopify_large_test.csv`
- `square_new_quantities.csv`
