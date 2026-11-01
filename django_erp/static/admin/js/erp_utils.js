/* static/admin/js/erp_utils.js
 * Utilidades centralizadas ERP. Se carga vía UNFOLD["SCRIPTS"], primero.
 * Expone window.ERP. No depende de Django ni de Unfold.
 * NO hardcodea tasas: si no hay exchange_rate ni tax_rate, devuelve 0.
 */
(function (window) {
    'use strict';

    const ERP = {};

    function cfg() {
        return window.ERP_CONFIG || {};
    }

    // ---------- Tasa de cambio ----------
    ERP.getExchangeRate = function () {
        const raw = cfg().exchange_rate;
        const rate = parseFloat(raw);
        if (isFinite(rate) && rate > 0) return rate;
        // Fallback: leer del campo #id_rate_display si existe
        const domRate = ERP.readRateFromDOM();
        if (domRate > 0) return domRate;
        return 0;  // ✅ NUNCA 40.00
    };

    // ---------- Tasa de IVA ----------
    ERP.getTaxRate = function () {
        const raw = cfg().tax_rate;
        const rate = parseFloat(raw);
        if (isFinite(rate) && rate >= 0) return rate;
        return 0;  // ✅ NUNCA 16
    };

    // ---------- Formato ----------
    ERP.formatNumber = function (value, decimals) {
        decimals = (decimals === undefined) ? 2 : decimals;
        const n = parseFloat(value);
        if (!isFinite(n)) return (0).toFixed(decimals);
        return n.toFixed(decimals);
    };

    ERP.formatCurrency = function (value, currency) {
        const n = parseFloat(value);
        if (!isFinite(n)) return (currency === 'BS') ? 'Bs. 0,00' : '$ 0.00';
        const rounded = Math.round(n * 100) / 100;
        const [intPart, decPart] = rounded.toFixed(2).split('.');
        const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        if (currency === 'BS') return 'Bs. ' + withThousands + ',' + decPart;
        return '$ ' + withThousands + '.' + decPart;
    };

    // ---------- Conversión ----------
    ERP.toUSD = function (amount, currencyCode) {
        const n = parseFloat(amount) || 0;
        if (currencyCode === 'USD') return n;
        const rate = ERP.getExchangeRate();
        if (rate <= 0) return n;
        return Math.round((n / rate) * 100) / 100;
    };

    ERP.toLocal = function (amountUSD) {
        const n = parseFloat(amountUSD) || 0;
        const rate = ERP.getExchangeRate();
        if (rate <= 0) return n;
        return Math.round(n * rate * 100) / 100;
    };

    // ---------- Toast ----------
    ERP.toast = function (message, type, duration) {
        type = type || 'info';
        duration = duration || 6000;
        let container = document.getElementById('erp-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'erp-toast-container';
            container.style.cssText =
                'position:fixed;top:1rem;right:1rem;z-index:99999;' +
                'display:flex;flex-direction:column;gap:.5rem;max-width:420px;';
            document.body.appendChild(container);
        }
        const colors = {
            info:    ['#eff6ff', '#1d4ed8', '#93c5fd'],
            success: ['#ecfdf5', '#047857', '#6ee7b7'],
            warning: ['#fffbeb', '#b45309', '#fcd34d'],
            error:   ['#fef2f2', '#b91c1c', '#fca5a5'],
        };
        const [bg, fg, border] = colors[type] || colors.info;
        const el = document.createElement('div');
        el.style.cssText =
            `background:${bg};color:${fg};border:1px solid ${border};` +
            'padding:.75rem 1rem;border-radius:.5rem;font-size:.875rem;' +
            'box-shadow:0 4px 6px rgba(0,0,0,.08);font-weight:500;' +
            'white-space:pre-line;';
        el.textContent = message;
        container.appendChild(el);
        setTimeout(() => el.remove(), duration);
    };

    // ---------- Guards ----------
    ERP.ensureExchangeRate = function () {
        if (ERP.getExchangeRate() > 0) return true;
        ERP.toast(
            '⚠️ No hay tasa de cambio configurada para hoy.\n' +
            'Los montos en Bs. NO se están calculando. ' +
            'Pide a la contadora que registre la tasa antes de facturar.',
            'error', 15000
        );
        return false;
    };

    ERP.ensureTaxRate = function () {
        if (ERP.getTaxRate() > 0) return true;
        ERP.toast(
            '⚠️ No hay tasa de IVA configurada para esta compañía.\n' +
            'El IVA se calculará en 0. Revisa Contabilidad > Tasas de Impuesto.',
            'warning', 12000
        );
        return false;
    };

    // ---------- Leer rate_display del DOM ----------
    ERP.readRateFromDOM = function (id) {
        id = id || 'id_rate_display';
        const field = document.getElementById(id);
        if (!field) return 0;
        const text = field.value || field.textContent || '';
        const matches = text.match(/(\d+[.,]?\d*)/g);
        if (!matches || matches.length === 0) return 0;
        const last = matches[matches.length - 1].replace(',', '.');
        const n = parseFloat(last);
        return (isFinite(n) && n > 0) ? n : 0;
    };

    window.ERP = ERP;
    console.log('[ERP] erp_utils.js cargado');
})(window);