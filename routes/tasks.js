const express = require('express');
const router = express.Router();

function isAuthenticated(req, res, next) {
    if (req.session && req.session.user_id) return next();
    return res.redirect('/login');
}

router.use(isAuthenticated);

// Tampilkan semua tasks
router.get('/', async (req, res) => {
    const db = req.db;
    const userId = req.session.user_id;
    try {
        const [tasks] = await db.query('SELECT * FROM tasks WHERE user_id = ? ORDER BY deadline ASC', [userId]);
        res.render('tasks', { tasks, user: req.session.user });
    } catch (err) {
        console.error(err);
        res.render('tasks', { tasks: [], user: req.session.user });
    }
});

// Tambah task
router.post('/add', async (req, res) => {
    const db = req.db;
    const userId = req.session.user_id;
    const { title, description, deadline, priority } = req.body;
    try {
        await db.query('INSERT INTO tasks (user_id, title, description, deadline, priority, status) VALUES (?, ?, ?, ?, ?, ?)', [userId, title, description, deadline, priority, 'belum']);
        res.redirect('/tasks');
    } catch (err) {
        console.error(err);
        res.redirect('/tasks');
    }
});

// Hapus task
router.post('/delete/:id', async (req, res) => {
    const db = req.db;
    const userId = req.session.user_id;
    const taskId = req.params.id;
    try {
        await db.query('DELETE FROM tasks WHERE id = ? AND user_id = ?', [taskId, userId]);
        res.redirect('/tasks');
    } catch (err) {
        console.error(err);
        res.redirect('/tasks');
    }
});

// Tandai selesai / belum dengan AUTO POIN & BADGE
router.post('/toggle/:id', async (req, res) => {
    const db = req.db;
    const userId = req.session.user_id;
    const taskId = req.params.id;
    
    try {
        const [tasks] = await db.query('SELECT status FROM tasks WHERE id = ? AND user_id = ?', [taskId, userId]);
        if (tasks.length > 0) {
            const newStatus = tasks[0].status === 'selesai' ? 'belum' : 'selesai';
            await db.query('UPDATE tasks SET status = ? WHERE id = ? AND user_id = ?', [newStatus, taskId, userId]);
            
            // KETIKA TUGAS DISELESAIKAN
            if (newStatus === 'selesai') {
                console.log('✅ Tugas selesai! Update poin & badge untuk user:', userId);
                
                // 1. Buat/user_points kalau belum ada
                await db.query(`INSERT INTO user_points (user_id, total_points, tasks_completed, study_minutes, notes_created) 
                               VALUES (?, 0, 0, 0, 0) 
                               ON DUPLICATE KEY UPDATE user_id = user_id`, [userId]);
                
                // 2. Tambah poin +10 dan tasks_completed +1
                await db.query(`UPDATE user_points 
                               SET tasks_completed = tasks_completed + 1, 
                                   total_points = total_points + 10 
                               WHERE user_id = ?`, [userId]);
                
                // 3. Ambil jumlah tugas yang sudah selesai
                const [userPoints] = await db.query('SELECT tasks_completed FROM user_points WHERE user_id = ?', [userId]);
                let tugasSelesai = userPoints[0].tasks_completed;
                console.log(`📊 Total tugas selesai untuk user ${userId}: ${tugasSelesai}`);
                
                // 4. Beri badge berdasarkan jumlah tugas selesai
                if (tugasSelesai >= 5) {
                    await db.query(`INSERT IGNORE INTO user_badges (user_id, badge_name, badge_icon) 
                                   VALUES (?, '🎓 Freshman', 'fa-graduation-cap')`, [userId]);
                    console.log('🏆 Badge Freshman diberikan!');
                }
                if (tugasSelesai >= 10) {
                    await db.query(`INSERT IGNORE INTO user_badges (user_id, badge_name, badge_icon) 
                                   VALUES (?, '📚 Pelajar Rajin', 'fa-book-reader')`, [userId]);
                    console.log('🏆 Badge Pelajar Rajin diberikan!');
                }
                if (tugasSelesai >= 20) {
                    await db.query(`INSERT IGNORE INTO user_badges (user_id, badge_name, badge_icon) 
                                   VALUES (?, '💪 Pekerja Keras', 'fa-fist-raised')`, [userId]);
                    console.log('🏆 Badge Pekerja Keras diberikan!');
                }
                if (tugasSelesai >= 30) {
                    await db.query(`INSERT IGNORE INTO user_badges (user_id, badge_name, badge_icon) 
                                   VALUES (?, '⭐ Bintang Pelajar', 'fa-star')`, [userId]);
                    console.log('🏆 Badge Bintang Pelajar diberikan!');
                }
                if (tugasSelesai >= 50) {
                    await db.query(`INSERT IGNORE INTO user_badges (user_id, badge_name, badge_icon) 
                                   VALUES (?, '🏆 Master', 'fa-trophy')`, [userId]);
                    console.log('🏆 Badge Master diberikan!');
                }
            }
        }
        res.redirect('/tasks');
    } catch (err) {
        console.error('❌ Error di toggle task:', err);
        res.redirect('/tasks');
    }
});

// AI Breakdown
router.post('/ai-breakdown/:id', async (req, res) => {
    const db = req.db;
    const userId = req.session.user_id;
    const taskId = req.params.id;
    
    try {
        const [tasks] = await db.query('SELECT title, description FROM tasks WHERE id = ? AND user_id = ?', [taskId, userId]);
        if (tasks.length === 0) return res.json({ success: false, error: 'Tugas tidak ditemukan' });
        const task = tasks[0];
        const breakdown = `📋 BREAKDOWN TUGAS: ${task.title}\n\n📝 Deskripsi: ${task.description || 'Tidak ada deskripsi'}\n\n✅ Langkah-langkah:\n1. Baca dan pahami tugas dengan seksama\n2. Kumpulkan referensi yang dibutuhkan\n3. Buat kerangka pengerjaan\n4. Kerjakan sesuai kerangka\n5. Review sebelum dikumpulkan\n\n💡 Tips: Kerjakan dari yang paling mudah!`;
        res.json({ success: true, breakdown });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: err.message });
    }
});

module.exports = router;