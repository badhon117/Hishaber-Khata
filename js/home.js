/* ============================================================
   হিসাবের খাতা — Home (বাসার হিসাব) Module
   সব লজিক এখানে
   ============================================================ */

/* ---------- Storage Keys ---------- */
const STORAGE_KEY = 'hisaber_khata_home_v1';
const CAT_KEY = 'hisaber_khata_categories_v1';
const DEFAULT_CATS = ['বাজার', 'বিল', 'চিকিৎসা', 'যাতায়াত'];

/* ---------- State ---------- */
let entries = [];
let categories = [];
let currentCategory = '';
let isSelectMode = false;
let selectedIds = new Set();
let catManageMode = false;

/* ============================================================
   Storage Load / Save
   ============================================================ */
function loadData() {
  entries = loadFromStorage(STORAGE_KEY, []);
  if (!Array.isArray(entries)) entries = [];

  categories = loadFromStorage(CAT_KEY, null);
  if (!Array.isArray(categories) || categories.length === 0) {
    categories = DEFAULT_CATS.slice();
  }
}

function saveData() {
  saveToStorage(STORAGE_KEY, entries);
}

function saveCats() {
  saveToStorage(CAT_KEY, categories);
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
    refreshCategoryDropdowns();
    renderTable();
  }
}

/* ============================================================
   Category Picker
   ============================================================ */
function toggleCatPanel(e) {
  if (e) e.stopPropagation();
  const panel = document.getElementById('catPanel');
  const trigger = document.getElementById('catTrigger');
  if (panel.classList.contains('open')) {
    closeCatPanel();
  } else {
    panel.classList.add('open');
    trigger.classList.add('open');
    document.getElementById('catSearch').value = '';
    renderCatList();
    setTimeout(() => document.getElementById('catSearch').focus(), 100);
  }
}

function closeCatPanel() {
  const panel = document.getElementById('catPanel');
  const trigger = document.getElementById('catTrigger');
  const addForm = document.getElementById('catAddForm');
  const addBtn = document.getElementById('catAddBtn');
  if (panel) panel.classList.remove('open');
  if (trigger) trigger.classList.remove('open');
  if (addForm) addForm.classList.remove('open');
  if (addBtn) addBtn.style.display = 'flex';
  catManageMode = false;
}

// 바깥에 클릭하면 বন্ধ
document.addEventListener('click', e => {
  const picker = document.querySelector('.cat-picker');
  if (picker && !picker.contains(e.target)) closeCatPanel();
});

function renderCatList() {
  const q = (document.getElementById('catSearch').value || '').toLowerCase().trim();
  const list = document.getElementById('catList');
  const filtered = categories.filter(c => !q || c.toLowerCase().includes(q));

  let html = '';
  if (catManageMode) {
    html += `<button type="button" class="manage-toggle" onclick="toggleManageMode()">✓ ম্যানেজ মোড বন্ধ করুন</button>`;
  } else {
    html += `<button type="button" class="manage-toggle" onclick="toggleManageMode()">⚙ এডিট/ডিলিট করুন</button>`;
  }

  if (filtered.length === 0) {
    html += `<div style="padding:16px;text-align:center;color:#94A3B8;font-size:13px;">কোনো খাত পাওয়া যায়নি</div>`;
  } else {
    html += filtered.map(c => {
      const sel = (c === currentCategory) ? ' selected' : '';
      const manage = catManageMode ? ' manage-mode' : '';
      const safeC = escapeAttr(c);
      return `
        <div class="cat-item${sel}${manage}" data-cat="${escapeHtml(c)}" onclick="selectCat(event, '${safeC}')">
          <span class="cat-item-text">${escapeHtml(c)}</span>
          <span class="cat-item-actions">
            <button type="button" onclick="startEditCat(event, '${safeC}')">এডিট</button>
            <button type="button" class="del" onclick="deleteCat(event, '${safeC}')">ডিলিট</button>
          </span>
        </div>
      `;
    }).join('');
  }
  list.innerHTML = html;
}

function toggleManageMode() {
  catManageMode = !catManageMode;
  renderCatList();
}

function selectCat(e, cat) {
  if (e) e.stopPropagation();
  currentCategory = cat;
  document.getElementById('catTriggerText').textContent = cat;
  document.getElementById('catTrigger').classList.remove('placeholder');
  closeCatPanel();
}

