const BASE_URL = '/api';

// Elemen Auth
const authSection = document.getElementById('authSection');
const appSection = document.getElementById('appSection');
const authForm = document.getElementById('authForm');
const authSubtitle = document.getElementById('authSubtitle');
const authUsername = document.getElementById('authUsername');
const authPassword = document.getElementById('authPassword');
const btnAuthSubmit = document.getElementById('btnAuthSubmit');
const authSwitchText = document.getElementById('authSwitchText');
const linkSwitchAuth = document.getElementById('linkSwitchAuth');

// Elemen App
const displayUsername = document.getElementById('displayUsername');
const badgeRole = document.getElementById('badgeRole');
const btnLogout = document.getElementById('btnLogout');
const adminPanel = document.getElementById('adminPanel');
const totalUserCount = document.getElementById('totalUserCount');
const daftarUsersAdmin = document.getElementById('daftarUsersAdmin');
const inputNama = document.getElementById('namaItem');
const inputNominal = document.getElementById('nominal');
const btnMasuk = document.getElementById('btnMasuk');
const btnKeluar = document.getElementById('btnKeluar');
const daftar = document.getElementById('daftarTransaksi');
const elSisaSaldo = document.getElementById('sisaSaldo');

// Elemen AI
const inputTanyaAi = document.getElementById('inputTanyaAi');
const btnTanyaAi = document.getElementById('btnTanyaAi');
const hasilAi = document.getElementById('hasilAi');

let modeRegister = false;

// Format ribuan otomatis saat mengetik nominal (contoh: 100.000)
inputNominal.addEventListener('input', (e) => {
  const angkaMurni = e.target.value.replace(/\D/g, '');
  e.target.value = angkaMurni ? Number(angkaMurni).toLocaleString('id-ID') : '';
});

// Switch Login <-> Register
linkSwitchAuth.addEventListener('click', (e) => {
  e.preventDefault();
  modeRegister = !modeRegister;
  if (modeRegister) {
    authSubtitle.textContent = 'Buat akun baru';
    btnAuthSubmit.textContent = 'Daftar Sekarang';
    authSwitchText.textContent = 'Sudah punya akun?';
    linkSwitchAuth.textContent = 'Masuk di sini';
  } else {
    authSubtitle.textContent = 'Masuk ke akunmu';
    btnAuthSubmit.textContent = 'Masuk';
    authSwitchText.textContent = 'Belum punya akun?';
    linkSwitchAuth.textContent = 'Daftar di sini';
  }
});

// Submit Login / Register
authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = authUsername.value.trim();
  const password = authPassword.value;
  const endpoint = modeRegister ? '/register' : '/login';

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await response.json();

    if (!response.ok) {
      alert(data.pesan || 'Terjadi kesalahan!');
      return;
    }

    if (modeRegister) {
      alert(data.pesan);
      linkSwitchAuth.click();
      authPassword.value = '';
    } else {
      localStorage.setItem('token_catat_cuan', data.token);
      localStorage.setItem('user_catat_cuan', data.username);
      localStorage.setItem('role_catat_cuan', data.role);
      cekStatusMasuk();
    }
  } catch (error) {
    alert('Gagal terhubung ke server!');
  }
});

// Logout
btnLogout.addEventListener('click', () => {
  localStorage.removeItem('token_catat_cuan');
  localStorage.removeItem('user_catat_cuan');
  localStorage.removeItem('role_catat_cuan');
  hasilAi.style.display = 'none';
  inputTanyaAi.value = '';
  cekStatusMasuk();
});

// Cek Sesi Login
function cekStatusMasuk() {
  const token = localStorage.getItem('token_catat_cuan');
  const username = localStorage.getItem('user_catat_cuan');
  const role = localStorage.getItem('role_catat_cuan');

  if (token && username) {
    authSection.style.display = 'none';
    appSection.style.display = 'block';
    displayUsername.textContent = username;

    if (role === 'admin') {
      badgeRole.style.display = 'inline-block';
      adminPanel.style.display = 'block';
      muatDaftarUserAdmin();
    } else {
      badgeRole.style.display = 'none';
      adminPanel.style.display = 'none';
    }

    muatTransaksi();
  } else {
    authSection.style.display = 'block';
    appSection.style.display = 'none';
  }
}

