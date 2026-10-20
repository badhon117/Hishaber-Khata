/* ============================================================
   হিসাবের খাতা — Shop (দোকানের হিসাব) Module (Fixed & Secured)
   ============================================================ */

/* ---------- Storage Keys ---------- */
const STORAGE_KEY = 'hisaber_khata_shop_v1';
const SHOP_KEY = 'hisaber_khata_shops_v1';
const SELLER_KEY = 'hisaber_khata_sellers_v1';   // 🆕
const DEFAULT_SHOPS = ['জারা ফ্যাশন', 'জারা স্পোর্টস'];

/* ---------- State ---------- */
let entries = [];
let shops = [];
let sellers = [];                                // 🆕
let currentShop = '';
let currentSeller = '';                          // 🆕
let isSelectMode = false;
let selectedIds = new Set();
let shopManageMode = false;
let sellerManageMode = false;                    // 🆕

/* ============================================================
   Storage Load / Save
   ============================================================ */
function loadData() {
  entries = loadFromStorage(STORAGE_KEY, []);
  if (!Array.isArray(entries)) entries = [];

  shops = loadFromStorage(SHOP_KEY, null);
  if (!Array.isArray(shops) || shops.length === 0) {
    shops = DEFAULT_SHOPS.slice();
    saveShops();
  }

  // 🆕 বিক্রেতা — সম্পূর্ণ খালি থেকে শুরু
  sellers = loadFromStorage(SELLER_KEY, []);
  if (!Array.isArray(sellers)) sellers = [];
}

function saveData() {
  const success = saveToStorage(STORAGE_KEY, entries);
  if (!success) {
    throw new Error('STORAGE_WRITE_FAILED');
  }
}

function saveShops() {
  const success = saveToStorage(SHOP_KEY, shops);
  if (!success) {
    throw new Error('STORAGE_WRITE_FAILED');
  }
}

function saveSellers() {                          // 🆕
  const success = saveToStorage(SELLER_KEY, sellers);
  if (!success) {
    throw new Error('STORAGE_WRITE_FAILED');
  }
}

/**
 * ডিফল্ট দোকান কি না
 */
function isDefaultShop(name) {
  return DEFAULT_SHOPS.includes(name);
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
    refreshShopDropdowns();
	refreshSellerDropdowns();      // 🆕
    renderTable();
  }
}

/* ============================================================
   Shop Picker
   ============================================================ */
function toggleShopPanel(e) {
  if (e) e.stopPropagation();
  closeSellerPanel(); // বিক্রেতার প্যানেল খোলা থাকলে বন্ধ করে দেব
  const panel = document.getElementById('shopPanel');
  const trigger = document.getElementById('shopTrigger');
  if (panel.classList.contains('open')) {
    closeShopPanel();
  } else {
    panel.classList.add('open');
    trigger.classList.add('open');
    document.getElementById('shopSearch').value = '';
    renderShopList();
    setTimeout(() => document.getElementById('shopSearch').focus(), 100);
  }
}

function closeShopPanel() {
  const panel = document.getElementById('shopPanel');
  const trigger = document.getElementById('shopTrigger');
  const addForm = document.getElementById('shopAddForm');
  const addBtn = document.getElementById('shopAddBtn');
  if (panel) panel.classList.remove('open');
  if (trigger) trigger.classList.remove('open');
  if (addForm) addForm.classList.remove('open');
  if (addBtn) addBtn.style.display = 'flex';
  shopManageMode = false;
}

document.addEventListener('click', e => {
  const picker = document.querySelector('.shop-picker');
  if (picker && !picker.contains(e.target)) closeShopPanel();
});

