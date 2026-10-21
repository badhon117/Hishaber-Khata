/* ============================================================
   হিসাবের খাতা — Goods (মালামাল ক্রয়ের হিসাব) Module (Secured & Updated)
   ============================================================ */

/* ---------- Storage Keys ---------- */
const STORAGE_KEY = 'hisaber_khata_goods_v1';
const GOODS_SHOPS_KEY = 'hisaber_khata_goods_shops_v1';   // 🆕

/* ---------- State ---------- */
let entries = [];
let goodsShops = [];                                    // 🆕
let currentShopName = '';                               // 🆕
let goodsShopManageMode = false;                        // 🆕
let isSelectMode = false;
let selectedIds = new Set();

/* ============================================================
   Storage Load / Save
   ============================================================ */
function loadData() {
  entries = loadFromStorage(STORAGE_KEY, []);
  if (!Array.isArray(entries)) entries = [];

  // 🆕 দোকানের তালিকা লোড
  goodsShops = loadFromStorage(GOODS_SHOPS_KEY, []);
  if (!Array.isArray(goodsShops)) goodsShops = [];
}

// 🆕 দোকানের তালিকা সেভ
function saveGoodsShops() {
  const success = saveToStorage(GOODS_SHOPS_KEY, goodsShops);
  if (!success) {
    throw new Error('STORAGE_WRITE_FAILED');
  }
}

function saveData() {
  const success = saveToStorage(STORAGE_KEY, entries);
  if (!success) {
    throw new Error('STORAGE_WRITE_FAILED');
  }
}

/* ============================================================
   Navigation & Tabs
   ============================================================ */
function switchTab(which) {
  const formTab = document.getElementById('formTab');
  const statsTab = document.getElementById('statsTab');
  const tabForm = document.getElementById('tabForm');
  const tabStats = document.getElementById('tabStats');
  const fab = document.getElementById('fabBtn');

  if (which === 'form') {
    formTab.classList.remove('hidden');
    statsTab.classList.add('hidden');
    tabForm.classList.add('active');
    tabStats.classList.remove('active');
    fab.classList.remove('show');
    exitSelectMode();
  } else {
    formTab.classList.add('hidden');
    statsTab.classList.remove('hidden');
    tabForm.classList.remove('active');
    tabStats.classList.add('active');
    fab.classList.add('show');
    renderMonthOptions();
	refreshShopNameDropdowns();   // এটা এখন goodsShops থেকে লিস্ট বানাবে
    renderTable();
  }
}

/* ============================================================
   Form Logic
   ============================================================ */
function startNewEntry() {
  document.getElementById('editId').value = '';
  document.getElementById('fDate').value = todayISO();
  
	// 🆕 দোকান পিকার রিসেট
  currentShopName = '';
  document.getElementById('goodsShopTriggerText').textContent = '-- নির্বাচন করুন --';
  document.getElementById('goodsShopTrigger').classList.add('placeholder');
  document.getElementById('fDescription').value = '';
  
  document.getElementById('fPrice').value = '';
  document.getElementById('fCash').value = '';
  document.getElementById('fDue').value = '';
  document.getElementById('fPaid').value = '';
  document.getElementById('fCost').value = '';
  document.getElementById('fNote').value = '';
  document.getElementById('formTitle').textContent = 'নতুন এন্ট্রি যোগ করুন';
  document.getElementById('editBadge').style.display = 'none';
  document.getElementById('deleteBtn').style.display = 'none';
  updateDateBn();
}

