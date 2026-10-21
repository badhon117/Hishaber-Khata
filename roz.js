/* ============================================================
   হিসাবের খাতা — রোজ হিসাব Module
   ============================================================ */

/* ---------- Storage Keys ---------- */
const STORAGE_KEY = 'hisaber_khata_roz_v1';

/* ---------- State ---------- */
let entries = [];
let isSelectMode = false;
let selectedIds = new Set();

/* ---------- Field Definitions (storage key, element id, label) ---------- */
const FIELDS = [
  { key: 'bkashPersonal', el: 'fBkashPersonal', label: 'বিকাশ পার্সোনাল' },
  { key: 'badhon',        el: 'fBadhon',        label: 'বাধন' },
  { key: 'merchant328',   el: 'fMerchant328',   label: 'মার্চেন্ট ৩২৮' },
  { key: 'bkashAgent',    el: 'fBkashAgent',    label: 'বিকাশ এজেন্ট' },
  { key: 'merchant40',    el: 'fMerchant40',    label: 'মার্চেন্ট ৪০' },
  { key: 'nagadBkash',    el: 'fNagadBkash',    label: 'নগদ বিকাশ' },
  { key: 'cash',          el: 'fCash',          label: 'ক্যাশ' },
  { key: 'pawna',         el: 'fPawna',         label: 'পাওনা' },
  { key: 'total',         el: 'fTotal',         label: 'মোট' },
  { key: 'expense',       el: 'fExpense',       label: 'খরচ' },
  { key: 'savings',       el: 'fSavings',       label: 'সঞ্চয়' },
  { key: 'goodsBuy',      el: 'fGoodsBuy',      label: 'মালামাল ক্রয়' },
  { key: 'totalExpense',  el: 'fTotalExpense',  label: 'মোট খরচ' },
  { key: 'grandTotal',    el: 'fGrandTotal',    label: 'খরচসহ সর্বমোট' },
  { key: 'remaining',     el: 'fRemaining',     label: 'অবশিষ্ট টাকা' },
  { key: 'lessMore',      el: 'fLessMore',      label: 'কম / বেশি' },
  { key: 'deficit',       el: 'fDeficit',       label: 'ঘাটতি / উদ্ধৃত' },
  { key: 'debt',          el: 'fDebt',          label: 'দেনা' }
];

/* ============================================================
   Storage Load / Save
   ============================================================ */
function loadData() {
  entries = loadFromStorage(STORAGE_KEY, []);
  if (!Array.isArray(entries)) entries = [];
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
    renderTable();
  }
}

/* ============================================================
   Form Logic
   ============================================================ */

