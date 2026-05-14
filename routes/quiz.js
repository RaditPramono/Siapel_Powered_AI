const express = require('express');
const router = express.Router();

function isAuthenticated(req, res, next) {
    if (req.session && req.session.user_id) return next();
    return res.redirect('/login');
}

router.use(isAuthenticated);

// Halaman daftar quiz (group by note_id - 1 catatan jadi 1 paket)
router.get('/', async (req, res) => {
    const db = req.db;
    const userId = req.session.user_id;
    
    try {
        // Ambil daftar note yang memiliki quiz (group by note_id)
        const [quizzes] = await db.query(`
            SELECT DISTINCT q.note_id, n.title as note_title, COUNT(q.id) as total_soal
            FROM quizzes q 
            JOIN notes n ON q.note_id = n.id 
            WHERE n.user_id = ?
            GROUP BY q.note_id, n.title
        `, [userId]);
        
        res.render('quiz', { quizzes: quizzes || [], user: req.session.user });
    } catch (err) {
        console.error(err);
        res.render('quiz', { quizzes: [], user: req.session.user });
    }
});

// Ambil SEMUA soal dari 1 note (10 soal sekaligus)
router.get('/take/:noteId', async (req, res) => {
    const db = req.db;
    const noteId = req.params.noteId;
    
    try {
        // Ambil semua soal dengan note_id yang sama
        const [questions] = await db.query('SELECT * FROM quizzes WHERE note_id = ? ORDER BY id ASC', [noteId]);
        
        if (questions.length === 0) {
            return res.redirect('/quiz');
        }
        
        // Ambil judul note
        const [note] = await db.query('SELECT title FROM notes WHERE id = ?', [noteId]);
        
        res.render('quiz-take', { 
            user: req.session.user, 
            questions: questions,
            noteId: noteId,
            noteTitle: note[0]?.title || 'Quiz',
            total: questions.length
        });
    } catch (err) {
        console.error('Error take quiz:', err);
        res.redirect('/quiz');
    }
});

// Submit SEMUA jawaban sekaligus (untuk 10 soal)
router.post('/submit-all', async (req, res) => {
    const db = req.db;
    const userId = req.session.user_id;
    const { note_id, total } = req.body;
    
    try {
        // Ambil semua correct_answer untuk note ini
        const [questions] = await db.query('SELECT id, correct_answer FROM quizzes WHERE note_id = ?', [note_id]);
        let score = 0;
        
        for (const q of questions) {
            const userAnswer = req.body[`answer_${q.id}`];
            const isCorrect = userAnswer && userAnswer === q.correct_answer;
            if (isCorrect) score++;
            
            // Simpan hasil setiap soal
            await db.query(
                'INSERT INTO quiz_results (user_id, quiz_id, user_answer, is_correct) VALUES (?, ?, ?, ?)',
                [userId, q.id, userAnswer || '', isCorrect]
            );
        }
        
        // Redirect ke halaman hasil
        res.redirect(`/quiz/result?score=${score}&total=${questions.length}&note_id=${note_id}`);
    } catch (err) {
        console.error('Error submit quiz:', err);
        res.redirect('/quiz');
    }
});

// Halaman hasil quiz
router.get('/result', async (req, res) => {
    const { score, total, note_id } = req.query;
    const db = req.db;
    
    try {
        const [note] = await db.query('SELECT title FROM notes WHERE id = ?', [note_id]);
        res.render('quiz-result', { 
            user: req.session.user, 
            score: score || 0, 
            total: total || 0,
            noteTitle: note[0]?.title || 'Quiz',
            percentage: total > 0 ? Math.round((score || 0) / total * 100) : 0
        });
    } catch (err) {
        res.render('quiz-result', { 
            user: req.session.user, 
            score: score || 0, 
            total: total || 0,
            noteTitle: 'Quiz',
            percentage: 0
        });
    }
});

module.exports = router;