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

// Elemen Input
const inputNama = document.getElementById('namaItem');
const inputNominal = document.getElementById('nominal');
const kategoriInput = document.getElementById('kategoriInput');
const waktuInput = document.getElementById('waktuInput');
const btnMasuk = document.getElementById('btnMasuk');
const btnKeluar = document.getElementById('btnKeluar');

// Elemen Saldo & Database
const elSisaSaldo = document.getElementById('sisaSaldo');
const totalMasukText = document.getElementById('totalMasukText');
const totalKeluarText = document.getElementById('totalKeluarText');
const jumlahDataBadge = document.getElementById('jumlahDataBadge');
const tabelTransaksiBody = document.getElementById('tabelTransaksiBody');

// Elemen Search & Filter
const searchInput = document.getElementById('searchInput');
const filterKategori = document.getElementById('filterKategori');
const filterTanggal = document.getElementById('filterTanggal');
const btnResetFilter = document.getElementById('btnResetFilter');

// Elemen AI
const inputTanyaAi = document.getElementById('inputTanyaAi');
const btnTanyaAi = document.getElementById('btnTanyaAi');
const hasilAi = document.getElementById('hasilAi');

let modeRegister = false;
let semuaTransaksi = [];

// Set waktu sekarang otomatis di input datetime-local
function setWaktuSekarang() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  waktuInput.value = now.toISOString().slice(0, 16);
}

// Format ribuan otomatis saat mengetik nominal
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
    setWaktuSekarang();

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

// Muat Daftar User (Admin)
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
        .map((u) => `<li><strong>${u.username}</strong> (${u.role})</li>`)
        .join('');
    }
  } catch (error) {
    console.error('Gagal memuat user admin:', error);
  }
}

// Format Tampilan Tanggal & Jam
function formatWaktuIndo(waktuStr) {
  if (!waktuStr) return '-';
  const d = new Date(waktuStr);
  if (isNaN(d.getTime())) return waktuStr;
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }) + ' • ' + d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Render Tabel Berdasarkan Search & Filter
function renderTabelTransaksi() {
  const kataKunci = searchInput.value.toLowerCase().trim();
  const katDipilih = filterKategori.value;
  const tglDipilih = filterTanggal.value; // Format YYYY-MM-DD

  const hasilFilter = semuaTransaksi.filter((item) => {
    const cocokNama = item.nama.toLowerCase().includes(kataKunci);
    const itemKat = item.kategori || 'Umum';
    const cocokKat = katDipilih === 'ALL' || itemKat === katDipilih;
    const itemTgl = item.waktu ? item.waktu.slice(0, 10) : '';
    const cocokTgl = !tglDipilih || itemTgl === tglDipilih;

    return cocokNama && cocokKat && cocokTgl;
  });

  jumlahDataBadge.textContent = `${hasilFilter.length} Data`;
  tabelTransaksiBody.innerHTML = '';

  if (hasilFilter.length === 0) {
    tabelTransaksiBody.innerHTML = `<tr><td colspan="5" class="empty-row">Tidak ada data transaksi yang cocok.</td></tr>`;
    return;
  }

  hasilFilter.forEach((item) => {
    const isMasuk = item.tipe === 'masuk';
    const tanda = isMasuk ? '+' : '-';
    const kelasWarna = isMasuk ? 'nominal-masuk' : 'nominal-keluar';
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td class="td-waktu">${formatWaktuIndo(item.waktu)}</td>
      <td><strong>${item.nama}</strong></td>
      <td><span class="badge-kat">${item.kategori || 'Umum'}</span></td>
      <td class="text-right ${kelasWarna}">${tanda} Rp ${Number(item.nominal).toLocaleString('id-ID')}</td>
      <td class="text-center">
        <button class="btn-hapus" onclick="hapusTransaksi(${item.id})" title="Hapus">×</button>
      </td>
    `;
    tabelTransaksiBody.appendChild(tr);
  });
}

// Muat Semua Transaksi dari Server
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

    semuaTransaksi = await response.json();
    let totalMasuk = 0;
    let totalKeluar = 0;

    semuaTransaksi.forEach((item) => {
      if (item.tipe === 'masuk') totalMasuk += Number(item.nominal);
      else totalKeluar += Number(item.nominal);
    });

    const saldo = totalMasuk - totalKeluar;
    elSisaSaldo.textContent = `Rp ${saldo.toLocaleString('id-ID')}`;
    elSisaSaldo.style.color = saldo < 0 ? '#ef4444' : '#10b981';
    totalMasukText.textContent = `+ Rp ${totalMasuk.toLocaleString('id-ID')}`;
    totalKeluarText.textContent = `- Rp ${totalKeluar.toLocaleString('id-ID')}`;

    renderTabelTransaksi();
  } catch (error) {
    console.error('Gagal mengambil transaksi:', error);
  }
}

// Kirim Transaksi Baru
async function kirimTransaksi(tipe) {
  const nama = inputNama.value.trim();
  const nominal = Number(inputNominal.value.replace(/\./g, ''));
  const kategori = kategoriInput.value;
  const waktu = waktuInput.value;
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
      body: JSON.stringify({ nama, nominal, tipe, kategori, waktu })
    });

    if (response.ok) {
      inputNama.value = '';
      inputNominal.value = '';
      setWaktuSekarang();
      inputNama.focus();
      muatTransaksi();
    } else {
      const err = await response.json();
      alert(err.pesan || 'Gagal menyimpan transaksi!');
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

// Event Search & Filter
searchInput.addEventListener('input', renderTabelTransaksi);
filterKategori.addEventListener('change', renderTabelTransaksi);
filterTanggal.addEventListener('change', renderTabelTransaksi);
btnResetFilter.addEventListener('click', () => {
  searchInput.value = '';
  filterKategori.value = 'ALL';
  filterTanggal.value = '';
  renderTabelTransaksi();
});

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
  hasilAi.textContent = '🤖 Sedang menganalisis saldo, kategori, & riwayat transaksi kamu...';

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

inputTanyaAi.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') btnTanyaAi.click();
});

btnMasuk.addEventListener('click', () => kirimTransaksi('masuk'));
btnKeluar.addEventListener('click', () => kirimTransaksi('keluar'));

cekStatusMasuk();