function fabNewEntry() {
  startNewEntry();
  switchTab('form');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelForm() {
  startNewEntry();
  showToast('ফর্ম খালি করা হয়েছে');
}

function editEntry(id) {
  const e = entries.find(x => x.id === id);
  if (!e) return;

  document.getElementById('editId').value = e.id;
  document.getElementById('fDate').value = e.date;
  
  // 🆕 দোকান পিকারে সেট
  currentShopName = e.shopName || '';
  document.getElementById('goodsShopTriggerText').textContent = e.shopName || '-- নির্বাচন করুন --';
  if (e.shopName) document.getElementById('goodsShopTrigger').classList.remove('placeholder');
  else document.getElementById('goodsShopTrigger').classList.add('placeholder');
  
  document.getElementById('fDescription').value = e.description || '';
  document.getElementById('fPrice').value = e.price || '';
  document.getElementById('fCash').value = e.cash || '';
  document.getElementById('fDue').value = e.due || '';
  document.getElementById('fPaid').value = e.paid || '';
  document.getElementById('fCost').value = e.cost || '';
  document.getElementById('fNote').value = e.note || '';
  document.getElementById('formTitle').textContent = 'এন্ট্রি এডিট করুন';
  document.getElementById('editBadge').style.display = 'inline-block';
  document.getElementById('deleteBtn').style.display = 'block';
  updateDateBn();
  switchTab('form');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateDateBn() {
  const v = document.getElementById('fDate').value;
  const el = document.getElementById('dateBn');
  if (v) el.textContent = '📅 ' + formatDateLongBn(v);
  else el.textContent = '';
}

/* ---------- Save / Delete ---------- */

function saveEntry() {
  // ১. প্রথমে সব ম্যাথ ফিল্ড evaluate করি — invalid হলে সেখানেই থামি
  const mathIds = ['fPrice', 'fCash', 'fDue', 'fPaid', 'fCost'];
  for (const id of mathIds) {
    const el = document.getElementById(id);
    if (el && typeof evaluateMathField === 'function') {
      const isValid = evaluateMathField(el);
      if (!isValid) {
        el.focus();
        return;   // 🛑 invalid হলে এখানেই থেমে যাবে, save হবে না
      }
    }
  }

  // ২. ফর্মের মান সংগ্রহ
  const id = document.getElementById('editId').value;
  const date = document.getElementById('fDate').value;
  const shopName = currentShopName;
  const description = document.getElementById('fDescription').value.trim();
  const price = parseFloat(document.getElementById('fPrice').value) || 0;
  const cash = parseFloat(document.getElementById('fCash').value) || 0;
  const due = parseFloat(document.getElementById('fDue').value) || 0;
  const paid = parseFloat(document.getElementById('fPaid').value) || 0;
  const cost = parseFloat(document.getElementById('fCost').value) || 0;
  const note = document.getElementById('fNote').value.trim();

  // ৩. ভ্যালিডেশন
  if (!date) { showToast('তারিখ দিন', 'error'); return; }
  if (!shopName) { showToast('দোকানের নাম নির্বাচন করুন', 'error'); return; }
  if (price <= 0) { showToast('সঠিক মূল্য দিন', 'error'); return; }

  // ৪. আর্থিক মানের ভ্যালিডেশন
  if (price < 0 || cash < 0 || due < 0 || paid < 0 || cost < 0) {
    showToast('আর্থিক পরিমাণ ঋণাত্মক হতে পারে না', 'error');
    return;
  }

  // ৫. Save
  try {
    if (id) {
      const idx = entries.findIndex(x => x.id === id);
      if (idx >= 0) {
        entries[idx] = { ...entries[idx], date, shopName, description, price, cash, due, paid, cost, note };
        saveData();
        showToast('আপডেট হয়েছে', 'success');
      }
    } else {
      entries.push({
        id: 'g_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        date, shopName, description, price, cash, due, paid, cost, note,
        createdAt: Date.now()
      });
      saveData();
      showToast('সেভ হয়েছে', 'success');
      incrementEntryCount();
    }
    startNewEntry();
    renderMonthOptions();
  } catch (err) {
    console.error('Save goods entry failed:', err);
    showToast('ডেটা সেভ করা যায়নি। স্টোরেজ পূর্ণ থাকতে পারে।', 'error');
  }
}

// 🆕 ডিলিট করা ডেটা আলাদা করে রাখার ফাংশন
function archiveDeleted(items) {
  if (!items || items.length === 0) return;
  let deletedData = loadFromStorage('hisaber_khata_deleted_data', []);
  let currentUser = localStorage.getItem('user_email') || 'anonymous';
  
  items.forEach(item => {
    deletedData.push({
      ...item,
      deletedFrom: 'goods', // এখানে 'shop', 'goods', বা 'roz' বসাবেন
      deletedAt: Date.now(),
      deletedBy: currentUser
    });
  });
  saveToStorage('hisaber_khata_deleted_data', deletedData);
}

// deleteCurrent() এবং deleteSelected() আগের মতোই থাকবে, শুধু archiveDeleted() কল করবেন

function processDelete(itemsToDelete) {
  if (!itemsToDelete || itemsToDelete.length === 0) return;
  archiveDeleted(itemsToDelete);
  const idsToDelete = itemsToDelete.map(i => i.id);
  entries = entries.filter(x => !idsToDelete.includes(x.id));
  saveData();
  renderMonthOptions();
  renderTable();

  showUndoToast('ডিলিট হয়েছে', itemsToDelete, (restoreItems) => {
    entries.push(...restoreItems);
    saveData();
    renderMonthOptions();
    renderTable();
    let deletedData = loadFromStorage('hisaber_khata_deleted_data', []);
    deletedData = deletedData.filter(d => !restoreItems.some(r => r.id === d.id));
    saveToStorage('hisaber_khata_deleted_data', deletedData);
  });
}

function deleteCurrent() {
  const id = document.getElementById('editId').value;
  if (!id) return;
  if (!askConfirm('এই এন্ট্রিটি ডিলিট করবেন?')) return;
  const itemToDelete = entries.find(x => x.id === id);
  if (itemToDelete) processDelete([itemToDelete]);
  startNewEntry();
}

function deleteSelected() {
  if (selectedIds.size === 0) {
    showToast('কিছু নির্বাচন করুন', 'error');
    return;
  }
  if (!askConfirm(toBn(selectedIds.size) + 'টি এন্ট্রি ডিলিট করবেন?')) return;
  const itemsToDelete = entries.filter(e => selectedIds.has(e.id));
  processDelete(itemsToDelete);
  exitSelectMode();
}

/* ============================================================
   Filter / Sort
   ============================================================ */
function getFiltered() {
  const search = document.getElementById('searchBox').value.toLowerCase().trim();
  const month = document.getElementById('filterMonth').value;
  const fShop = document.getElementById('filterShopName').value;
  const onlyDup = document.getElementById('filterDuplicate').checked;
  const sortBy = document.getElementById('sortBy').value;

  let list = entries.slice();

  if (month) list = list.filter(e => e.date.startsWith(month));
  if (fShop) list = list.filter(e => (e.shopName || '') === fShop);

  if (search) {
    list = list.filter(e =>
      (e.shopName || '').toLowerCase().includes(search) ||
      (e.description || '').toLowerCase().includes(search) ||
      (e.note || '').toLowerCase().includes(search)
    );
  }

  // ডুপ্লিকেট দোকান ফিল্টার
  if (onlyDup) {
    const counts = {};
    entries.forEach(e => {
      const s = (e.shopName || '').trim();
      if (s) counts[s.toLowerCase()] = (counts[s.toLowerCase()] || 0) + 1;
    });
    list = list.filter(e => {
      const s = (e.shopName || '').trim().toLowerCase();
      return s && counts[s] > 1;
    });
  }

  const [field, dir] = sortBy.split('-');
  list.sort((a, b) => {
    let cmp = 0;
    if (field === 'date') cmp = (a.date || '').localeCompare(b.date || '');
    else if (field === 'price') cmp = (a.price || 0) - (b.price || 0);
    else if (field === 'due') cmp = (a.due || 0) - (b.due || 0);
    else if (field === 'shopname') cmp = (a.shopName || '').localeCompare(b.shopName || '');
    return dir === 'desc' ? -cmp : cmp;
  });
  return list;
}

/* ============================================================
   Table Render
   ============================================================ */
function renderTable() {
  const list = getFiltered();
  const tbody = document.getElementById('tableBody');
  const empty = document.getElementById('emptyState');

  if (list.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    updateSelCount();
    updateSummary([]);
    return;
  }
  empty.style.display = 'none';

  tbody.innerHTML = list.map(e => {
    const checked = selectedIds.has(e.id) ? 'checked' : '';
    const cbCell = isSelectMode
      ? `<td class="checkbox-cell"><input type="checkbox" ${checked} onclick="event.stopPropagation(); toggleRowSelect('${e.id}', this.checked)"></td>`
      : '';
    const noteText = e.note ? escapeHtml(e.note) : '—';
    const descText = e.description ? escapeHtml(e.description) : '—';
    const rowClick = isSelectMode
      ? `toggleRowSelect('${e.id}', !selectedIds.has('${e.id}'))`
      : `editEntry('${e.id}')`;
    return `
      <tr onclick="${rowClick}">
        ${cbCell}
        <td>${formatDateBn(e.date)}</td>
        <td class="shopname-cell">${escapeHtml(e.shopName)}</td>
        <td class="desc-cell">${descText}</td>
        <td class="amount-cell">${formatTaka(e.price)}</td>
        <td class="cash-cell">${formatTaka(e.cash)}</td>
        <td class="due-cell">${formatTaka(e.due)}</td>
        <td class="paid-cell">${formatTaka(e.paid)}</td>
        <td class="cost-cell">${formatTaka(e.cost)}</td>
        <td class="note-cell">${noteText}</td>
      </tr>
    `;
  }).join('');

  updateSelCount();
  updateSummary(list);
}

/* ============================================================
   Month Filter Options
   ============================================================ */
function renderMonthOptions() {
  const sel = document.getElementById('filterMonth');
  if (!sel) return;
  const current = sel.value;
  const months = new Set();
  entries.forEach(e => { if (e.date) months.add(e.date.slice(0, 7)); });
  const sorted = Array.from(months).sort().reverse();
  sel.innerHTML = '<option value="">সব মাস</option>' +
    sorted.map(m => {
      const [y, mo] = m.split('-');
      return `<option value="${m}">${getBnMonth(parseInt(mo))} ${toBn(y)}</option>`;
    }).join('');
  if (sorted.includes(current)) sel.value = current;
}

/* ============================================================
   Shop Name Dropdown (অটো-লিস্ট)
   ============================================================ */

function refreshShopNameDropdowns() {
  const sel = document.getElementById('filterShopName');
  if (!sel) return;
  const current = sel.value;

  // 🆕 goodsShops থেকে নেওয়া (edit/delete করলেও ঠিক থাকবে)
  // তবে যদি entries-এ এমন দোকান থাকে যা goodsShops-এ নেই, সেগুলোও যোগ করি
  const shopSet = new Set(goodsShops);
  entries.forEach(e => {
    const s = (e.shopName || '').trim();
    if (s) shopSet.add(s);
  });

  const sorted = Array.from(shopSet).sort();
  sel.innerHTML = '<option value="">সব দোকান</option>' +
    sorted.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');

  if (sorted.includes(current)) sel.value = current;
}

/* ============================================================
   Select Mode
   ============================================================ */
function enterSelectMode() {
  isSelectMode = true;
  selectedIds.clear();
  document.getElementById('selectionBar').classList.add('open');
  document.getElementById('selectBtn').classList.add('active');
  document.getElementById('selectBtn').textContent = '☑ সক্রিয়';
  renderTable();
}

function exitSelectMode() {
  isSelectMode = false;
  selectedIds.clear();
  const bar = document.getElementById('selectionBar');
  if (bar) bar.classList.remove('open');
  const btn = document.getElementById('selectBtn');
  if (btn) {
    btn.classList.remove('active');
    btn.textContent = '☑ Select';
  }
  renderTable();
}

function toggleRowSelect(id, checked) {
  if (checked) selectedIds.add(id);
  else selectedIds.delete(id);
  renderTable();
}

function toggleSelectAll() {
  const list = getFiltered();
  const allSel = list.length > 0 && list.every(e => selectedIds.has(e.id));
  if (allSel) list.forEach(e => selectedIds.delete(e.id));
  else list.forEach(e => selectedIds.add(e.id));
  renderTable();
}

function updateSelCount() {
  const el = document.getElementById('selCount');
  if (el) el.textContent = toBn(selectedIds.size) + 'টি নির্বাচিত';
}



/* ============================================================
   Summary Grid (২x২)
   ============================================================ */
function updateSummary(list) {
  let displayList = list;
  let label = 'মোট';

  if (isSelectMode && selectedIds.size > 0) {
    displayList = list.filter(e => selectedIds.has(e.id));
    label = 'নির্বাচিত';
  }

  const purchase = displayList.reduce((s, e) => s + (Number(e.price) || 0), 0);
  const cost = displayList.reduce((s, e) => s + (Number(e.cost) || 0), 0);
  const due = displayList.reduce((s, e) => s + (Number(e.due) || 0), 0);
  const paid = displayList.reduce((s, e) => s + (Number(e.paid) || 0), 0);

  const elPurchase = document.getElementById('sumPurchase');
  const elCost = document.getElementById('sumCost');
  const elDue = document.getElementById('sumDue');
  const elPaid = document.getElementById('sumPaid');

  if (elPurchase) elPurchase.textContent = formatTaka(purchase);
  if (elCost) elCost.textContent = formatTaka(cost);
  if (elDue) elDue.textContent = formatTaka(due);
  if (elPaid) elPaid.textContent = formatTaka(paid);

  const lPurchase = document.getElementById('labelPurchase');
  const lCost = document.getElementById('labelCost');
  const lDue = document.getElementById('labelDue');
  const lPaid = document.getElementById('labelPaid');

  if (lPurchase) lPurchase.textContent = label + ' ক্রয়';
  if (lCost) lCost.textContent = label + ' খরচ';
  if (lDue) lDue.textContent = label + ' বাকি';
  if (lPaid) lPaid.textContent = label + ' বাকি প্রদান';
}

/* ============================================================
   CSV Export
   ============================================================ */
function exportCSV() {
  const list = getFiltered();
  if (list.length === 0) {
    showToast('এক্সপোর্ট করার ডেটা নেই', 'error');
    return;
  }

  const rows = [['তারিখ', 'দোকানের নাম', 'বিবরণ', 'মূল্য', 'নগদ', 'বাকি', 'বাকি প্রদান', 'খরচ', 'মন্তব্য']];
  list.forEach(e => {
    rows.push([
      formatDateBn(e.date), e.shopName || '', e.description || '',
      e.price || 0, e.cash || 0, e.due || 0, e.paid || 0, e.cost || 0, e.note || ''
    ]);
  });

  const csv = '\uFEFF' + rows.map(r =>
    r.map(c => `"${String(c == null ? '' : c).replace(/"/g, '""')}"`).join(',')
  ).join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'malamaal_kroy_' + todayISO() + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('CSV ডাউনলোড হয়েছে', 'success');
}

/* ============================================================
   Chart Logic (Goods)
   ============================================================ */
let chartInstance = null;

function openChartModal() {
  const modal = document.getElementById('chartModal');
  if (modal) {
    modal.style.display = 'flex';
    populateChartFilters();
    renderChart();
  }
}

function closeChartModal() {
  const modal = document.getElementById('chartModal');
  if (modal) modal.style.display = 'none';
}

function populateChartFilters() {
  const monthSelect = document.getElementById('chartMonth');
  const yearSelect = document.getElementById('chartYear');
  
  if (!monthSelect || !yearSelect) return;

  const months = new Set();
  const years = new Set();
  
  entries.forEach(e => {
    if (e.date) {
      const [y, m] = e.date.split('-');
      years.add(y);
      months.add(m);
    }
  });

  const today = new Date();
  const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
  const currentYear = String(today.getFullYear());

  const sortedMonths = Array.from(months).sort();
  monthSelect.innerHTML = '<option value="">-- মাস --</option>' + 
    sortedMonths.map(m => {
      const monthName = getBnMonth(parseInt(m));
      return `<option value="${m}" ${m === currentMonth ? 'selected' : ''}>${monthName}</option>`;
    }).join('');

  const sortedYears = Array.from(years).sort().reverse();
  yearSelect.innerHTML = '<option value="">-- বছর --</option>' + 
    sortedYears.map(y => `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${toBn(y)}</option>`).join('');
}

function renderChart() {
  const month = document.getElementById('chartMonth').value;
  const year = document.getElementById('chartYear').value;
  
  if (!month || !year) return;

  const filtered = entries.filter(e => e.date.startsWith(`${year}-${month}`));
  
  const shopData = {};
  filtered.forEach(e => {
    const shop = e.shopName || 'অন্যান্য';
    if (!shopData[shop]) {
      shopData[shop] = { purchase: 0, due: 0, paid: 0, cost: 0 };
    }
    shopData[shop].purchase += (Number(e.price) || 0);
    shopData[shop].due += (Number(e.due) || 0);
    shopData[shop].paid += (Number(e.paid) || 0);
    shopData[shop].cost += (Number(e.cost) || 0);
  });

  const labels = Object.keys(shopData);
  
  const purchaseData = labels.map(s => shopData[s].purchase);
  const dueData = labels.map(s => shopData[s].due);
  const paidData = labels.map(s => shopData[s].paid);
  const costData = labels.map(s => shopData[s].cost);

  if (chartInstance) {
    chartInstance.destroy();
  }

  const ctx = document.getElementById('myChart').getContext('2d');
  
  if (labels.length === 0) {
    chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['কোনো ডেটা নেই'],
        datasets: [{ data: [0], backgroundColor: '#CBD5E1' }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
    return;
  }

  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'মোট ক্রয়',
          data: purchaseData,
          backgroundColor: '#0F766E',
          borderRadius: 4,
          barPercentage: 0.6,
          categoryPercentage: 0.7
        },
        {
          label: 'মোট বাকি',
          data: dueData,
          backgroundColor: '#F97316',
          borderRadius: 4,
          barPercentage: 0.6,
          categoryPercentage: 0.7
        },
        {
          label: 'মোট বাকি প্রদান',
          data: paidData,
          backgroundColor: '#10B981',
          borderRadius: 4,
          barPercentage: 0.6,
          categoryPercentage: 0.7
        },
        {
          label: 'মোট খরচ',
          data: costData,
          backgroundColor: '#DC2626',
          borderRadius: 4,
          barPercentage: 0.6,
          categoryPercentage: 0.7
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { 
          display: true, 
          position: 'bottom',
          labels: {
            font: { family: 'Noto Sans Bengali', size: 11 },
            boxWidth: 12
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { 
            callback: function(value) { return '৳' + value; }, 
            font: { family: 'Noto Sans Bengali' } 
          }
        },
        x: { 
          ticks: { font: { family: 'Noto Sans Bengali' } } 
        }
      }
    }
  });
}