function startEditCat(e, cat) {
  e.stopPropagation();
  const item = e.target.closest('.cat-item');
  const oldText = item.querySelector('.cat-item-text');
  const actions = item.querySelector('.cat-item-actions');
  oldText.style.display = 'none';
  actions.style.display = 'none';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'cat-edit-input';
  input.value = cat;
  item.insertBefore(input, oldText.nextSibling);
  input.focus();
  input.select();

  const finish = (save) => {
    if (save) {
      const newName = input.value.trim();
      if (newName && newName !== cat) {
        if (categories.includes(newName)) {
          showToast('এই খাত ইতিমধ্যে আছে', 'error');
        } else {
          const idx = categories.indexOf(cat);
          if (idx >= 0) categories[idx] = newName;
          entries.forEach(en => { if (en.category === cat) en.category = newName; });
          if (currentCategory === cat) {
            currentCategory = newName;
            document.getElementById('catTriggerText').textContent = newName;
          }
          saveCats();
          saveData();
          showToast('খাত আপডেট হয়েছে', 'success');
        }
      }
    }
    renderCatList();
  };

  input.onblur = () => finish(true);
  input.onkeydown = (ev) => {
    if (ev.key === 'Enter') { ev.preventDefault(); input.blur(); }
    if (ev.key === 'Escape') { ev.preventDefault(); input.onblur = null; finish(false); }
  };
}

function deleteCat(e, cat) {
  e.stopPropagation();
  const used = entries.filter(en => en.category === cat).length;
  let msg = `"${cat}" খাতটি ডিলিট করবেন?`;
  if (used > 0) msg += `\n\n${toBn(used)}টি এন্ট্রিতে এই খাত ব্যবহৃত আছে।`;
  if (!askConfirm(msg)) return;

  categories = categories.filter(c => c !== cat);
  saveCats();
  if (currentCategory === cat) {
    currentCategory = '';
    document.getElementById('catTriggerText').textContent = '-- নির্বাচন করুন --';
    document.getElementById('catTrigger').classList.add('placeholder');
  }
  refreshCategoryDropdowns();
  renderCatList();
  showToast('খাত ডিলিট হয়েছে', 'success');
}

function showAddCatForm(e) {
  if (e) e.stopPropagation();
  document.getElementById('catAddBtn').style.display = 'none';
  document.getElementById('catAddForm').classList.add('open');
  const inp = document.getElementById('catNewInput');
  inp.value = '';
  setTimeout(() => inp.focus(), 100);
}

function hideAddCatForm(e) {
  if (e) e.stopPropagation();
  document.getElementById('catAddForm').classList.remove('open');
  document.getElementById('catAddBtn').style.display = 'flex';
}

function addNewCat() {
  const inp = document.getElementById('catNewInput');
  const name = inp.value.trim();
  if (!name) { showToast('খাতের নাম লিখুন', 'error'); return; }
  if (categories.includes(name)) { showToast('এই খাত ইতিমধ্যে আছে', 'error'); return; }

  categories.push(name);
  saveCats();
  currentCategory = name;
  document.getElementById('catTriggerText').textContent = name;
  document.getElementById('catTrigger').classList.remove('placeholder');
  document.getElementById('catAddForm').classList.remove('open');
  document.getElementById('catAddBtn').style.display = 'flex';
  refreshCategoryDropdowns();
  closeCatPanel();
  showToast('নতুন খাত যোগ হয়েছে', 'success');
}

function refreshCategoryDropdowns() {
  const sel = document.getElementById('filterCategory');
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">সব খাত</option>' +
    categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  if (categories.includes(current)) sel.value = current;
}

/* ============================================================
   Form Logic
   ============================================================ */
