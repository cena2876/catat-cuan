const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
// Menyajikan file frontend (index.html, style.css, script.js) langsung dari server
app.use(express.static(__dirname));

// Koneksi ke Database Cloud Supabase milikmu
const SUPABASE_URL = 'https://sgrxosnwmqtiyywiuwyv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNncnhvc253bXF0aXl5d2l1d3l2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUzOTY5NTIsImV4cCI6MjExMDk3Mjk1Mn0.Art4g6gw9uSoJM_6fXmooeWBZgQOLC4Kklwr32LZSMc';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const JWT_SECRET = 'kunci-rahasia-catat-cuan-2026';

// 1. JALUR REGISTER (Simpan akun baru ke tabel 'users' di Supabase)
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password || username.length < 3 || password.length < 3) {
    return res.status(400).json({ pesan: 'Username & password minimal 3 karakter!' });
  }

  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .ilike('username', username.trim())
    .maybeSingle();

  if (existingUser) {
    return res.status(400).json({ pesan: 'Username sudah dipakai, pilih yang lain!' });
  }

  const { error } = await supabase
    .from('users')
    .insert([{ username: username.trim(), password, role: 'user' }]);

  if (error) {
    return res.status(500).json({ pesan: 'Gagal mendaftar ke database!' });
  }

  res.status(201).json({ pesan: 'Registrasi berhasil! Silakan login.' });
});

// 2. JALUR LOGIN (Dengan laporan error jujur)
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  const { data: userCocok, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .eq('password', password)
    .maybeSingle();

  if (error) {
    console.error('ERROR SUPABASE:', error);
    return res.status(500).json({ pesan: `Error Database: ${error.message}` });
  }

  if (!userCocok) {
    return res.status(401).json({ pesan: 'Akun tidak ditemukan di tabel users Supabase!' });
  }

  const token = jwt.sign(
    { username: userCocok.username, role: userCocok.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    username: userCocok.username,
    role: userCocok.role,
    pesan: 'Login berhasil!'
  });
});

// 3. SATPAM (Middleware)
function cekLogin(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ pesan: 'Dilarang masuk! Kamu belum login.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ pesan: 'Sesi habis, silakan login ulang.' });
    }
    req.user = user;
    next();
  });
}

// 4. AMBIL TRANSAKSI MILIK USER DARI SUPABASE
app.get('/api/transaksi', cekLogin, async (req, res) => {
  const { data, error } = await supabase
    .from('transaksi')
    .select('*')
    .eq('pemilik', req.user.username)
    .order('id', { ascending: true });

  if (error) {
    return res.status(500).json({ pesan: 'Gagal mengambil data dari cloud!' });
  }

  res.json(data);
});

// 5. TAMBAH TRANSAKSI BARU KE SUPABASE
app.post('/api/transaksi', cekLogin, async (req, res) => {
  const { nama, nominal, tipe } = req.body;

  if (!nama || nominal <= 0 || !['masuk', 'keluar'].includes(tipe)) {
    return res.status(400).json({ pesan: 'Data tidak valid!' });
  }

  const { data, error } = await supabase
    .from('transaksi')
    .insert([{ pemilik: req.user.username, nama, nominal: Number(nominal), tipe }])
    .select()
    .single();

  if (error) {
    return res.status(500).json({ pesan: 'Gagal menyimpan transaksi ke cloud!' });
  }

  res.status(201).json(data);
});

// 6. HAPUS TRANSAKSI DARI SUPABASE
app.delete('/api/transaksi/:id', cekLogin, async (req, res) => {
  const id = Number(req.params.id);

  const { error } = await supabase
    .from('transaksi')
    .delete()
    .eq('id', id)
    .eq('pemilik', req.user.username);

  if (error) {
    return res.status(500).json({ pesan: 'Gagal menghapus transaksi!' });
  }

  res.json({ pesan: 'Terhapus' });
});

// 7. KHUSUS ADMIN: LIHAT DAFTAR SEMUA AKUN DI SUPABASE
app.get('/api/admin/users', cekLogin, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ pesan: 'Khusus Admin!' });
  }

  const { data, error } = await supabase
    .from('users')
    .select('id, username, role')
    .order('id', { ascending: true });

  if (error) {
    return res.status(500).json({ pesan: 'Gagal memuat daftar user!' });
  }

  res.json(data);
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server Catat Cuan (Supabase Cloud) jalan di http://localhost:${PORT}`);
  });
}

module.exports = app;