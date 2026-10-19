/* ============================================================
   হিসাবের খাতা — Common JavaScript
   ============================================================ */

const BN_DIGITS = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
const BN_MONTHS = ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];

function toBn(str) { return String(str).replace(/\d/g, d => BN_DIGITS[d]); }
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
function getBnMonth(m) { return BN_MONTHS[m - 1] || ''; }
function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}
function escapeHtml(s) {
  if (!s) return '';
  return String(s).replace(/[&<>"']/g, c => ({'&': '&amp;','<': '&lt;','>': '&gt;','"': '&quot;',"'": '&#39;'}[c]));
}
function escapeAttr(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\n/g, ' ');
}
function loadFromStorage(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    return parsed === null ? fallback : parsed;
  } catch (e) { return fallback; }
}
function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    
    // 🆕 অটো-সিঙ্ক বন্ধ করা হলো (শুধু ম্যানুয়ালি সিঙ্ক হবে)
    // ইউজার নিজে "সিঙ্ক" বাটনে ক্লিক করলে তবেই ক্লাউডে যাবে।
    
  } catch (e) {
    console.error('Storage save failed:', e);
    showToast('ডেটা সেভ করা যায়নি', 'error');
  }
}
let _toastTimer = null;
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  if (!t) return;
  if (_toastTimer) { clearTimeout(_toastTimer); _toastTimer = null; }
  t.classList.remove('show');
  t.textContent = msg;
  t.className = 'toast' + (type ? ' ' + type : '');
  void t.offsetWidth;
  t.classList.add('show');
  _toastTimer = setTimeout(() => { t.classList.remove('show'); _toastTimer = null; }, 2200);
}
function askConfirm(msg) { return confirm(msg); }
function navigateTo(page) { window.location.href = page; }
function goHomePage() { window.location.href = 'index.html'; }

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
  if (e.target && e.target.id === 'menuOverlay') closeMenu();
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
	  shop_sellers: loadFromStorage('hisaber_khata_sellers_v1', []),   // 🆕
      goods_entries: loadFromStorage('hisaber_khata_goods_v1', [])
    }
  };
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'hisaber-khata-backup-' + todayISO() + '.json';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('ব্যাকআপ ডাউনলোড হয়েছে', 'success');
}

function triggerRestore() {
  if (!askConfirm('বর্তমান সব ডেটা মুছে যাবে এবং ব্যাকআপ থেকে নতুন ডেটা আসবে। নিশ্চিত?')) return;
  const input = document.getElementById('restoreFileInput');
  if (input) { input.value = ''; input.click(); }
}

function handleRestoreFile(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const backup = JSON.parse(e.target.result);
      if (!backup || !backup.data) { showToast('ফাইলটি সঠিক নয়', 'error'); return; }
      const d = backup.data;
      if (Array.isArray(d.home_entries)) saveToStorage('hisaber_khata_home_v1', d.home_entries);
      if (Array.isArray(d.home_categories)) saveToStorage('hisaber_khata_categories_v1', d.home_categories);
      if (Array.isArray(d.shop_entries)) saveToStorage('hisaber_khata_shop_v1', d.shop_entries);
      if (Array.isArray(d.shop_shops)) saveToStorage('hisaber_khata_shops_v1', d.shop_shops);
       if (Array.isArray(d.shop_sellers)) saveToStorage('hisaber_khata_sellers_v1', d.shop_sellers);   // 🆕
	  if (Array.isArray(d.goods_entries)) saveToStorage('hisaber_khata_goods_v1', d.goods_entries);
      showToast('সফলভাবে রিস্টোর হয়েছে', 'success');
      setTimeout(() => { window.location.reload(); }, 1200);
    } catch (err) { showToast('ফাইল পড়া যায়নি', 'error'); }
  };
  reader.readAsText(file);
}

let deferredInstallPrompt = null;
const INSTALL_DISMISSED = 'hisaber_install_dismissed';
const INSTALL_LATER = 'hisaber_install_later';
const INSTALL_NOTIFIED = 'hisaber_install_notified';
function updateInstallButtons() {
  // এই ফাংশনটি প্রতিবার পেজ লোডে কল হয়।
  // ভবিষ্যতে ইনস্টল বাটনের UI আপডেট লাগলে এখানে কোড লিখব।
  // এখন শুধু খালি রাখছি যাতে undefined error না আসে।
}