function startNewEntry() {
  document.getElementById('editId').value = '';
  document.getElementById('fDate').value = todayISO();
  currentCategory = '';
  document.getElementById('catTriggerText').textContent = '-- নির্বাচন করুন --';
  document.getElementById('catTrigger').classList.add('placeholder');
  document.getElementById('fDescription').value = '';
  document.getElementById('fAmount').value = '';
  document.getElementById('fCash').value = '';
  document.getElementById('fBkash').value = '';
  document.getElementById('fNote').value = '';
  document.getElementById('formTitle').textContent = 'নতুন খরচ যোগ করুন';
  document.getElementById('editBadge').style.display = 'none';
  document.getElementById('deleteBtn').style.display = 'none';
  updateDateBn();
  updateAmountHint();
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
  currentCategory = e.category;
  document.getElementById('catTriggerText').textContent = e.category || '-- নির্বাচন করুন --';
  if (e.category) document.getElementById('catTrigger').classList.remove('placeholder');
  else document.getElementById('catTrigger').classList.add('placeholder');
  document.getElementById('fDescription').value = e.description || '';
  document.getElementById('fAmount').value = e.amount;
  document.getElementById('fCash').value = e.cash || '';
  document.getElementById('fBkash').value = e.bkash || '';
  document.getElementById('fNote').value = e.note || '';
  document.getElementById('formTitle').textContent = 'খরচ এডিট করুন';
  document.getElementById('editBadge').style.display = 'inline-block';
  document.getElementById('deleteBtn').style.display = 'block';
  updateDateBn();
  updateAmountHint();
  switchTab('form');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateDateBn() {
  const v = document.getElementById('fDate').value;
  const el = document.getElementById('dateBn');
  if (v) el.textContent = '📅 ' + formatDateLongBn(v);
  else el.textContent = '';
}

function updateAmountHint() {
  const amt = parseFloat(document.getElementById('fAmount').value) || 0;
  const cash = parseFloat(document.getElementById('fCash').value) || 0;
  const bkash = parseFloat(document.getElementById('fBkash').value) || 0;
  const sum = cash + bkash;
  const hint = document.getElementById('amountHint');

  if (amt <= 0) {
    hint.textContent = '';
    hint.className = 'amount-hint';
    return;
  }

  if (Math.abs(sum - amt) < 0.001) {
    hint.textContent = '✓ ক্যাশ + বিকাশ = ' + formatTaka(amt);
    hint.className = 'amount-hint ok';
  } else {
    hint.textContent = '⚠ ক্যাশ + বিকাশ = ' + formatTaka(sum) + ' (পরিমাণ ' + formatTaka(amt) + ')';
    hint.className = 'amount-hint error';
  }
}

/* ---------- Save / Delete ---------- */
function saveEntry() {
  const id = document.getElementById('editId').value;
  const date = document.getElementById('fDate').value;
  const category = currentCategory;
  const description = document.getElementById('fDescription').value.trim();
  const amount = parseFloat(document.getElementById('fAmount').value);
  const cash = parseFloat(document.getElementById('fCash').value) || 0;
  const bkash = parseFloat(document.getElementById('fBkash').value) || 0;
  const note = document.getElementById('fNote').value.trim();

  if (!date) { showToast('তারিখ দিন', 'error'); return; }
  if (!category) { showToast('খাতের ধরন নির্বাচন করুন', 'error'); return; }
  if (!amount || amount <= 0) { showToast('সঠিক পরিমাণ দিন', 'error'); return; }

  if (Math.abs((cash + bkash) - amount) > 0.001) {
    showToast('ক্যাশ + বিকাশ = পরিমাণ হতে হবে', 'error');
    return;
  }

  if (id) {
    const idx = entries.findIndex(x => x.id === id);
    if (idx >= 0) {
      entries[idx] = { ...entries[idx], date, category, description, amount, cash, bkash, note };
      showToast('আপডেট হয়েছে', 'success');
    }
  } else {
    entries.push({
      id: 'e_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      date, category, description, amount, cash, bkash, note,
      createdAt: Date.now()
    });
    showToast('সেভ হয়েছে', 'success');
  }
  saveData();
  startNewEntry();
  renderMonthOptions();
}

function deleteCurrent() {
  const id = document.getElementById('editId').value;
  if (!id) return;
  if (!askConfirm('এই এন্ট্রিটি ডিলিট করবেন?')) return;
  entries = entries.filter(x => x.id !== id);
  saveData();
  startNewEntry();
  renderMonthOptions();
  showToast('ডিলিট হয়েছে', 'success');
}

/* ============================================================
   Filter / Sort
   ============================================================ */
function getFiltered() {
  const search = document.getElementById('searchBox').value.toLowerCase().trim();
  const month = document.getElementById('filterMonth').value;
  const fcat = document.getElementById('filterCategory').value;
  const sortBy = document.getElementById('sortBy').value;

  let list = entries.slice();
  if (month) list = list.filter(e => e.date.startsWith(month));
  if (fcat) list = list.filter(e => e.category === fcat);
  if (search) {
    list = list.filter(e =>
      (e.description || '').toLowerCase().includes(search) ||
      (e.note || '').toLowerCase().includes(search) ||
      (e.category || '').toLowerCase().includes(search)
    );
  }

  const [field, dir] = sortBy.split('-');
  list.sort((a, b) => {
    let cmp = 0;
    if (field === 'date') cmp = (a.date || '').localeCompare(b.date || '');
    else if (field === 'amount') cmp = (a.amount || 0) - (b.amount || 0);
    else if (field === 'category') cmp = (a.category || '').localeCompare(b.category || '');
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
    const rowClick = isSelectMode
      ? `toggleRowSelect('${e.id}', !selectedIds.has('${e.id}'))`
      : `editEntry('${e.id}')`;
    return `
      <tr onclick="${rowClick}">
        ${cbCell}
        <td>${formatDateBn(e.date)}</td>
        <td>${escapeHtml(e.category)}</td>
        <td class="desc-cell">${escapeHtml(e.description) || '—'}</td>
        <td class="amount-cell">${formatTaka(e.amount)}</td>
        <td class="cash-cell">${formatTaka(e.cash)}</td>
        <td class="bkash-cell">${formatTaka(e.bkash)}</td>
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

function deleteSelected() {
  if (selectedIds.size === 0) {
    showToast('কিছু নির্বাচন করুন', 'error');
    return;
  }
  if (!askConfirm(toBn(selectedIds.size) + 'টি এন্ট্রি ডিলিট করবেন?')) return;
  entries = entries.filter(e => !selectedIds.has(e.id));
  saveData();
  exitSelectMode();
  renderMonthOptions();
  renderTable();
  showToast('ডিলিট হয়েছে', 'success');
}

/* ============================================================
   Summary Bar
   ============================================================ */
function updateSummary(list) {
  let displayList = list;
  let label = 'মোট';

  if (isSelectMode && selectedIds.size > 0) {
    displayList = list.filter(e => selectedIds.has(e.id));
    label = 'নির্বাচিত';
  }

  const total = displayList.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const count = displayList.length;

  const sumTotalEl = document.getElementById('sumTotal');
  const sumCountEl = document.getElementById('sumCount');
  if (sumTotalEl) sumTotalEl.textContent = formatTaka(total);
  if (sumCountEl) sumCountEl.textContent = toBn(count);

  // নতুন গ্রিডের লেবেল আপডেট
  const labelTotalEl = document.getElementById('labelTotal');
  const labelCountEl = document.getElementById('labelCount');
  if (labelTotalEl) labelTotalEl.textContent = label + ' খরচ';
  if (labelCountEl) labelCountEl.textContent = label + ' এন্ট্রি';
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

  const rows = [['তারিখ', 'খাতের ধরন', 'বিবরণ', 'পরিমাণ', 'ক্যাশ', 'বিকাশ', 'মন্তব্য']];
  list.forEach(e => {
    rows.push([e.date, e.category, e.description || '', e.amount, e.cash, e.bkash, e.note || '']);
  });

  const csv = '\uFEFF' + rows.map(r =>
    r.map(c => `"${String(c == null ? '' : c).replace(/"/g, '""')}"`).join(',')
  ).join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'basar_hisab_' + todayISO() + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('CSV ডাউনলোড হয়েছে', 'success');
}

/* ============================================================
   Event Listeners
   ============================================================ */
function attachEventListeners() {
  document.getElementById('fDate').addEventListener('change', updateDateBn);
  document.getElementById('fAmount').addEventListener('input', updateAmountHint);
  document.getElementById('fCash').addEventListener('input', updateAmountHint);
  document.getElementById('fBkash').addEventListener('input', updateAmountHint);
}

/* ============================================================
   Init
   ============================================================ */
loadData();
startNewEntry();
attachEventListeners();