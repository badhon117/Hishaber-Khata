/* ============================================================
   Google Drive Sync Logic with Smart Merge (Fixed & Secured)
   ============================================================ */

const CLIENT_ID = '555637526676-tje8vroaiqqjqje34uhaecf9vf7hfn6g.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
const MASTER_FILE_NAME = 'hisaber_khata_master_backup.json';

let tokenClient;
let accessToken = null;
let isSyncingFromCloud = false;

window.addEventListener('load', () => {
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
          
          // লগইন সফল হলে প্রথমে ড্রাইভ থেকে ডেটা টেনে এনে মার্জ করবে, তারপর সেভ করবে
          syncAndMergeFromDrive(true);
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
          syncAndMergeFromDrive(false);
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

/* ============================================================
   স্মার্ট মার্জ ফাংশন (লোকাল এবং ক্লাউডের ডেটা একত্রিত করা)
   ============================================================ */
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

// ড্রাইভ থেকে ডেটা এনে লোকাল ডেটার সাথে মার্জ করা এবং ড্রাইভে আপডেট পাঠানো
async function syncAndMergeFromDrive(isManualSync = false) {
  if (!accessToken) return;
  if (isSyncingFromCloud) return;

  try {
    isSyncingFromCloud = true;

    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${MASTER_FILE_NAME}' and trashed=false`, {
      headers: { 'Authorization': 'Bearer ' + accessToken }
    });

    if (!searchRes.ok) {
      if (searchRes.status === 401 || searchRes.status === 403) {
        handleTokenExpired();
        isSyncingFromCloud = false;
        return;
      }
      throw new Error('Drive load search failed');
    }

    const searchData = await searchRes.json();

    let cloudData = {};
    if (searchData.files && searchData.files.length > 0) {
      const fileId = searchData.files[0].id;
      const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { 'Authorization': 'Bearer ' + accessToken }
      });

      if (fileRes.ok) {
        cloudData = await fileRes.json();
      }
    }

    // ১. লোকাল ডেটা এবং ক্লাউড ডেটা মার্জ করি
    const localHome = loadFromStorage('hisaber_khata_home_v1', []) || [];
    const mergedHome = mergeEntries(localHome, cloudData.home_entries || []);
    saveToStorage('hisaber_khata_home_v1', mergedHome);

    const localCats = loadFromStorage('hisaber_khata_categories_v1', []) || [];
    const mergedCats = mergeStrings(localCats, cloudData.home_categories || []);
    saveToStorage('hisaber_khata_categories_v1', mergedCats);

    const localShop = loadFromStorage('hisaber_khata_shop_v1', []) || [];
    const mergedShop = mergeEntries(localShop, cloudData.shop_entries || []);
    saveToStorage('hisaber_khata_shop_v1', mergedShop);

    const localShops = loadFromStorage('hisaber_khata_shops_v1', []) || [];
    const mergedShops = mergeStrings(localShops, cloudData.shop_shops || []);
    saveToStorage('hisaber_khata_shops_v1', mergedShops);

    const localSellers = loadFromStorage('hisaber_khata_sellers_v1', []) || [];
    const mergedSellers = mergeStrings(localSellers, cloudData.shop_sellers || []);
    saveToStorage('hisaber_khata_sellers_v1', mergedSellers);

    const localGoods = loadFromStorage('hisaber_khata_goods_v1', []) || [];
    const mergedGoods = mergeEntries(localGoods, cloudData.goods_entries || []);
    saveToStorage('hisaber_khata_goods_v1', mergedGoods);

    const localGoodsShops = loadFromStorage('hisaber_khata_goods_shops_v1', []) || [];
    const mergedGoodsShops = mergeStrings(localGoodsShops, cloudData.goods_shops || []);
    saveToStorage('hisaber_khata_goods_shops_v1', mergedGoodsShops);
    
    const localRoz = loadFromStorage('hisaber_khata_roz_v1', []) || [];
    const mergedRoz = mergeEntries(localRoz, cloudData.roz_entries || []);
    saveToStorage('hisaber_khata_roz_v1', mergedRoz);
    
    const localDeleted = loadFromStorage('hisaber_khata_deleted_data', []) || [];
    const mergedDeleted = mergeEntries(localDeleted, cloudData.deleted_data || []);
    saveToStorage('hisaber_khata_deleted_data', mergedDeleted);

    isSyncingFromCloud = false;

    // ২. মার্জ করার পর সম্পূর্ণ ডেটা আবার ড্রাইভে ব্যাকআপ পাঠিয়ে দিই যাতে উভয় ডিভাইস একই আপডেট পায়
    await saveToDriveSilently();

    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const isMainPage = ['index.html', 'home.html', ''].includes(currentPage);

    const shouldReload = isManualSync || (!sessionStorage.getItem('drive_synced_once') && isMainPage);
    
    if (shouldReload) {
      sessionStorage.setItem('drive_synced_once', 'true');
      showToast('সব ডেটা সফলভাবে সিঙ্ক ও মার্জ হয়েছে ✅', 'success');
      setTimeout(() => { window.location.reload(); }, 1200);
    } else {
      sessionStorage.setItem('drive_synced_once', 'true');
    }

  } catch (error) {
    isSyncingFromCloud = false;
    console.error('Drive Sync & Merge Error:', error);
  }
}

// ড্রাইভে সেভ করার মূল ফাংশন
async function saveToDrive() {
  await saveToDriveSilently();
  showToast('ড্রাইভে সফলভাবে সেভ হয়েছে ✅', 'success');
}

// ব্যাকগ্রাউন্ডে নীরবে ড্রাইভে ডেটা আপলোড করার ফাংশন
async function saveToDriveSilently() {
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

    if (fileId) {
      await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: { 'Authorization': 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
        body: fileContent
      });
    } else {
      const boundary = '-------314159265358979323846';
      const delimiter = "\r\n--" + boundary + "\r\n";
      const close_delim = "\r\n--" + boundary + "--";
      const multipartRequestBody = delimiter + 'Content-Type: application/json\r\n\r\n' + JSON.stringify(metadata) + delimiter + 'Content-Type: application/json\r\n\r\n' + fileContent + close_delim;
      
      await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + accessToken, 'Content-Type': 'multipart/related; boundary="' + boundary + '"' },
        body: multipartRequestBody
      });
    }
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
   Auto-Sync (ডেটা সেভ হলে ব্যাকগ্রাউন্ডে Drive এ মার্জ ও সিঙ্ক)
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
    syncAndMergeFromDrive(false); // ব্যাকগ্রাউন্ডে মার্জ করে ড্রাইভে সেভ করবে
    _autoSyncTimer = null;
  }, 2000);
}

function setAutoSync(enabled) {
  localStorage.setItem('auto_sync_enabled', enabled ? 'true' : 'false');
  showToast(enabled ? 'অটো-সিঙ্ক চালু হয়েছে' : 'অটো-সিঙ্ক বন্ধ হয়েছে', 'success');
}