function startNewEntry() {
  document.getElementById('editId').value = '';
  document.getElementById('fDate').value = todayISO();

  FIELDS.forEach(f => {
    const el = document.getElementById(f.el);
    if (el) el.value = '';
  });

  // 🆕 মন্তব্য ফিল্ড খালি করি
  const noteEl = document.getElementById('fNote');
  if (noteEl) noteEl.value = '';

  document.getElementById('formTitle').textContent = 'নতুন এন্ট্রি যোগ করুন';
  document.getElementById('editBadge').style.display = 'none';
  document.getElementById('deleteBtn').style.display = 'none';
  updateDateBn();
  recalcAll();   // 🆕 সব অটো ফিল্ড 0 করে দিই
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

  FIELDS.forEach(f => {
    const el = document.getElementById(f.el);
    if (el) el.value = (e[f.key] === 0 || e[f.key]) ? e[f.key] : '';
  });

  // 🆕 মন্তব্য বসাই
  const noteEl = document.getElementById('fNote');
  if (noteEl) noteEl.value = e.note || '';

  document.getElementById('formTitle').textContent = 'এন্ট্রি এডিট করুন';
    document.getElementById('editBadge').style.display = 'inline-block';
  document.getElementById('deleteBtn').style.display = 'block';
  updateDateBn();
  recalcAll();   // 🆕 মান অনুযায়ী সব অটো ফিল্ড আপডেট
  switchTab('form');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateDateBn() {
  const v = document.getElementById('fDate').value;
  const el = document.getElementById('dateBn');
  if (v) el.textContent = '📅 ' + formatDateLongBn(v);
  else el.textContent = '';
}



/* ============================================================
   🆕 Auto-Calculation Logic (রিয়েল-টাইম ফর্মুলা)
   ============================================================ */

// একটি ফিল্ডের সংখ্যামান বের করি (খালি হলে 0)
function getNum(id) {
  const el = document.getElementById(id);
  if (!el) return 0;
  const v = parseFloat(el.value);
  return isNaN(v) ? 0 : v;
}

// একটি ফিল্ডে মান বসাই
function setNum(id, val) {
  const el = document.getElementById(id);
  if (!el) return;

  // 🆕 শূন্য হলে খালি রাখি — placeholder দেখাবে, value নয়
  if (val === 0 || val === null || isNaN(val)) {
    el.value = '';
  } else {
    el.value = Math.round(val * 100) / 100;
  }
}

// সব অটো-ক্যালকুলেটেড ফিল্ড আপডেট করি
function recalcAll() {
  // ১. মোট = সব ইনপুট সোর্সের যোগফল
  const bkashPersonal = getNum('fBkashPersonal');
  const badhon        = getNum('fBadhon');
  const merchant328   = getNum('fMerchant328');
  const bkashAgent    = getNum('fBkashAgent');
  const merchant40    = getNum('fMerchant40');
  const nagadBkash    = getNum('fNagadBkash');
  const cash          = getNum('fCash');
  const pawna         = getNum('fPawna');

  const total = bkashPersonal + badhon + merchant328 + bkashAgent + merchant40 + nagadBkash + cash + pawna;
  setNum('fTotal', total);

  // ২. মোট খরচ = খরচ + সঞ্চয় + মালামাল ক্রয়
  const expense   = getNum('fExpense');
  const savings   = getNum('fSavings');
  const goodsBuy  = getNum('fGoodsBuy');

  const totalExpense = expense + savings + goodsBuy;
  setNum('fTotalExpense', totalExpense);

  // ৩. খরচসহ সর্বমোট = মোট + মোট খরচ
  const grandTotal = total + totalExpense;
  setNum('fGrandTotal', grandTotal);

  // ৪. অবশিষ্ট টাকা = খরচসহ সর্বমোট - মোট খরচ
  const remaining = grandTotal - totalExpense;
  setNum('fRemaining', remaining);

  // ৫. কম / বেশি = খরচসহ সর্বমোট - অবশিষ্ট টাকা
  const lessMore = grandTotal - remaining;
  setNum('fLessMore', lessMore);

    // ৬. ঘাটতি / উদ্ধৃত্ত = অবশিষ্ট টাকা − দেনা
  // (দেনা ইনপুট, ঘাটতি অটো)
  const debt = getNum('fDebt');        // ইনপুট
  const deficit = remaining - debt;    // অটো
  setNum('fDeficit', deficit);
}

function saveEntry() {
  // 🆕 প্রথমে সব ম্যাথ ফিল্ড evaluate করি — invalid হলে সেখানেই থামি
  // ⚠️ শুধু ইনপুট ফিল্ডেই math calculator আছে, তাই readonly ফিল্ড বাদ দিই
  const inputFieldIds = [
    'fBkashPersonal', 'fBadhon', 'fMerchant328', 'fBkashAgent',
    'fMerchant40', 'fNagadBkash', 'fCash', 'fPawna',
    'fExpense', 'fSavings', 'fGoodsBuy', 'fDebt'
  ];
  for (const id of inputFieldIds) {
    const el = document.getElementById(id);
    if (el && typeof evaluateMathField === 'function') {
      const isValid = evaluateMathField(el);
      if (!isValid) {
        el.focus();
        return;   // 🛑 invalid হলে save হবে না
      }
    }
  }

  // 🆕 শেষবারের মতো সব অটো ফিল্ড আপডেট
  recalcAll();
 

  const id = document.getElementById('editId').value;
  const date = document.getElementById('fDate').value;

  if (!date) { showToast('তারিখ দিন', 'error'); return; }

  // সব ফিল্ড একসাথে সংগ্রহ
  const data = { date };
  FIELDS.forEach(f => {
    const raw = document.getElementById(f.el).value.trim();
    data[f.key] = raw === '' ? 0 : (parseFloat(raw) || 0);
  });

  // 🆕 মন্তব্য সংগ্রহ
  data.note = document.getElementById('fNote').value.trim();
  
  if (id) {
    const idx = entries.findIndex(x => x.id === id);
    if (idx >= 0) {
      entries[idx] = { ...entries[idx], ...data };
      showToast('আপডেট হয়েছে', 'success');
    }
  } else {
    entries.push({
      id: 'r_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      ...data,
      createdAt: Date.now()
    });
    showToast('সেভ হয়েছে', 'success');
    incrementEntryCount();
  }

  saveData();
  startNewEntry();
  renderMonthOptions();
}


/* ============================================================
   Filter / Sort
   ============================================================ */
function getFiltered() {
  const search = document.getElementById('searchBox').value.toLowerCase().trim();
  const month = document.getElementById('filterMonth').value;
  const sortBy = document.getElementById('sortBy').value;

  let list = entries.slice();

  if (month) list = list.filter(e => e.date.startsWith(month));

  if (search) {
    list = list.filter(e =>
      (e.date || '').includes(search) ||
      formatDateBn(e.date).includes(search)
    );
  }

  const [field, dir] = sortBy.split('-');
  list.sort((a, b) => {
    let cmp = 0;
    if (field === 'date') cmp = (a.date || '').localeCompare(b.date || '');
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
    const rowClick = isSelectMode
      ? `toggleRowSelect('${e.id}', !selectedIds.has('${e.id}'))`
      : `editEntry('${e.id}')`;

    const cells = FIELDS.map(f => {
      const v = Number(e[f.key]) || 0;
      const cls = v < 0 ? 'roz-money-cell negative' : 'roz-money-cell';
      return `<td class="${cls}">${formatTaka(v)}</td>`;
    }).join('');

    // 🆕 মন্তব্য সেল
    const noteText = e.note ? escapeHtml(e.note) : '—';

    return `
      <tr onclick="${rowClick}">
        ${cbCell}
        <td>${formatDateBn(e.date)}</td>
        ${cells}
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

// 🆕 ডিলিট করা ডেটা আলাদা করে রাখার ফাংশন
function archiveDeleted(items) {
  if (!items || items.length === 0) return;
  let deletedData = loadFromStorage('hisaber_khata_deleted_data', []);
  let currentUser = localStorage.getItem('user_email') || 'anonymous';
  
  items.forEach(item => {
    deletedData.push({
      ...item,
      deletedFrom: 'roz', // এখানে 'shop', 'goods', বা 'roz' বসাবেন
      deletedAt: Date.now(),
      deletedBy: currentUser
    });
  });
  saveToStorage('hisaber_khata_deleted_data', deletedData);
}

// 🆕 ডিলিট হওয়া ডেটা আনডু ও রিসাইকেল বিনে পাঠানোর ফাংশন
function processDelete(itemsToDelete) {
  if (!itemsToDelete || itemsToDelete.length === 0) return;
  
  // ১. রিসাইকেল বিনে পাঠানো (আপনার আগের কোড)
  archiveDeleted(itemsToDelete);
  
  // ২. মূল ডেটা থেকে মুছে ফেলা
  const idsToDelete = itemsToDelete.map(i => i.id);
  entries = entries.filter(x => !idsToDelete.includes(x.id));
  saveData();
  renderMonthOptions();
  renderTable();

  // ৩. আনডু অপশন দেখানো (৫ সেকেন্ডের জন্য)
  showUndoToast('ডিলিট হয়েছে', itemsToDelete, (restoreItems) => {
    // আনডুতে ক্লিক করলে ডেটা আবার ফিরে আসবে
    entries.push(...restoreItems);
    saveData();
    renderMonthOptions();
    renderTable();
    
    // রিসাইকেল বিন থেকেও মুছে ফেলা (কারণ ফিরিয়ে এনেছি)
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
// deleteCurrent() এবং deleteSelected() আগের মতোই থাকবে, শুধু archiveDeleted() কল করবেন

/* ============================================================
   Summary Grid (2x2)
   ============================================================ */
function updateSummary(list) {
  let displayList = list;
  let label = 'মোট';

  if (isSelectMode && selectedIds.size > 0) {
    displayList = list.filter(e => selectedIds.has(e.id));
    label = 'নির্বাচিত';
  }

  const total = displayList.reduce((s, e) => s + (Number(e.total) || 0), 0);
  const totalExpense = displayList.reduce((s, e) => s + (Number(e.totalExpense) || 0), 0);
  const remaining = displayList.reduce((s, e) => s + (Number(e.remaining) || 0), 0);
  const count = displayList.length;

  const elCount = document.getElementById('sumCount');
  const elTotal = document.getElementById('sumTotal');
  const elTotExp = document.getElementById('sumTotalExpense');
  const elRem = document.getElementById('sumRemaining');

  if (elCount) elCount.textContent = toBn(count);
  if (elTotal) elTotal.textContent = formatTaka(total);
  if (elTotExp) elTotExp.textContent = formatTaka(totalExpense);
  if (elRem) elRem.textContent = formatTaka(remaining);

  const lCount = document.getElementById('labelCount');
  const lTotal = document.getElementById('labelTotal');
  const lTotExp = document.getElementById('labelTotalExpense');
  const lRem = document.getElementById('labelRemaining');
  if (lCount) lCount.textContent = label + ' এন্ট্রি';
  if (lTotal) lTotal.textContent = ' সর্বমোট';
  if (lTotExp) lTotExp.textContent = ' সর্বমোট খরচ';
  if (lRem) lRem.textContent = label + ' অবশিষ্ট';
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

  const header = ['তারিখ', ...FIELDS.map(f => f.label), 'মন্তব্য'];
  const rows = [header];

  list.forEach(e => {
    rows.push([
      formatDateBn(e.date),
      ...FIELDS.map(f => e[f.key] || 0),
      e.note || ''   // 🆕 মন্তব্য
    ]);
  });

  const csv = '\uFEFF' + rows.map(r =>
    r.map(c => `"${String(c == null ? '' : c).replace(/"/g, '""')}"`).join(',')
  ).join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'roz_hisab_' + todayISO() + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('CSV ডাউনলোড হয়েছে', 'success');
}