/* ============================================================
   🆕 Goods Shop Picker Logic
   ============================================================ */

function toggleGoodsShopPanel(e) {
  if (e) e.stopPropagation();
  const panel = document.getElementById('goodsShopPanel');
  const trigger = document.getElementById('goodsShopTrigger');
  if (panel.classList.contains('open')) {
    closeGoodsShopPanel();
  } else {
    panel.classList.add('open');
    trigger.classList.add('open');
    document.getElementById('goodsShopSearch').value = '';
    renderGoodsShopList();
    setTimeout(() => document.getElementById('goodsShopSearch').focus(), 100);
  }
}

function closeGoodsShopPanel() {
  const panel = document.getElementById('goodsShopPanel');
  const trigger = document.getElementById('goodsShopTrigger');
  const addForm = document.getElementById('goodsShopAddForm');
  const addBtn = document.getElementById('goodsShopAddBtn');
  if (panel) panel.classList.remove('open');
  if (trigger) trigger.classList.remove('open');
  if (addForm) addForm.classList.remove('open');
  if (addBtn) addBtn.style.display = 'flex';
  goodsShopManageMode = false;
}

// বাইরে ক্লিক করলে বন্ধ
document.addEventListener('click', e => {
  const picker = document.querySelector('.goods-shop-picker');
  if (picker && !picker.contains(e.target)) closeGoodsShopPanel();
});

