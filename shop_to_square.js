// Moved from shopify-to-square.html
// Lightweight helper to strip HTML from Shopify "Body (HTML)" fields
function stripHTML(html) {
  const div = document.createElement("div");
  div.innerHTML = html || "";
  return div.textContent || div.innerText || "";
}

// Main conversion function: reads the uploaded Shopify CSV, maps rows into the
// Square import format, and triggers a download.
function convertCSV() {
  const fileInput = document.getElementById('csvFile');
  const file = fileInput.files[0];

  if (!file) {
    alert("Upload a Shopify CSV first.");
    return;
  }

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: function(results) {
      const data = results.data;

      const squareHeaders = [
        "Reference Handle","Token","Item Name","Customer-facing Name","Variation Name",
        "SKU","Description","Categories","Reporting Category","GTIN",
        "Item Type","Weight (lb)","Social Media Link Title","Social Media Link Description",
        "Price","Online Sale Price","Archived","Sellable","Contains Alcohol","Stockable",
        "Skip Detail Screen in POS","Option Name 1","Option Value 1",
        "Current Quantity LPT Realty, LLC","New Quantity LPT Realty, LLC",
        "Stock Alert Enabled LPT Realty, LLC","Stock Alert Count LPT Realty, LLC"
      ];

      let output = [squareHeaders];

      // Group rows by handle to ensure variants inherit only their product's data
      const groups = {};
      data.forEach(row => {
        const handle = row["Handle"] || "";
        if (!groups[handle]) groups[handle] = [];
        groups[handle].push(row);
      });

      Object.keys(groups).forEach(handle => {
        const group = groups[handle];

        // Use the first row that includes a Title as the product-level source
        const productRow = group.find(r => r["Title"]);
        const base = {
          title: productRow ? productRow["Title"] : "",
          description: productRow ? stripHTML(productRow["Body (HTML)"]) : "",
          category: productRow ? productRow["Type"] : "",
          vendor: productRow ? productRow["Vendor"] : "",
          option1: productRow ? (productRow["Option1 Value"] || "") : ""
        };

        group.forEach(row => {
          const sku = row["Variant SKU"];
          if (!sku) return;

          const finalTitle = row["Title"] || base.title || "";
          const finalDescription = stripHTML(row["Body (HTML)"]) || base.description || "";
          const finalCategory = row["Type"] || base.category || "";
          const price = row["Variant Price"] || "";
          const barcode = row["Variant Barcode"] || "";
          const weight = " ";
          const inventoryQty = row["Variant Inventory Qty"] || "0";

          const archived = (row["Status"] || "").toLowerCase() === "archived" ? "Y" : "N";
          const sellable = "";

          const optionName = row["Option1 Name"] || "Title";
          const optionValue = row["Option1 Value"] || base.option1 || "Default";
          const variationName = optionValue;

          const squareRow = [
            handle, "", finalTitle, finalTitle, variationName,
            sku, finalDescription, finalCategory, "", barcode,
            "Physical good", weight, "", "",
            price, "", archived, sellable, "N", " ",
            "N", optionName, optionValue,
            "0", inventoryQty, "TRUE", "",
          ];

          output.push(squareRow);
        });
      });

      downloadCSV(output);
    }
  });
}

// downloadCSV: converts 2D array into CSV text and triggers a browser download.
function downloadCSV(data) {
  const csv = data.map(row =>
    row.map(val => `"${(val||"").toString().replace(/"/g,'""')}"`).join(",")
  ).join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "square_import.csv";
  link.click();

  // Release the temporary object URL once the download is triggered
  URL.revokeObjectURL(url);

  // Release the object URL once the download has been triggered
  URL.revokeObjectURL(url);
}
