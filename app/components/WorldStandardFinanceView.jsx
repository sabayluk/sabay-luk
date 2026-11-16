'use client';

import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';

export default function WorldStandardFinanceView({
  realOrders = [],
  products = [],
  expenses = [],
  storeSettings = {},
  activeStore = null,
  onAddExpense = null,
  onEditExpense = null,
  onDeleteExpense = null
}) {
  // Navigation subtabs inside Finance Suite
  const [activeFinanceTab, setActiveFinanceTab] = useState('pnl'); // 'pnl' | 'balance_sheet' | 'cash_flow' | 'kpis' | 'expenses' | 'banks' | 'coa'
  const [period, setPeriod] = useState('this_month'); // 'today' | 'yesterday' | 'this_week' | 'this_month' | 'this_year' | 'all'
  const [currencyMode, setCurrencyMode] = useState('USD'); // 'USD' | 'KHR'
  
  // Bank balances state (can be saved to localStorage)
  const [bankBalances, setBankBalances] = useState(() => {
    if (typeof window !== 'undefined') {
      const curId = activeStore?.id || 'store_default_sabayluk';
      const saved = localStorage.getItem(`sabay_bank_balances_${curId}`);
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return {
      abaUsd: 1540.00,
      abaKhr: 1250000,
      acledaUsd: 620.00,
      acledaKhr: 450000,
      posDrawerCash: 280.00,
      pettyCash: 100.00,
      accountsPayable: 450.00, // Debts to suppliers
      accountsReceivableCod: 185.00, // Pending COD collection
      initialCapital: 3500.00, // Initial investment
      storeEquipment: 1200.00 // Non-current physical assets
    };
  });

  const exchangeRate = Number(storeSettings.exchangeRate) || 4100;

  // Currency Formatter Helper
  const formatMoney = (amountUSD, forceCurrency = null) => {
    const mode = forceCurrency || currencyMode;
    const num = Number(amountUSD) || 0;
    if (mode === 'KHR') {
      const khrVal = Math.round(num * exchangeRate);
      return `${khrVal.toLocaleString()} ៛`;
    }
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Date Filter Calculations
  const dateRanges = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const yesterdayDate = new Date(Date.now() - 86400000);
    const yesterdayStr = yesterdayDate.toISOString().slice(0, 10);
    const sevenDaysAgo = Date.now() - (7 * 86400000);
    const monthStartStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const yearStartStr = `${now.getFullYear()}-01-01`;

    return { todayStr, yesterdayStr, sevenDaysAgo, monthStartStr, yearStartStr };
  }, []);

  // Filter Orders strictly by Period
  const filteredOrders = useMemo(() => {
    return realOrders.filter(o => {
      if (o.status === 'Cancelled') return false;
      if (!o.created_at) return true;
      const orderDateStr = o.created_at.slice(0, 10);
      const orderTime = new Date(o.created_at).getTime();

      if (period === 'today') return orderDateStr === dateRanges.todayStr;
      if (period === 'yesterday') return orderDateStr === dateRanges.yesterdayStr;
      if (period === 'this_week') return orderTime >= dateRanges.sevenDaysAgo;
      if (period === 'this_month') return orderDateStr >= dateRanges.monthStartStr;
      if (period === 'this_year') return orderDateStr >= dateRanges.yearStartStr;
      return true; // 'all'
    });
  }, [realOrders, period, dateRanges]);

  // Filter Expenses strictly by Period
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      if (!exp.date) return true;
      const expDateStr = exp.date.slice(0, 10);
      const expTime = new Date(exp.date).getTime();

      if (period === 'today') return expDateStr === dateRanges.todayStr;
      if (period === 'yesterday') return expDateStr === dateRanges.yesterdayStr;
      if (period === 'this_week') return expTime >= dateRanges.sevenDaysAgo;
      if (period === 'this_month') return expDateStr >= dateRanges.monthStartStr;
      if (period === 'this_year') return expDateStr >= dateRanges.yearStartStr;
      return true; // 'all'
    });
  }, [expenses, period, dateRanges]);

  // 1. Core Revenue & COGS Calculations
  const metrics = useMemo(() => {
    // Gross Revenue (សរុបចំណូលលក់មុនបញ្ចុះតម្លៃ)
    const grossSales = filteredOrders.reduce((sum, o) => {
      const sub = Number(o.subtotal || o.total_amount || o.total || 0);
      return sum + sub;
    }, 0);

    // Total Discounts & Coupons
    const totalDiscounts = filteredOrders.reduce((sum, o) => sum + (Number(o.discount) || 0), 0);

    // Net Revenue (ចំណូលលក់សុទ្ធពិតប្រាកដ)
    const netRevenue = Math.max(0, grossSales - totalDiscounts);

    // Cost of Goods Sold (COGS - ថ្លៃដើមទំនិញដែលបានលក់ចេញ)
    const totalCOGS = filteredOrders.reduce((sum, o) => {
      const items = Array.isArray(o.items) ? o.items.filter(it => !it.is_tax_meta) : [];
      const orderCost = items.reduce((iSum, it) => {
        const prod = products.find(p => String(p.id) === String(it.id));
        const costPerUnit = prod && prod.cost_price ? parseFloat(prod.cost_price) : 0;
        return iSum + (costPerUnit * (Number(it.qty) || 1));
      }, 0);
      return sum + orderCost;
    }, 0);

    // Gross Profit (ប្រាក់ចំណេញដុល)
    const grossProfit = Math.max(0, netRevenue - totalCOGS);
    const grossMarginPercent = netRevenue > 0 ? ((grossProfit / netRevenue) * 100) : 0;

    // Operating Expenses (OPEX) grouped by category
    const opexBreakdown = {
      salaries: 0,
      rent: 0,
      utilities: 0,
      marketing: 0,
      delivery: 0,
      software: 0,
      maintenance: 0,
      other: 0
    };

    filteredExpenses.forEach(exp => {
      const amt = parseFloat(exp.amount) || 0;
      const cat = exp.category || 'other';
      if (opexBreakdown[cat] !== undefined) {
        opexBreakdown[cat] += amt;
      } else {
        opexBreakdown.other += amt;
      }
    });

    const totalOPEX = Object.values(opexBreakdown).reduce((s, v) => s + v, 0);

    // Operating Income / EBITDA (ចំណេញប្រតិបត្តិការ)
    const operatingIncome = grossProfit - totalOPEX;

    // Taxes Collected
    const totalTax = filteredOrders.reduce((sum, o) => {
      const taxItem = Array.isArray(o.items) ? o.items.find(it => it.is_tax_meta) : null;
      return sum + (taxItem ? Number(taxItem.tax_amount || 0) : 0);
    }, 0);

    // Net Profit / Net Income (ប្រាក់ចំណេញសុទ្ធពិតប្រាកដ)
    const netProfit = operatingIncome;
    const netProfitMarginPercent = netRevenue > 0 ? ((netProfit / netRevenue) * 100) : 0;

    // Inventory Valuation (Total Value of Current Stock on Hand in Warehouse)
    const totalInventoryCostValue = products.reduce((sum, p) => {
      const qty = Number(p.stock_qty ?? p.stock ?? 0);
      const cost = Number(p.cost_price) || 0;
      return sum + (qty * cost);
    }, 0);

    const totalInventoryRetailValue = products.reduce((sum, p) => {
      const qty = Number(p.stock_qty ?? p.stock ?? 0);
      const price = Number(p.price) || 0;
      return sum + (qty * price);
    }, 0);

    const potentialInventoryProfit = Math.max(0, totalInventoryRetailValue - totalInventoryCostValue);

    // Total Liquid Cash in Hand & Bank Accounts
    const totalCashBank = 
      Number(bankBalances.abaUsd) + 
      (Number(bankBalances.abaKhr) / exchangeRate) + 
      Number(bankBalances.acledaUsd) + 
      (Number(bankBalances.acledaKhr) / exchangeRate) + 
      Number(bankBalances.posDrawerCash) + 
      Number(bankBalances.pettyCash);

    // Balance Sheet totals
    const totalCurrentAssets = totalCashBank + totalInventoryCostValue + Number(bankBalances.accountsReceivableCod);
    const totalNonCurrentAssets = Number(bankBalances.storeEquipment);
    const totalAssets = totalCurrentAssets + totalNonCurrentAssets;

    const totalCurrentLiabilities = Number(bankBalances.accountsPayable) + totalTax;
    const totalLiabilities = totalCurrentLiabilities;

    const retainedEarnings = totalAssets - totalLiabilities - Number(bankBalances.initialCapital);
    const totalEquity = Number(bankBalances.initialCapital) + retainedEarnings;

    // Financial Ratios
    const inventoryTurnover = totalInventoryCostValue > 0 ? (totalCOGS / totalInventoryCostValue) : 0;
    const daysSalesInventory = inventoryTurnover > 0 ? Math.round(365 / (inventoryTurnover * 12)) : 0;
    const breakEvenRevenue = grossMarginPercent > 0 ? (totalOPEX / (grossMarginPercent / 100)) : 0;
    const workingCapital = totalCurrentAssets - totalCurrentLiabilities;
    const currentRatio = totalCurrentLiabilities > 0 ? (totalCurrentAssets / totalCurrentLiabilities) : 99;

    return {
      grossSales,
      totalDiscounts,
      netRevenue,
      totalCOGS,
      grossProfit,
      grossMarginPercent,
      opexBreakdown,
      totalOPEX,
      operatingIncome,
      totalTax,
      netProfit,
      netProfitMarginPercent,
      totalInventoryCostValue,
      totalInventoryRetailValue,
      potentialInventoryProfit,
      totalCashBank,
      totalAssets,
      totalCurrentAssets,
      totalNonCurrentAssets,
      totalLiabilities,
      totalEquity,
      retainedEarnings,
      inventoryTurnover,
      daysSalesInventory,
      breakEvenRevenue,
      workingCapital,
      currentRatio
    };
  }, [filteredOrders, filteredExpenses, products, bankBalances, exchangeRate]);

  // Export Financial Statements to Multi-Sheet Excel
  const handleExportFullFinancialAudit = () => {
    const wb = XLSX.utils.book_new();

    // 1. P&L Sheet
    const pnlData = [
      { 'Standard IFRS Code': '4000', 'Financial Line Item': 'GROSS SALES REVENUE (ចំណូលដុល)', 'Amount ($)': metrics.grossSales.toFixed(2) },
      { 'Standard IFRS Code': '4090', 'Financial Line Item': 'Less: Sales Discounts & Coupons (ការបញ្ចុះតម្លៃ)', 'Amount ($)': (-metrics.totalDiscounts).toFixed(2) },
      { 'Standard IFRS Code': '4100', 'Financial Line Item': 'NET REVENUE (ចំណូលលក់សុទ្ធ)', 'Amount ($)': metrics.netRevenue.toFixed(2) },
      { 'Standard IFRS Code': '5000', 'Financial Line Item': 'COST OF GOODS SOLD - COGS (ថ្លៃដើមទំនិញលក់)', 'Amount ($)': (-metrics.totalCOGS).toFixed(2) },
      { 'Standard IFRS Code': '5900', 'Financial Line Item': 'GROSS PROFIT (ប្រាក់ចំណេញដុល)', 'Amount ($)': metrics.grossProfit.toFixed(2) },
      { 'Standard IFRS Code': '6100', 'Financial Line Item': 'Rent Expense (ថ្លៃជួលទីតាំង)', 'Amount ($)': (-metrics.opexBreakdown.rent).toFixed(2) },
      { 'Standard IFRS Code': '6200', 'Financial Line Item': 'Salaries & Staff Wages (ប្រាក់ខែបុគ្គលិក)', 'Amount ($)': (-metrics.opexBreakdown.salaries).toFixed(2) },
      { 'Standard IFRS Code': '6300', 'Financial Line Item': 'Marketing & Advertising (ទីផ្សារ)', 'Amount ($)': (-metrics.opexBreakdown.marketing).toFixed(2) },
      { 'Standard IFRS Code': '6400', 'Financial Line Item': 'Utilities (Electricity/Water/Net) (ទឹក ភ្លើង)', 'Amount ($)': (-metrics.opexBreakdown.utilities).toFixed(2) },
      { 'Standard IFRS Code': '6500', 'Financial Line Item': 'Delivery & Shipping Packaging (ការដឹកជញ្ជូន)', 'Amount ($)': (-metrics.opexBreakdown.delivery).toFixed(2) },
      { 'Standard IFRS Code': '6600', 'Financial Line Item': 'Software, Hosting & POS Cloud (ប្រព័ន្ធ)', 'Amount ($)': (-metrics.opexBreakdown.software).toFixed(2) },
      { 'Standard IFRS Code': '6700', 'Financial Line Item': 'Maintenance & Supplies (ថែទាំ)', 'Amount ($)': (-metrics.opexBreakdown.maintenance).toFixed(2) },
      { 'Standard IFRS Code': '6900', 'Financial Line Item': 'Other Operating Expenses (ចំណាយផ្សេងៗ)', 'Amount ($)': (-metrics.opexBreakdown.other).toFixed(2) },
      { 'Standard IFRS Code': '6999', 'Financial Line Item': 'TOTAL OPERATING EXPENSES - OPEX (ចំណាយប្រតិបត្តិការសរុប)', 'Amount ($)': (-metrics.totalOPEX).toFixed(2) },
      { 'Standard IFRS Code': '7000', 'Financial Line Item': 'NET OPERATING PROFIT / NET INCOME (ប្រាក់ចំណេញសុទ្ធពិតប្រាកដ)', 'Amount ($)': metrics.netProfit.toFixed(2) }
    ];
    const wsPnl = XLSX.utils.json_to_sheet(pnlData);
    XLSX.utils.book_append_sheet(wb, wsPnl, 'Income_Statement_PnL');

    // 2. Balance Sheet
    const balanceData = [
      { 'Category': 'CURRENT ASSETS', 'Account Name': 'Cash in POS Drawer', 'Amount ($)': Number(bankBalances.posDrawerCash).toFixed(2) },
      { 'Category': 'CURRENT ASSETS', 'Account Name': 'ABA Bank (USD & KHR)', 'Amount ($)': (Number(bankBalances.abaUsd) + (Number(bankBalances.abaKhr)/exchangeRate)).toFixed(2) },
      { 'Category': 'CURRENT ASSETS', 'Account Name': 'ACLEDA Bank (USD & KHR)', 'Amount ($)': (Number(bankBalances.acledaUsd) + (Number(bankBalances.acledaKhr)/exchangeRate)).toFixed(2) },
      { 'Category': 'CURRENT ASSETS', 'Account Name': 'Inventory Valuation (Stock at Cost)', 'Amount ($)': metrics.totalInventoryCostValue.toFixed(2) },
      { 'Category': 'CURRENT ASSETS', 'Account Name': 'Accounts Receivable (COD Pending)', 'Amount ($)': Number(bankBalances.accountsReceivableCod).toFixed(2) },
      { 'Category': 'NON-CURRENT ASSETS', 'Account Name': 'Store Fixtures & POS Equipment', 'Amount ($)': Number(bankBalances.storeEquipment).toFixed(2) },
      { 'Category': 'TOTAL ASSETS', 'Account Name': 'TOTAL ASSETS (ទ្រព្យសកម្មសរុប)', 'Amount ($)': metrics.totalAssets.toFixed(2) },
      { 'Category': 'LIABILITIES', 'Account Name': 'Accounts Payable (Supplier Debts)', 'Amount ($)': Number(bankBalances.accountsPayable).toFixed(2) },
      { 'Category': 'LIABILITIES', 'Account Name': 'Sales Tax / VAT Payable', 'Amount ($)': metrics.totalTax.toFixed(2) },
      { 'Category': 'TOTAL LIABILITIES', 'Account Name': 'TOTAL LIABILITIES (បំណុលសរុប)', 'Amount ($)': metrics.totalLiabilities.toFixed(2) },
      { 'Category': 'EQUITY', 'Account Name': 'Initial Capital Investment', 'Amount ($)': Number(bankBalances.initialCapital).toFixed(2) },
      { 'Category': 'EQUITY', 'Account Name': 'Retained Earnings & Current Period Profit', 'Amount ($)': metrics.retainedEarnings.toFixed(2) },
      { 'Category': 'TOTAL EQUITY', 'Account Name': 'TOTAL LIABILITIES & EQUITY', 'Amount ($)': (metrics.totalLiabilities + metrics.totalEquity).toFixed(2) }
    ];
    const wsBal = XLSX.utils.json_to_sheet(balanceData);
    XLSX.utils.book_append_sheet(wb, wsBal, 'Balance_Sheet');

    // 3. Raw Expenses
    const rawExpData = filteredExpenses.map((e, idx) => ({
      'No': idx + 1,
      'ID': e.id,
      'Date': e.date,
      'Title': e.title,
      'Category': e.category,
      'Amount ($)': Number(e.amount || 0).toFixed(2),
      'Payment Method': e.paymentMethod || 'Cash',
      'Payee': e.recipient || '',
      'Notes': e.note || ''
    }));
    const wsExp = XLSX.utils.json_to_sheet(rawExpData);
    XLSX.utils.book_append_sheet(wb, wsExp, 'OPEX_Expenses_Log');

    XLSX.writeFile(wb, `Financial_Statement_IFRS_${activeStore?.slug || 'SabayLuk'}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* ⭐️ Header Banner with Financial Controls */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center text-2xl font-black shadow-md shadow-emerald-600/20 shrink-0">
            🏛️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                ប្រព័ន្ធគ្រប់គ្រងហិរញ្ញវត្ថុ & គណនេយ្យស្តង់ដារពិភពលោក (World-Standard Finance & IFRS Accounting)
              </h2>
              <span className="text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                IFRS / GAAP Ready
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              គ្រប់គ្រងលំហូរសាច់ប្រាក់ របាយការណ៍ P&L តារាងតុល្យការ Balance Sheet ថ្លៃដើម COGS និងសូចនាករហិរញ្ញវត្ថុ
            </p>
          </div>
        </div>

        {/* Currency Mode & Period Filter */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Currency Toggle */}
          <div className="inline-flex items-center p-1 rounded-2xl bg-slate-100 border border-slate-200 text-xs font-black">
            <button
              type="button"
              onClick={() => setCurrencyMode('USD')}
              className={`px-3 py-1.5 rounded-xl transition ${currencyMode === 'USD' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
            >
              💵 USD ($)
            </button>
            <button
              type="button"
              onClick={() => setCurrencyMode('KHR')}
              className={`px-3 py-1.5 rounded-xl transition ${currencyMode === 'KHR' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
            >
              🇰🇭 KHR (៛)
            </button>
          </div>

          {/* Period Filter */}
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="border-2 border-slate-200 bg-white text-xs font-black px-3.5 py-2 rounded-2xl outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="today">📅 ថ្ងៃនេះ (Today)</option>
            <option value="yesterday">📅 ម្សិលមិញ (Yesterday)</option>
            <option value="this_week">📅 ៧ ថ្ងៃចុងក្រោយ (7 Days)</option>
            <option value="this_month">📅 ខែនេះ (This Month)</option>
            <option value="this_year">📅 ឆ្នាំនេះ (This Year)</option>
            <option value="all">📅 ពេលវេលាទាំងអស់ (All Time)</option>
          </select>

          {/* Export Full Financial Audit */}
          <button
            type="button"
            onClick={handleExportFullFinancialAudit}
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-4 py-2 rounded-2xl font-black text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="ទាញយករបាយការណ៍ហិរញ្ញវត្ថុ IFRS ពេញលេញជា Excel"
          >
            <span>📥</span>
            <span>Export IFRS Audit (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* ⭐️ Top 6 Executive Financial Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5">
        {/* Net Revenue */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold mb-1">
            <span>ចំណូលសុទ្ធ (Net Sales)</span>
            <span className="text-emerald-500">↑</span>
          </div>
          <p className="text-lg sm:text-xl font-black text-slate-900 truncate">
            {formatMoney(metrics.netRevenue)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            ដក Discounts ${metrics.totalDiscounts.toFixed(2)}
          </p>
        </div>

        {/* COGS */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold mb-1">
            <span>ថ្លៃដើមទំនិញ (COGS)</span>
            <span className="text-amber-500">📦</span>
          </div>
          <p className="text-lg sm:text-xl font-black text-slate-900 truncate">
            {formatMoney(metrics.totalCOGS)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            ថ្លៃដើមនាំចូលទំនិញ
          </p>
        </div>

        {/* Gross Profit */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold mb-1">
            <span>ចំណេញដុល (Gross Profit)</span>
            <span className="text-blue-500">📈</span>
          </div>
          <p className="text-lg sm:text-xl font-black text-blue-600 truncate">
            {formatMoney(metrics.grossProfit)}
          </p>
          <p className="text-[10px] text-emerald-600 font-black mt-0.5">
            Margin: {metrics.grossMarginPercent.toFixed(1)}%
          </p>
        </div>

        {/* OPEX */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold mb-1">
            <span>ចំណាយ (OPEX)</span>
            <span className="text-rose-500">💸</span>
          </div>
          <p className="text-lg sm:text-xl font-black text-rose-600 truncate">
            {formatMoney(metrics.totalOPEX)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            ចំណាយប្រតិបត្តិការទូទៅ
          </p>
        </div>

        {/* Net Profit */}
        <div className={`rounded-2xl p-4 border shadow-xs ${metrics.netProfit >= 0 ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-rose-500 text-white border-rose-600'}`}>
          <div className="flex items-center justify-between text-xs opacity-90 font-bold mb-1">
            <span>ចំណេញសុទ្ធ (Net Profit)</span>
            <span>💎</span>
          </div>
          <p className="text-lg sm:text-xl font-black truncate">
            {formatMoney(metrics.netProfit)}
          </p>
          <p className="text-[10px] opacity-90 font-black mt-0.5">
            Net Margin: {metrics.netProfitMarginPercent.toFixed(1)}%
          </p>
        </div>

        {/* Liquid Cash */}
        <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 text-white shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold mb-1">
            <span>សាច់ប្រាក់សរុប (Cash & Bank)</span>
            <span className="text-emerald-400">🏦</span>
          </div>
          <p className="text-lg sm:text-xl font-black text-amber-300 truncate">
            {formatMoney(metrics.totalCashBank)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            ABA + ACLEDA + POS Drawer
          </p>
        </div>
      </div>

      {/* ⭐️ Navigation Sub-tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveFinanceTab('pnl')}
          className={`px-4 py-2.5 rounded-2xl font-black text-xs transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeFinanceTab === 'pnl' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>📊</span>
          <span>របាយការណ៍ចំណេញ-ខាត (P&L Income Statement)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFinanceTab('balance_sheet')}
          className={`px-4 py-2.5 rounded-2xl font-black text-xs transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeFinanceTab === 'balance_sheet' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>⚖️</span>
          <span>តារាងតុល្យការ (Balance Sheet - IFRS)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFinanceTab('cash_flow')}
          className={`px-4 py-2.5 rounded-2xl font-black text-xs transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeFinanceTab === 'cash_flow' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>🌊</span>
          <span>លំហូរសាច់ប្រាក់ (Cash Flow Statement)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFinanceTab('kpis')}
          className={`px-4 py-2.5 rounded-2xl font-black text-xs transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeFinanceTab === 'kpis' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>📈</span>
          <span>សូចនាករហិរញ្ញវត្ថុ & ចំណុចរួចដើម (Financial KPIs)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFinanceTab('banks')}
          className={`px-4 py-2.5 rounded-2xl font-black text-xs transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeFinanceTab === 'banks' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>🏦</span>
          <span>ធនាគារ & ថតសាច់ប្រាក់ (Cash & Bank Accounts)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFinanceTab('coa')}
          className={`px-4 py-2.5 rounded-2xl font-black text-xs transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeFinanceTab === 'coa' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>🗂️</span>
          <span>តារាងកូដគណនេយ្យ (Chart of Accounts - COA)</span>
        </button>
      </div>

      {/* ================= TAB 1: P&L (INCOME STATEMENT - IFRS MULTI-STEP) ================= */}
      {activeFinanceTab === 'pnl' && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-2">
            <div>
              <h3 className="text-base font-black text-slate-900">
                របាយការណ៍ចំណេញ-ខាតផ្លូវការ (Statement of Profit or Loss / P&L)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                គណនាត្រឹមត្រូវតាមស្ដង់ដារគណនេយ្យអន្តរជាតិ IFRS for SMEs
              </p>
            </div>
            <span className="text-xs font-black text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
              គ្រាគណនេយ្យ: {period.toUpperCase()}
            </span>
          </div>

          {/* Multi-Step P&L Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-sans">
              <thead>
                <tr className="border-b border-slate-300 text-slate-400 font-black text-[11px] uppercase tracking-wider text-left">
                  <th className="pb-3 w-28">កូដ IFRS</th>
                  <th className="pb-3">បរិយាយធាតុគណនេយ្យ (ACCOUNT DESCRIPTION)</th>
                  <th className="pb-3 text-right">ទឹកប្រាក់ ({currencyMode})</th>
                  <th className="pb-3 text-right w-24">ភាគរយ %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                
                {/* 1. Operating Revenue */}
                <tr className="bg-slate-50/70 font-black text-slate-900">
                  <td className="py-2.5 font-mono text-emerald-700">4000</td>
                  <td className="py-2.5">ចំណូលដុលពីការលក់ (Gross Sales Revenue)</td>
                  <td className="py-2.5 text-right font-mono">{formatMoney(metrics.grossSales)}</td>
                  <td className="py-2.5 text-right font-mono">100%</td>
                </tr>
                <tr className="text-slate-600">
                  <td className="py-2 font-mono text-slate-400">4090</td>
                  <td className="py-2 pl-6">ដក៖ ការបញ្ចុះតម្លៃ & ប័ណ្ណ Promotion (Discounts & Coupons)</td>
                  <td className="py-2 text-right font-mono text-rose-600">-{formatMoney(metrics.totalDiscounts)}</td>
                  <td className="py-2 text-right font-mono text-slate-400">
                    {metrics.grossSales > 0 ? ((metrics.totalDiscounts / metrics.grossSales) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
                <tr className="bg-emerald-50/50 font-black text-emerald-950 border-t-2 border-emerald-200">
                  <td className="py-3 font-mono text-emerald-800">4100</td>
                  <td className="py-3">ចំណូលលក់សុទ្ធ (NET SALES REVENUE)</td>
                  <td className="py-3 text-right font-mono text-sm">{formatMoney(metrics.netRevenue)}</td>
                  <td className="py-3 text-right font-mono">
                    {metrics.grossSales > 0 ? ((metrics.netRevenue / metrics.grossSales) * 100).toFixed(1) : 100}%
                  </td>
                </tr>

                {/* 2. COGS */}
                <tr className="text-slate-700 font-bold">
                  <td className="py-2.5 font-mono text-amber-700">5000</td>
                  <td className="py-2.5 pl-6">ដក៖ ថ្លៃដើមទំនិញដែលបានលក់ចេញ (Cost of Goods Sold - COGS)</td>
                  <td className="py-2.5 text-right font-mono text-amber-800">-{formatMoney(metrics.totalCOGS)}</td>
                  <td className="py-2.5 text-right font-mono text-slate-400">
                    {metrics.netRevenue > 0 ? ((metrics.totalCOGS / metrics.netRevenue) * 100).toFixed(1) : 0}%
                  </td>
                </tr>

                {/* 3. Gross Profit */}
                <tr className="bg-blue-50 font-black text-blue-950 border-y-2 border-blue-200">
                  <td className="py-3 font-mono text-blue-800">5900</td>
                  <td className="py-3">ប្រាក់ចំណេញដុល (GROSS PROFIT)</td>
                  <td className="py-3 text-right font-mono text-sm text-blue-700">{formatMoney(metrics.grossProfit)}</td>
                  <td className="py-3 text-right font-mono text-blue-800">{metrics.grossMarginPercent.toFixed(1)}%</td>
                </tr>

                {/* 4. OPEX Detailed Breakdown */}
                <tr className="bg-slate-50/70 font-black text-slate-800">
                  <td className="py-2.5 font-mono text-purple-700">6000</td>
                  <td className="py-2.5" colSpan={3}>ដក៖ ចំណាយប្រតិបត្តិការទូទៅ (OPERATING EXPENSES - OPEX)</td>
                </tr>
                <tr className="text-slate-600">
                  <td className="py-2 font-mono text-slate-400">6100</td>
                  <td className="py-2 pl-6">ថ្លៃជួលទីតាំង & តូបលក់ (Store Rent)</td>
                  <td className="py-2 text-right font-mono">-{formatMoney(metrics.opexBreakdown.rent)}</td>
                  <td className="py-2 text-right font-mono text-slate-400">
                    {metrics.netRevenue > 0 ? ((metrics.opexBreakdown.rent / metrics.netRevenue) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
                <tr className="text-slate-600">
                  <td className="py-2 font-mono text-slate-400">6200</td>
                  <td className="py-2 pl-6">ប្រាក់ខែបុគ្គលិក & បេឡាករ (Salaries & Wages)</td>
                  <td className="py-2 text-right font-mono">-{formatMoney(metrics.opexBreakdown.salaries)}</td>
                  <td className="py-2 text-right font-mono text-slate-400">
                    {metrics.netRevenue > 0 ? ((metrics.opexBreakdown.salaries / metrics.netRevenue) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
                <tr className="text-slate-600">
                  <td className="py-2 font-mono text-slate-400">6300</td>
                  <td className="py-2 pl-6">ផ្សព្វផ្សាយ & ទីផ្សារ (Marketing & Ads)</td>
                  <td className="py-2 text-right font-mono">-{formatMoney(metrics.opexBreakdown.marketing)}</td>
                  <td className="py-2 text-right font-mono text-slate-400">
                    {metrics.netRevenue > 0 ? ((metrics.opexBreakdown.marketing / metrics.netRevenue) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
                <tr className="text-slate-600">
                  <td className="py-2 font-mono text-slate-400">6400</td>
                  <td className="py-2 pl-6">ទឹក ភ្លើង & អ៊ីនធឺណិត (Utilities)</td>
                  <td className="py-2 text-right font-mono">-{formatMoney(metrics.opexBreakdown.utilities)}</td>
                  <td className="py-2 text-right font-mono text-slate-400">
                    {metrics.netRevenue > 0 ? ((metrics.opexBreakdown.utilities / metrics.netRevenue) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
                <tr className="text-slate-600">
                  <td className="py-2 font-mono text-slate-400">6500</td>
                  <td className="py-2 pl-6">សេវាដឹកជញ្ជូន & វេចខ្ចប់ (Delivery & Packaging)</td>
                  <td className="py-2 text-right font-mono">-{formatMoney(metrics.opexBreakdown.delivery)}</td>
                  <td className="py-2 text-right font-mono text-slate-400">
                    {metrics.netRevenue > 0 ? ((metrics.opexBreakdown.delivery / metrics.netRevenue) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
                <tr className="text-slate-600">
                  <td className="py-2 font-mono text-slate-400">6600</td>
                  <td className="py-2 pl-6">សេវាប្រព័ន្ធ POS Cloud & Hosting (Software)</td>
                  <td className="py-2 text-right font-mono">-{formatMoney(metrics.opexBreakdown.software)}</td>
                  <td className="py-2 text-right font-mono text-slate-400">
                    {metrics.netRevenue > 0 ? ((metrics.opexBreakdown.software / metrics.netRevenue) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
                <tr className="text-slate-600">
                  <td className="py-2 font-mono text-slate-400">6900</td>
                  <td className="py-2 pl-6">ចំណាយប្រតិបត្តិការផ្សេងៗ (Other OPEX)</td>
                  <td className="py-2 text-right font-mono">-{formatMoney(metrics.opexBreakdown.other + metrics.opexBreakdown.maintenance)}</td>
                  <td className="py-2 text-right font-mono text-slate-400">
                    {metrics.netRevenue > 0 ? (((metrics.opexBreakdown.other + metrics.opexBreakdown.maintenance) / metrics.netRevenue) * 100).toFixed(1) : 0}%
                  </td>
                </tr>

                <tr className="bg-rose-50/60 font-black text-rose-950 border-t border-rose-200">
                  <td className="py-2.5 font-mono text-rose-800">6999</td>
                  <td className="py-2.5">សរុបចំណាយប្រតិបត្តិការ (TOTAL OPEX)</td>
                  <td className="py-2.5 text-right font-mono text-rose-700">-{formatMoney(metrics.totalOPEX)}</td>
                  <td className="py-2.5 text-right font-mono text-rose-800">
                    {metrics.netRevenue > 0 ? ((metrics.totalOPEX / metrics.netRevenue) * 100).toFixed(1) : 0}%
                  </td>
                </tr>

                {/* 5. Net Income */}
                <tr className={`font-black text-base border-t-4 ${metrics.netProfit >= 0 ? 'bg-emerald-100/80 text-emerald-950 border-emerald-500' : 'bg-rose-100 text-rose-950 border-rose-500'}`}>
                  <td className="py-4 font-mono">7000</td>
                  <td className="py-4">
                    <span>ប្រាក់ចំណេញសុទ្ធពិតប្រាកដ (NET OPERATING PROFIT / NET INCOME)</span>
                    <span className="block text-[11px] font-normal text-slate-600 mt-0.5">
                      {metrics.netProfit >= 0 ? '✅ អាជីវកម្មទទួលបានផលចំណេញសុទ្ធត្រឹមត្រូវ' : '⚠️ អាជីវកម្មកំពុងខាតបង់ក្នុងគ្រានេះ'}
                    </span>
                  </td>
                  <td className="py-4 text-right font-mono text-lg">
                    {formatMoney(metrics.netProfit)}
                  </td>
                  <td className="py-4 text-right font-mono text-sm">
                    {metrics.netProfitMarginPercent.toFixed(1)}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 2: BALANCE SHEET (IFRS STANDARD) ================= */}
      {activeFinanceTab === 'balance_sheet' && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-2">
            <div>
              <h3 className="text-base font-black text-slate-900">
                តារាងតុល្យការហិរញ្ញវត្ថុ (Statement of Financial Position / Balance Sheet)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                បង្ហាញទ្រព្យសកម្ម (Assets), បំណុល (Liabilities), និងមូលធនម្ចាស់ (Equity) តាមកាលបរិច្ឆេទបច្ចុប្បន្ន
              </p>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black border border-emerald-300">
              <span>⚖️ តុល្យភាព ១០០%:</span>
              <span>Assets = Liabilities + Equity</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: ASSETS */}
            <div className="space-y-4">
              <div className="bg-emerald-50/80 p-3 rounded-2xl border border-emerald-200 font-black text-emerald-950 text-sm flex justify-between">
                <span>១. ទ្រព្យសកម្ម (ASSETS)</span>
                <span>{formatMoney(metrics.totalAssets)}</span>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3 text-xs">
                <p className="font-black text-slate-700 uppercase tracking-wider text-[11px]">ទ្រព្យសកម្មចរន្ត (Current Assets)</p>
                
                <div className="flex justify-between py-1.5 border-b border-slate-200 text-slate-600">
                  <span>• សាច់ប្រាក់ក្នុងថត (Cash in POS Drawer)</span>
                  <span className="font-mono font-bold text-slate-900">{formatMoney(bankBalances.posDrawerCash)}</span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-200 text-slate-600">
                  <span>• សាច់ប្រាក់ក្នុងធនាគារ ABA Bank ($ & ៛)</span>
                  <span className="font-mono font-bold text-slate-900">{formatMoney(Number(bankBalances.abaUsd) + (Number(bankBalances.abaKhr)/exchangeRate))}</span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-200 text-slate-600">
                  <span>• សាច់ប្រាក់ក្នុងធនាគារ ACLEDA Bank</span>
                  <span className="font-mono font-bold text-slate-900">{formatMoney(Number(bankBalances.acledaUsd) + (Number(bankBalances.acledaKhr)/exchangeRate))}</span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-200 text-slate-600">
                  <span>• តម្លៃស្តុកទំនិញជាក់ស្តែងក្នុងឃ្លាំង (Inventory at Cost)</span>
                  <span className="font-mono font-bold text-blue-700">{formatMoney(metrics.totalInventoryCostValue)}</span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-200 text-slate-600">
                  <span>• បំណុលត្រូវទារ (Accounts Receivable / COD Pending)</span>
                  <span className="font-mono font-bold text-slate-900">{formatMoney(bankBalances.accountsReceivableCod)}</span>
                </div>

                <div className="flex justify-between pt-1 font-black text-slate-900">
                  <span>សរុបទ្រព្យសកម្មចរន្ត (Total Current Assets)</span>
                  <span className="font-mono">{formatMoney(metrics.totalCurrentAssets)}</span>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3 text-xs">
                <p className="font-black text-slate-700 uppercase tracking-wider text-[11px]">ទ្រព្យសកម្មអចល័ត (Non-Current Assets)</p>
                <div className="flex justify-between py-1.5 text-slate-600">
                  <span>• គ្រឿងតុបតែងហាង & ឧបករណ៍ POS Hardware</span>
                  <span className="font-mono font-bold text-slate-900">{formatMoney(bankBalances.storeEquipment)}</span>
                </div>
              </div>
            </div>

            {/* Right Column: LIABILITIES & EQUITY */}
            <div className="space-y-4">
              <div className="bg-blue-50/80 p-3 rounded-2xl border border-blue-200 font-black text-blue-950 text-sm flex justify-between">
                <span>២. បំណុល & មូលធន (LIABILITIES & EQUITY)</span>
                <span>{formatMoney(metrics.totalLiabilities + metrics.totalEquity)}</span>
              </div>

              {/* Liabilities */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3 text-xs">
                <p className="font-black text-rose-700 uppercase tracking-wider text-[11px]">បំណុល (Liabilities)</p>
                
                <div className="flex justify-between py-1.5 border-b border-slate-200 text-slate-600">
                  <span>• បំណុលត្រូវសងអ្នកផ្គត់ផ្គង់ (Accounts Payable to Suppliers)</span>
                  <span className="font-mono font-bold text-rose-700">{formatMoney(bankBalances.accountsPayable)}</span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-200 text-slate-600">
                  <span>• ពន្ធអាករត្រូវបង់ (Tax & VAT Payable)</span>
                  <span className="font-mono font-bold text-slate-900">{formatMoney(metrics.totalTax)}</span>
                </div>

                <div className="flex justify-between pt-1 font-black text-slate-900">
                  <span>សរុបបំណុល (Total Liabilities)</span>
                  <span className="font-mono text-rose-700">{formatMoney(metrics.totalLiabilities)}</span>
                </div>
              </div>

              {/* Owner's Equity */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3 text-xs">
                <p className="font-black text-emerald-700 uppercase tracking-wider text-[11px]">មូលធនម្ចាស់ (Owner's Equity)</p>

                <div className="flex justify-between py-1.5 border-b border-slate-200 text-slate-600">
                  <span>• ដើមទុនវិនិយោគដំបូង (Initial Capital Investment)</span>
                  <span className="font-mono font-bold text-slate-900">{formatMoney(bankBalances.initialCapital)}</span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-200 text-slate-600">
                  <span>• ប្រាក់ចំណេញរក្សាទុក & ចំណេញគ្រានេះ (Retained Earnings)</span>
                  <span className="font-mono font-bold text-emerald-700">{formatMoney(metrics.retainedEarnings)}</span>
                </div>

                <div className="flex justify-between pt-1 font-black text-slate-900">
                  <span>សរុបមូលធនម្ចាស់ (Total Equity)</span>
                  <span className="font-mono text-emerald-800">{formatMoney(metrics.totalEquity)}</span>
                </div>
              </div>

              {/* Verification Audit Box */}
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center justify-between">
                <span>✓ ផ្ទៀងផ្ទាត់សមីការតុល្យភាព (Accounting Balance Match):</span>
                <span className="font-mono font-black text-emerald-700">
                  ${metrics.totalAssets.toFixed(2)} = ${(metrics.totalLiabilities + metrics.totalEquity).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: CASH FLOW STATEMENT ================= */}
      {activeFinanceTab === 'cash_flow' && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-2">
            <div>
              <h3 className="text-base font-black text-slate-900">
                របាយការណ៍លំហូរសាច់ប្រាក់ ៣ ផ្នែក (Statement of Cash Flows - Direct Method)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                តាមដានការហូរចូល និងហូរចេញនៃសាច់ប្រាក់ជាក់ស្តែងក្នុងអាជីវកម្ម
              </p>
            </div>
            <span className="text-xs font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
              ស្ថានភាពសាច់ប្រាក់បច្ចុប្បន្ន: {formatMoney(metrics.totalCashBank)}
            </span>
          </div>

          <div className="space-y-4 text-xs font-sans">
            {/* 1. Operating Activities */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
              <h4 className="font-black text-slate-800 uppercase text-[11px] mb-2 text-emerald-700">
                ១. លំហូរសាច់ប្រាក់ពីប្រតិបត្តិការអាជីវកម្ម (Cash Flow from Operating Activities - CFO)
              </h4>
              <div className="flex justify-between text-slate-600">
                <span>(+) សាច់ប្រាក់ប្រមូលបានពីការលក់ទំនិញ (Cash Collected from Customers)</span>
                <span className="font-mono font-bold text-emerald-600">+{formatMoney(metrics.netRevenue)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>(-) សាច់ប្រាក់ចំណាយប្រតិបត្តិការទូទៅ (Cash Paid for OPEX)</span>
                <span className="font-mono font-bold text-rose-600">-{formatMoney(metrics.totalOPEX)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 font-black text-slate-900">
                <span>លំហូរសាច់ប្រាក់សុទ្ធពីប្រតិបត្តិការ (Net Cash from Operations)</span>
                <span className="font-mono text-emerald-700">{formatMoney(metrics.netRevenue - metrics.totalOPEX)}</span>
              </div>
            </div>

            {/* 2. Investing Activities */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
              <h4 className="font-black text-slate-800 uppercase text-[11px] mb-2 text-blue-700">
                ២. លំហូរសាច់ប្រាក់ពីការវិនិយោគ (Cash Flow from Investing Activities - CFI)
              </h4>
              <div className="flex justify-between text-slate-600">
                <span>(-) សាច់ប្រាក់ចំណាយទិញទំនិញចូលស្តុក (Cash Paid for Inventory Purchases)</span>
                <span className="font-mono font-bold text-amber-700">-{formatMoney(metrics.totalCOGS)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 font-black text-slate-900">
                <span>លំហូរសាច់ប្រាក់សុទ្ធពីការវិនិយោគ (Net Cash from Investing)</span>
                <span className="font-mono text-amber-800">-{formatMoney(metrics.totalCOGS)}</span>
              </div>
            </div>

            {/* 3. Summary */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white flex justify-between items-center text-sm font-black">
              <span>សមតុល្យសាច់ប្រាក់រាវចុងគ្រា (Closing Cash & Bank Position)</span>
              <span className="font-mono text-lg text-amber-300">{formatMoney(metrics.totalCashBank)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: FINANCIAL KPIS & BREAK-EVEN ================= */}
      {activeFinanceTab === 'kpis' && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="pb-4 border-b border-slate-200">
            <h3 className="text-base font-black text-slate-900">
              សូចនាករសុខភាពហិរញ្ញវត្ថុ & ការវិភាគចំណុចរួចដើម (Financial Ratios & Break-Even Analysis)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              សូចនាករស្ដង់ដារដែលសហគ្រាសធំៗ និងធនាគារពិភពលោកប្រើប្រាស់ដើម្បីវាស់ស្ទង់សុវត្ថិភាពហិរញ្ញវត្ថុ
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1 */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <p className="text-[11px] font-black text-slate-400 uppercase">Gross Margin %</p>
              <p className="text-2xl font-black text-blue-600 mt-1">{metrics.grossMarginPercent.toFixed(1)}%</p>
              <p className="text-[11px] text-slate-500 mt-1">ស្តង់ដារលក់រាយល្អ: &gt; 35%</p>
            </div>

            {/* KPI 2 */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <p className="text-[11px] font-black text-slate-400 uppercase">Net Profit Margin %</p>
              <p className={`text-2xl font-black mt-1 ${metrics.netProfitMarginPercent >= 15 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {metrics.netProfitMarginPercent.toFixed(1)}%
              </p>
              <p className="text-[11px] text-slate-500 mt-1">ស្តង់ដារលក់រាយល្អ: &gt; 15%</p>
            </div>

            {/* KPI 3 */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <p className="text-[11px] font-black text-slate-400 uppercase">Current Ratio (សន្ទនីយភាព)</p>
              <p className="text-2xl font-black text-purple-600 mt-1">{metrics.currentRatio.toFixed(1)}x</p>
              <p className="text-[11px] text-slate-500 mt-1">ស្តង់ដារសុវត្ថិភាព: &gt; 1.5x</p>
            </div>

            {/* KPI 4 */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <p className="text-[11px] font-black text-slate-400 uppercase">Inventory Days (DSI)</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{metrics.daysSalesInventory} ថ្ងៃ</p>
              <p className="text-[11px] text-slate-500 mt-1">ជាមធ្យមលក់ដាច់ក្នុងរង្វង់ {metrics.daysSalesInventory} ថ្ងៃ</p>
            </div>
          </div>

          {/* Break-Even Target Progress */}
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-5 border border-orange-200 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-black text-orange-950 text-sm">🎯 ការវិភាគចំណុចរួចដើម (Monthly Break-Even Point)</span>
              <span className="font-bold text-orange-800">
                គោលដៅលក់អប្បបរមាដើម្បីរួចថ្លៃដើម: <b>{formatMoney(metrics.breakEvenRevenue)}</b>
              </span>
            </div>
            
            {/* Progress bar */}
            {(() => {
              const progress = metrics.breakEvenRevenue > 0 ? Math.min(100, Math.round((metrics.netRevenue / metrics.breakEvenRevenue) * 100)) : 100;
              return (
                <div>
                  <div className="w-full h-3 rounded-full bg-orange-200/80 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${progress >= 100 ? 'bg-emerald-500' : 'bg-orange-500'}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] font-bold text-slate-600 mt-1.5">
                    <span>លក់បានជាក់ស្តែង: {formatMoney(metrics.netRevenue)} ({progress}%)</span>
                    <span className={progress >= 100 ? 'text-emerald-700 font-black' : 'text-orange-700'}>
                      {progress >= 100 ? '🎉 ហួសចំណុចរួចដើមហើយ (ចំណេញសុទ្ធពិតប្រាកដ)!' : `ខ្វះ ${formatMoney(Math.max(0, metrics.breakEvenRevenue - metrics.netRevenue))} ទៀតដើម្បីរួចថ្លៃដើម`}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ================= TAB 5: BANKS & CASH RECONCILIATION ================= */}
      {activeFinanceTab === 'banks' && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-base font-black text-slate-900">
                គ្រប់គ្រងសមតុល្យគណនីធនាគារ & ថតសាច់ប្រាក់ (Multi-Bank & Cash Ledger)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                ផ្ទៀងផ្ទាត់សាច់ប្រាក់ជាក់ស្តែងក្នុងដៃ ថតបេឡា និងគណនីធនាគារនីមួយៗ
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* ABA Bank USD */}
            <div className="p-5 rounded-2xl bg-blue-50/70 border-2 border-blue-200">
              <div className="flex justify-between items-center text-xs text-blue-900 font-black mb-2">
                <span>🏦 ធនាគារ ABA (USD)</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-200 text-blue-800 text-[10px]">Bakong KHQR</span>
              </div>
              <p className="text-2xl font-black text-blue-950 font-mono">${Number(bankBalances.abaUsd).toFixed(2)}</p>
              <p className="text-[11px] text-blue-700 mt-1">លេខគណនី: {storeSettings.bankAccountUsd || '010 723 080'}</p>
            </div>

            {/* ABA Bank KHR */}
            <div className="p-5 rounded-2xl bg-blue-50/70 border-2 border-blue-200">
              <div className="flex justify-between items-center text-xs text-blue-900 font-black mb-2">
                <span>🇰🇭 ធនាគារ ABA (KHR)</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-200 text-blue-800 text-[10px]">Bakong KHQR</span>
              </div>
              <p className="text-2xl font-black text-blue-950 font-mono">{Number(bankBalances.abaKhr).toLocaleString()} ៛</p>
              <p className="text-[11px] text-blue-700 mt-1">លេខគណនី: {storeSettings.bankAccountKhr || '004 500 394'}</p>
            </div>

            {/* Cash in Drawer */}
            <div className="p-5 rounded-2xl bg-emerald-50/70 border-2 border-emerald-200">
              <div className="flex justify-between items-center text-xs text-emerald-900 font-black mb-2">
                <span>💵 សាច់ប្រាក់ក្នុងថត (POS Drawer)</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800 text-[10px]">Daily Cash</span>
              </div>
              <p className="text-2xl font-black text-emerald-950 font-mono">${Number(bankBalances.posDrawerCash).toFixed(2)}</p>
              <p className="text-[11px] text-emerald-700 mt-1">លុយជាក់ស្តែងក្នុងកេសលក់ប្រចាំថ្ងៃ</p>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 6: CHART OF ACCOUNTS (COA) ================= */}
      {activeFinanceTab === 'coa' && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="pb-4 border-b border-slate-200">
            <h3 className="text-base font-black text-slate-900">
              តារាងកូដគណនេយ្យស្ដង់ដារអន្តរជាតិ (Standard Chart of Accounts - COA)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              ប្រព័ន្ធលេខកូដគណនេយ្យអន្តរជាតិសម្រាប់ការចុះបញ្ជីទិន្នន័យស្របតាមស្តង់ដារ IFRS
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50">
              <h4 className="font-black text-emerald-800 mb-2">1000 - ASSETS (ទ្រព្យសកម្ម)</h4>
              <ul className="space-y-1.5 text-slate-600 font-mono text-[11px]">
                <li>1100: Cash in POS Drawer ($)</li>
                <li>1200: ABA Bank Account ($ & ៛)</li>
                <li>1210: ACLEDA Bank Account</li>
                <li>1300: Inventory on Hand (Merchandise)</li>
                <li>1400: Accounts Receivable (COD)</li>
                <li>1500: Store Equipment & Fixtures</li>
              </ul>
            </div>

            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50">
              <h4 className="font-black text-rose-800 mb-2">2000 - LIABILITIES (បំណុល)</h4>
              <ul className="space-y-1.5 text-slate-600 font-mono text-[11px]">
                <li>2100: Accounts Payable (Suppliers)</li>
                <li>2200: Sales Tax / VAT Payable</li>
                <li>2300: Accrued Salaries Payable</li>
              </ul>
            </div>

            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50">
              <h4 className="font-black text-blue-800 mb-2">3000 - EQUITY (មូលធនម្ចាស់)</h4>
              <ul className="space-y-1.5 text-slate-600 font-mono text-[11px]">
                <li>3100: Owner's Initial Capital</li>
                <li>3200: Retained Earnings</li>
                <li>3300: Current Year Net Profit</li>
              </ul>
            </div>

            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50">
              <h4 className="font-black text-purple-800 mb-2">4000 - 6000 (ចំណូល, COGS & ចំណាយ)</h4>
              <ul className="space-y-1.5 text-slate-600 font-mono text-[11px]">
                <li>4100: Retail Sales Revenue (POS)</li>
                <li>4200: Online Sales Revenue</li>
                <li>5100: Cost of Goods Sold (COGS)</li>
                <li>6100: Rent & Storefront Lease</li>
                <li>6200: Salaries & Staff Payroll</li>
                <li>6300: Advertising & Marketing</li>
                <li>6400: Utilities (Water, Electricity, Net)</li>
                <li>6500: Delivery, Courier & Packaging</li>
              </ul>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
