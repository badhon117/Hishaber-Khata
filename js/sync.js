/* ============================================================
   Google Drive Sync Logic with Refresh Token (Secured & Updated)
   ============================================================ */

const CLIENT_ID = '555637526676-tje8vroaiqqjqje34uhaecf9vf7hfn6g.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';

let tokenClient;
let accessToken = null;
let isSyncingFromCloud = false;

window.addEventListener('load', () => {
  // 🆕 FIX #14: Google লোড হওয়ার আগেই টোকেন চেক (UI ঠিক করার জন্য)
  checkExistingToken();

  let googleLoadAttempts = 0;
  const MAX_ATTEMPTS = 20;

  const initGoogle = () => {
    if (typeof google === 'undefined' || !google.accounts) {
      googleLoadAttempts++;
      if (googleLoadAttempts >= MAX_ATTEMPTS) {
        console.warn('Google Drive স্ক্রিপ্ট লোড হয়নি। ইন্টারনেট চেক করুন।');
        return; 
      }
      setTimeout(initGoogle, 500);
      return;
    }
    
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (tokenResponse) => {
        if (tokenResponse && tokenResponse.access_token) {
          accessToken = tokenResponse.access_token;
          localStorage.setItem('gdrive_access_token', accessToken);
          localStorage.removeItem('use_without_sync');
          if (tokenResponse.expires_in) {
            const expiryTime = Date.now() + (tokenResponse.expires_in * 1000);
            localStorage.setItem('gdrive_token_expiry', expiryTime);
          }
          updateLoginUI(true);
          
          if (typeof onLoginSuccess === 'function') {
            onLoginSuccess();
          } else {
            syncFromDrive(true);
          }
        }
      },
    });
  };
  
  initGoogle();
});

function checkExistingToken() {
  const savedToken = localStorage.getItem('gdrive_access_token');
  const expiry = localStorage.getItem('gdrive_token_expiry');
  if (savedToken && expiry) {
    if (Date.now() < (parseInt(expiry) - 300000)) {
      accessToken = savedToken;
      updateLoginUI(true);
      // 🆕 FIX #14: Google লোড না হলেও sync চালানোর চেষ্টা
      if (typeof google !== 'undefined' && google.accounts) {
        syncFromDrive(false);
      } else {
        // Google স্ক্রিপ্ট পরে লোড হলে sync হবে, এখন শুধু UI আপডেট
        setTimeout(() => {
          if (typeof google !== 'undefined' && google.accounts) {
            syncFromDrive(false);
          }
        }, 3000);
      }
    } else {
      localStorage.removeItem('gdrive_access_token');
      localStorage.removeItem('gdrive_token_expiry');
      updateLoginUI(false);
    }
  }
}

function handleGoogleLogin() {
  if (tokenClient) {
    tokenClient.requestAccessToken({ prompt: 'select_account' });
  } else {
    showToast('ইন্টারনেট কানেকশন নেই বা গুগল লোড হয়নি। পেজ রিফ্রেশ করুন।', 'error');
  }
}

function changeGoogleAccount() {
  if (tokenClient) {
    tokenClient.requestAccessToken({ prompt: 'select_account' });
  } else {
    showToast('ইন্টারনেট কানেকশন নেই', 'error');
  }
}

function updateLoginUI(isLoggedIn) {
  const btnText = document.getElementById('loginBtnText');
  const btn = document.getElementById('loginBtn');
  const switchBtn = document.getElementById('switchAccountBtn'); 
  
  if (btnText && btn) {
    if (isLoggedIn) {
      btnText.textContent = 'গুগল ড্রাইভে সিঙ্কড ✅';
      btn.style.background = '#ECFDF5';
      if (switchBtn) switchBtn.style.display = 'flex';
    } else {
      btnText.textContent = 'Google Drive-এ সিঙ্ক করুন';
      btn.style.background = '';
      if (switchBtn) switchBtn.style.display = 'none';
    }
  }
}

