const loginSection = document.getElementById('loginSection');
const registerSection = document.getElementById('registerSection');
const appSection = document.getElementById('appSection');
const linkKeRegister = document.getElementById('linkKeRegister');
const linkKeLogin = document.getElementById('linkKeLogin');

const formLogin = document.getElementById('formLogin');
const loginUser = document.getElementById('loginUser');
const loginPass = document.getElementById('loginPass');

const formRegister = document.getElementById('formRegister');
const regUser = document.getElementById('regUser');
const regPass = document.getElementById('regPass');

const btnLogout = document.getElementById('btnLogout');
const badgeRole = document.getElementById('badgeRole');
const sapaanUser = document.getElementById('sapaanUser');
const adminPanel = document.getElementById('adminPanel');
const totalUserText = document.getElementById('totalUserText');
const listUserAdmin = document.getElementById('listUserAdmin');

const inputNama = document.getElementById('namaItem');
const inputNominal = document.getElementById('nominal');
inputNominal.addEventListener('input', (e) => {
  const angkaMurni = e.target.value.replace(/\D/g, '');
  e.target.value = angkaMurni ? Number(angkaMurni).toLocaleString('id-ID') : '';
});
const btnMasuk = document.getElementById('btnMasuk');
const btnKeluar = document.getElementById('btnKeluar');
const daftar = document.getElementById('daftarTransaksi');
const elSisaSaldo = document.getElementById('sisaSaldo');

const BASE_URL = '/api';

linkKeRegister.addEventListener('click', (e) => {
  e.preventDefault();
  loginSection.style.display = 'none';
  registerSection.style.display = 'block';
  regUser.focus();
});

linkKeLogin.addEventListener('click', (e) => {
  e.preventDefault();
  registerSection.style.display = 'none';
  loginSection.style.display = 'block';
  loginUser.focus();
});

function cekStatusMasuk() {
  const token = localStorage.getItem('token_catat_cuan');
  const username = localStorage.getItem('user_catat_cuan');
  const role = localStorage.getItem('role_catat_cuan');

  if (token && username) {
    loginSection.style.display = 'none';
    registerSection.style.display = 'none';
    appSection.style.display = 'block';
    sapaanUser.textContent = `Halo, ${username}!`;
    badgeRole.textContent = role || 'user';

    if (role === 'admin') {
      badgeRole.style.backgroundColor = '#38bdf8';
      badgeRole.style.color = '#0f172a';
      adminPanel.style.display = 'block';
      muatDaftarUserAdmin();
    } else {
      badgeRole.style.backgroundColor = '#334155';
      badgeRole.style.color = '#cbd5e1';
      adminPanel.style.display = 'none';
    }
    muatTransaksi();
  } else {
    loginSection.style.display = 'block';
    registerSection.style.display = 'none';
    appSection.style.display = 'none';
    loginUser.focus();
  }
}

// Proses Register (Bisa pakai Klik maupun tombol Enter!)
formRegister.addEventListener('submit', async (e) => {
  e.preventDefault(); // Mencegah halaman refresh bawaan form
  const username = regUser.value.trim();
  const password = regPass.value.trim();

  try {
    const response = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const hasil = await response.json();
    if (response.ok) {
      alert(hasil.pesan);
      regUser.value = '';
      regPass.value = '';
      registerSection.style.display = 'none';
      loginSection.style.display = 'block';
      loginUser.value = username;
      loginPass.focus();
    } else {
      alert(hasil.pesan || 'Gagal mendaftar!');
    }
  } catch (error) {
    alert('Server mati! Jalankan node server.js dulu.');
  }
});

// Proses Login (Bisa pakai Klik maupun tombol Enter!)
formLogin.addEventListener('submit', async (e) => {
  e.preventDefault(); // Mencegah halaman refresh bawaan form
  const username = loginUser.value.trim();
  const password = loginPass.value.trim();

  try {
    const response = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const hasil = await response.json();
    if (response.ok) {
      localStorage.setItem('token_catat_cuan', hasil.token);
      localStorage.setItem('user_catat_cuan', hasil.username);
      localStorage.setItem('role_catat_cuan', hasil.role);
      loginUser.value = '';
      loginPass.value = '';
      cekStatusMasuk();
    } else {
      alert(hasil.pesan || 'Gagal login!');
    }
  } catch (error) {
    alert('Server mati! Jalankan node server.js dulu.');
  }
});

btnLogout.addEventListener('click', () => {
  localStorage.removeItem('token_catat_cuan');
  localStorage.removeItem('user_catat_cuan');
  localStorage.removeItem('role_catat_cuan');
  cekStatusMasuk();
});

async function muatDaftarUserAdmin() {
  const token = localStorage.getItem('token_catat_cuan');
  try {
    const response = await fetch(`${BASE_URL}/admin/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
      const users = await response.json();
      totalUserText.textContent = `${users.length} Akun Terdaftar`;
      listUserAdmin.innerHTML = users.map((u) => `• <strong>${u.username}</strong> (${u.role})`).join('<br>');
    }
  } catch (err) {
    console.error(err);
  }
}

function tampilkanKeLayar(item) {
  const li = document.createElement('li');
  const isMasuk = item.tipe === 'masuk';
  li.innerHTML = `
    <span class="item-nama">${item.nama}</span>
    <div class="item-kanan">
      <strong class="${isMasuk ? 'nominal-masuk' : 'nominal-keluar'}">${isMasuk ? '+' : '-'} Rp ${Number(item.nominal).toLocaleString('id-ID')}</strong>
      <button class="btn-hapus" onclick="hapusTransaksi(${item.id})" title="Hapus">×</button>
    </div>
  `;
  daftar.appendChild(li);
}

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
      saldo += item.tipe === 'masuk' ? Number(item.nominal) : -Number(item.nominal);
    });
    elSisaSaldo.textContent = `Rp ${saldo.toLocaleString('id-ID')}`;
    elSisaSaldo.style.color = saldo < 0 ? '#ef4444' : '#10b981';
  } catch (error) {
    console.error('Gagal mengambil data:', error);
  }
}

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
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ nama, nominal, tipe })
    });
    if (response.ok) {
      inputNama.value = '';
      inputNominal.value = '';
      inputNama.focus();
      muatTransaksi();
    }
  } catch (error) {
    alert('Server backend mati! Jalankan node server.js dulu.');
  }
}

async function hapusTransaksi(id) {
  const token = localStorage.getItem('token_catat_cuan');
  await fetch(`${BASE_URL}/transaksi/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  muatTransaksi();
}

btnMasuk.addEventListener('click', () => kirimTransaksi('masuk'));
btnKeluar.addEventListener('click', () => kirimTransaksi('keluar'));

cekStatusMasuk();