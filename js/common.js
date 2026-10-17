/* ============================================================
   হিসাবের খাতা — Common JavaScript
   সব পেজে ব্যবহার হবে (Home, Bazar, Dokan)
   ============================================================ */

/* ============================================================
   ১. বাংলা হেল্পার
   ============================================================ */

const BN_DIGITS = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
const BN_MONTHS = ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];

/**
 * ইংরেজি সংখ্যাকে বাংলায় রূপান্তর
 * @param {string|number} str
 * @returns {string}
 */
function toBn(str) {
  return String(str).replace(/\d/g, d => BN_DIGITS[d]);
}

/**
 * টাকা ফরম্যাট — বাংলা সংখ্যা + কমা + ৳ চিহ্ন
 * @param {number} n
 * @returns {string}
 */
function formatTaka(n) {
  const num = Number(n) || 0;
  const fixed = num % 1 === 0 ? num.toString() : num.toFixed(2);
  const parts = fixed.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return '৳' + toBn(parts.join('.'));
}

/**
 * তারিখ ফরম্যাট — বাংলায় (যেমন ১৬/১০/২০২৬)
 * @param {string} isoDate — YYYY-MM-DD
 * @returns {string}
 */
function formatDateBn(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  return toBn(d) + '/' + toBn(m) + '/' + toBn(y);
}

/**
 * তারিখ ফরম্যাট — বাংলায় দীর্ঘ (যেমন ১৬ অক্টোবর ২০২৬)
 * @param {string} isoDate — YYYY-MM-DD
 * @returns {string}
 */
function formatDateLongBn(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  return toBn(parseInt(d)) + ' ' + BN_MONTHS[parseInt(m) - 1] + ' ' + toBn(y);
}

/**
 * মাসের নাম বাংলায় (মাস নম্বর ১-১২)
 * @param {number} m
 * @returns {string}
 */
function getBnMonth(m) {
  return BN_MONTHS[m - 1] || '';
}

/**
 * আজকের তারিখ ISO ফরম্যাটে (YYYY-MM-DD)
 * @returns {string}
 */
function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

/* ============================================================
   ২. HTML Safety
   ============================================================ */

/**
 * HTML-এ ইউজারের লেখা নিরাপদে বসানোর জন্য
 * @param {string} s
 * @returns {string}
 */
function escapeHtml(s) {
  if (!s) return '';
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

/**
 * JavaScript স্ট্রিং-এ ইউজারের লেখা নিরাপদে বসানোর জন্য
 * @param {string} s
 * @returns {string}
 */
function escapeAttr(s) {
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '&quot;')
    .replace(/\n/g, ' ');
}

/* ============================================================
   ৩. Storage Helpers
   ============================================================ */

/**
 * localStorage থেকে ডেটা লোড
 * @param {string} key
 * @param {*} fallback — ডেটা না থাকলে কী ফেরত দেবে
 * @returns {*}
 */
function loadFromStorage(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    return parsed === null ? fallback : parsed;
  } catch (e) {
    return fallback;
  }
}

/**
 * localStorage-এ ডেটা সেভ
 * @param {string} key
 * @param {*} value
 */
function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage save failed:', e);
    showToast('ডেটা সেভ করা যায়নি', 'error');
  }
}
  } catch (e) {
    console.error('Storage save failed:', e);
    showToast('ডেটা সেভ করা যায়নি', 'error');
  }
}

/**
 * একটা key মুছে ফেলুন
 */
function removeFromStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch (e) {}
}

/* ============================================================
   ৪. Toast Notification
   ============================================================ */



/* ============================================================
   ৫. Confirm Dialog Helper
   ============================================================ */

/**
 * নিশ্চিতকরণ ডায়ালগ (browser confirm wrapper)
 * @param {string} msg
 * @returns {boolean}
 */
function askConfirm(msg) {
  return confirm(msg);
}

/* ============================================================
   ৬. Navigation Helpers
   ============================================================ */

/**
 * অন্য পেজে যান
 * @param {string} page
 */
function navigateTo(page) {
  window.location.href = page;
}

/**
 * হোমে ফিরুন
 */
function goHomePage() {
  window.location.href = 'index.html';
}

let _toastTimer = null;

function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  if (!t) return;

  if (_toastTimer) {
    clearTimeout(_toastTimer);
    _toastTimer = null;
  }

  t.classList.remove('show');
  t.textContent = msg;
  t.className = 'toast' + (type ? ' ' + type : '');

  void t.offsetWidth; // ব্রাউজারকে আপডেট করতে বাধ্য করে

  t.classList.add('show');

  _toastTimer = setTimeout(() => {
    t.classList.remove('show');
    _toastTimer = null;
  }, 2200);
}
/* ============================================================
   ৭. Dropdown Panel Toggle (Filter / Sort)
   ============================================================ */