async function saveToDrive() {
  if (!accessToken) return;

  const expiry = localStorage.getItem('gdrive_token_expiry');
  if (expiry && Date.now() > (parseInt(expiry) - 300000)) {
    handleTokenExpired();
    return;
  }

  const backupData = {
    home_entries: loadFromStorage('hisaber_khata_home_v1', []),
    home_categories: loadFromStorage('hisaber_khata_categories_v1', []),
    shop_entries: loadFromStorage('hisaber_khata_shop_v1', []),
    shop_shops: loadFromStorage('hisaber_khata_shops_v1', []),
    shop_sellers: loadFromStorage('hisaber_khata_sellers_v1', []),
    goods_entries: loadFromStorage('hisaber_khata_goods_v1', []),
    goods_shops: loadFromStorage('hisaber_khata_goods_shops_v1', []),
    roz_entries: loadFromStorage('hisaber_khata_roz_v1', []),
    deleted_data: loadFromStorage('hisaber_khata_deleted_data', []) // 🆕
  };
  const fileContent = JSON.stringify(backupData);
  
  // 🆕 আজকের তারিখ দিয়ে ফাইলের নাম (যেমন: backup_2023-10-27.json)
  const todayDate = new Date().toISOString().split('T')[0];
  const fileName = `backup_${todayDate}.json`;
  
  const metadata = { name: fileName, mimeType: 'application/json', parents: ['appDataFolder'] };

  try {
    // ১. আজকের ফাইল আগে থেকে আছে কিনা চেক করা
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${fileName}'`, {
      headers: { 'Authorization': 'Bearer ' + accessToken }
    });

    if (!searchRes.ok) {
      if (searchRes.status === 401 || searchRes.status === 403) { handleTokenExpired(); return; }
      throw new Error('Drive file search failed');
    }

    const searchData = await searchRes.json();
    let fileId = searchData.files && searchData.files.length > 0 ? searchData.files[0].id : null;

    let saveRes;
    if (fileId) {
      // ফাইল থাকলে আপডেট করবে
      saveRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: { 'Authorization': 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
        body: fileContent
      });
    } else {
      // না থাকলে নতুন তৈরি করবে
      const boundary = '-------314159265358979323846';
      const delimiter = "\r\n--" + boundary + "\r\n";
      const close_delim = "\r\n--" + boundary + "--";
      const multipartRequestBody = delimiter + 'Content-Type: application/json\r\n\r\n' + JSON.stringify(metadata) + delimiter + 'Content-Type: application/json\r\n\r\n' + fileContent + close_delim;
      
      saveRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + accessToken, 'Content-Type': 'multipart/related; boundary="' + boundary + '"' },
        body: multipartRequestBody
      });

      // 🆕 নতুন ব্যাকআপ তৈরি হলে পুরনো ৩০ দিনের আগের ফাইল ডিলিট করে দেব
      if (saveRes.ok) cleanupOldBackups();
    }

    if (!saveRes.ok) throw new Error('Drive upload failed');
    console.log('✅ Drive save successful');

  } catch (error) {
    console.error('Google Drive save failed:', error);
  }
}