function renderShopList() {
  const q = (document.getElementById('shopSearch').value || '').toLowerCase().trim();
  const list = document.getElementById('shopList');
  const filtered = shops.filter(s => !q || s.toLowerCase().includes(q));

  let html = '';
  if (shopManageMode) {
    html += `<button type="button" class="shop-manage-toggle" onclick="toggleManageMode()">✓ ম্যানেজ মোড বন্ধ করুন</button>`;
  } else {
    html += `<button type="button" class="shop-manage-toggle" onclick="toggleManageMode()">⚙ এডিট/ডিলিট করুন</button>`;
  }

  if (filtered.length === 0) {
    html += `<div style="padding:16px;text-align:center;color:#94A3B8;font-size:13px;">কোনো দোকান পাওয়া যায়নি</div>`;
  } else {
    html += filtered.map(s => {
      const sel = (s === currentShop) ? ' selected' : '';
      const manage = shopManageMode ? ' manage-mode' : '';
      const safeS = escapeAttr(s);
      const isDefault = isDefaultShop(s);
      const actionsHtml = isDefault ? '' : `
        <span class="shop-item-actions">
          <button type="button" onclick="startEditShop(event, '${safeS}')">এডিট</button>
          <button type="button" class="del" onclick="deleteShop(event, '${safeS}')">ডিলিট</button>
        </span>
      `;
      return `
        <div class="shop-item${sel}${manage}" data-shop="${escapeHtml(s)}" onclick="selectShop(event, '${safeS}')">
          <span class="shop-item-text">${escapeHtml(s)}</span>
          ${actionsHtml}
        </div>
      `;
    }).join('');
  }
  list.innerHTML = html;
}

function toggleManageMode() {
  shopManageMode = !shopManageMode;
  renderShopList();
}

function selectShop(e, shop) {
  if (e) e.stopPropagation();
  currentShop = shop;
  document.getElementById('shopTriggerText').textContent = shop;
  document.getElementById('shopTrigger').classList.remove('placeholder');
  closeShopPanel();
}

function startEditShop(e, shop) {
  e.stopPropagation();
  if (isDefaultShop(shop)) {
    showToast('ডিফল্ট দোকান এডিট করা যাবে না', 'error');
    return;
  }

  const item = e.target.closest('.shop-item');
  const oldText = item.querySelector('.shop-item-text');
  const actions = item.querySelector('.shop-item-actions');
  oldText.style.display = 'none';
  if (actions) actions.style.display = 'none';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'shop-edit-input';
  input.value = shop;
  item.insertBefore(input, oldText.nextSibling);
  input.focus();
  input.select();

  const finish = (save) => {
    if (save) {
      const newName = input.value.trim();
      if (newName && newName !== shop) {
        if (shops.some(s => s.toLowerCase() === newName.toLowerCase())) {
          showToast('এই দোকান ইতিমধ্যে আছে', 'error');
        } else {
          const idx = shops.indexOf(shop);
          if (idx >= 0) shops[idx] = newName;
          entries.forEach(en => { if (en.shop === shop) en.shop = newName; });
          if (currentShop === shop) {
            currentShop = newName;
            document.getElementById('shopTriggerText').textContent = newName;
          }
          saveShops();
          saveData();
          refreshShopDropdowns();
          showToast('দোকান আপডেট হয়েছে', 'success');
        }
      }
    }
    renderShopList();
  };

  input.onblur = () => finish(true);
  input.onkeydown = (ev) => {
    if (ev.key === 'Enter') { ev.preventDefault(); input.blur(); }
    if (ev.key === 'Escape') { ev.preventDefault(); input.onblur = null; finish(false); }
  };
}

function deleteShop(e, shop) {
  e.stopPropagation();
  if (isDefaultShop(shop)) {
    showToast('ডিফল্ট দোকান ডিলিট করা যাবে না', 'error');
    return;
  }

  const used = entries.filter(en => en.shop === shop).length;
  let msg = `"${shop}" দোকানটি ডিলিট করবেন?`;
  if (used > 0) msg += `\n\n${toBn(used)}টি এন্ট্রিতে এই দোকান ব্যবহৃত আছে।`;
  if (!askConfirm(msg)) return;

  shops = shops.filter(s => s !== shop);
  saveShops();
  if (currentShop === shop) {
    currentShop = '';
    document.getElementById('shopTriggerText').textContent = '-- নির্বাচন করুন --';
    document.getElementById('shopTrigger').classList.add('placeholder');
  }
  refreshShopDropdowns();
  renderShopList();
  showToast('দোকান ডিলিট হয়েছে', 'success');
}

function showAddShopForm(e) {
  if (e) e.stopPropagation();
  document.getElementById('shopAddBtn').style.display = 'none';
  document.getElementById('shopAddForm').classList.add('open');
  const inp = document.getElementById('shopNewInput');
  inp.value = '';
  setTimeout(() => inp.focus(), 100);
}

function hideAddShopForm(e) {
  if (e) e.stopPropagation();
  document.getElementById('shopAddForm').classList.remove('open');
  document.getElementById('shopAddBtn').style.display = 'flex';
}