function renderGoodsShopList() {
  const q = (document.getElementById('goodsShopSearch').value || '').toLowerCase().trim();
  const list = document.getElementById('goodsShopList');
  const filtered = goodsShops.filter(s => !q || s.toLowerCase().includes(q));

  let html = '';
  if (goodsShopManageMode) {
    html += `<button type="button" class="goods-shop-manage-toggle" onclick="toggleGoodsShopManageMode()">✓ ম্যানেজ মোড বন্ধ করুন</button>`;
  } else {
    html += `<button type="button" class="goods-shop-manage-toggle" onclick="toggleGoodsShopManageMode()">⚙ এডিট/ডিলিট করুন</button>`;
  }

  if (filtered.length === 0) {
    html += `<div style="padding:16px;text-align:center;color:#94A3B8;font-size:13px;">কোনো দোকান পাওয়া যায়নি</div>`;
  } else {
    html += filtered.map(s => {
      const sel = (s === currentShopName) ? ' selected' : '';
      const manage = goodsShopManageMode ? ' manage-mode' : '';
      const safeS = escapeAttr(s);
      return `
        <div class="goods-shop-item${sel}${manage}" data-shop="${escapeHtml(s)}" onclick="selectGoodsShop(event, '${safeS}')">
          <span class="goods-shop-item-text">${escapeHtml(s)}</span>
          <span class="goods-shop-item-actions">
            <button type="button" onclick="startEditGoodsShop(event, '${safeS}')">এডিট</button>
            <button type="button" class="del" onclick="deleteGoodsShop(event, '${safeS}')">ডিলিট</button>
          </span>
        </div>
      `;
    }).join('');
  }
  list.innerHTML = html;
}