// 🆕 ৩০ দিনের পুরনো ব্যাকআপ ডিলিট করার ফাংশন
async function cleanupOldBackups() {
  try {
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name contains 'backup_'`, {
      headers: { 'Authorization': 'Bearer ' + accessToken }
    });
    const data = await searchRes.json();
    if (!data.files) return;

    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

    data.files.forEach(async (file) => {
      // ফাইলের নাম থেকে তারিখ বের করা (backup_YYYY-MM-DD.json)
      const dateMatch = file.name.match(/backup_(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        const fileDate = new Date(dateMatch[1]).getTime();
        if (fileDate < thirtyDaysAgo) {
          await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + accessToken }
          });
          console.log('Deleted old backup:', file.name);
        }
      }
    });
  } catch (e) {
    console.error('Cleanup error:', e);
  }
}

function handleTokenExpired() {
  accessToken = null;
  localStorage.removeItem('gdrive_access_token');
  localStorage.removeItem('gdrive_token_expiry');
  updateLoginUI(false);

  const lastNotice = sessionStorage.getItem('token_expired_notice');
  if (!lastNotice) {
    sessionStorage.setItem('token_expired_notice', 'true');
    showToast('সিঙ্ক বন্ধ হয়েছে। আবার লগইন করুন।', 'error');
  }
}

function mergeEntries(localArr, cloudArr) {
  if (!Array.isArray(localArr)) localArr = [];
  if (!Array.isArray(cloudArr)) cloudArr = [];
  
  const merged = [...localArr];
  const localIds = new Set(localArr.map(e => e.id));
  
  cloudArr.forEach(cloudEntry => {
    if (cloudEntry && cloudEntry.id && !localIds.has(cloudEntry.id)) {
      merged.push(cloudEntry);
    }
  });
  
  return merged;
}

function mergeStrings(localArr, cloudArr) {
  if (!Array.isArray(localArr)) localArr = [];
  if (!Array.isArray(cloudArr)) cloudArr = [];
  
  const set = new Set([...localArr, ...cloudArr]);
  return Array.from(set);
}

async function syncFromDrive(isManualSync = false) {
  if (!accessToken) return;
  try {
        // 🆕 সব ব্যাকআপ খুঁজে বের করা এবং সর্বশেষটির আইডি নেওয়া
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name contains 'backup_'&orderBy=name desc`, {
      headers: { 'Authorization': 'Bearer ' + accessToken }
    });

    if (!searchRes.ok) {
      if (searchRes.status === 401 || searchRes.status === 403) {
        handleTokenExpired();
        return;
      }
      throw new Error('Drive load search failed: HTTP ' + searchRes.status);
    }

    const searchData = await searchRes.json();

    if (searchData.files && searchData.files.length > 0) {
      const fileId = searchData.files[0].id;
      const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { 'Authorization': 'Bearer ' + accessToken }
      });

      if (!fileRes.ok) {
        if (fileRes.status === 401 || fileRes.status === 403) {
          handleTokenExpired();
          return;
        }
        throw new Error('Drive download failed: HTTP ' + fileRes.status);
      }

      const data = await fileRes.json();

      // 🆕 FIX #5: সিঙ্ক চলাকালীন auto-sync বন্ধ রাখি
      isSyncingFromCloud = true;

      const localHome = loadFromStorage('hisaber_khata_home_v1', []) || [];
      const cloudHome = Array.isArray(data.home_entries) ? data.home_entries : [];
      saveToStorage('hisaber_khata_home_v1', mergeEntries(localHome, cloudHome));

      const localCats = loadFromStorage('hisaber_khata_categories_v1', []) || [];
      const cloudCats = Array.isArray(data.home_categories) ? data.home_categories : [];
      saveToStorage('hisaber_khata_categories_v1', mergeStrings(localCats, cloudCats));

      const localShop = loadFromStorage('hisaber_khata_shop_v1', []) || [];
      const cloudShop = Array.isArray(data.shop_entries) ? data.shop_entries : [];
      saveToStorage('hisaber_khata_shop_v1', mergeEntries(localShop, cloudShop));

      const localShops = loadFromStorage('hisaber_khata_shops_v1', []) || [];
      const cloudShops = Array.isArray(data.shop_shops) ? data.shop_shops : [];
      saveToStorage('hisaber_khata_shops_v1', mergeStrings(localShops, cloudShops));

      const localSellers = loadFromStorage('hisaber_khata_sellers_v1', []) || [];
      const cloudSellers = Array.isArray(data.shop_sellers) ? data.shop_sellers : [];
      saveToStorage('hisaber_khata_sellers_v1', mergeStrings(localSellers, cloudSellers));

      const localGoods = loadFromStorage('hisaber_khata_goods_v1', []) || [];
      const cloudGoods = Array.isArray(data.goods_entries) ? data.goods_entries : [];
      saveToStorage('hisaber_khata_goods_v1', mergeEntries(localGoods, cloudGoods));

      const localGoodsShops = loadFromStorage('hisaber_khata_goods_shops_v1', []) || [];
      const cloudGoodsShops = Array.isArray(data.goods_shops) ? data.goods_shops : [];
      saveToStorage('hisaber_khata_goods_shops_v1', mergeStrings(localGoodsShops, cloudGoodsShops));
		
      const localRoz = loadFromStorage('hisaber_khata_roz_v1', []) || [];
      const cloudRoz = Array.isArray(data.roz_entries) ? data.roz_entries : [];
      saveToStorage('hisaber_khata_roz_v1', mergeEntries(localRoz, cloudRoz));
		
		// 🆕 ডিলিট করা ডেটা সিঙ্ক
	  const localDeleted = loadFromStorage('hisaber_khata_deleted_data', []) || [];
	  const cloudDeleted = Array.isArray(data.deleted_data) ? data.deleted_data : [];
	  saveToStorage('hisaber_khata_deleted_data', mergeEntries(localDeleted, cloudDeleted));
      
	  // 🆕 FIX #5: সিঙ্ক শেষ
      isSyncingFromCloud = false;

      // 🆕 FIX #8: reload শুধু manual sync বা main page-এ
      const currentPage = window.location.pathname.split('/').pop() || 'index.html';
      const isMainPage = ['index.html', 'home.html', ''].includes(currentPage);

      const shouldReload = isManualSync || (!sessionStorage.getItem('drive_synced_once') && isMainPage);
      
      if (shouldReload) {
        sessionStorage.setItem('drive_synced_once', 'true');
        showToast('সব ডেটা মিলিয়ে নেওয়া হয়েছে ✅', 'success');
        setTimeout(() => { window.location.reload(); }, 1200);
      } else {
        sessionStorage.setItem('drive_synced_once', 'true');
      }
    }
  } catch (error) {
    isSyncingFromCloud = false;  // 🆕 FIX #5: এরর হলেও ফ্ল্যাগ রিসেট
    console.error('Drive Load Error:', error);
  }
}

