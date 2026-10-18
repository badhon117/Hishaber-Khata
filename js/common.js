/* ============================================================
   হিসাবের খাতা — Common JavaScript
   ============================================================ */

const BN_DIGITS = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
const BN_MONTHS = ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];

function toBn(str) {
  return String(str).replace(/\d/g, d => BN_DIGITS[d]);
}

function formatTaka(n) {
  const num = Number(n) || 0;
  const fixed = num % 1 === 0 ? num.toString() : num.toFixed(2);
  const parts = fixed.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return '৳' + toBn(parts.join('.'));
}

function formatDateBn(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  return toBn(d) + '/' + toBn(m) + '/' + toBn(y);
}

function formatDateLongBn(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  return toBn(parseInt(d)) + ' ' + BN_MONTHS[parseInt(m) - 1] + ' ' + toBn(y);
}

function getBnMonth(m) {
  return BN_MONTHS[m - 1] || '';
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

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

function escapeAttr(s) {
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '&quot;')
    .replace(/\n/g, ' ');
}

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

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    if (typeof saveToDrive === 'function' && typeof accessToken !== 'undefined' && accessToken) {
      if (typeof isSyncingFromCloud !== 'undefined' && !isSyncingFromCloud) {
         saveToDrive();
      }
    }
  } catch (e) {
    console.error('Storage save failed:', e);
    showToast('ডেটা সেভ করা যায়নি', 'error');
  }
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

  void t.offsetWidth;

  t.classList.add('show');

  _toastTimer = setTimeout(() => {
    t.classList.remove('show');
    _toastTimer = null;
  }, 2200);
}

function askConfirm(msg) {
  return confirm(msg);
}

function navigateTo(page) {
  window.location.href = page;
}

function goHomePage() {
  window.location.href = 'index.html';
}

function toggleDropdownPanel(panelId, btnId) {
  const panel = document.getElementById(panelId);
  const btn = document.getElementById(btnId);
  if (!panel) return;
  const isOpen = panel.classList.contains('open');

  document.querySelectorAll('.dropdown-panel').forEach(p => p.classList.remove('open'));
  document.querySelectorAll('.tool-btn').forEach(b => {
    if (b.id === 'filterBtn' || b.id === 'sortBtn') b.classList.remove('active');
  });

  if (!isOpen) {
    panel.classList.add('open');
    if (btn) btn.classList.add('active');
  }
}

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

document.addEventListener('click', e => {
  if (e.target && e.target.id === 'menuOverlay') {
    closeMenu();
  }
});

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

let deferredInstallPrompt = null;
const INSTALL_DISMISSED = 'hisaber_install_dismissed';
const INSTALL_LATER = 'hisaber_install_later';
const INSTALL_NOTIFIED = 'hisaber_install_notified';

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstallPrompt = e;
  updateInstallButtons();
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  saveToStorage(INSTALL_DISMISSED, true);
  updateInstallButtons();
  hideInstallBanner();
  showToast('অ্যাপ ইনস্টল হয়েছে', 'success');
});

function updateInstallButtons() {
  const iconBtn = document.getElementById('installIconBtn');
  if (iconBtn) {
    if (isStandalone() || localStorage.getItem(INSTALL_DISMISSED) === 'true') {
      iconBtn.classList.add('hidden');
    } else {
      iconBtn.classList.remove('hidden');
    }
  }
  const menuInstall = document.getElementById('menuInstall');
  if (menuInstall) {
    if (isStandalone()) {
      menuInstall.classList.add('hidden');
    } else {
      menuInstall.classList.remove('hidden');
    }
  }
}

function isStandalone() {
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
  if (window.navigator.standalone === true) return true;
  return false;
}

async function handleInstallClick() {
  if (isStandalone()) {
    showToast('অ্যাপটি ইতিমধ্যে ইনস্টল করা আছে', 'success');
    return;
  }

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
      deferredInstallPrompt = null;
    }
  } catch (e) {
    showIOSInstallModal();
  }
}

function showIOSInstallModal() {
  const modal = document.getElementById('iosModalOverlay');
  if (modal) modal.classList.add('open');
}

function closeIOSInstallModal() {
  const modal = document.getElementById('iosModalOverlay');
  if (modal) modal.classList.remove('open');
}