function toggleGoodsShopManageMode() {
  goodsShopManageMode = !goodsShopManageMode;
  renderGoodsShopList();
}

function selectGoodsShop(e, shop) {
  if (e) e.stopPropagation();
  currentShopName = shop;
  document.getElementById('goodsShopTriggerText').textContent = shop;
  document.getElementById('goodsShopTrigger').classList.remove('placeholder');
  closeGoodsShopPanel();
}

function startEditGoodsShop(e, shop) {
  e.stopPropagation();
  const item = e.target.closest('.goods-shop-item');
  const oldText = item.querySelector('.goods-shop-item-text');
  const actions = item.querySelector('.goods-shop-item-actions');
  oldText.style.display = 'none';
  if (actions) actions.style.display = 'none';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'goods-shop-edit-input';
  input.value = shop;
  item.insertBefore(input, oldText.nextSibling);
  input.focus();
  input.select();

  const finish = (save) => {
    if (save) {
      const newName = input.value.trim();
      if (newName && newName !== shop) {
        // কেস-ইনসেন্সিটিভ ডুপ্লিকেট চেক
        if (goodsShops.some(s => s.toLowerCase() === newName.toLowerCase() && s !== shop)) {
          showToast('এই দোকান ইতিমধ্যে আছে', 'error');
        } else {
          const idx = goodsShops.indexOf(shop);
          if (idx >= 0) goodsShops[idx] = newName;
          // পুরোনো entries-এ দোকানের নাম আপডেট
          entries.forEach(en => { if (en.shopName === shop) en.shopName = newName; });
          if (currentShopName === shop) {
            currentShopName = newName;
            document.getElementById('goodsShopTriggerText').textContent = newName;
          }
          saveGoodsShops();
          saveData();
          refreshShopNameDropdowns();
          showToast('দোকান আপডেট হয়েছে', 'success');
        }
      }
    }
    renderGoodsShopList();
  };

  input.onblur = () => finish(true);
  input.onkeydown = (ev) => {
    if (ev.key === 'Enter') { ev.preventDefault(); input.blur(); }
    if (ev.key === 'Escape') { ev.preventDefault(); input.onblur = null; finish(false); }
  };
}