/**
 * একটা ড্রপডাউন প্যানেল খুলুন / বন্ধ করুন
 * @param {string} panelId
 * @param {string} btnId
 */
function toggleDropdownPanel(panelId, btnId) {
  const panel = document.getElementById(panelId);
  const btn = document.getElementById(btnId);
  if (!panel) return;
  const isOpen = panel.classList.contains('open');

  // সব প্যানেল বন্ধ
  document.querySelectorAll('.dropdown-panel').forEach(p => p.classList.remove('open'));
  document.querySelectorAll('.tool-btn').forEach(b => {
    if (b.id === 'filterBtn' || b.id === 'sortBtn') b.classList.remove('active');
  });

  // যদি বন্ধ ছিল, এখন খুলুন
  if (!isOpen) {
    panel.classList.add('open');
    if (btn) btn.classList.add('active');
  }
}

/* ============================================================
   ৮. Settings Menu (⋮)
   ============================================================ */

function openMenu() {
  const overlay = document.getElementById('menuOverlay');
  const panel = document.getElementById('menuPanel');
  if (overlay) overlay.classList.add('open');
  if (panel) panel.classList.add('open');
}

function closeMenu() {
  const overlay = document.getElementById('menuOverlay');
  const panel = document.getElementById('menuPanel');
  if (overlay) overlay.classList.remove('open');
  if (panel) panel.classList.remove('open');
}

// overlay-তে ক্লিক করলে মেনু বন্ধ
document.addEventListener('click', e => {
  if (e.target && e.target.id === 'menuOverlay') {
    closeMenu();
  }
});

/* ============================================================
   ৯. Backup / Restore
   ============================================================ */

/**
 * সব key-এর ডেটা নিয়ে একটা JSON ফাইল ডাউনলোড করবে
 */
function downloadBackup() {
  const backup = {
    app: 'হিসাবের খাতা',
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
  home_entries: loadFromStorage('hisaber_khata_home_v1', []),
  home_categories: loadFromStorage('hisaber_khata_categories_v1', []),
  shop_entries: loadFromStorage('hisaber_khata_shop_v1', []),
  shop_shops: loadFromStorage('hisaber_khata_shops_v1', []),
  goods_entries: loadFromStorage('hisaber_khata_goods_v1', [])
}
  };

  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const today = todayISO();
  a.download = 'hisaber-khata-backup-' + today + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('ব্যাকআপ ডাউনলোড হয়েছে', 'success');
}

/**
 * রিস্টোর করার জন্য ফাইল সিলেক্ট করা
 */
function triggerRestore() {
  if (!askConfirm('বর্তমান সব ডেটা মুছে যাবে এবং ব্যাকআপ থেকে নতুন ডেটা আসবে। নিশ্চিত?')) {
    return;
  }
  const input = document.getElementById('restoreFileInput');
  if (input) {
    input.value = '';
    input.click();
  }
}

/**
 * ব্যাকআপ ফাইল পড়ে ডেটা ফিরিয়ে আনা
 * @param {Event} event
 */
function handleRestoreFile(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const backup = JSON.parse(e.target.result);
      if (!backup || !backup.data) {
        showToast('ফাইলটি সঠিক নয়', 'error');
        return;
      }
      const d = backup.data;
if (Array.isArray(d.home_entries)) saveToStorage('hisaber_khata_home_v1', d.home_entries);
if (Array.isArray(d.home_categories)) saveToStorage('hisaber_khata_categories_v1', d.home_categories);
if (Array.isArray(d.shop_entries)) saveToStorage('hisaber_khata_shop_v1', d.shop_entries);
if (Array.isArray(d.shop_shops)) saveToStorage('hisaber_khata_shops_v1', d.shop_shops);
if (Array.isArray(d.goods_entries)) saveToStorage('hisaber_khata_goods_v1', d.goods_entries);

      showToast('সফলভাবে রিস্টোর হয়েছে', 'success');
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err) {
      showToast('ফাইল পড়া যায়নি', 'error');
    }
  };
  reader.readAsText(file);
}

/* ============================================================
   ১০. PWA Install
   ============================================================ */

let deferredInstallPrompt = null;
const INSTALL_PREFIX = 'hisaber_install_';
const INSTALL_DISMISSED = INSTALL_PREFIX + 'dismissed';
const INSTALL_LATER = INSTALL_PREFIX + 'later_until';
const INSTALL_NOTIFIED = INSTALL_PREFIX + 'notified';