function handleInstallClick() {
  if (deferredInstallPrompt) {
    // ব্রাউজারের আসল install prompt দেখাও
    deferredInstallPrompt.prompt();
    deferredInstallPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        showToast('ইনস্টল শুরু হয়েছে...', 'success');
      }
      deferredInstallPrompt = null;
    });
  } else {
    // ব্রাউজার সাপোর্ট না করলে বা আগেই ইনস্টল করা থাকলে
    // ম্যানুয়াল ইনস্টল গাইড দেখাও
    showIOSInstallModal();
  }
}

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); deferredInstallPrompt = e; updateInstallButtons();
});
window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null; saveToStorage(INSTALL_DISMISSED, true); updateInstallButtons(); hideInstallBanner(); showToast('অ্যাপ ইনস্টল হয়েছে', 'success');
});

function isStandalone() {
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
  if (window.navigator.standalone === true) return true;
  return false;
}

function showIOSInstallModal() { const modal = document.getElementById('iosModalOverlay'); if (modal) modal.classList.add('open'); }
function closeIOSInstallModal() { const modal = document.getElementById('iosModalOverlay'); if (modal) modal.classList.remove('open'); }
function showInstallBanner() {
  if (isStandalone()) return;
  if (localStorage.getItem(INSTALL_DISMISSED) === 'true') return;
  const laterUntil = parseInt(localStorage.getItem(INSTALL_LATER) || '0', 10);
  if (laterUntil && Date.now() < laterUntil) return;
  const banner = document.getElementById('installBanner');
  if (banner) banner.classList.add('show');
}
function hideInstallBanner() { const banner = document.getElementById('installBanner'); if (banner) banner.classList.remove('show'); }
function dismissInstallBanner() { saveToStorage(INSTALL_DISMISSED, true); hideInstallBanner(); updateInstallButtons(); }
function postponeInstallBanner() {
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  saveToStorage(INSTALL_LATER, Date.now() + sevenDays); hideInstallBanner();
}
function startInstallBannerTimer() {
  if (localStorage.getItem(INSTALL_NOTIFIED) === 'true') return;
  if (isStandalone()) return;
  const THREE_MINUTES = 3 * 60 * 1000;
  setTimeout(() => { showInstallBanner(); saveToStorage(INSTALL_NOTIFIED, true); }, THREE_MINUTES);
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => console.log('Service Worker Registered Successfully:', reg.scope))
      .catch((err) => console.error('Service Worker Registration Failed:', err));
  });
}
document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });
document.addEventListener('DOMContentLoaded', () => { updateInstallButtons(); });

/* ============================================================
   Export Bottom Sheet & PDF
   ============================================================ */

function openExportSheet() {
  const overlay = document.getElementById('exportOverlay');
  const sheet = document.getElementById('exportSheet');
  if (overlay && sheet) { overlay.classList.add('open'); sheet.classList.add('open'); }
}
function closeExportSheet() {
  const overlay = document.getElementById('exportOverlay');
  const sheet = document.getElementById('exportSheet');
  if (overlay && sheet) { overlay.classList.remove('open'); sheet.classList.remove('open'); }
}
function exportPDF() {
  closeExportSheet();
  
  // ব্রাউজারের ডিফল্ট হেডার (তারিখ, URL) বন্ধ করার ট্রিক
  const originalTitle = document.title;
  document.title = ""; 

  setTimeout(() => {
    window.print();
    
    setTimeout(() => {
      document.title = originalTitle;
    }, 500);
  }, 300);
}
/* ============================================================
   Theme Management (Light, Dark, AMOLED)
   ============================================================ */

function setTheme(theme) {
  // সব ক্লাস রিমুভ করা
  document.body.classList.remove('dark-mode', 'amoled-mode');
  
  // নতুন থিম অ্যাপ্লাই করা
  if (theme === 'dark') {
    document.body.classList.add('dark-mode');
  } else if (theme === 'amoled') {
    document.body.classList.add('amoled-mode');
  }
  
  // লোকাল স্টোরেজে সেভ করা
  localStorage.setItem('appTheme', theme);
  
  // মডাল বন্ধ করা
  closeThemeModal();
  
  // UI আপডেট (যদি দরকার হয়)
}

function openThemeModal() {
  const modal = document.getElementById('themeModalOverlay');
  if (!modal) return;
  
  modal.classList.add('open');
  
  // বর্তমান থিম হাইলাইট করা
  const current = localStorage.getItem('appTheme') || 'light';
  document.querySelectorAll('.theme-option').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.theme === current) {
      btn.classList.add('active');
    }
  });
  
  if (typeof closeMenu === 'function') closeMenu();
}