/* ============================================================
   🆕 Chart Logic (রোজ হিসাব)
   ============================================================ */

let chartIncomeInstance = null;
let chartExpenseInstance = null;
let chartSummaryInstance = null;

// চার্টে কোন ফিল্ডগুলো দেখাবে
const INCOME_FIELDS = [
  { key: 'bkashPersonal', label: 'বিকাশ পার্সোনাল' },
  { key: 'badhon',        label: 'বাধন' },
  { key: 'merchant328',   label: 'মার্চেন্ট ৩২৮' },
  { key: 'bkashAgent',    label: 'বিকাশ এজেন্ট' },
  { key: 'merchant40',    label: 'মার্চেন্ট ৪০' },
  { key: 'nagadBkash',    label: 'নগদ বিকাশ' },
  { key: 'cash',          label: 'ক্যাশ' },
  { key: 'pawna',         label: 'পাওনা' }
];

const EXPENSE_FIELDS = [
  { key: 'expense',  label: 'খরচ' },
  { key: 'savings',  label: 'সঞ্চয়' },
  { key: 'goodsBuy', label: 'মালামাল ক্রয়' }
];

const SUMMARY_FIELDS = [
  { key: 'remaining', label: 'অবশিষ্ট টাকা' },
  { key: 'lessMore',  label: 'কম / বেশি' },
  { key: 'deficit',   label: 'ঘাটতি / উদ্ধৃত্ত' },
  { key: 'debt',      label: 'দেনা' }
];

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

