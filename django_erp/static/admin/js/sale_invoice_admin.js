// django_erp/static/admin/js/sale_invoice_admin.js
console.log("🔴 SCRIPT DE FACTURAS DE VENTA CARGADO");

function fetchProductData(productId, row) {
    if (!productId || !row) return;
    fetch('/admin/sales/get-product-price/?product_id=' + productId)
        .then(response => response.json())
        .then(data => {
            var priceInput = row.querySelector('input[name$="unit_price"]');
            if (priceInput) {
                priceInput.value = data.unit_price;
                priceInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
            var stockField = row.querySelector('.field-stock_display');
            if (stockField) {
                stockField.textContent = data.stock_display || (data.stock + ' unidades') || 'Sin stock';
            }
            updateLineSubtotal(row);
            recalculateInvoiceTotals();
        })
        .catch(error => console.error("Error:", error));
}

function updateLineSubtotal(row) {
    var qtyInput = row.querySelector('input[name$="quantity"]');
    var priceInput = row.querySelector('input[name$="unit_price"]');
    if (!qtyInput || !priceInput) return;
    var subtotal = (parseFloat(qtyInput.value) || 0) * (parseFloat(priceInput.value) || 0);
    var subtotalField = row.querySelector('.field-subtotal');
    if (subtotalField) subtotalField.textContent = ERP.formatNumber(subtotal);
    var subtotalInput = row.querySelector('input[name$="subtotal"]');
    if (subtotalInput) subtotalInput.value = ERP.formatNumber(subtotal);
}

function recalculateInvoiceTotals() {
    var subtotal = 0;
    document.querySelectorAll('tr.form-row').forEach(function(row) {
        if (row.querySelector('select[name$="-method"]')) return;
        var qtyInput = row.querySelector('input[name$="quantity"]');
        var priceInput = row.querySelector('input[name$="unit_price"]');
        subtotal += (parseFloat(qtyInput?.value) || 0) * (parseFloat(priceInput?.value) || 0);
    });

    var taxRate = ERP.getTaxRate();
    var tax = subtotal * (taxRate / 100);
    var total = subtotal + tax;
    var rate = ERP.getExchangeRate();

    var subtotalField = document.getElementById('id_subtotal_display');
    var taxField = document.getElementById('id_tax_display');
    var totalField = document.getElementById('id_total_display');
    if (subtotalField) { subtotalField.value = ERP.formatNumber(subtotal); subtotalField.textContent = ERP.formatNumber(subtotal); }
    if (taxField) { taxField.value = ERP.formatNumber(tax); taxField.textContent = ERP.formatNumber(tax); }
    if (totalField) { totalField.value = ERP.formatNumber(total); totalField.textContent = ERP.formatNumber(total); }

    var subtotalBsField = document.getElementById('id_subtotal_bs_display');
    var taxBsField = document.getElementById('id_tax_bs_display');
    var totalBsField = document.getElementById('id_total_bs_display');
    if (rate > 0) {
        if (subtotalBsField) { subtotalBsField.value = ERP.formatNumber(subtotal * rate); subtotalBsField.textContent = ERP.formatNumber(subtotal * rate); }
        if (taxBsField) { taxBsField.value = ERP.formatNumber(tax * rate); taxBsField.textContent = ERP.formatNumber(tax * rate); }
        if (totalBsField) { totalBsField.value = ERP.formatNumber(total * rate); totalBsField.textContent = ERP.formatNumber(total * rate); }
    } else {
        [subtotalBsField, taxBsField, totalBsField].forEach(function(f) {
            if (f) { f.value = ''; f.textContent = '— sin tasa —'; }
        });
    }
}

function setupRow(row) {
    var select = row.querySelector('select[id$="-product"]');
    var qtyInput = row.querySelector('input[name$="quantity"]');
    var priceInput = row.querySelector('input[name$="unit_price"]');
    var rowRef = row;

    if (select) {
        var $ = django.jQuery;
        $(select).on('select2:select', function(e) {
            var productId = e.params.data.id;
            if (productId) { this.value = productId; fetchProductData(productId, rowRef); }
        });
        select.addEventListener('change', function() {
            if (this.value) fetchProductData(this.value, rowRef);
        });
    }
    if (qtyInput) {
        qtyInput.addEventListener('change', function() { updateLineSubtotal(rowRef); recalculateInvoiceTotals(); });
        qtyInput.addEventListener('keyup', function() { updateLineSubtotal(rowRef); recalculateInvoiceTotals(); });
    }
    if (priceInput) {
        priceInput.addEventListener('change', function() { updateLineSubtotal(rowRef); recalculateInvoiceTotals(); });
        priceInput.addEventListener('keyup', function() { updateLineSubtotal(rowRef); recalculateInvoiceTotals(); });
    }
}

function setupAllRows() {
    document.querySelectorAll('tr.form-row').forEach(function(row) {
        if (!row._hasSetup) { row._hasSetup = true; setupRow(row); }
    });
    recalculateInvoiceTotals();
}

document.addEventListener('click', function(e) {
    var addButton = e.target.closest('.add-row a') || e.target.closest('.add-row');
    if (addButton) {
        setTimeout(function() {
            document.querySelectorAll('tr.form-row').forEach(function(row) {
                if (!row._hasSetup) { row._hasSetup = true; setupRow(row); }
            });
            recalculateInvoiceTotals();
        }, 300);
        setTimeout(recalculateInvoiceTotals, 600);
    }
});

document.addEventListener('DOMContentLoaded', function() {
    if (!window.ERP) { console.error('[sale_invoice_admin] ERP no cargó'); return; }
    var hasRate = ERP.ensureExchangeRate();
    ERP.ensureTaxRate();
    if (!hasRate) {
        var saveBtn = document.querySelector('input[name="_save"], button[name="_save"]');
        if (saveBtn) { saveBtn.disabled = true; saveBtn.title = 'No hay tasa de cambio configurada'; }
    }
    setupAllRows();
    setTimeout(setupAllRows, 500);
    setTimeout(setupAllRows, 1000);
});