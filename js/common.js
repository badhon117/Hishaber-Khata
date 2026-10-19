/* ============================================================
   হিসাবের খাতা — Common JavaScript (Updated & Secured)
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

// 🔒 ফিক্স ৪: saveToStorage এখন সফল হলে true এবং ব্যর্থ হলে false রিটার্ন করবে[cite: 27, 28]
function saveToStorage(key, value) {
  try {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) {
      throw new Error('Data cannot be serialized');
    }
    localStorage.setItem(key, serialized);
    return true;
  } catch (e) {
    console.error('Storage save failed:', key, e);
    showToast('ডেটা সেভ করা যায়নি। স্টোরেজের জায়গা পরীক্ষা করুন।', 'error');
    return false;
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
	  shop_sellers: loadFromStorage('hisaber_khata_sellers_v1', []),
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

// 🔒 ফিক্স ১: নিরাপদ ব্যাকআপ রিস্টোর (কাঠামো ও সাইজ যাচাই এবং রোলব্যাক সুবিধা সহ)[cite: 17, 18, 20]
function handleRestoreFile(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const MAX_BACKUP_SIZE = 20 * 1024 * 1024; // ২০ MB লিমিট
  if (file.size > MAX_BACKUP_SIZE) {
    showToast('ব্যাকআপ ফাইলটি অনেক বড় (সর্বোচ্চ ২০ MB)', 'error');
    event.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const backup = JSON.parse(e.target.result);

      if (
        !backup ||
        backup.app !== 'হিসাবের খাতা' ||
        !backup.data ||
        typeof backup.data !== 'object' ||
        Array.isArray(backup.data)
      ) {
        throw new Error('INVALID_BACKUP');
      }

      const d = backup.data;
      const keys = [
        'home_entries',
        'home_categories',
        'shop_entries',
        'shop_shops',
        'shop_sellers',
        'goods_entries'
      ];

      const normalized = {};
      for (const key of keys) {
        if (d[key] === undefined) {
          normalized[key] = [];
        } else if (Array.isArray(d[key])) {
          normalized[key] = d[key];
        } else {
          throw new Error('INVALID_ARRAY: ' + key);
        }
      }

      const entryKeys = ['home_entries', 'shop_entries', 'goods_entries'];
      for (const key of entryKeys) {
        for (const entry of normalized[key]) {
          if (
            !entry ||
            typeof entry !== 'object' ||
            Array.isArray(entry) ||
            typeof entry.id !== 'string' ||
            !entry.id.trim()
          ) {
            throw new Error('INVALID_ENTRY: ' + key);
          }
        }
      }

      const storageMap = {
        home_entries: 'hisaber_khata_home_v1',
        home_categories: 'hisaber_khata_categories_v1',
        shop_entries: 'hisaber_khata_shop_v1',
        shop_shops: 'hisaber_khata_shops_v1',
        shop_sellers: 'hisaber_khata_sellers_v1',
        goods_entries: 'hisaber_khata_goods_v1'
      };

      // পরিবর্তনের আগে পুরোনো ডেটা সংরক্ষণ (Rollback snapshot)
      const previous = {};
      for (const key of keys) {
        previous[key] = localStorage.getItem(storageMap[key]);
      }

      try {
        for (const key of keys) {
          localStorage.setItem(storageMap[key], JSON.stringify(normalized[key]));
        }
      } catch (writeError) {
        // ফেইল করলে আগের ডেটা ফিরিয়ে আনা (Rollback)
        for (const key of keys) {
          try {
            if (previous[key] === null) {
              localStorage.removeItem(storageMap[key]);
            } else {
              localStorage.setItem(storageMap[key], previous[key]);
            }
          } catch (rollbackError) {
            console.error('Restore rollback failed:', key, rollbackError);
          }
        }
        throw new Error('STORAGE_WRITE_FAILED');
      }

      showToast('ব্যাকআপ সফলভাবে রিস্টোর হয়েছে', 'success');
      setTimeout(() => { window.location.reload(); }, 1200);

    } catch (err) {
      console.error('Backup restore failed:', err);
      showToast('ব্যাকআপ ফাইল ভুল বা করাপ্টed। বর্তমান ডেটা অক্ষত আছে।', 'error');
    } finally {
      event.target.value = '';
    }
  };

  reader.onerror = function () {
    showToast('ব্যাকআপ ফাইল পড়া যায়নি', 'error');
    event.target.value = '';
  };

  reader.readAsText(file);
}

let deferredInstallPrompt = null;
const INSTALL_DISMISSED = 'hisaber_install_dismissed';
const INSTALL_LATER = 'hisaber_install_later';
const INSTALL_NOTIFIED = 'hisaber_install_notified';
function updateInstallButtons() {}

function handleInstallClick() {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    deferredInstallPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        showToast('ইনস্টল শুরু হয়েছে...', 'success');
      }
      deferredInstallPrompt = null;
    });
  } else {
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
  const originalTitle = document.title;
  document.title = ""; 
  setTimeout(() => {
    window.print();
    setTimeout(() => { document.title = originalTitle; }, 500);
  }, 300);
}

/* ============================================================
   Theme Management (Light, Dark, AMOLED)
   ============================================================ */

