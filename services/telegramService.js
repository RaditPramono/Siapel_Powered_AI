const https = require('https');

function sendTelegramMessage(chatId, message) {
    return new Promise((resolve) => {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (!token) {
            console.log('❌ TELEGRAM_BOT_TOKEN tidak ditemukan di .env');
            return resolve(false);
        }
        
        const data = JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML'
        });
        
        const url = `https://api.telegram.org/bot${token}/sendMessage`;
        const parsedUrl = new URL(url);
        
        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };
        
        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => { responseData += chunk; });
            res.on('end', () => {
                try {
                    const json = JSON.parse(responseData);
                    if (json.ok) {
                        console.log('✅ Pesan Telegram terkirim ke', chatId);
                        resolve(true);
                    } else {
                        console.log('❌ Gagal kirim:', json.description);
                        resolve(false);
                    }
                } catch (e) {
                    console.log('❌ Error parsing response');
                    resolve(false);
                }
            });
        });
        
        req.on('error', (err) => {
            console.error('❌ Telegram error:', err.message);
            resolve(false);
        });
        
        req.write(data);
        req.end();
    });
}

async function checkAndSendReminders(db) {
    try {
        const [users] = await db.query('SELECT id, name, telegram_id FROM users WHERE telegram_id IS NOT NULL AND telegram_id != ""');
        
        console.log(`📢 Cek reminder untuk ${users.length} user...`);
        
        for (const user of users) {
            const [tasks] = await db.query(`
                SELECT id, title, deadline 
                FROM tasks 
                WHERE user_id = ? 
                    AND status = 'belum' 
                    AND deadline <= DATE_ADD(NOW(), INTERVAL 1 DAY)
                    AND deadline > NOW()
            `, [user.id]);
            
            if (tasks.length > 0) {
                let message = `📢 <b>Reminder Tugas - SIAPEL</b>\n\nHalo <b>${user.name}</b>! Kamu punya ${tasks.length} tugas yang deadline kurang dari 24 jam:\n\n`;
                tasks.forEach((task, i) => {
                    const deadline = new Date(task.deadline).toLocaleDateString('id-ID');
                    message += `${i+1}. <b>${task.title}</b>\n   ⏰ Deadline: ${deadline}\n`;
                });
                message += `\nJangan lupa dikerjakan ya! 💪\n\n- SIAPEL Team`;
                
                await sendTelegramMessage(user.telegram_id, message);
                console.log(`✅ Reminder terkirim ke ${user.name} (${user.telegram_id})`);
            }
        }
    } catch (err) {
        console.error('❌ Error check reminders:', err.message);
    }
}

module.exports = { sendTelegramMessage, checkAndSendReminders };