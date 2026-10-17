/* ============================================================
   Google Drive Sync Logic
   ============================================================ */

const CLIENT_ID = 'আপনার_Client_ID_এখানে_বসান'; // <-- এখানে আপনার ID বসান
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';

let tokenClient;
let accessToken = null;

// গুগল স্ক্রিপ্ট লোড হওয়ার পর কল হবে
window.onload = () => {
  if (typeof google === 'undefined') {
    setTimeout(window.onload, 500);
    return;
  }
  
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: (tokenResponse) => {
      if (tokenResponse && tokenResponse.access_token) {
        accessToken = tokenResponse.access_token;
        document.getElementById('loginBtnText').textContent = 'গুগল ড্রাইভে সিঙ্কড';
        document.getElementById('loginBtn').style.background = '#059669'; // সবুজ
        syncFromDrive(); // লগইন সফল হলে ডেটা আনবে
      }
    },
  });
};

// লগইন বাটনে ক্লিক করলে
function handleGoogleLogin() {
  if (accessToken) {
    showToast('আপনি ইতিমধ্যে সিঙ্ক করেছেন', 'success');
    return;
  }
  if (tokenClient) {
    tokenClient.requestAccessToken({ prompt: 'consent' });
  } else {
    showToast('ইন্টারনেট কানেকশন বা গুগল স্ক্রিপ্ট লোড হয়নি', 'error');
  }
}

// ড্রাইভে ডেটা সেভ করা (আপডেট)
async function saveToDrive() {
  if (!accessToken) return; // লগইন না থাকলে কিছু করবে না

  const backupData = {
    home_entries: loadFromStorage('hisaber_khata_home_v1', []),
    home_categories: loadFromStorage('hisaber_khata_categories_v1', []),
    shop_entries: loadFromStorage('hisaber_khata_shop_v1', []),
    shop_shops: loadFromStorage('hisaber_khata_shops_v1', []),
    goods_entries: loadFromStorage('hisaber_khata_goods_v1', [])
  };

  const fileContent = JSON.stringify(backupData);
  const metadata = {
    name: 'hisaber_khata_backup.json',
    mimeType: 'application/json',
    parents: ['appDataFolder']
  };

  try {
    // ১. আগের ফাইল খোঁজা
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='hisaber_khata_backup.json'`, {
      headers: { 'Authorization': 'Bearer ' + accessToken }
    });
    const searchData = await searchRes.json();
    
    let fileId = null;
    if (searchData.files && searchData.files.length > 0) {
      fileId = searchData.files[0].id;
    }

    if (fileId) {
      // আপডেট করা
      await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: {
          'Authorization': 'Bearer ' + accessToken,
          'Content-Type': 'application/json'
        },
        body: fileContent
      });
    } else {
      // নতুন তৈরি করা
      const boundary = '-------314159265358979323846';
      const delimiter = "\r\n--" + boundary + "\r\n";
      const close_delim = "\r\n--" + boundary + "--";
      
      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        fileContent +
        close_delim;

      await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + accessToken,
          'Content-Type': 'multipart/related; boundary="' + boundary + '"'
        },
        body: multipartRequestBody
      });
    }
    showToast('ড্রাইভে সিঙ্ক সম্পন্ন হয়েছে', 'success');
  } catch (error) {
    console.error('Drive Save Error:', error);
    showToast('সিঙ্ক করতে সমস্যা হয়েছে', 'error');
  }
}

// ড্রাইভ থেকে ডেটা লোড করা (লগইন করার পর)
async function syncFromDrive() {
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
      
      // লোকাল স্টোরেজে আপডেট
      if (data.home_entries) saveToStorage('hisaber_khata_home_v1', data.home_entries);
      if (data.home_categories) saveToStorage('hisaber_khata_categories_v1', data.home_categories);
      if (data.shop_entries) saveToStorage('hisaber_khata_shop_v1', data.shop_entries);
      if (data.shop_shops) saveToStorage('hisaber_khata_shops_v1', data.shop_shops);
      if (data.goods_entries) saveToStorage('hisaber_khata_goods_v1', data.goods_entries);

      showToast('ড্রাইভ থেকে ডেটা লোড হয়েছে', 'success');
      setTimeout(() => { window.location.reload(); }, 1000);
    }
  } catch (error) {
    console.error('Drive Load Error:', error);
  }
}