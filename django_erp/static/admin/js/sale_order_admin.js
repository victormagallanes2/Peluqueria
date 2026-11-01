// django_erp/static/admin/js/sale_order_admin.js
console.log("🔴 SCRIPT DE ÓRDENES DE VENTA CARGADO");

function fetchProductDetails(productId, row) {
    if (!productId || !row) return;
    fetch('/admin/sales/get-product-price/?product_id=' + productId)
        .then(response => response.json())
        .then(data => {
            var priceInput = row.querySelector('input[name$="unit_price"]');
            if (!priceInput) priceInput = row.querySelector('input[id*="unit_price"]');
            if (priceInput) {
                priceInput.value = data.unit_price;
                priceInput.setAttribute('readonly', 'readonly');
                priceInput.style.backgroundColor = '#f0f0f0';
                priceInput.style.cursor = 'not-allowed';
                priceInput.dispatchEvent(new Event('change', { bubbles: true }));
            } else {
                var priceDisplay = row.querySelector('.field-unit_price');
                if (priceDisplay) {
                    if (data.rate && data.rate > 0) {
                        priceDisplay.innerHTML =
                            '<div><strong>$ ' + data.unit_price.toFixed(2) + '</strong></div>' +
                            '<div style="color:#6c757d;font-size:11px;">Bs. ' + data.price_bs.toFixed(2) + '</div>';
                    } else {
                        priceDisplay.innerHTML = '$ ' + data.unit_price.toFixed(2);
                    }
                }
            }
            var stockField = row.querySelector('.field-stock_display');
            if (stockField) {
                if (data.stock_display) stockField.textContent = data.stock_display;
                else if (data.stock !== undefined) stockField.textContent = data.stock + ' unidades';
                else stockField.textContent = 'Sin stock';
            }
            var locationSelect = row.querySelector('select[name$="location"]');
            if (locationSelect && data.location_id) {
                for (var i = 0; i < locationSelect.options.length; i++) {
                    if (locationSelect.options[i].value == data.location_id) {
                        locationSelect.value = data.location_id;
                        break;
                    }
                }
                locationSelect.disabled = true;
                locationSelect.style.backgroundColor = '#f0f0f0';
                locationSelect.style.cursor = 'not-allowed';
            }
            updateLineSubtotal(row);
            recalculateOrderTotals();
        })
        .catch(error => console.error("Error al obtener datos del producto:", error));
}

function updateLineSubtotal(row) {
    var qtyInput = row.querySelector('input[name$="quantity"]');
    var priceInput = row.querySelector('input[name$="unit_price"]');
    if (!priceInput) {
        var priceDisplay = row.querySelector('.field-unit_price');
        if (priceDisplay) {
            var text = priceDisplay.textContent || '';
            var match = text.match(/\$?\s*([\d,]+\.?\d*)/);
            if (match) {
                var priceValue = parseFloat(match[1].replace(/,/g, ''));
                updateTotalsFromValues(row, qtyInput, priceValue);
                return;
            }
        }
        return;
    }
    if (!qtyInput) return;
    var subtotal = (parseFloat(qtyInput.value) || 0) * (parseFloat(priceInput.value) || 0);
    var subtotalField = row.querySelector('.field-subtotal');
    if (subtotalField) subtotalField.textContent = ERP.formatNumber(subtotal);
    var subtotalInput = row.querySelector('input[name$="subtotal"]');
    if (subtotalInput) subtotalInput.value = ERP.formatNumber(subtotal);
}

function updateTotalsFromValues(row, qtyInput, priceValue) {
    var subtotal = (parseFloat(qtyInput?.value) || 0) * (priceValue || 0);
    var subtotalField = row.querySelector('.field-subtotal');
    if (subtotalField) subtotalField.textContent = ERP.formatNumber(subtotal);
    var subtotalInput = row.querySelector('input[name$="subtotal"]');
    if (subtotalInput) subtotalInput.value = ERP.formatNumber(subtotal);
}