function deleteGoodsShop(e, shop) {
  e.stopPropagation();
  const used = entries.filter(en => en.shopName === shop).length;
  let msg = `"${shop}" দোকানটি ডিলিট করবেন?`;
  if (used > 0) msg += `\n\n${toBn(used)}টি এন্ট্রিতে এই দোকান ব্যবহৃত আছে।`;
  if (!askConfirm(msg)) return;

  goodsShops = goodsShops.filter(s => s !== shop);
  saveGoodsShops();
  if (currentShopName === shop) {
    currentShopName = '';
    document.getElementById('goodsShopTriggerText').textContent = '-- নির্বাচন করুন --';
    document.getElementById('goodsShopTrigger').classList.add('placeholder');
  }
  refreshShopNameDropdowns();
  renderGoodsShopList();
  showToast('দোকান ডিলিট হয়েছে', 'success');
}

function showAddGoodsShopForm(e) {
  if (e) e.stopPropagation();
  document.getElementById('goodsShopAddBtn').style.display = 'none';
  document.getElementById('goodsShopAddForm').classList.add('open');
  const inp = document.getElementById('goodsShopNewInput');
  inp.value = '';
  setTimeout(() => inp.focus(), 100);
}

function hideAddGoodsShopForm(e) {
  if (e) e.stopPropagation();
  document.getElementById('goodsShopAddForm').classList.remove('open');
  document.getElementById('goodsShopAddBtn').style.display = 'flex';
}