function setTheme(theme) {
  document.body.classList.remove('dark-mode', 'amoled-mode');
  if (theme === 'dark') {
    document.body.classList.add('dark-mode');
  } else if (theme === 'amoled') {
    document.body.classList.add('amoled-mode');
  }
  localStorage.setItem('appTheme', theme);
  closeThemeModal();
}

function openThemeModal() {
  const modal = document.getElementById('themeModalOverlay');
  if (!modal) return;
  modal.classList.add('open');
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

document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('appTheme') || 'light';
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
  } else if (savedTheme === 'amoled') {
    document.body.classList.add('amoled-mode');
  }
});

/* ============================================================
   🔒 ফিক্স ২: নিরাপদ ম্যাথ পার্সার (eval() এর বিকল্প)[cite: 22]
   ============================================================ */

/* ============================================================
   🔒 নিরাপদ ম্যাথ পার্সার ও ক্যালকুলেটর (সম্পূর্ণ ঠিক করা কোড)
   ============================================================ */

function safeMathEvaluate(expression) {
  const input = String(expression).replace(/\s+/g, '');
  if (!input || input.length > 200) {
    throw new Error('Invalid expression');
  }
  if (!/^[0-9+\-*/%().\s]+$/.test(input)) {
    throw new Error('Invalid characters');
  }

  // 🚫 পরপর একাধিক প্লাস চিহ্ন (যেমন ++ বা ++++) থাকলে তা ভুল হিসেবে গণ্য হবে
  if (/\+{2,}/.test(input)) {
    throw new Error('Invalid consecutive plus operators');
  }

  let pos = 0;

  function parseExpression() {
    let value = parseTerm();
    while (pos < input.length) {
      const op = input[pos];
      if (op !== '+' && op !== '-') break;
      pos++;
      const right = parseTerm();
      value = op === '+' ? value + right : value - right;
    }
    return value;
  }

  function parseTerm() {
    let value = parseUnary();
    while (pos < input.length) {
      const op = input[pos];
      if (op !== '*' && op !== '/') break;
      pos++;
      const right = parseUnary();
      if (op === '/' && right === 0) {
        throw new Error('Division by zero');
      }
      value = op === '*' ? value * right : value / right;
    }
    return value;
  }

  function parseUnary() {
    if (input[pos] === '+') {
      pos++;
      return parseUnary();
    }
    if (input[pos] === '-') {
      pos++;
      return -parseUnary();
    }
    return parsePrimary();
  }

  function parsePrimary() {
    let value;
    if (input[pos] === '(') {
      pos++;
      value = parseExpression();
      if (input[pos] !== ')') {
        throw new Error('Missing closing parenthesis');
      }
      pos++;
    } else {
      const match = input.slice(pos).match(/^(?:\d+\.?\d*|\.\d+)/);
      if (!match) {
        throw new Error('Expected a number');
      }
      value = Number(match[0]);
      pos += match[0].length;
    }

    while (input[pos] === '%') {
      value /= 100;
      pos++;
    }

    if (!Number.isFinite(value)) {
      throw new Error('Invalid result');
    }
    return value;
  }

  const result = parseExpression();
  if (pos !== input.length || !Number.isFinite(result)) {
    throw new Error('Invalid expression');
  }
  return result;
}

