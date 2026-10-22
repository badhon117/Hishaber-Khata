/* ============================================================
   Google Drive Sync Logic with Fixed Master Backup (Secured & Updated)
   ============================================================ */

const CLIENT_ID = '555637526676-tje8vroaiqqjqje34uhaecf9vf7hfn6g.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
const MASTER_FILE_NAME = 'hisaber_khata_master_backup.json';

let tokenClient;
let accessToken = null;
let isSyncingFromCloud = false;

window.addEventListener('load', () => {
  // ডিফল্টভাবে অটো-সিঙ্ক চালু রাখা (যদি আগে সেট না করা থাকে)
  if (localStorage.getItem('auto_sync_enabled') === null) {
    localStorage.setItem('auto_sync_enabled', 'true');
  }

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
      
      const trySync = () => {
        if (typeof google !== 'undefined' && google.accounts) {
          syncFromDrive(false);
        } else {
          setTimeout(trySync, 1000);
        }
      };
      trySync();
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
    deleted_data: loadFromStorage('hisaber_khata_deleted_data', [])
  };
  const fileContent = JSON.stringify(backupData);
  
  const metadata = { name: MASTER_FILE_NAME, mimeType: 'application/json', parents: ['appDataFolder'] };

  try {
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${MASTER_FILE_NAME}' and trashed=false`, {
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
      saveRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: { 'Authorization': 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
        body: fileContent
      });
    } else {
      const boundary = '-------314159265358979323846';
      const delimiter = "\r\n--" + boundary + "\r\n";
      const close_delim = "\r\n--" + boundary + "--";
      const multipartRequestBody = delimiter + 'Content-Type: application/json\r\n\r\n' + JSON.stringify(metadata) + delimiter + 'Content-Type: application/json\r\n\r\n' + fileContent + close_delim;
      
      saveRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + accessToken, 'Content-Type': 'multipart/related; boundary="' + boundary + '"' },
        body: multipartRequestBody
      });
    }

    if (!saveRes.ok) throw new Error('Drive upload failed');
    console.log('✅ Drive save successful');

  } catch (error) {
    console.error('Google Drive save failed:', error);
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
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${MASTER_FILE_NAME}' and trashed=false`, {
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
		
      const localDeleted = loadFromStorage('hisaber_khata_deleted_data', []) || [];
      const cloudDeleted = Array.isArray(data.deleted_data) ? data.deleted_data : [];
      saveToStorage('hisaber_khata_deleted_data', mergeEntries(localDeleted, cloudDeleted));
      
      isSyncingFromCloud = false;

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
    isSyncingFromCloud = false;
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
   Auto-Sync (ডেটা সেভ হলে ব্যাকগ্রাউন্ডে Drive এ)
   ============================================================ */

let _autoSyncTimer = null;

function triggerAutoSync() {
  if (isSyncingFromCloud) return;
  if (!accessToken) return;
  
  const expiry = localStorage.getItem('gdrive_token_expiry');
  if (expiry && Date.now() > (parseInt(expiry) - 300000)) return;
  
  if (localStorage.getItem('auto_sync_enabled') === 'false') return;
  
  if (_autoSyncTimer) clearTimeout(_autoSyncTimer);
  _autoSyncTimer = setTimeout(() => {
    saveToDrive();
    _autoSyncTimer = null;
  }, 2000);
}

function setAutoSync(enabled) {
  localStorage.setItem('auto_sync_enabled', enabled ? 'true' : 'false');
  showToast(enabled ? 'অটো-সিঙ্ক চালু হয়েছে' : 'অটো-সিঙ্ক বন্ধ হয়েছে', 'success');
}
