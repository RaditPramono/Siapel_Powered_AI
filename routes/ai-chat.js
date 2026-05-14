const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { extractTextFromFile } = require('../services/fileProcessor');
const { chatWithAI } = require('../services/groqService');

// Setup upload folder
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

function isAuthenticated(req, res, next) {
    if (req.session && req.session.user_id) return next();
    return res.redirect('/login');
}

router.use(isAuthenticated);

// Halaman AI Assistant
router.get('/', (req, res) => {
    res.render('ai-chat', { user: req.session.user });
});

// Ambil riwayat chat (untuk widget dashboard)
router.get('/history', async (req, res) => {
    try {
        const [rows] = await req.db.query(
            'SELECT message, reply FROM chat_history WHERE user_id = ? ORDER BY created_at ASC LIMIT 20',
            [req.session.user_id]
        );
        res.json({ history: rows });
    } catch (err) {
        res.json({ history: [] });
    }
});

// Hapus riwayat chat
router.post('/clear-history', async (req, res) => {
    try {
        await req.db.query('DELETE FROM chat_history WHERE user_id = ?', [req.session.user_id]);
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        res.redirect('/dashboard');
    }
});

// Endpoint chat dengan file upload dan simpan ke database
router.post('/chat', upload.single('file'), async (req, res) => {
    const { message } = req.body;
    const file = req.file;
    const userName = req.session.user.name;
    const userId = req.session.user_id;
    
    let fileContent = '';
    let userMessage = message || '';
    
    // Proses file jika ada
    if (file) {
        const filePath = file.path;
        const extracted = await extractTextFromFile(filePath, file.originalname);
        
        if (extracted.type === 'image') {
            fileContent = `\n\n[Gambar diupload: ${file.originalname}] Deskripsikan dan bantu jawab berdasarkan gambar.\n\n`;
            userMessage = message ? message : `[Upload gambar: ${file.originalname}]`;
        } else if (extracted.type === 'text') {
            fileContent = `\n\n--- ISI FILE (${file.originalname}) ---\n${extracted.content.substring(0, 3000)}\n--- AKHIR FILE ---\n\n`;
            userMessage = message ? message : `[Upload file: ${file.originalname}]`;
        }
        
        try { fs.unlinkSync(filePath); } catch(e) {}
    }
    
    const fullMessage = message + fileContent;
    
    // Validasi input
    if (!fullMessage.trim() && !file) {
        return res.json({ reply: 'Halo! Ada yang bisa saya bantu? Silakan tulis pertanyaan atau upload file.' });
    }
    
    try {
        const reply = await chatWithAI(fullMessage, userName);
        
        // Simpan ke database jika sukses
        if (userMessage && reply) {
            await req.db.query(
                'INSERT INTO chat_history (user_id, message, reply) VALUES (?, ?, ?)',
                [userId, userMessage.substring(0, 500), reply.substring(0, 2000)]
            );
            console.log('✅ Chat berhasil disimpan ke database');
        }
        
        res.json({ reply });
        
    } catch (error) {
        console.error('Chat error detail:', error);
        
        let errorMessage = 'Maaf, terjadi kesalahan. Coba lagi ya!';
        
        if (error.message && error.message.includes('API')) {
            errorMessage = 'Maaf, layanan AI sedang sibuk. Coba lagi beberapa saat.';
        } else if (error.message && error.message.includes('timeout')) {
            errorMessage = 'Koneksi timeout. Periksa koneksi internetmu.';
        }
        
        res.json({ reply: errorMessage });
    }
});

module.exports = router;