function addNewShop() {
  const inp = document.getElementById('shopNewInput');
  const name = inp.value.trim();
  
  if (!name) { 
    showToast('দোকানের নাম লিখুন', 'error'); 
    return; 
  }
  
  // একই নাম আগে থেকে আছে কি না কেস-ইনসেন্সিটিভ চেক
  if (shops.some(s => s.toLowerCase() === name.toLowerCase())) { 
    showToast('এই দোকান ইতিমধ্যে আছে', 'error'); 
    return; 
  }

  shops.push(name);
  saveShops();
  
  currentShop = name;
  document.getElementById('shopTriggerText').textContent = name;
  document.getElementById('shopTrigger').classList.remove('placeholder');
  
  document.getElementById('shopAddForm').classList.remove('open');
  document.getElementById('shopAddBtn').style.display = 'flex';
  
  refreshShopDropdowns();
  renderShopList();
  closeShopPanel();
  showToast('নতুন দোকান যোগ হয়েছে', 'success');
}

function refreshShopDropdowns() {
  const sel = document.getElementById('filterShop');
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">সব দোকান</option>' +
    shops.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
  if (shops.includes(current)) sel.value = current;
}

/* ============================================================
   🆕 Seller Picker
   ============================================================ */
function toggleSellerPanel(e) {
  if (e) e.stopPropagation();
  closeShopPanel(); // দোকানের প্যানেল খোলা থাকলে বন্ধ করে দেব
  const panel = document.getElementById('sellerPanel');
  const trigger = document.getElementById('sellerTrigger');
  if (panel.classList.contains('open')) {
    closeSellerPanel();
  } else {
    panel.classList.add('open');
    trigger.classList.add('open');
    document.getElementById('sellerSearch').value = '';
    renderSellerList();
    setTimeout(() => document.getElementById('sellerSearch').focus(), 100);
  }
}

function closeSellerPanel() {
  const panel = document.getElementById('sellerPanel');
  const trigger = document.getElementById('sellerTrigger');
  const addForm = document.getElementById('sellerAddForm');
  const addBtn = document.getElementById('sellerAddBtn');
  if (panel) panel.classList.remove('open');
  if (trigger) trigger.classList.remove('open');
  if (addForm) addForm.classList.remove('open');
  if (addBtn) addBtn.style.display = 'flex';
  sellerManageMode = false;
}

document.addEventListener('click', e => {
  const picker = document.querySelector('.seller-picker');
  if (picker && !picker.contains(e.target)) closeSellerPanel();
});

function renderSellerList() {
  const q = (document.getElementById('sellerSearch').value || '').toLowerCase().trim();
  const list = document.getElementById('sellerList');
  const filtered = sellers.filter(s => !q || s.toLowerCase().includes(q));

  let html = '';
  if (sellerManageMode) {
    html += `<button type="button" class="seller-manage-toggle" onclick="toggleSellerManageMode()">✓ ম্যানেজ মোড বন্ধ করুন</button>`;
  } else {
    html += `<button type="button" class="seller-manage-toggle" onclick="toggleSellerManageMode()">⚙ এডিট/ডিলিট করুন</button>`;
  }

  if (filtered.length === 0) {
    html += `<div style="padding:16px;text-align:center;color:#94A3B8;font-size:13px;">কোনো বিক্রেতা পাওয়া যায়নি</div>`;
  } else {
    html += filtered.map(s => {
      const sel = (s === currentSeller) ? ' selected' : '';
      const manage = sellerManageMode ? ' manage-mode' : '';
      const safeS = escapeAttr(s);
      return `
        <div class="seller-item${sel}${manage}" data-seller="${escapeHtml(s)}" onclick="selectSeller(event, '${safeS}')">
          <span class="seller-item-text">${escapeHtml(s)}</span>
          <span class="seller-item-actions">
            <button type="button" onclick="startEditSeller(event, '${safeS}')">এডিট</button>
            <button type="button" class="del" onclick="deleteSeller(event, '${safeS}')">ডিলিট</button>
          </span>
        </div>
      `;
    }).join('');
  }
  list.innerHTML = html;
}

function toggleSellerManageMode() {
  sellerManageMode = !sellerManageMode;
  renderSellerList();
}

