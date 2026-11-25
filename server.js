const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const SUPABASE_URL = 'https://sgrxosnwmqtiyywiuwyv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNncnhvc253bXF0aXl5d2l1d3l2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUzOTY5NTIsImV4cCI6MjExMDk3Mjk1Mn0.Art4g6gw9uSoJM_6fXmooeWBZgQOLC4Kklwr32LZSMc';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const JWT_SECRET = 'kunci-rahasia-catat-cuan-2026';

// 1. REGISTER
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

// 2. LOGIN
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const { data: userCocok, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .eq('password', password)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ pesan: `Error Database: ${error.message}` });
  }
  if (!userCocok) {
    return res.status(401).json({ pesan: 'Username atau password salah!' });
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

// 3. MIDDLEWARE AUTH
function cekLogin(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ pesan: 'Dilarang masuk! Kamu belum login.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ pesan: 'Sesi habis, silakan login ulang.' });
    req.user = user;
    next();
  });
}

// 4. AMBIL TRANSAKSI USER
app.get('/api/transaksi', cekLogin, async (req, res) => {
  const { data, error } = await supabase
    .from('transaksi')
    .select('*')
    .eq('pemilik', req.user.username)
    .order('id', { ascending: false });

  if (error) return res.status(500).json({ pesan: 'Gagal mengambil data dari cloud!' });
  res.json(data);
});

// 5. TAMBAH TRANSAKSI BARU (Dengan Kategori & Waktu)
app.post('/api/transaksi', cekLogin, async (req, res) => {
  const { nama, nominal, tipe, kategori, waktu } = req.body;

  if (!nama || nominal <= 0 || !['masuk', 'keluar'].includes(tipe)) {
    return res.status(400).json({ pesan: 'Data tidak valid!' });
  }

  const waktuFinal = waktu || new Date().toISOString().slice(0, 16);
  const kategoriFinal = kategori || 'Umum';

  const { data, error } = await supabase
    .from('transaksi')
    .insert([{
      pemilik: req.user.username,
      nama,
      nominal: Number(nominal),
      tipe,
      kategori: kategoriFinal,
      waktu: waktuFinal
    }])
    .select()
    .single();

  if (error) {
    console.error('INSERT ERROR:', error);
    return res.status(500).json({ pesan: `Gagal menyimpan: ${error.message}` });
  }

  res.status(201).json(data);
});

// 6. HAPUS TRANSAKSI
app.delete('/api/transaksi/:id', cekLogin, async (req, res) => {
  const id = Number(req.params.id);
  const { error } = await supabase
    .from('transaksi')
    .delete()
    .eq('id', id)
    .eq('pemilik', req.user.username);

  if (error) return res.status(500).json({ pesan: 'Gagal menghapus transaksi!' });
  res.json({ pesan: 'Terhapus' });
});

// 7. ADMIN USERS
app.get('/api/admin/users', cekLogin, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ pesan: 'Khusus Admin!' });

  const { data, error } = await supabase
    .from('users')
    .select('id, username, role')
    .order('id', { ascending: true });

  if (error) return res.status(500).json({ pesan: 'Gagal memuat daftar user!' });
  res.json(data);
});

// 8. AI FINANCIAL PLANNER
app.post('/api/ai-plan', cekLogin, async (req, res) => {
  const { pertanyaan } = req.body;
  if (!pertanyaan) return res.status(400).json({ pesan: 'Tulis pertanyaanmu dulu!' });

  try {
    const { data: transaksi } = await supabase
      .from('transaksi')
      .select('nama, nominal, tipe, kategori, waktu')
      .eq('pemilik', req.user.username)
      .order('id', { ascending: false });

    let totalMasuk = 0;
    let totalKeluar = 0;
    const daftarTeks = (transaksi || []).map((t) => {
      if (t.tipe === 'masuk') totalMasuk += Number(t.nominal);
      else totalKeluar += Number(t.nominal);
      const tgl = t.waktu ? `[${t.waktu.replace('T', ' ')}] ` : '';
      const kat = t.kategori ? `(${t.kategori}) ` : '';
      return `- ${tgl}${kat}${t.nama}: ${t.tipe === 'masuk' ? '+' : '-'}Rp ${Number(t.nominal).toLocaleString('id-ID')}`;
    }).join('\n');

    const sisaSaldo = totalMasuk - totalKeluar;

    const prompt = `Kamu adalah asisten perencana keuangan (Financial Planner) pribadi untuk user "${req.user.username}" di aplikasi Catat Cuan.
Data keuangan saat ini:
- Total Pemasukan: Rp ${totalMasuk.toLocaleString('id-ID')}
- Total Pengeluaran: Rp ${totalKeluar.toLocaleString('id-ID')}
- Sisa Saldo Saat Ini: Rp ${sisaSaldo.toLocaleString('id-ID')}
- Riwayat Transaksi:
${daftarTeks || '(Belum ada transaksi)'}

Pertanyaan user: "${pertanyaan}"

Berikan jawaban yang praktis, cerdas, langsung memakai angka nyata berdasarkan saldo dan kategori transaksi di atas, dalam bahasa Indonesia yang ringkas.`;

    let response, lastErr;
    for (const m of ['gemini-3.5-flash-lite', 'gemini-3.8-flash']) {
      try {
        response = await ai.models.generateContent({ model: m, contents: prompt });
        if (response && response.text) break;
      } catch (e) {
        lastErr = e;
      }
    }

    if (!response || !response.text) throw lastErr || new Error('Semua model AI sedang sibuk');
    res.json({ jawaban: response.text });
  } catch (error) {
    console.error('ERROR AI:', error);
    res.status(500).json({ pesan: 'Error AI: ' + (error.message || JSON.stringify(error)) });
  }
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server Catat Cuan jalan di http://localhost:${PORT}`);
  });
}

module.exports = app;