function closeThemeModal() {
  const modal = document.getElementById('themeModalOverlay');
  if (modal) modal.classList.remove('open');
}

// পেজ লোড হওয়ার সময় থিম চেক করা
document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('appTheme') || 'light';
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
  } else if (savedTheme === 'amoled') {
    document.body.classList.add('amoled-mode');
  }
});
/* ============================================================
   🆕 Math Calculator for Numeric Fields
   টাকার ঘরে +, -, *, /, % সাপোর্ট করে
   ============================================================ */

function evaluateMathField(inputElement) {
  let val = inputElement.value.trim();
  if (!val) return;

  // যদি শুধু সংখ্যা থাকে (কোনো অপারেটর নেই) — কিছু করব না
  if (!/[+\-*/%]/.test(val)) return;

  // সেফটি চেক: শুধু সংখ্যা, ডেসিমাল, স্পেস এবং + - * / % ( ) থাকতে পারবে
  if (!/^[0-9+\-*/%().\s]+$/.test(val)) {
    showToast('শুধু সংখ্যা এবং + - * / % ব্যবহার করুন', 'error');
    inputElement.value = '';
    inputElement.focus();
    return;
  }

  try {
    let expression = val.replace(/%/g, '/100');
    let result = eval(expression);

    if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
      let rounded = Math.round(result * 100) / 100;
      inputElement.value = rounded;

      // input/change ইভেন্ট ট্রিগার — যাতে hint আপডেট হয়
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      inputElement.dispatchEvent(new Event('change', { bubbles: true }));

      // সাকসেস ফিডব্যাক — বাটন সবুজ হয়ে যাবে
      const wrapper = inputElement.closest('.math-field-wrapper');
      if (wrapper) {
        const btn = wrapper.querySelector('.math-eq-btn');
        if (btn) {
          btn.classList.add('success');
          btn.textContent = '✓';
          setTimeout(() => {
            btn.classList.remove('success');
            btn.textContent = '=';
          }, 900);
        }
      }
    } else {
      showToast('হিসাবটি সঠিক নয়', 'error');
    }
  } catch (error) {
    showToast('হিসাবটি সঠিক নয়', 'error');
  }
}

// 🆕 পেজ লোডের সময় সব নাম্বার-টাইপ ফিল্ডে ইভেন্ট অ্যাটাচ করি
document.addEventListener('DOMContentLoaded', () => {
  const mathFieldIds = [
    'fAmount', 'fCash', 'fBkash',
    'fPrice', 'fDue', 'fReceived', 'fCost',
    'fPaid'
  ];

  // 🆕 হিন্ট দেখানোর কন্ডিশন
  const showMathHint = shouldShowMathHint();

  mathFieldIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    el.setAttribute('type', 'text');
    el.setAttribute('inputmode', 'decimal');
    el.setAttribute('autocomplete', 'off');

    // wrapper + "=" বাটন (সবসময় থাকবে)
    if (!el.parentElement.classList.contains('math-field-wrapper')) {
      const wrapper = document.createElement('div');
      wrapper.className = 'math-field-wrapper';
      el.parentNode.insertBefore(wrapper, el);
      wrapper.appendChild(el);

      const eqBtn = document.createElement('button');
      eqBtn.type = 'button';
      eqBtn.className = 'math-eq-btn';
      eqBtn.textContent = '=';
      eqBtn.setAttribute('title', 'হিসাব করুন');
      eqBtn.onclick = (e) => {
        e.preventDefault();
        evaluateMathField(el);
        el.focus();
      };
      wrapper.appendChild(eqBtn);
    }

    // 🆕 💡 হিন্ট — শুধু কন্ডিশন সত্য হলে
    if (showMathHint && !el.parentElement.parentElement.querySelector('.math-hint')) {
      const hint = document.createElement('div');
      hint.className = 'math-hint';
      hint.innerHTML = '💡 <b>250+30</b>, <b>100*5</b>, <b>10%</b> — Enter বা <b>=</b> চাপুন';
      el.parentElement.parentElement.appendChild(hint);
    }

        // ইভেন্ট লিসেনার
    if (!el.dataset.mathBound) {
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          evaluateMathField(el);
        }
      });
      el.addEventListener('blur', () => {
        // 🆕 setTimeout সরানো হয়েছে — সাথে সাথে evaluate হবে
        evaluateMathField(el);
      });
      el.dataset.mathBound = 'true';
    }
  });
});