function showInstallBanner() {
  if (isStandalone()) return;
  if (localStorage.getItem(INSTALL_DISMISSED) === 'true') return;

  const laterUntil = parseInt(localStorage.getItem(INSTALL_LATER) || '0', 10);
  if (laterUntil && Date.now() < laterUntil) return;

  const banner = document.getElementById('installBanner');
  if (banner) banner.classList.add('show');
}

function hideInstallBanner() {
  const banner = document.getElementById('installBanner');
  if (banner) banner.classList.remove('show');
}

function dismissInstallBanner() {
  saveToStorage(INSTALL_DISMISSED, true);
  hideInstallBanner();
  updateInstallButtons();
}

function postponeInstallBanner() {
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  saveToStorage(INSTALL_LATER, Date.now() + sevenDays);
  hideInstallBanner();
}

function startInstallBannerTimer() {
  if (localStorage.getItem(INSTALL_NOTIFIED) === 'true') return;
  if (isStandalone()) return;

  const THREE_MINUTES = 3 * 60 * 1000;
  setTimeout(() => {
    showInstallBanner();
    saveToStorage(INSTALL_NOTIFIED, true);
  }, THREE_MINUTES);
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => console.log('Service Worker Registered Successfully:', reg.scope))
      .catch((err) => console.error('Service Worker Registration Failed:', err));
  });
}

document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });

document.addEventListener('DOMContentLoaded', () => {
  updateInstallButtons();
});

/* ============================================================
   ১৪. Export Bottom Sheet & PDF/Word Logic
   ============================================================ */

// ১. এক্সপোর্ট মেনু (Bottom Sheet) খোলা ও বন্ধ করা
function openExportSheet() {
  const overlay = document.getElementById('exportOverlay');
  const sheet = document.getElementById('exportSheet');
  if (overlay && sheet) {
    overlay.classList.add('open');
    sheet.classList.add('open');
  }
}

function closeExportSheet() {
  const overlay = document.getElementById('exportOverlay');
  const sheet = document.getElementById('exportSheet');
  if (overlay && sheet) {
    overlay.classList.remove('open');
    sheet.classList.remove('open');
  }
}

// ২. PDF এক্সপোর্ট (ব্রাউজারের প্রিন্ট ব্যবহার করে)
function exportPDF() {
  closeExportSheet();
  // টেবিলটি সুন্দরভাবে প্রিন্ট হওয়ার জন্য একটু সময় দেওয়া হলো
  setTimeout(() => {
    window.print();
  }, 300);
}

// ৩. Word (.doc) এক্সপোর্ট
function exportWord(moduleName) {
  closeExportSheet();
  
  // বর্তমানে যে টেবিলটি স্ক্রিনে দেখা যাচ্ছে, সেটির HTML নেওয়া হচ্ছে
  const tableHTML = document.querySelector('.table-card').innerHTML;
  
  // যদি টেবিলে কোনো ডেটা না থাকে
  if (tableHTML.includes('empty-state')) {
    showToast('এক্সপোর্ট করার মতো কোনো ডেটা নেই', 'error');
    return;
  }

  const title = moduleName || 'হিসাবের খাতা';
  const dateStr = new Date().toLocaleDateString('bn-BD');

  // Word ফাইলের জন্য সুন্দর HTML স্ট্রাকচার তৈরি
  const htmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>${title}</title>
      <style>
        body { font-family: 'Arial', sans-serif; }
        h1 { text-align: center; color: #1E3A8A; }
        p.subtitle { text-align: center; color: #555; font-size: 14px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #333; padding: 8px; text-align: left; font-size: 13px; }
        th { background-color: #F1F5F9; color: #000; font-weight: bold; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #777; }
      </style>
    </head>
    <body>
      <h1>হিসাবের খাতা</h1>
      <p class="subtitle">${title} রিপোর্ট</p>
      ${tableHTML}
      <div class="footer">
        রিপোর্ট তৈরির তারিখ: ${dateStr} | হিসাবের খাতা অ্যাপ
      </div>
    </body>
    </html>
  `;

  // ফাইল ডাউনলোড করার লজিক
  const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title}_${new Date().toISOString().split('T')[0]}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showToast('Word ফাইল ডাউনলোড হয়েছে', 'success');
}