function evaluateMathField(inputElement) {
  let val = inputElement.value.trim();
  if (!val) return true;

  // যদি শুধু সাধারণ সংখ্যা থাকে
  if (!/[+\-*/%]/.test(val)) {
    if (isNaN(Number(val))) {
      showToast('হিসাবটি সঠিক নয়', 'error');
      inputElement.value = ''; // ভুল হলে ফিল্ড খালি করে দেব
      return false;
    }
    return true;
  }

  try {
    let result = safeMathEvaluate(val);

    if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
      let rounded = Math.round((result + Number.EPSILON) * 100) / 100;
      inputElement.value = rounded;

      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      inputElement.dispatchEvent(new Event('change', { bubbles: true }));

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
      return true;
    } else {
      showToast('হিসাবটি সঠিক নয়', 'error');
      inputElement.value = ''; // ভুল হলে ফিল্ড খালি করে দেব
      return false;
    }
  } catch (error) {
    showToast('হিসাবটি সঠিক নয়', 'error');
    inputElement.value = ''; // ভুল হলে ফিল্ড খালি করে দেব
    return false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const mathFieldIds = [
    'fAmount', 'fCash', 'fBkash',
    'fPrice', 'fDue', 'fReceived', 'fCost',
    'fPaid'
  ];

  const showMathHint = shouldShowMathHint();

  mathFieldIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    el.setAttribute('type', 'text');
    el.setAttribute('inputmode', 'decimal');
    el.setAttribute('autocomplete', 'off');

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

    if (showMathHint && !el.parentElement.parentElement.querySelector('.math-hint')) {
      const hint = document.createElement('div');
      hint.className = 'math-hint';
      hint.innerHTML = '💡 <b>250+30</b>, <b>100*5</b>, <b>10%</b> — Enter বা <b>=</b> চাপুন';
      el.parentElement.parentElement.appendChild(hint);
    }

    if (!el.dataset.mathBound) {
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          evaluateMathField(el);
        }
      });
      el.addEventListener('blur', () => {
        evaluateMathField(el);
      });
      el.dataset.mathBound = 'true';
    }
  });
});

function incrementEntryCount() {
  const count = parseInt(localStorage.getItem('math_hint_entry_count') || '0', 10) + 1;
  localStorage.setItem('math_hint_entry_count', count);
}

function shouldShowMathHint() {
  const manualSetting = localStorage.getItem('math_hint_manual_setting');
  if (manualSetting === 'off') return false;
  if (manualSetting === 'on') return true;

  const entryCount = parseInt(localStorage.getItem('math_hint_entry_count') || '0', 10);
  return entryCount < 2;
}

function toggleMathHint() {
  const current = shouldShowMathHint();
  const newSetting = current ? 'off' : 'on';
  localStorage.setItem('math_hint_manual_setting', newSetting);
  showToast(newSetting === 'on' ? 'হিন্ট চালু হয়েছে' : 'হিন্ট বন্ধ হয়েছে', 'success');

  document.querySelectorAll('.math-hint').forEach(el => el.remove());
  if (newSetting === 'on') {
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
  updateMathHintMenuUI();
}

function updateMathHintMenuUI() {
  const btn = document.getElementById('mathHintToggleBtn');
  if (!btn) return;
  const isOn = shouldShowMathHint();
  btn.innerHTML = `
    <span class="si-icon">💡</span>
    <span class="si-text">হিসাবের হিন্ট ${isOn ? 'বন্ধ করুন' : 'চালু করুন'}</span>
    <span class="si-arrow">›</span>
  `;
}

function openSettingsMenu() {
  const overlay = document.getElementById('settingsOverlay');
  const panel = document.getElementById('settingsPanel');
  if (overlay) overlay.classList.add('open');
  if (panel) panel.classList.add('open');
  if (typeof updateMathHintMenuUI === 'function') updateMathHintMenuUI();
}

function closeSettingsMenu() {
  const overlay = document.getElementById('settingsOverlay');
  const panel = document.getElementById('settingsPanel');
  if (overlay) overlay.classList.remove('open');
  if (panel) panel.classList.remove('open');
}

function updateHeaderHintBtn() {
  const btn = document.getElementById('headerMathHintBtn');
  if (!btn) return;
  if (shouldShowMathHint()) {
    btn.style.opacity = '1';
    btn.style.background = 'rgba(255,255,255,0.25)';
  } else {
    btn.style.opacity = '0.5';
    btn.style.background = 'rgba(255,255,255,0.05)';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  updateHeaderHintBtn();
});