// ফিল্টার অপশন (দিন, মাস, বছর) পপুলেট করি
function populateChartFilters() {
  const daySelect = document.getElementById('chartDay');
  const monthSelect = document.getElementById('chartMonth');
  const yearSelect = document.getElementById('chartYear');

  if (!daySelect || !monthSelect || !yearSelect) return;

  const months = new Set();
  const years = new Set();
  const days = new Set();

  entries.forEach(e => {
    if (e.date) {
      const [y, m, d] = e.date.split('-');
      years.add(y);
      months.add(m);
      days.add(d);
    }
  });

  const today = new Date();
  const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
  const currentYear = String(today.getFullYear());
  const currentDay = String(today.getDate()).padStart(2, '0');

  // দিন
  const sortedDays = Array.from(days).sort();
  daySelect.innerHTML = '<option value="">সব দিন</option>' +
    sortedDays.map(d => `<option value="${d}" ${d === currentDay ? 'selected' : ''}>${toBn(parseInt(d))}</option>`).join('');

  // মাস
  const sortedMonths = Array.from(months).sort();
  monthSelect.innerHTML = '<option value="">-- মাস --</option>' +
    sortedMonths.map(m => {
      const monthName = getBnMonth(parseInt(m));
      return `<option value="${m}" ${m === currentMonth ? 'selected' : ''}>${monthName}</option>`;
    }).join('');

  // বছর
  const sortedYears = Array.from(years).sort().reverse();
  yearSelect.innerHTML = '<option value="">-- বছর --</option>' +
    sortedYears.map(y => `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${toBn(y)}</option>`).join('');
}

