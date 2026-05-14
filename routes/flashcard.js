const express = require('express');
const router = express.Router();

function isAuthenticated(req, res, next) {
    if (req.session && req.session.user_id) return next();
    return res.redirect('/login');
}

router.use(isAuthenticated);

// Halaman utama flashcards
router.get('/', async (req, res) => {
    const db = req.db;
    const userId = req.session.user_id;
    
    try {
        const [flashcards] = await db.query('SELECT * FROM flashcards WHERE user_id = ? ORDER BY mastered ASC, created_at DESC', [userId]);
        const [sets] = await db.query('SELECT * FROM flashcard_sets WHERE user_id = ?', [userId]);
        
        // Statistik
        const [total] = await db.query('SELECT COUNT(*) as total FROM flashcards WHERE user_id = ?', [userId]);
        const [mastered] = await db.query('SELECT COUNT(*) as mastered FROM flashcards WHERE user_id = ? AND mastered = TRUE', [userId]);
        
        res.render('flashcard', { 
            user: req.session.user, 
            flashcards, 
            sets,
            stats: {
                total: total[0].total,
                mastered: mastered[0].mastered,
                percent: total[0].total > 0 ? Math.round(mastered[0].mastered / total[0].total * 100) : 0
            }
        });
    } catch (err) {
        console.error(err);
        res.render('flashcard', { user: req.session.user, flashcards: [], sets: [], stats: { total: 0, mastered: 0, percent: 0 } });
    }
});

// Tambah flashcard
router.post('/add', async (req, res) => {
    const db = req.db;
    const userId = req.session.user_id;
    const { title, question, answer, category, difficulty } = req.body;
    
    try {
        await db.query('INSERT INTO flashcards (user_id, title, question, answer, category, difficulty) VALUES (?, ?, ?, ?, ?, ?)', 
            [userId, title, question, answer, category || null, difficulty || 'sedang']);
        res.redirect('/flashcard');
    } catch (err) {
        console.error(err);
        res.redirect('/flashcard');
    }
});

// Hapus flashcard
router.post('/delete/:id', async (req, res) => {
    const db = req.db;
    const userId = req.session.user_id;
    const cardId = req.params.id;
    
    try {
        await db.query('DELETE FROM flashcards WHERE id = ? AND user_id = ?', [cardId, userId]);
        res.redirect('/flashcard');
    } catch (err) {
        console.error(err);
        res.redirect('/flashcard');
    }
});

// Tandai mastered
router.post('/mastered/:id', async (req, res) => {
    const db = req.db;
    const userId = req.session.user_id;
    const cardId = req.params.id;
    
    try {
        await db.query('UPDATE flashcards SET mastered = TRUE WHERE id = ? AND user_id = ?', [cardId, userId]);
        res.redirect('/flashcard');
    } catch (err) {
        console.error(err);
        res.redirect('/flashcard');
    }
});

// Mode belajar (acak kartu)
router.get('/study/:setId?', async (req, res) => {
    const db = req.db;
    const userId = req.session.user_id;
    const setId = req.params.setId;
    
    try {
        let query = 'SELECT * FROM flashcards WHERE user_id = ? ORDER BY RAND()';
        let params = [userId];
        
        if (setId && setId !== 'all') {
            query = 'SELECT * FROM flashcards WHERE user_id = ? AND set_id = ? ORDER BY RAND()';
            params = [userId, setId];
        }
        
        const [cards] = await db.query(query, params);
        res.render('flashcard-study', { user: req.session.user, cards, currentIndex: 0 });
    } catch (err) {
        console.error(err);
        res.redirect('/flashcard');
    }
});

module.exports = router;