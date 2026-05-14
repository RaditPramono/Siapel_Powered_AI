const express = require('express');
const router = express.Router();

function isAuthenticated(req, res, next) {
    if (req.session && req.session.user_id) return next();
    return res.redirect('/login');
}

router.use(isAuthenticated);

router.get('/', async (req, res) => {
    const db = req.db;
    const userId = req.session.user_id;
    
    try {
        const [sessions] = await db.query('SELECT * FROM study_sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 10', [userId]);
        const [today] = await db.query('SELECT COALESCE(SUM(duration_minutes), 0) as total FROM study_sessions WHERE user_id = ? AND DATE(created_at) = CURDATE()', [userId]);
        const [week] = await db.query('SELECT COALESCE(SUM(duration_minutes), 0) as total FROM study_sessions WHERE user_id = ? AND YEARWEEK(created_at) = YEARWEEK(CURDATE())', [userId]);
        
        res.render('study', { 
            user: req.session.user, 
            sessions: sessions, 
            todayMinutes: today[0].total, 
            weekMinutes: week[0].total 
        });
    } catch (err) {
        console.error(err);
        res.render('study', { user: req.session.user, sessions: [], todayMinutes: 0, weekMinutes: 0 });
    }
});

router.post('/save', async (req, res) => {
    const db = req.db;
    const userId = req.session.user_id;
    const { duration, notes } = req.body;
    
    try {
        await db.query('INSERT INTO study_sessions (user_id, duration_minutes, notes) VALUES (?, ?, ?)', [userId, duration, notes || '']);
        
        // TAMBAH POIN UNTUK STUDY SESSION
        await db.query('INSERT INTO user_points (user_id, total_points, study_minutes) VALUES (?, 0, 0) ON DUPLICATE KEY UPDATE user_id = user_id', [userId]);
        await db.query('UPDATE user_points SET study_minutes = study_minutes + ?, total_points = total_points + ? WHERE user_id = ?', [duration, duration, userId]);
        
        // Cek dan beri badge untuk belajar
        const [userPoints] = await db.query('SELECT study_minutes FROM user_points WHERE user_id = ?', [userId]);
        
        if (userPoints[0].study_minutes >= 30 && userPoints[0].study_minutes < 100) {
            await db.query('INSERT IGNORE INTO user_badges (user_id, badge_name, badge_icon) VALUES (?, ?, ?)', [userId, '🌱 Belajar Pemula', 'fa-seedling']);
        }
        if (userPoints[0].study_minutes >= 100 && userPoints[0].study_minutes < 300) {
            await db.query('INSERT IGNORE INTO user_badges (user_id, badge_name, badge_icon) VALUES (?, ?, ?)', [userId, '⭐ Bintang Belajar', 'fa-star']);
        }
        if (userPoints[0].study_minutes >= 300 && userPoints[0].study_minutes < 500) {
            await db.query('INSERT IGNORE INTO user_badges (user_id, badge_name, badge_icon) VALUES (?, ?, ?)', [userId, '🚀 Semangat Belajar', 'fa-rocket']);
        }
        if (userPoints[0].study_minutes >= 500) {
            await db.query('INSERT IGNORE INTO user_badges (user_id, badge_name, badge_icon) VALUES (?, ?, ?)', [userId, '🔥 Gila Belajar', 'fa-fire']);
        }
        
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.json({ success: false });
    }
});

module.exports = router;