// মূল রেন্ডার
function renderChart() {
  const day   = document.getElementById('chartDay').value;
  const month = document.getElementById('chartMonth').value;
  const year  = document.getElementById('chartYear').value;

  if (!month || !year) return;

  // ফিল্টার
  let filtered = entries.filter(e => {
    if (!e.date) return false;
    if (!e.date.startsWith(`${year}-${month}`)) return false;
    if (day && e.date.slice(8, 10) !== day) return false;
    return true;
  });

  // --- চার্ট ১: আয়ের সোর্স ---
  const incomeLabels = [];
  const incomeData = [];
  let totalIncome = 0;

  INCOME_FIELDS.forEach(f => {
    const sum = filtered.reduce((s, e) => s + (Number(e[f.key]) || 0), 0);
    incomeLabels.push(f.label);
    incomeData.push(Math.max(0, sum));  // ঋণাত্মক = 0
    totalIncome += sum;
  });

  // শেষে "মোট" যোগ করি
  incomeLabels.push('মোট');
  incomeData.push(Math.max(0, totalIncome));

  renderHorizontalBar('chartIncome', incomeLabels, incomeData, incomeLabels.length,
    ['#F59E0B', '#F59E0B', '#F59E0B', '#F59E0B', '#F59E0B', '#F59E0B', '#F59E0B', '#F59E0B', '#1E3A8A'],
    (inst) => { chartIncomeInstance = inst; },
    chartIncomeInstance
  );

  // --- চার্ট ২: খরচের সারাংশ ---
  const expenseLabels = [];
  const expenseData = [];
  let totalExpense = 0;

  EXPENSE_FIELDS.forEach(f => {
    const sum = filtered.reduce((s, e) => s + (Number(e[f.key]) || 0), 0);
    expenseLabels.push(f.label);
    expenseData.push(Math.max(0, sum));
    totalExpense += sum;
  });

  expenseLabels.push('মোট খরচ');
  expenseData.push(Math.max(0, totalExpense));

  renderHorizontalBar('chartExpense', expenseLabels, expenseData, expenseLabels.length,
    ['#DC2626', '#DC2626', '#DC2626', '#991B1B'],
    (inst) => { chartExpenseInstance = inst; },
    chartExpenseInstance
  );

  // --- চার্ট ৩: সারাংশ ---
  const summaryLabels = [];
  const summaryData = [];

  SUMMARY_FIELDS.forEach(f => {
    const sum = filtered.reduce((s, e) => s + (Number(e[f.key]) || 0), 0);
    summaryLabels.push(f.label);
    summaryData.push(Math.max(0, sum));
  });

  renderHorizontalBar('chartSummary', summaryLabels, summaryData, summaryLabels.length,
    ['#10B981', '#2563EB', '#F97316', '#EF4444'],
    (inst) => { chartSummaryInstance = inst; },
    chartSummaryInstance
  );
}