/**
 * ইনস্টল প্রম্পট রেজিস্ট্রেশন
 */
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstallPrompt = e;
  // এখন থেকে হোম স্ক্রিনে 📲 আইকন দেখাব
  updateInstallButtons();
});

/**
 * ইনস্টল সফল হলে
 */
window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  saveToStorage(INSTALL_DISMISSED, true);
  updateInstallButtons();
  hideInstallBanner();
  showToast('অ্যাপ ইনস্টল হয়েছে', 'success');
});

/**
 * হোম স্ক্রিন / মেনুর ইনস্টল বাটনগুলো দেখাব কি না
 */
function updateInstallButtons() {
  // হোমে 📲 আইকন
  const iconBtn = document.getElementById('installIconBtn');
  if (iconBtn) {
    if (isStandalone() || localStorage.getItem(INSTALL_DISMISSED) === 'true') {
      iconBtn.classList.add('hidden');
    } else {
      iconBtn.classList.remove('hidden');
    }
  }
  // মেনুর ইনস্টল আইটেম
  const menuInstall = document.getElementById('menuInstall');
  if (menuInstall) {
    if (isStandalone()) {
      menuInstall.classList.add('hidden');
    } else {
      menuInstall.classList.remove('hidden');
    }
  }
}

/**
 * অ্যাপ ইনস্টল হয়ে চালু হয়েছে কি না (standalone মোডে)
 */
function isStandalone() {
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
  if (window.navigator.standalone === true) return true; // iOS Safari
  return false;
}

/**
 * ইনস্টল বাটনে ক্লিক করলে
 */
async function handleInstallClick() {
  if (isStandalone()) {
    showToast('অ্যাপটি ইতিমধ্যে ইনস্টল করা আছে', 'success');
    return;
  }

  // iOS — beforeinstallprompt নেই
  if (!deferredInstallPrompt) {
    showIOSInstallModal();
    return;
  }

  try {
    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      deferredInstallPrompt = null;
    } else {
      // ইউজার বাতিল করলে — পরে আবার দেখাতে পারব
      deferredInstallPrompt = null;
    }
  } catch (e) {
    showIOSInstallModal();
  }
}

/**
 * iOS-এর জন্য ইনস্টল মডাল
 */
function showIOSInstallModal() {
  const modal = document.getElementById('iosModalOverlay');
  if (modal) modal.classList.add('open');
}

function closeIOSInstallModal() {
  const modal = document.getElementById('iosModalOverlay');
  if (modal) modal.classList.remove('open');
}

/**
 * ইনস্টল ব্যানার দেখান (৩ মিনিট পর)
 */
function showInstallBanner() {
  if (isStandalone()) return;
  if (localStorage.getItem(INSTALL_DISMISSED) === 'true') return;

  // "পরে" চাপলে ৭ দিনের মধ্যে আবার দেখাবে না
  const laterUntil = parseInt(localStorage.getItem(INSTALL_LATER) || '0', 10);
  if (laterUntil && Date.now() < laterUntil) return;

  const banner = document.getElementById('installBanner');
  if (banner) banner.classList.add('show');
}

function hideInstallBanner() {
  const banner = document.getElementById('installBanner');
  if (banner) banner.classList.remove('show');
}

/**
 * ✕ চাপলে — আর কখনো ব্যানার আসবে না
 */
function dismissInstallBanner() {
  saveToStorage(INSTALL_DISMISSED, true);
  hideInstallBanner();
  updateInstallButtons();
}

/**
 * "পরে" চাপলে — ৭ দিন পর আবার দেখাবে
 */
function postponeInstallBanner() {
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  saveToStorage(INSTALL_LATER, Date.now() + sevenDays);
  hideInstallBanner();
}

/**
 * ৩ মিনিটের টাইমার — হোম স্ক্রিনে ঢোকার সময় চালু হবে
 */
function startInstallBannerTimer() {
  // আগে থেকেই notified থাকলে আর দেখাবে না
  if (localStorage.getItem(INSTALL_NOTIFIED) === 'true') return;
  if (isStandalone()) return;

  const THREE_MINUTES = 3 * 60 * 1000;
  setTimeout(() => {
    showInstallBanner();
    saveToStorage(INSTALL_NOTIFIED, true);
  }, THREE_MINUTES);
}


/* ============================================================
   ১২. Utility — double-tap zoom বন্ধ
   ============================================================ */
document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });

/* ============================================================
   ১৩. Init — Menu এবং Install buttons আপডেট
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  updateInstallButtons();
});