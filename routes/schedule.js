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
        const [schedules] = await db.query('SELECT * FROM schedules WHERE user_id = ? ORDER BY FIELD(day, "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu")', [userId]);
        res.render('schedule', { schedules, user: req.session.user });
    } catch (err) {
        console.error(err);
        res.render('schedule', { schedules: [], user: req.session.user });
    }
});

router.post('/add', async (req, res) => {
    const db = req.db;
    const userId = req.session.user_id;
    const { subject, day, start_time, end_time, room, teacher } = req.body;
    try {
        await db.query('INSERT INTO schedules (user_id, subject, day, start_time, end_time, room, teacher) VALUES (?, ?, ?, ?, ?, ?, ?)', [userId, subject, day, start_time, end_time, room, teacher]);
        res.redirect('/schedule');
    } catch (err) {
        console.error(err);
        res.redirect('/schedule');
    }
});

router.post('/delete/:id', async (req, res) => {
    const db = req.db;
    const userId = req.session.user_id;
    const scheduleId = req.params.id;
    try {
        await db.query('DELETE FROM schedules WHERE id = ? AND user_id = ?', [scheduleId, userId]);
        res.redirect('/schedule');
    } catch (err) {
        console.error(err);
        res.redirect('/schedule');
    }
});

module.exports = router;