function selectSeller(e, seller) {
  if (e) e.stopPropagation();
  currentSeller = seller;
  document.getElementById('sellerTriggerText').textContent = seller;
  document.getElementById('sellerTrigger').classList.remove('placeholder');
  closeSellerPanel();
}

function startEditSeller(e, seller) {
  e.stopPropagation();
  const item = e.target.closest('.seller-item');
  const oldText = item.querySelector('.seller-item-text');
  const actions = item.querySelector('.seller-item-actions');
  oldText.style.display = 'none';
  if (actions) actions.style.display = 'none';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'seller-edit-input';
  input.value = seller;
  item.insertBefore(input, oldText.nextSibling);
  input.focus();
  input.select();

  const finish = (save) => {
    if (save) {
      const newName = input.value.trim();
      if (newName && newName !== seller) {
        if (sellers.some(s => s.toLowerCase() === newName.toLowerCase())) {
          showToast('এই বিক্রেতা ইতিমধ্যে আছে', 'error');
        } else {
          const idx = sellers.indexOf(seller);
          if (idx >= 0) sellers[idx] = newName;
          entries.forEach(en => { if (en.seller === seller) en.seller = newName; });
          if (currentSeller === seller) {
            currentSeller = newName;
            document.getElementById('sellerTriggerText').textContent = newName;
          }
          saveSellers();
          saveData();
          refreshSellerDropdowns();
          showToast('বিক্রেতা আপডেট হয়েছে', 'success');
        }
      }
    }
    renderSellerList();
  };

  input.onblur = () => finish(true);
  input.onkeydown = (ev) => {
    if (ev.key === 'Enter') { ev.preventDefault(); input.blur(); }
    if (ev.key === 'Escape') { ev.preventDefault(); input.onblur = null; finish(false); }
  };
}

function deleteSeller(e, seller) {
  e.stopPropagation();
  const used = entries.filter(en => en.seller === seller).length;
  let msg = `"${seller}" বিক্রেতাটি ডিলিট করবেন?`;
  if (used > 0) msg += `\n\n${toBn(used)}টি এন্ট্রিতে এই বিক্রেতা ব্যবহৃত আছে।`;
  if (!askConfirm(msg)) return;

  sellers = sellers.filter(s => s !== seller);
  saveSellers();
  if (currentSeller === seller) {
    currentSeller = '';
    document.getElementById('sellerTriggerText').textContent = '-- নির্বাচন করুন --';
    document.getElementById('sellerTrigger').classList.add('placeholder');
  }
  refreshSellerDropdowns();
  renderSellerList();
  showToast('বিক্রেতা ডিলিট হয়েছে', 'success');
}

function showAddSellerForm(e) {
  if (e) e.stopPropagation();
  document.getElementById('sellerAddBtn').style.display = 'none';
  document.getElementById('sellerAddForm').classList.add('open');
  const inp = document.getElementById('sellerNewInput');
  inp.value = '';
  setTimeout(() => inp.focus(), 100);
}

function hideAddSellerForm(e) {
  if (e) e.stopPropagation();
  document.getElementById('sellerAddForm').classList.remove('open');
  document.getElementById('sellerAddBtn').style.display = 'flex';
}

function addNewSeller() {
  const inp = document.getElementById('sellerNewInput');
  const name = inp.value.trim();
  if (!name) { showToast('বিক্রেতার নাম লিখুন', 'error'); return; }
  if (sellers.some(s => s.toLowerCase() === name.toLowerCase())) { showToast('এই বিক্রেতা ইতিমধ্যে আছে', 'error'); return; }

  sellers.push(name);
  saveSellers();
  currentSeller = name;
  document.getElementById('sellerTriggerText').textContent = name;
  document.getElementById('sellerTrigger').classList.remove('placeholder');
  document.getElementById('sellerAddForm').classList.remove('open');
  document.getElementById('sellerAddBtn').style.display = 'flex';
  refreshSellerDropdowns();
  closeSellerPanel();
  showToast('নতুন বিক্রেতা যোগ হয়েছে', 'success');
}

function refreshSellerDropdowns() {
  const sel = document.getElementById('filterSeller');
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">সব বিক্রেতা</option>' +
    sellers.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
  if (sellers.includes(current)) sel.value = current;
}

/* ============================================================
   Form Logic
   ============================================================ */
