// django_erp/static/admin/js/purchase_payment_admin.js
console.log("🔴 SCRIPT DE PAGOS DE COMPRAS CARGADO");

function getCurrencySymbol(currencyCode) {
    var symbols = { 'USD': '$', 'BS': 'Bs.', 'EUR': '€' };
    return symbols[currencyCode] || currencyCode;
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

        var amountUsdField = row.querySelector('input[name$="amount_usd"]');
        if (amountUsdField && amountUsdField !== amountUsdInput) {
            amountUsdField.value = usdAmount.toFixed(2);
        }
    }

    currencySelect.addEventListener('change', updateConversion);
    amountInput.addEventListener('input', updateConversion);
    amountInput.addEventListener('change', updateConversion);
    setTimeout(updateConversion, 100);
}

function setupAllPaymentRows() {
    var count = 0;
    document.querySelectorAll('tr.form-row').forEach(function(row) {
        if (row.querySelector('select[name$="-method"]')) {
            count++;
            if (!row._hasPaymentSetup) {
                row._hasPaymentSetup = true;
                setupPaymentConversion(row);
            }
        }
    });
    console.log('✅ ' + count + ' filas de pago configuradas');
}

document.addEventListener('click', function(e) {
    var addButton = e.target.closest('.add-row a') || e.target.closest('.add-row');
    if (addButton) {
        setTimeout(function() {
            document.querySelectorAll('tr.form-row').forEach(function(row) {
                if (row.querySelector('select[name$="-method"]') && !row._hasPaymentSetup) {
                    row._hasPaymentSetup = true;
                    setupPaymentConversion(row);
                }
            });
        }, 300);
        setTimeout(function() {
            document.querySelectorAll('tr.form-row').forEach(function(row) {
                if (row.querySelector('select[name$="-method"]') && !row._hasPaymentSetup) {
                    row._hasPaymentSetup = true;
                    setupPaymentConversion(row);
                }
            });
        }, 600);
    }
});

document.addEventListener('formset:added', function(event) {
    setTimeout(function() {
        var target = event.target || document;
        target.querySelectorAll('tr.form-row').forEach(function(row) {
            if (row.querySelector('select[name$="-method"]') && !row._hasPaymentSetup) {
                row._hasPaymentSetup = true;
                setupPaymentConversion(row);
            }
        });
    }, 100);
});

document.addEventListener('DOMContentLoaded', function() {
    if (!window.ERP) { console.error('[purchase_payment_admin] ERP no cargó'); return; }
    ERP.ensureExchangeRate();
    setupAllPaymentRows();
    setTimeout(setupAllPaymentRows, 500);
    setTimeout(setupAllPaymentRows, 1000);
});