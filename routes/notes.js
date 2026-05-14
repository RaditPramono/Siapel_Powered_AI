const express = require('express');
const router = express.Router();

function isAuthenticated(req, res, next) {
    if (req.session && req.session.user_id) return next();
    return res.redirect('/login');
}

router.use(isAuthenticated);

// Tampilkan semua notes
router.get('/', async (req, res) => {
    const db = req.db;
    const userId = req.session.user_id;
    
    try {
        const [notes] = await db.query('SELECT * FROM notes WHERE user_id = ? ORDER BY updated_at DESC', [userId]);
        res.render('notes', { notes, user: req.session.user });
    } catch (err) {
        console.error(err);
        res.render('notes', { notes: [], user: req.session.user });
    }
});

// Tambah note
router.post('/add', async (req, res) => {
    const db = req.db;
    const userId = req.session.user_id;
    const { title, content, subject } = req.body;
    
    try {
        await db.query('INSERT INTO notes (user_id, title, content, subject) VALUES (?, ?, ?, ?)', [userId, title, content, subject]);
        
        // Tambah poin untuk catatan baru
        await db.query('INSERT INTO user_points (user_id, total_points, notes_created) VALUES (?, 0, 0) ON DUPLICATE KEY UPDATE user_id = user_id', [userId]);
        await db.query('UPDATE user_points SET notes_created = notes_created + 1, total_points = total_points + 5 WHERE user_id = ?', [userId]);
        
        // Cek badge
        const [userPoints] = await db.query('SELECT notes_created FROM user_points WHERE user_id = ?', [userId]);
        if (userPoints[0].notes_created === 5) {
            await db.query('INSERT IGNORE INTO user_badges (user_id, badge_name, badge_icon) VALUES (?, ?, ?)', [userId, '📝 Perangkum Pemula', 'fa-pen']);
        }
        if (userPoints[0].notes_created === 10) {
            await db.query('INSERT IGNORE INTO user_badges (user_id, badge_name, badge_icon) VALUES (?, ?, ?)', [userId, '📚 Ratu Catatan', 'fa-book']);
        }
        if (userPoints[0].notes_created === 25) {
            await db.query('INSERT IGNORE INTO user_badges (user_id, badge_name, badge_icon) VALUES (?, ?, ?)', [userId, '📝 Rangkuman Expert', 'fa-pen-fancy']);
        }
        
        res.redirect('/notes');
    } catch (err) {
        console.error(err);
        res.redirect('/notes');
    }
});

// Hapus note
router.post('/delete/:id', async (req, res) => {
    const db = req.db;
    const userId = req.session.user_id;
    const noteId = req.params.id;
    
    try {
        await db.query('DELETE FROM notes WHERE id = ? AND user_id = ?', [noteId, userId]);
        res.redirect('/notes');
    } catch (err) {
        console.error(err);
        res.redirect('/notes');
    }
});

// ========== PERUBAHAN: GENERATE 10 SOAL SEKALIGUS ==========
router.post('/generate-quiz/:id', async (req, res) => {
    const db = req.db;
    const userId = req.session.user_id;
    const noteId = req.params.id;
    const { generateQuizFromNote } = require('../services/geminiService');
    
    try {
        const [notes] = await db.query('SELECT title, content FROM notes WHERE id = ? AND user_id = ?', [noteId, userId]);
        
        if (notes.length === 0) {
            return res.json({ success: false, error: 'Catatan tidak ditemukan' });
        }
        
        console.log('📝 Generate 10 soal untuk note:', notes[0].title);
        
        // Generate 10 soal sekaligus (sudah diatur di geminiService.js)
        const questions = await generateQuizFromNote(notes[0].title, notes[0].content);
        
        if (questions.length === 0) {
            return res.json({ success: false, count: 0 });
        }
        
        // HAPUS SEMUA QUIZ LAMA UNTUK NOTE INI (biar gak double)
        await db.query('DELETE FROM quizzes WHERE note_id = ?', [noteId]);
        
        // SIMPAN SEMUA SOAL (10 soal)
        for (const q of questions) {
            await db.query(
                `INSERT INTO quizzes (note_id, question, option_a, option_b, option_c, option_d, correct_answer, explanation) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [noteId, q.question, q.options.A || '', q.options.B || '', q.options.C || '', q.options.D || '', q.correct, q.explanation || '']
            );
        }
        
        console.log(`✅ Berhasil generate ${questions.length} soal untuk note ${noteId}`);
        res.json({ success: true, count: questions.length });
        
    } catch (err) {
        console.error('❌ Error generate quiz:', err);
        res.json({ success: false, error: err.message });
    }
});

module.exports = router;