function logoutGoogle() {
  localStorage.removeItem('gdrive_access_token');
  localStorage.removeItem('gdrive_token_expiry');
  accessToken = null;
  updateLoginUI(false);
  showToast('সিঙ্ক বন্ধ করা হয়েছে', 'success');
}

window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    sessionStorage.removeItem('drive_synced_once');
    sessionStorage.removeItem('drive_synced_reload');
  }
});

/* ============================================================
   🆕 Auto-Sync (ডেটা সেভ হলে ব্যাকগ্রাউন্ডে Drive এ)
   ============================================================ */

let _autoSyncTimer = null;

function triggerAutoSync() {
  // 🆕 FIX #5: সিঙ্ক চলাকালীন auto-sync বন্ধ (loop এড়াতে)
  if (isSyncingFromCloud) return;
  
  // লগইন না থাকলে সিঙ্ক করব না
  if (!accessToken) return;
  
  // টোকেন মেয়াদ চেক
  const expiry = localStorage.getItem('gdrive_token_expiry');
  if (expiry && Date.now() > (parseInt(expiry) - 300000)) return;
  
  // অটো-সিঙ্ক বন্ধ থাকলে
  if (localStorage.getItem('auto_sync_enabled') === 'false') return;
  
  // Debounce: ২ সেকেন্ড পর সিঙ্ক
  if (_autoSyncTimer) clearTimeout(_autoSyncTimer);
  _autoSyncTimer = setTimeout(() => {
    saveToDrive();
    _autoSyncTimer = null;
  }, 2000);
}

// 🆕 অটো-সিঙ্ক চালু/বন্ধ
function setAutoSync(enabled) {
  localStorage.setItem('auto_sync_enabled', enabled ? 'true' : 'false');
  showToast(enabled ? 'অটো-সিঙ্ক চালু হয়েছে' : 'অটো-সিঙ্ক বন্ধ হয়েছে', 'success');
}