function addNewGoodsShop() {
  const inp = document.getElementById('goodsShopNewInput');
  const name = inp.value.trim();
  if (!name) { showToast('দোকানের নাম লিখুন', 'error'); return; }
  
  // কেস-ইনসেন্সিটিভ ডুপ্লিকেট চেক
  if (goodsShops.some(s => s.toLowerCase() === name.toLowerCase())) {
    showToast('এই দোকান ইতিমধ্যে আছে', 'error');
    return;
  }

  goodsShops.push(name);
  saveGoodsShops();
  currentShopName = name;
  document.getElementById('goodsShopTriggerText').textContent = name;
  document.getElementById('goodsShopTrigger').classList.remove('placeholder');
  document.getElementById('goodsShopAddForm').classList.remove('open');
  document.getElementById('goodsShopAddBtn').style.display = 'flex';
  refreshShopNameDropdowns();
  closeGoodsShopPanel();
  showToast('নতুন দোকান যোগ হয়েছে', 'success');
}

/* ============================================================
   Event Listeners
   ============================================================ */

function attachEventListeners() {
  document.getElementById('fDate').addEventListener('change', updateDateBn);

  // 🆕 ইনপুট ফিল্ডগুলোতে রিয়েল-টাইম ফিল্টার (বাংলা + ইংরেজি)
  const inputIds = ['fPrice', 'fCash', 'fDue', 'fPaid', 'fCost'];

  inputIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    el.addEventListener('input', (e) => {
      const original = e.target.value;

      // 🆕 বাংলা সংখ্যা → ইংরেজিতে রূপান্তর
      const converted = bnToEn(original);

      // 🆕 শুধু অনুমোদিত ক্যারেক্টার রাখি
      const filtered = converted.replace(/[^0-9+\-*/%().\s]/g, '');

      if (filtered !== original) {
        e.target.value = filtered;

        if (converted !== original && filtered === converted) {
          // বাংলা সংখ্যা ছিল — চুপচাপ
        } else {
          showToast('শুধু সংখ্যা এবং + - * / % ব্যবহার করুন', 'error');
        }
      }
    });
  });
}

/* ============================================================
   Init
   ============================================================ */
loadData();
startNewEntry();
attachEventListeners();