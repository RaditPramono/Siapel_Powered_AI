const express = require('express');
const router = express.Router();

function isAuthenticated(req, res, next) {
    if (req.session && req.session.user_id) return next();
    return res.redirect('/login');
}

router.use(isAuthenticated);

// Halaman setting Telegram
router.get('/setup', (req, res) => {
    res.render('telegram-setup', { user: req.session.user, error: null, success: null });
});

// Simpan Telegram ID
router.post('/save', async (req, res) => {
    const db = req.db;
    const userId = req.session.user_id;
    const { telegram_id } = req.body;
    
    try {
        await db.query('UPDATE users SET telegram_id = ? WHERE id = ?', [telegram_id, userId]);
        res.render('telegram-setup', { user: req.session.user, error: null, success: 'Telegram ID berhasil disimpan! Kamu akan menerima reminder.' });
    } catch (err) {
        console.error(err);
        res.render('telegram-setup', { user: req.session.user, error: 'Gagal menyimpan', success: null });
    }
});

// Test kirim pesan
router.post('/test', async (req, res) => {
    const db = req.db;
    const userId = req.session.user_id;
    const { sendTelegramMessage } = require('../services/telegramService');
    
    try {
        const [users] = await db.query('SELECT telegram_id FROM users WHERE id = ?', [userId]);
        const telegramId = users[0].telegram_id;
        
        if (!telegramId) {
            return res.render('telegram-setup', { user: req.session.user, error: 'Telegram ID belum diisi', success: null });
        }
        
        await sendTelegramMessage(telegramId, '✅ <b>Test Notifikasi SIAPEL</b>\n\nKoneksi berhasil! Kamu akan menerima reminder tugas otomatis.');
        res.render('telegram-setup', { user: req.session.user, error: null, success: 'Pesan test terkirim! Cek Telegram kamu.' });
    } catch (err) {
        console.error(err);
        res.render('telegram-setup', { user: req.session.user, error: 'Gagal mengirim test', success: null });
    }
});

module.exports = router;