function recalculateOrderTotals() {
    var subtotal = 0;
    document.querySelectorAll('tr.form-row').forEach(function(row) {
        if (row.querySelector('select[name$="-method"]')) return;
        var qtyInput = row.querySelector('input[name$="quantity"]');
        var priceInput = row.querySelector('input[name$="unit_price"]');
        var qty = parseFloat(qtyInput?.value) || 0;
        var price = 0;
        if (priceInput) {
            price = parseFloat(priceInput.value) || 0;
        } else {
            var priceDisplay = row.querySelector('.field-unit_price');
            if (priceDisplay) {
                var match = (priceDisplay.textContent || '').match(/\$?\s*([\d,]+\.?\d*)/);
                if (match) price = parseFloat(match[1].replace(/,/g, '')) || 0;
            }
        }
        subtotal += qty * price;
    });

    var taxRate = ERP.getTaxRate();
    var tax = subtotal * (taxRate / 100);
    var total = subtotal + tax;
    var rate = ERP.getExchangeRate();

    var subtotalField = document.getElementById('id_subtotal_display');
    var taxField = document.getElementById('id_tax_display');
    var totalField = document.getElementById('id_total_display');
    if (subtotalField) subtotalField.value = ERP.formatNumber(subtotal);
    if (taxField) taxField.value = ERP.formatNumber(tax);
    if (totalField) totalField.value = ERP.formatNumber(total);

    var subtotalBsField = document.getElementById('id_subtotal_bs_display');
    var taxBsField = document.getElementById('id_tax_bs_display');
    var totalBsField = document.getElementById('id_total_bs_display');
    if (rate > 0) {
        if (subtotalBsField) subtotalBsField.value = ERP.formatNumber(subtotal * rate);
        if (taxBsField) taxBsField.value = ERP.formatNumber(tax * rate);
        if (totalBsField) totalBsField.value = ERP.formatNumber(total * rate);
    } else {
        [subtotalBsField, taxBsField, totalBsField].forEach(function(f) {
            if (f) f.value = '';
        });
    }
}

function setupPaymentConversion(row) {
    if (!row) {
        document.querySelectorAll('tr.form-row').forEach(function(r) {
            if (r.querySelector('select[name$="-method"]')) setupPaymentConversion(r);
        });
        return;
    }
    var currencySelect = row.querySelector('select[name$="-currency"]');
    var amountInput = row.querySelector('input[name$="-amount"]');
    var amountUsdDisplay = row.querySelector('.field-amount_usd_display');
    var amountUsdInput = row.querySelector('input[name$="-amount_usd"]');
    if (!currencySelect || !amountInput) return;

    function updateConversion() {
        var opt = currencySelect.options[currencySelect.selectedIndex];
        var currencyText = opt ? opt.text : 'USD';
        var currencyCode = currencyText.split(' - ')[0] || currencyText;
        var amount = parseFloat(amountInput.value) || 0;
        var usdAmount = (currencyCode === 'USD') ? amount : ERP.toUSD(amount, currencyCode);
        usdAmount = Math.round(usdAmount * 100) / 100;
        if (amountUsdDisplay) amountUsdDisplay.textContent = '$ ' + usdAmount.toFixed(2);
        if (amountUsdInput) amountUsdInput.value = usdAmount.toFixed(2);
    }
    currencySelect.addEventListener('change', updateConversion);
    amountInput.addEventListener('input', updateConversion);
    amountInput.addEventListener('change', updateConversion);
    setTimeout(updateConversion, 100);
}

function setupRow(row) {
    if (row.querySelector('select[name$="-method"]')) {
        setupPaymentConversion(row);
        return;
    }
    var qtyInput = row.querySelector('input[name$="quantity"]');
    var priceInput = row.querySelector('input[name$="unit_price"]');
    var select = row.querySelector('select[id$="-product"]');
    var rowRef = row;

    if (priceInput && !priceInput.hasAttribute('readonly')) {
        priceInput.setAttribute('readonly', 'readonly');
        priceInput.style.backgroundColor = '#f0f0f0';
        priceInput.style.cursor = 'not-allowed';
    }
    if (qtyInput) {
        qtyInput.addEventListener('change', function() { updateLineSubtotal(rowRef); recalculateOrderTotals(); });
        qtyInput.addEventListener('keyup', function() { updateLineSubtotal(rowRef); recalculateOrderTotals(); });
    }
    if (select) {
        var $ = django.jQuery;
        $(select).on('select2:select', function(e) {
            var productId = e.params.data.id;
            if (productId) { this.value = productId; fetchProductDetails(productId, rowRef); }
        });
        select.addEventListener('change', function() {
            if (this.value) fetchProductDetails(this.value, rowRef);
        });
    }
}

function setupAllRows() {
    document.querySelectorAll('tr.form-row').forEach(function(row) {
        if (!row._hasSetup) { row._hasSetup = true; setupRow(row); }
    });
    recalculateOrderTotals();
}

document.addEventListener('click', function(e) {
    var addButton = e.target.closest('.add-row a') || e.target.closest('.add-row');
    if (addButton) {
        setTimeout(function() {
            document.querySelectorAll('tr.form-row').forEach(function(row) {
                if (!row._hasSetup) { row._hasSetup = true; setupRow(row); }
            });
            recalculateOrderTotals();
        }, 300);
    }
});

document.addEventListener('DOMContentLoaded', function() {
    if (!window.ERP) { console.error('[sale_order_admin] ERP no cargó'); return; }
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