// Muat Daftar User (Khusus Admin)
async function muatDaftarUserAdmin() {
  const token = localStorage.getItem('token_catat_cuan');
  try {
    const response = await fetch(`${BASE_URL}/admin/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
      const users = await response.json();
      totalUserCount.textContent = `${users.length} Akun Terdaftar`;
      daftarUsersAdmin.innerHTML = users
        .map((u) => `<li>• <strong>${u.username}</strong> (${u.role})</li>`)
        .join('');
    }
  } catch (error) {
    console.error('Gagal memuat user admin:', error);
  }
}

// Tampilkan 1 Baris Transaksi
function tampilkanKeLayar(item) {
  const li = document.createElement('li');
  const isMasuk = item.tipe === 'masuk';
  const tanda = isMasuk ? '+' : '-';
  const kelasWarna = isMasuk ? 'nominal-masuk' : 'nominal-keluar';

  li.innerHTML = `
    <span class="item-nama">${item.nama}</span>
    <div class="item-kanan">
      <strong class="${kelasWarna}">${tanda} Rp ${Number(item.nominal).toLocaleString('id-ID')}</strong>
      <button class="btn-hapus" onclick="hapusTransaksi(${item.id})" title="Hapus">×</button>
    </div>
  `;
  daftar.appendChild(li);
}

// Muat Semua Transaksi User
async function muatTransaksi() {
  const token = localStorage.getItem('token_catat_cuan');
  try {
    const response = await fetch(`${BASE_URL}/transaksi`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.status === 401 || response.status === 403) {
      btnLogout.click();
      return;
    }

    const data = await response.json();
    daftar.innerHTML = '';
    let saldo = 0;

    data.forEach((item) => {
      tampilkanKeLayar(item);
      if (item.tipe === 'masuk') saldo += Number(item.nominal);
      else saldo -= Number(item.nominal);
    });

    elSisaSaldo.textContent = `Rp ${saldo.toLocaleString('id-ID')}`;
    elSisaSaldo.style.color = saldo < 0 ? '#ef4444' : '#10b981';
  } catch (error) {
    console.error('Gagal mengambil transaksi:', error);
  }
}

// Kirim Transaksi Baru
async function kirimTransaksi(tipe) {
  const nama = inputNama.value.trim();
  const nominal = Number(inputNominal.value.replace(/\./g, ''));
  const token = localStorage.getItem('token_catat_cuan');

  if (!nama || nominal <= 0) {
    alert('Isi keterangan dan nominal yang benar!');
    return;
  }

  try {
    const response = await fetch(`${BASE_URL}/transaksi`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ nama, nominal, tipe })
    });

    if (response.ok) {
      inputNama.value = '';
      inputNominal.value = '';
      inputNama.focus();
      muatTransaksi();
    }
  } catch (error) {
    alert('Gagal menyimpan transaksi!');
  }
}

// Hapus Transaksi
async function hapusTransaksi(id) {
  const token = localStorage.getItem('token_catat_cuan');
  await fetch(`${BASE_URL}/transaksi/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  muatTransaksi();
}

// Tanya AI Financial Planner
btnTanyaAi.addEventListener('click', async () => {
  const pertanyaan = inputTanyaAi.value.trim();
  if (!pertanyaan) {
    alert('Tulis pertanyaan keuanganmu dulu!');
    return;
  }

  const token = localStorage.getItem('token_catat_cuan');
  btnTanyaAi.disabled = true;
  btnTanyaAi.textContent = '...';
  hasilAi.style.display = 'block';
  hasilAi.textContent = '🤖 Sedang menganalisis saldo & transaksi kamu...';

  try {
    const response = await fetch(`${BASE_URL}/ai-plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ pertanyaan })
    });

    const data = await response.json();
    if (response.ok) {
      hasilAi.textContent = data.jawaban;
    } else {
      hasilAi.textContent = `⚠️ ${data.pesan}`;
    }
  } catch (error) {
    hasilAi.textContent = '⚠️ Gagal terhubung ke server AI.';
  } finally {
    btnTanyaAi.disabled = false;
    btnTanyaAi.textContent = 'Tanya';
  }
});

btnMasuk.addEventListener('click', () => kirimTransaksi('masuk'));
btnKeluar.addEventListener('click', () => kirimTransaksi('keluar'));

cekStatusMasuk();
inputTanyaAi.addEventListener('keydown', (e) => { if (e.key === 'Enter') btnTanyaAi.click(); });