function startNewEntry() {
  document.getElementById('editId').value = '';
  document.getElementById('fDate').value = todayISO();
  currentShop = '';
  document.getElementById('shopTriggerText').textContent = '-- নির্বাচন করুন --';
  document.getElementById('shopTrigger').classList.add('placeholder');
  currentSeller = '';
  document.getElementById('sellerTriggerText').textContent = '-- নির্বাচন করুন --';
  document.getElementById('sellerTrigger').classList.add('placeholder');
  document.getElementById('fCustomer').value = '';
  document.getElementById('fDescription').value = '';
  document.getElementById('fPrice').value = '';
  document.getElementById('fCash').value = '';
  document.getElementById('fDue').value = '';
  document.getElementById('fReceived').value = '';
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
  currentShop = e.shop;
  document.getElementById('shopTriggerText').textContent = e.shop || '-- নির্বাচন করুন --';
  if (e.shop) document.getElementById('shopTrigger').classList.remove('placeholder');
  else document.getElementById('shopTrigger').classList.add('placeholder');
  
  currentSeller = e.seller || '';
  document.getElementById('sellerTriggerText').textContent = e.seller || '-- নির্বাচন করুন --';
  if (e.seller) document.getElementById('sellerTrigger').classList.remove('placeholder');
  else document.getElementById('sellerTrigger').classList.add('placeholder');
  
  document.getElementById('fCustomer').value = e.customer || '';
  document.getElementById('fDescription').value = e.description || '';
  document.getElementById('fPrice').value = e.price || '';
  document.getElementById('fCash').value = e.cash || '';
  document.getElementById('fDue').value = e.due || '';
  document.getElementById('fReceived').value = e.received || '';
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
function evaluateAllMathFields() {
  const ids = ['fAmount', 'fCash', 'fBkash', 'fPrice', 'fDue', 'fReceived', 'fCost', 'fPaid'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el && typeof evaluateMathField === 'function') {
      evaluateMathField(el);
    }
  });
}

