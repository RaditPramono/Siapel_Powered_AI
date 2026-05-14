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
        let [points] = await db.query('SELECT * FROM user_points WHERE user_id = ?', [userId]);
        if (points.length === 0) {
            await db.query('INSERT INTO user_points (user_id) VALUES (?)', [userId]);
            [points] = await db.query('SELECT * FROM user_points WHERE user_id = ?', [userId]);
        }
        
        const [badges] = await db.query('SELECT * FROM user_badges WHERE user_id = ? ORDER BY earned_at DESC', [userId]);
        
        const availableBadges = [
            { name: '🎓 Freshman', desc: 'Menyelesaikan 5 tugas', icon: 'fa-graduation-cap', requirement: 5, type: 'tasks' },
            { name: '📚 Pelajar Rajin', desc: 'Menyelesaikan 10 tugas', icon: 'fa-book-reader', requirement: 10, type: 'tasks' },
            { name: '💪 Pekerja Keras', desc: 'Menyelesaikan 20 tugas', icon: 'fa-fist-raised', requirement: 20, type: 'tasks' },
            { name: '⭐ Bintang Pelajar', desc: 'Menyelesaikan 30 tugas', icon: 'fa-star', requirement: 30, type: 'tasks' },
            { name: '🏆 Master', desc: 'Menyelesaikan 50 tugas', icon: 'fa-trophy', requirement: 50, type: 'tasks' },
            { name: '⭐ Bintang Belajar', desc: 'Belajar 100 menit', icon: 'fa-star', requirement: 100, type: 'study' },
            { name: '🔥 Gila Belajar', desc: 'Belajar 500 menit', icon: 'fa-fire', requirement: 500, type: 'study' },
            { name: '📚 Ratu Catatan', desc: 'Membuat 10 catatan', icon: 'fa-book', requirement: 10, type: 'notes' },
            { name: '📝 Rangkuman Expert', desc: 'Membuat 25 catatan', icon: 'fa-pen-fancy', requirement: 25, type: 'notes' }
        ];
        
        res.render('gamification', { user: req.session.user, points: points[0], badges, availableBadges });
    } catch (err) {
        console.error(err);
        res.render('gamification', { user: req.session.user, points: { total_points: 0, tasks_completed: 0, study_minutes: 0, notes_created: 0 }, badges: [], availableBadges: [] });
    }
});

module.exports = router;