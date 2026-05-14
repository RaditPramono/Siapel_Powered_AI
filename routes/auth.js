const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();

// Halaman Login
router.get('/login', (req, res) => {
    res.render('login', { error: null });
});

// Proses Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const db = req.db;

    try {
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        
        if (users.length === 0) {
            return res.render('login', { error: 'Email tidak ditemukan' });
        }

        const user = users[0];
        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
            return res.render('login', { error: 'Password salah' });
        }

        req.session.user_id = user.id;
        req.session.user = user;
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        res.render('login', { error: 'Terjadi kesalahan' });
    }
});

// Halaman Register
router.get('/register', (req, res) => {
    res.render('register', { error: null });
});

// Proses Register
router.post('/register', async (req, res) => {
    const { name, email, password, kelas } = req.body;
    const db = req.db;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query(
            'INSERT INTO users (name, email, password, kelas) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, kelas]
        );
        res.redirect('/login');
    } catch (err) {
        console.error(err);
        res.render('register', { error: 'Email sudah terdaftar' });
    }
});

// Dashboard
router.get('/dashboard', async (req, res) => {
    if (!req.session.user_id) {
        return res.redirect('/login');
    }

    const db = req.db;
    const userId = req.session.user_id;

    try {
        // Ambil SEMUA tugas untuk statistik
        const [allTasks] = await db.query(
            'SELECT * FROM tasks WHERE user_id = ? ORDER BY deadline ASC',
            [userId]
        );
        
        // Ambil tugas yang BELUM selesai dengan deadline terdekat (max 3)
        const [urgentTasks] = await db.query(
            'SELECT * FROM tasks WHERE user_id = ? AND status = "belum" ORDER BY deadline ASC LIMIT 3',
            [userId]
        );
        
        // AMBIL HISTORY CHAT (10 terakhir) - PAKAI TRY CATCH BIAR GAK ERROR
        let chatHistory = [];
        try {
            const [history] = await db.query(
                'SELECT message, reply, created_at FROM chat_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
                [userId]
            );
            chatHistory = history.reverse();
        } catch (err) {
            console.log('Tabel chat_history belum ada, skip...');
        }
        
        // Telegram reminder (pakai try catch biar gak ganggu)
        try {
            const { checkAndSendReminders } = require('../services/telegramService');
            await checkAndSendReminders(db);
        } catch (err) {
            console.log('Telegram error:', err.message);
        }
        
        res.render('dashboard', { 
            user: req.session.user, 
            tasks: allTasks,
            urgentTasks: urgentTasks,
            chatHistory: chatHistory
        });
    } catch (err) {
        console.error('Dashboard error:', err);
        res.render('dashboard', { 
            user: req.session.user, 
            tasks: [], 
            urgentTasks: [], 
            chatHistory: [] 
        });
    }
});

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

module.exports = router;