/* ============================================================
   🆕 হিন্ট দেখানো/লুকানোর লজিক
   ============================================================ */

// ইউজার কতটি এন্ট্রি সেভ করেছে তা ট্র্যাক করি
function incrementEntryCount() {
  const count = parseInt(localStorage.getItem('math_hint_entry_count') || '0', 10) + 1;
  localStorage.setItem('math_hint_entry_count', count);
}

// হিন্ট দেখানো উচিত কি না
function shouldShowMathHint() {
  // ১. ইউজার ম্যানুয়ালি অফ করে দিয়েছে?
  const manualSetting = localStorage.getItem('math_hint_manual_setting');
  if (manualSetting === 'off') return false;
  if (manualSetting === 'on') return true;

  // ২. স্বয়ংক্রিয়: ২টি এন্ট্রি সেভ হয়ে গেলে বন্ধ
  const entryCount = parseInt(localStorage.getItem('math_hint_entry_count') || '0', 10);
  return entryCount < 2; // প্রথম ২টি এন্ট্রি পর্যন্ত দেখাবে
}

// সেটিংস টগল
function toggleMathHint() {
  const current = shouldShowMathHint();
  const newSetting = current ? 'off' : 'on';
  localStorage.setItem('math_hint_manual_setting', newSetting);
  showToast(newSetting === 'on' ? 'হিন্ট চালু হয়েছে' : 'হিন্ট বন্ধ হয়েছে', 'success');

  // সব hint সরাসরি আপডেট করি (রিলোড ছাড়াই)
  document.querySelectorAll('.math-hint').forEach(el => el.remove());
  if (newSetting === 'on') {
    // আবার যোগ করি
    const mathFieldIds = ['fAmount', 'fCash', 'fBkash', 'fPrice', 'fDue', 'fReceived', 'fCost', 'fPaid'];
    mathFieldIds.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const formGroup = el.closest('.form-group');
      if (formGroup && !formGroup.querySelector('.math-hint')) {
        const hint = document.createElement('div');
        hint.className = 'math-hint';
        hint.innerHTML = '💡 <b>250+30</b>, <b>100*5</b>, <b>10%</b> — Enter বা <b>=</b> চাপুন';
        formGroup.appendChild(hint);
      }
    });
  }

  // মেনুর আইকন আপডেট
  updateMathHintMenuUI();
}

// সেটিংস মেনুর টেক্সট আপডেট
function updateMathHintMenuUI() {
  const btn = document.getElementById('mathHintToggleBtn');
  if (!btn) return;
  const isOn = shouldShowMathHint();
  // নতুন সেটিংস প্যানেলের স্ট্রাকচার অনুযায়ী আপডেট
  btn.innerHTML = `
    <span class="si-icon">💡</span>
    <span class="si-text">হিসাবের হিন্ট ${isOn ? 'বন্ধ করুন' : 'চালু করুন'}</span>
    <span class="si-arrow">›</span>
  `;
}
/* ============================================================
   🆕 Settings Panel (সেটিংস প্যানেল)
   ============================================================ */

function openSettingsMenu() {
  const overlay = document.getElementById('settingsOverlay');
  const panel = document.getElementById('settingsPanel');
  if (overlay) overlay.classList.add('open');
  if (panel) panel.classList.add('open');
  
  // মেনুর টেক্সট আপডেট করি (হিন্ট অন/অফ অনুযায়ী)
  if (typeof updateMathHintMenuUI === 'function') updateMathHintMenuUI();
}

function closeSettingsMenu() {
  const overlay = document.getElementById('settingsOverlay');
  const panel = document.getElementById('settingsPanel');
  if (overlay) overlay.classList.remove('open');
  if (panel) panel.classList.remove('open');
}
// 🆕 হেডারের হিন্ট বাটনের অবস্থা আপডেট করা
function updateHeaderHintBtn() {
  const btn = document.getElementById('headerMathHintBtn');
  if (!btn) return;
  
  if (shouldShowMathHint()) {
    btn.style.opacity = '1';           // চালু থাকলে উজ্জ্বল দেখাবে
    btn.style.background = 'rgba(255,255,255,0.25)';
  } else {
    btn.style.opacity = '0.5';         // বন্ধ থাকলে হালকা দেখাবে
    btn.style.background = 'rgba(255,255,255,0.05)';
  }
}

// 🆕 পেজ লোড হওয়ার সময় হেডারের বাটনটির স্টেট সেট করি
document.addEventListener('DOMContentLoaded', () => {
  updateHeaderHintBtn();
});