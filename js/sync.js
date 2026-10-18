/* ============================================================
   Google Drive Sync Logic with Refresh Token
   ============================================================ */

const CLIENT_ID = '555637526676-tje8vroaiqqjqje34uhaecf9vf7hfn6g.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';

let tokenClient;
let accessToken = null;
let isSyncingFromCloud = false;

window.addEventListener('load', () => {
  const initGoogle = () => {
    if (typeof google === 'undefined' || !google.accounts) {
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
          if (tokenResponse.expires_in) {
            const expiryTime = Date.now() + (tokenResponse.expires_in * 1000);
            localStorage.setItem('gdrive_token_expiry', expiryTime);
          }
          updateLoginUI(true);
          syncFromDrive();
        }
      },
    });
    checkExistingToken();
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
      syncFromDrive();
    } else {
      localStorage.removeItem('gdrive_access_token');
      localStorage.removeItem('gdrive_token_expiry');
      updateLoginUI(false);
    }
  }
}

function handleGoogleLogin() {
  if (tokenClient) {
    // প্রথমবার লগইন বা নতুন অ্যাকাউন্ট যোগ করার জন্য
    tokenClient.requestAccessToken({ prompt: 'select_account' });
  } else {
    showToast('ইন্টারনেট কানেকশন বা গুগল স্ক্রিপ্ট লোড হয়নি', 'error');
  }
}
function changeGoogleAccount() {
  if (tokenClient) {
    // গুগলকে বলছি নতুন অ্যাকাউন্ট সিলেক্ট করার পপআপ দেখাও
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
      if (switchBtn) switchBtn.style.display = 'flex'; // লগইন থাকলে দেখাবে
    } else {
      btnText.textContent = 'Google Drive-এ সিঙ্ক করুন';
      btn.style.background = '';
      if (switchBtn) switchBtn.style.display = 'none'; // লগইন না থাকলে লুকাবে
    }
  }
}

async function saveToDrive() {
  if (!accessToken) return; 
  const backupData = {
    home_entries: loadFromStorage('hisaber_khata_home_v1', []),
    home_categories: loadFromStorage('hisaber_khata_categories_v1', []),
    shop_entries: loadFromStorage('hisaber_khata_shop_v1', []),
    shop_shops: loadFromStorage('hisaber_khata_shops_v1', []),
    goods_entries: loadFromStorage('hisaber_khata_goods_v1', [])
  };
  const fileContent = JSON.stringify(backupData);
  const metadata = { name: 'hisaber_khata_backup.json', mimeType: 'application/json', parents: ['appDataFolder'] };
  try {
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='hisaber_khata_backup.json'`, {
      headers: { 'Authorization': 'Bearer ' + accessToken }
    });
    const searchData = await searchRes.json();
    let fileId = null;
    if (searchData.files && searchData.files.length > 0) fileId = searchData.files[0].id;
    if (fileId) {
      await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH', headers: { 'Authorization': 'Bearer ' + accessToken, 'Content-Type': 'application/json' }, body: fileContent
      });
    } else {
      const boundary = '-------314159265358979323846';
      const delimiter = "\r\n--" + boundary + "\r\n";
      const close_delim = "\r\n--" + boundary + "--";
      const multipartRequestBody = delimiter + 'Content-Type: application/json\r\n\r\n' + JSON.stringify(metadata) + delimiter + 'Content-Type: application/json\r\n\r\n' + fileContent + close_delim;
      await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST', headers: { 'Authorization': 'Bearer ' + accessToken, 'Content-Type': 'multipart/related; boundary="' + boundary + '"' }, body: multipartRequestBody
      });
    }
  } catch (error) {
    console.error('Drive Save Error:', error);
    if (error.message.includes('401')) logoutGoogle();
  }
}

async function syncFromDrive() {
  if (!accessToken) return;
  try {
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='hisaber_khata_backup.json'`, {
      headers: { 'Authorization': 'Bearer ' + accessToken }
    });
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      const fileId = searchData.files[0].id;
      const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { 'Authorization': 'Bearer ' + accessToken }
      });
      const data = await fileRes.json();
      isSyncingFromCloud = true; 
      if (data.home_entries) saveToStorage('hisaber_khata_home_v1', data.home_entries);
      if (data.home_categories) saveToStorage('hisaber_khata_categories_v1', data.home_categories);
      if (data.shop_entries) saveToStorage('hisaber_khata_shop_v1', data.shop_entries);
      if (data.shop_shops) saveToStorage('hisaber_khata_shops_v1', data.shop_shops);
      if (data.goods_entries) saveToStorage('hisaber_khata_goods_v1', data.goods_entries);
      isSyncingFromCloud = false;
      if (!sessionStorage.getItem('drive_synced_reload')) {
        sessionStorage.setItem('drive_synced_reload', 'true');
        showToast('ড্রাইভ থেকে ডেটা লোড হয়েছে', 'success');
        setTimeout(() => { window.location.reload(); }, 1000);
      }
    } else {
      saveToDrive();
    }
  } catch (error) { console.error('Drive Load Error:', error); }
}

function logoutGoogle() {
  localStorage.removeItem('gdrive_access_token');
  localStorage.removeItem('gdrive_token_expiry');
  accessToken = null;
  updateLoginUI(false);
  showToast('সিঙ্ক বন্ধ করা হয়েছে', 'success');
}

window.addEventListener('pageshow', (event) => {
  if (event.persisted) sessionStorage.removeItem('drive_synced_reload');
});