// হেল্পার: Horizontal Bar Chart
function renderHorizontalBar(canvasId, labels, data, barCount, colors, setInstance, prevInstance) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  // পুরোনো চার্ট ধ্বংস করি
  if (prevInstance) prevInstance.destroy();

  // "মোট" এর জন্য আলাদা রঙ (শেষেরটা)
  const finalColors = data.map((_, i) => {
    if (i === data.length - 1 && barCount > 2) return colors[colors.length - 1] || '#1E3A8A';
    return colors[Math.min(i, colors.length - 2)] || '#F59E0B';
  });

  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: finalColors,
        borderRadius: 4,
        barPercentage: 0.7,
        categoryPercentage: 0.8
      }]
    },
    options: {
      indexAxis: 'y',   // Horizontal Bar
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              const val = context.parsed.x;
              return '৳ ' + toBn(Math.round(val).toLocaleString('en-US'));
            }
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            callback: function(value) { return '৳' + toBn(value); },
            font: { family: 'Noto Sans Bengali', size: 10 }
          }
        },
        y: {
          ticks: {
            font: { family: 'Noto Sans Bengali', size: 11 }
          }
        }
      }
    }
  });

  setInstance(chart);
}

/* ============================================================
   🆕 Formula Modal (হিসাবের ফর্মুলা)
   ============================================================ */

function openFormulaModal() {
  const modal = document.getElementById('formulaModalOverlay');
  if (modal) modal.classList.add('open');
}

function closeFormulaModal() {
  const modal = document.getElementById('formulaModalOverlay');
  if (modal) modal.classList.remove('open');
}

/* ============================================================
   Event Listeners
   ============================================================ */

function attachEventListeners() {
  document.getElementById('fDate').addEventListener('change', updateDateBn);

  // 🆕 ইনপুট ফিল্ডগুলোতে রিয়েল-টাইম লিসেনার
  const inputIds = [
    'fBkashPersonal', 'fBadhon', 'fMerchant328', 'fBkashAgent',
    'fMerchant40', 'fNagadBkash', 'fCash', 'fPawna',
    'fExpense', 'fSavings', 'fGoodsBuy', 'fDebt'
  ];

  inputIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    // 🆕 শুধু সংখ্যা, +, -, *, /, %, ., (, ) গ্রহণ করি
    el.addEventListener('input', (e) => {
  const original = e.target.value;

  // 🆕 বাংলা সংখ্যা → ইংরেজিতে রূপান্তর
  const converted = bnToEn(original);

  // 🆕 শুধু অনুমোদিত ক্যারেক্টার রাখি
  const filtered = converted.replace(/[^0-9+\-*/%().\s]/g, '');

  if (filtered !== original) {
    e.target.value = filtered;
    if (converted !== original && filtered === converted) {
      // বাংলা সংখ্যা ছিল, সফলভাবে ইংরেজিতে রূপান্তর হয়েছে — টোস্ট দেখাব না
    } else {
      showToast('শুধু সংখ্যা এবং + - * / % ব্যবহার করুন', 'error');
    }
  }

  recalcAll();   // বা updateAmountHint()
});

    el.addEventListener('change', recalcAll);
    el.addEventListener('blur', () => {
      // blur-এ evaluateMathField (common.js) ঠিকমতো কাজ করার সুযোগ
      setTimeout(recalcAll, 10);
    });
  });
}

/* ============================================================
   Init
   ============================================================ */
loadData();
startNewEntry();
attachEventListeners();