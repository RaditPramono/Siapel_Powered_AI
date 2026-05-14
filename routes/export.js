const express = require('express');
const ExcelJS = require('exceljs');
const router = express.Router();

function isAuthenticated(req, res, next) {
    if (req.session && req.session.user_id) return next();
    return res.redirect('/login');
}

router.use(isAuthenticated);

// Ekspor tugas ke Excel
router.get('/tasks/excel', async (req, res) => {
    const db = req.db;
    const userId = req.session.user_id;
    
    try {
        const [tasks] = await db.query('SELECT title, description, deadline, priority, status FROM tasks WHERE user_id = ? ORDER BY deadline ASC', [userId]);
        
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Daftar Tugas');
        
        worksheet.columns = [
            { header: 'No', key: 'no', width: 10 },
            { header: 'Judul Tugas', key: 'title', width: 30 },
            { header: 'Deskripsi', key: 'description', width: 40 },
            { header: 'Deadline', key: 'deadline', width: 20 },
            { header: 'Prioritas', key: 'priority', width: 15 },
            { header: 'Status', key: 'status', width: 15 }
        ];
        
        tasks.forEach((task, index) => {
            worksheet.addRow({
                no: index + 1,
                title: task.title,
                description: task.description || '-',
                deadline: new Date(task.deadline).toLocaleDateString('id-ID'),
                priority: task.priority === 'tinggi' ? 'Tinggi' : task.priority === 'sedang' ? 'Sedang' : 'Rendah',
                status: task.status === 'selesai' ? 'Selesai' : 'Belum Selesai'
            });
        });
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=daftar_tugas.xlsx');
        
        await workbook.xlsx.write(res);
        res.end();
        
    } catch (err) {
        console.error(err);
        res.status(500).send('Gagal ekspor data');
    }
});

// Ekspor catatan ke Excel
router.get('/notes/excel', async (req, res) => {
    const db = req.db;
    const userId = req.session.user_id;
    
    try {
        const [notes] = await db.query('SELECT title, content, subject, created_at FROM notes WHERE user_id = ? ORDER BY created_at DESC', [userId]);
        
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Daftar Catatan');
        
        worksheet.columns = [
            { header: 'No', key: 'no', width: 10 },
            { header: 'Judul', key: 'title', width: 30 },
            { header: 'Isi', key: 'content', width: 50 },
            { header: 'Mata Pelajaran', key: 'subject', width: 20 },
            { header: 'Tanggal Dibuat', key: 'created_at', width: 20 }
        ];
        
        notes.forEach((note, index) => {
            worksheet.addRow({
                no: index + 1,
                title: note.title,
                content: note.content.substring(0, 500),
                subject: note.subject || '-',
                created_at: new Date(note.created_at).toLocaleDateString('id-ID')
            });
        });
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=daftar_catatan.xlsx');
        
        await workbook.xlsx.write(res);
        res.end();
        
    } catch (err) {
        console.error(err);
        res.status(500).send('Gagal ekspor data');
    }
});

module.exports = router;