function saveEntry() {
  // 🆕 প্রথমে সব ম্যাথ ফিল্ড evaluate করি — invalid হলে সেখানেই থামি
  const mathIds = ['fPrice', 'fCash', 'fDue', 'fReceived', 'fCost'];
  for (const id of mathIds) {
    const el = document.getElementById(id);
    if (el && typeof evaluateMathField === 'function') {
      const isValid = evaluateMathField(el);
      if (!isValid) {
        el.focus();
        return;   // 🛑 invalid হলে save হবে না
      }
    }
  }

  const id = document.getElementById('editId').value;
  const date = document.getElementById('fDate').value;
  const shop = currentShop;
  const seller = currentSeller;
  const customer = document.getElementById('fCustomer').value.trim();
  const description = document.getElementById('fDescription').value.trim();
  const price = parseFloat(document.getElementById('fPrice').value) || 0;
  const cash = parseFloat(document.getElementById('fCash').value) || 0;
  const due = parseFloat(document.getElementById('fDue').value) || 0;
  const received = parseFloat(document.getElementById('fReceived').value) || 0;
  const cost = parseFloat(document.getElementById('fCost').value) || 0;
  const note = document.getElementById('fNote').value.trim();

  if (!date) { showToast('তারিখ দিন', 'error'); return; }
  if (!shop) { showToast('দোকানের নাম নির্বাচন করুন', 'error'); return; }

  try {
    if (id) {
      const idx = entries.findIndex(x => x.id === id);
      if (idx >= 0) {
        entries[idx] = { ...entries[idx], date, shop, seller, customer, description, price, cash, due, received, cost, note };
        saveData();
        showToast('আপডেট হয়েছে', 'success');
      }
    } else {
      entries.push({
        id: 's_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        date, shop, seller, customer, description, price, cash, due, received, cost, note,
        createdAt: Date.now()
      });
      saveData();
      showToast('সেভ হয়েছে', 'success');
      incrementEntryCount();
    }
    startNewEntry();
    renderMonthOptions();
  } catch (err) {
    console.error('Save entry failed:', err);
    showToast('ডেটা সেভ করা যায়নি। স্টোরেজ পূর্ণ থাকতে পারে।', 'error');
  }
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
  const fshop = document.getElementById('filterShop').value;
  const fseller = document.getElementById('filterSeller') ? document.getElementById('filterSeller').value : '';
  const fcustomer = document.getElementById('filterCustomer').value.toLowerCase().trim();
  const onlyDup = document.getElementById('filterDuplicate').checked;
  const sortBy = document.getElementById('sortBy').value;

  let list = entries.slice();

  if (month) list = list.filter(e => e.date.startsWith(month));
  if (fshop) list = list.filter(e => e.shop === fshop);
  if (fseller) list = list.filter(e => e.seller === fseller);
  if (fcustomer) list = list.filter(e => (e.customer || '').toLowerCase().includes(fcustomer));

  if (search) {
    list = list.filter(e =>
      (e.customer || '').toLowerCase().includes(search) ||
      (e.description || '').toLowerCase().includes(search) ||
      (e.note || '').toLowerCase().includes(search) ||
      (e.shop || '').toLowerCase().includes(search)
    );
  }

  if (onlyDup) {
    const counts = {};
    entries.forEach(e => {
      const c = (e.customer || '').trim();
      if (c) counts[c.toLowerCase()] = (counts[c.toLowerCase()] || 0) + 1;
    });
    list = list.filter(e => {
      const c = (e.customer || '').trim().toLowerCase();
      return c && counts[c] > 1;
    });
  }

  const [field, dir] = sortBy.split('-');
  list.sort((a, b) => {
    let cmp = 0;
    if (field === 'date') cmp = (a.date || '').localeCompare(b.date || '');
    else if (field === 'price') cmp = (a.price || 0) - (b.price || 0);
    else if (field === 'due') cmp = (a.due || 0) - (b.due || 0);
    else if (field === 'customer') cmp = (a.customer || '').localeCompare(b.customer || '');
    else if (field === 'seller') cmp = (a.seller || '').localeCompare(b.seller || '');
    else if (field === 'shop') cmp = (a.shop || '').localeCompare(b.shop || '');
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
    const sellerText = e.seller ? escapeHtml(e.seller) : '—';
    const customerText = e.customer ? escapeHtml(e.customer) : '—';
    const descText = e.description ? escapeHtml(e.description) : '—';
    const rowClick = isSelectMode
      ? `toggleRowSelect('${e.id}', !selectedIds.has('${e.id}'))`
      : `editEntry('${e.id}')`;
    return `
      <tr onclick="${rowClick}">
        ${cbCell}
        <td>${formatDateBn(e.date)}</td>
        <td class="shop-name-cell">${escapeHtml(e.shop)}</td>
        <td class="seller-cell">${sellerText}</td>
        <td class="customer-cell">${customerText}</td>
        <td class="desc-cell">${descText}</td>
        <td class="amount-cell">${formatTaka(e.price)}</td>
        <td class="cash-cell">${formatTaka(e.cash)}</td>
        <td class="due-cell">${formatTaka(e.due)}</td>
        <td class="paid-cell">${formatTaka(e.received)}</td>
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
   Summary Grid (২x২)
   ============================================================ */
function updateSummary(list) {
  let displayList = list;
  let label = 'মোট';

  if (isSelectMode && selectedIds.size > 0) {
    displayList = list.filter(e => selectedIds.has(e.id));
    label = 'নির্বাচিত';
  }

  const sales = displayList.reduce((s, e) => s + (Number(e.price) || 0), 0);
  const due = displayList.reduce((s, e) => s + (Number(e.due) || 0), 0);
  const received = displayList.reduce((s, e) => s + (Number(e.received) || 0), 0);
  const cost = displayList.reduce((s, e) => s + (Number(e.cost) || 0), 0);

  const elSales = document.getElementById('sumSales');
  const elDue = document.getElementById('sumDue');
  const elRec = document.getElementById('sumReceived');
  const elCost = document.getElementById('sumCost');
  if (elSales) elSales.textContent = formatTaka(sales);
  if (elDue) elDue.textContent = formatTaka(due);
  if (elRec) elRec.textContent = formatTaka(received);
  if (elCost) elCost.textContent = formatTaka(cost);

  const lSales = document.getElementById('labelSales');
  const lDue = document.getElementById('labelDue');
  const lRec = document.getElementById('labelReceived');
  const lCost = document.getElementById('labelCost');
  if (lSales) lSales.textContent = label + ' বিক্রয়';
  if (lDue) lDue.textContent = label + ' বাকি';
  if (lRec) lRec.textContent = label + ' বাকি প্রাপ্ত';
  if (lCost) lCost.textContent = label + ' খরচ';
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

  const rows = [['তারিখ', 'দোকান', 'বিক্রয়কারী', 'ক্রয়কারী', 'বিবরণ', 'মূল্য', 'নগদ', 'বাকি', 'বাকি প্রাপ্ত', 'খরচ', 'মন্তব্য']];
  list.forEach(e => {
    rows.push([
      formatDateBn(e.date), e.shop || '', e.seller || '', e.customer || '', e.description || '',
      e.price || 0, e.cash || 0, e.due || 0, e.received || 0, e.cost || 0, e.note || ''
    ]);
  });

  const csv = '\uFEFF' + rows.map(r =>
    r.map(c => `"${String(c == null ? '' : c).replace(/"/g, '""')}"`).join(',')
  ).join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'dokaner_hisab_' + todayISO() + '.csv';
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
}

