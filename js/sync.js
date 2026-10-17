/* ============================================================
   Google Drive Sync Logic
   ============================================================ */

// আপনার আসল Client ID এখানে বসানো হলো
const CLIENT_ID = '555637526676-tje8vroaiqqjqje34uhaecf9vf7hfn6g.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';

let tokenClient;
let accessToken = null;

// গুগল স্ক্রিপ্ট পুরোপুরি লোড হওয়ার পর এই ফাংশনটি চলবে
window.addEventListener('load', () => {
  const initGoogle = () => {
    // যদি গুগলের স্ক্রিপ্ট এখনো লোড না হয়ে থাকে, তবে ৫০০ মিলি-সেকেন্ড পর আবার চেক করবে
    if (typeof google === 'undefined' || !google.accounts) {
      setTimeout(initGoogle, 500);
      return;
    }
    
    // গুগলের লগইন ক্লায়েন্ট চালু করা
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (tokenResponse) => {
        if (tokenResponse && tokenResponse.access_token) {
          accessToken = tokenResponse.access_token;
          
          const btnText = document.getElementById('loginBtnText');
          const btn = document.getElementById('loginBtn');
          
          if (btnText) btnText.textContent = 'গুগল ড্রাইভে সিঙ্কড ✅';
          if (btn) btn.style.background = '#ECFDF5'; // হালকা সবুজ ব্যাকগ্রাউন্ড
          
          syncFromDrive(); // লগইন সফল হলে ড্রাইভ থেকে ডেটা আনবে
        }
      },
    });
  };
  
  initGoogle();
});

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

// ড্রাইভে ডেটা সেভ করা (আপডেট বা নতুন তৈরি)
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
    // ১. ড্রাইভে আগে থেকেই কোনো ফাইল আছে কি না খোঁজা
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='hisaber_khata_backup.json'`, {
      headers: { 'Authorization': 'Bearer ' + accessToken }
    });
    const searchData = await searchRes.json();
    
    let fileId = null;
    if (searchData.files && searchData.files.length > 0) {
      fileId = searchData.files[0].id;
    }

    if (fileId) {
      // ২. আগের ফাইল থাকলে সেটা আপডেট করা
      await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: {
          'Authorization': 'Bearer ' + accessToken,
          'Content-Type': 'application/json'
        },
        body: fileContent
      });
    } else {
      // ৩. আগের ফাইল না থাকলে নতুন ফাইল তৈরি করা
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
    // ১. ফাইল খোঁজা
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='hisaber_khata_backup.json'`, {
      headers: { 'Authorization': 'Bearer ' + accessToken }
    });
    const searchData = await searchRes.json();
    
    // ২. ফাইল পাওয়া গেলে সেটার ডেটা পড়া
    if (searchData.files && searchData.files.length > 0) {
      const fileId = searchData.files[0].id;
      const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { 'Authorization': 'Bearer ' + accessToken }
      });
      const data = await fileRes.json();
      
      // ৩. লোকাল স্টোরেজে ডেটা আপডেট করা
      if (data.home_entries) saveToStorage('hisaber_khata_home_v1', data.home_entries);
      if (data.home_categories) saveToStorage('hisaber_khata_categories_v1', data.home_categories);
      if (data.shop_entries) saveToStorage('hisaber_khata_shop_v1', data.shop_entries);
      if (data.shop_shops) saveToStorage('hisaber_khata_shops_v1', data.shop_shops);
      if (data.goods_entries) saveToStorage('hisaber_khata_goods_v1', data.goods_entries);

      showToast('ড্রাইভ থেকে ডেটা লোড হয়েছে', 'success');
      
      // ডেটা লোড হওয়ার পর পেজ রিফ্রেশ করা যাতে নতুন ডেটা দেখা যায়
      setTimeout(() => { window.location.reload(); }, 1000);
    } else {
        showToast('ড্রাইভে কোনো ব্যাকআপ ফাইল পাওয়া যায়নি', 'error');
    }
  } catch (error) {
    console.error('Drive Load Error:', error);
  }
}