/* ============================================================
   Chart Logic (Shop)
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
  const shopSelect = document.getElementById('chartShop');
  
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

  if (shopSelect) {
    const currentShopValue = shopSelect.value;
    const shopSet = new Set();
    entries.forEach(e => {
      if (e.shop) shopSet.add(e.shop);
    });
    const sortedShops = Array.from(shopSet).sort();
    shopSelect.innerHTML = '<option value="">-- সব দোকান (তুলনা) --</option>' +
      sortedShops.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
    if (sortedShops.includes(currentShopValue)) shopSelect.value = currentShopValue;
  }
}

function renderChart() {
  const month = document.getElementById('chartMonth').value;
  const year = document.getElementById('chartYear').value;
  const selectedShop = document.getElementById('chartShop') ? document.getElementById('chartShop').value : '';
  
  if (!month || !year) return;

  const filtered = entries.filter(e => e.date.startsWith(`${year}-${month}`));
  
  if (chartInstance) {
    chartInstance.destroy();
  }

  const ctx = document.getElementById('myChart').getContext('2d');

  if (selectedShop) {
    const shopEntries = filtered.filter(e => e.shop === selectedShop);
    
    const totalSales = shopEntries.reduce((s, e) => s + (Number(e.price) || 0), 0);
    const totalDue = shopEntries.reduce((s, e) => s + (Number(e.due) || 0), 0);
    const totalReceived = shopEntries.reduce((s, e) => s + (Number(e.received) || 0), 0);
    const totalCost = shopEntries.reduce((s, e) => s + (Number(e.cost) || 0), 0);

    if (shopEntries.length === 0) {
      chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['এই মাসে কোনো ডেটা নেই'],
          datasets: [{ data: [0], backgroundColor: '#CBD5E1' }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
      });
      return;
    }

    chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['মোট বিক্রয়', 'মোট বাকি', 'মোট বাকি প্রাপ্ত', 'মোট খরচ'],
        datasets: [{
          label: selectedShop,
          data: [totalSales, totalDue, totalReceived, totalCost],
          backgroundColor: ['#3B82F6', '#F97316', '#10B981', '#DC2626'],
          borderRadius: 6,
          barPercentage: 0.6,
          categoryPercentage: 0.7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: selectedShop + ' — ' + getBnMonth(parseInt(month)) + ' ' + toBn(year),
            font: { family: 'Noto Sans Bengali', size: 13, weight: 'bold' },
            color: '#047857',
            padding: { bottom: 10 }
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
            ticks: { font: { family: 'Noto Sans Bengali', size: 11 } } 
          }
        }
      }
    });
    return;
  }

  const shopData = {};
  filtered.forEach(e => {
    const shop = e.shop || 'অন্যান্য';
    if (!shopData[shop]) {
      shopData[shop] = { sales: 0, due: 0, received: 0, cost: 0 };
    }
    shopData[shop].sales += (Number(e.price) || 0);
    shopData[shop].due += (Number(e.due) || 0);
    shopData[shop].received += (Number(e.received) || 0);
    shopData[shop].cost += (Number(e.cost) || 0);
  });

  const labels = Object.keys(shopData);
  
  const salesData = labels.map(s => shopData[s].sales);
  const dueData = labels.map(s => shopData[s].due);
  const receivedData = labels.map(s => shopData[s].received);
  const costData = labels.map(s => shopData[s].cost);

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
          label: 'মোট বিক্রয়',
          data: salesData,
          backgroundColor: '#3B82F6',
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
          label: 'মোট বাকি প্রাপ্ত',
          data: receivedData,
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
   Init
   ============================================================ */
loadData();
startNewEntry();
attachEventListeners();