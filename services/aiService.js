const { GoogleGenerativeAI } = require('@google/generative-ai');

async function getAIResponse(userMessage, userName) {
    const apiKey = process.env.GEMINI_API_KEY;
    
    // Kalau gak ada API key, pake response default
    if (!apiKey) {
        console.log('⚠️ GEMINI_API_KEY tidak ditemukan di .env, pake response default');
        return getDefaultResponse(userMessage);
    }
    
    try {
        // Inisialisasi Gemini
        const genAI = new GoogleGenerativeAI(apiKey);
        
        // PAKAI MODEL YANG MASIH AKTIF (gemini-2.0-flash atau gemini-1.5-flash)
        // Coba beberapa model sampai nemu yang jalan
        let model = null;
        let modelName = '';
        
        const modelsToTry = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-pro'];
        
        for (const tryModel of modelsToTry) {
            try {
                model = genAI.getGenerativeModel({ model: tryModel });
                // Test ping dulu
                await model.generateContent('test');
                modelName = tryModel;
                console.log(`✅ Model ${tryModel} berhasil dipakai`);
                break;
            } catch (err) {
                console.log(`❌ Model ${tryModel} gagal: ${err.message}`);
                continue;
            }
        }
        
        if (!model) {
            console.log('⚠️ Semua model gagal, pake response default');
            return getDefaultResponse(userMessage);
        }
        
        const prompt = `Kamu adalah asisten belajar AI bernama "SiaPel" yang ramah dan membantu.
User bernama ${userName}. Fokus bantu soal pelajaran, manajemen waktu belajar, 
tips mengerjakan tugas, dan motivasi belajar. Jawab dengan singkat, jelas, dan friendly. 
Gunakan emoji sesekali biar lebih asyik. Maksimal 3 paragraf.

Pertanyaan user: ${userMessage}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        console.log(`✅ Gemini response berhasil dari model ${modelName}`);
        return text;
        
    } catch (error) {
        console.error('❌ Gemini Error:', error.message);
        
        // Fallback ke response default kalo error
        return getDefaultResponse(userMessage);
    }
}

function getDefaultResponse(message) {
    const lowerMsg = message.toLowerCase();
    
    if (lowerMsg.includes('tugas') || lowerMsg.includes('deadline')) {
        return "📚 Tips mengerjakan tugas: \n\n1️⃣ Bagi tugas jadi bagian-bagian kecil\n2️⃣ Buat jadwal pengerjaan\n3️⃣ Kerjakan dari yang paling mudah dulu\n4️⃣ Gunakan teknik Pomodoro (25 menit fokus, 5 menit istirahat)\n\nSemangat ya! 💪";
    }
    else if (lowerMsg.includes('motivasi') || lowerMsg.includes('semangat')) {
        return "🔥 **Kata motivasi untukmu:**\n\n\"Jangan bandingkan progressmu dengan orang lain. Fokus pada perkembanganmu sendiri. Setiap langkah kecil tetap membawamu lebih dekat ke tujuan!\"\n\nTerus belajar, kamu pasti bisa! 🚀";
    }
    else if (lowerMsg.includes('belajar') || lowerMsg.includes('belajar efektif')) {
        return "📖 **Tips Belajar Efektif:**\n\n• Gunakan teknik Pomodoro (25 menit belajar, 5 menit istirahat)\n• Buat rangkuman atau catatan sendiri\n• Belajar di tempat yang nyaman dan minim distraksi\n• Jangan lupa istirahat yang cukup!\n\nSelamat belajar! 🧠✨";
    }
    else if (lowerMsg.includes('hai') || lowerMsg.includes('halo') || lowerMsg.includes('helo') || lowerMsg.includes('hi')) {
        return "Halo! 👋 Ada yang bisa SiaPel bantu? Tanya soal tugas, belajar, atau butuh motivasi? 😊";
    }
    else if (lowerMsg.includes('terima kasih') || lowerMsg.includes('makasih') || lowerMsg.includes('thanks')) {
        return "Sama-sama! Senang bisa membantu! 😊 Kalau ada yang ditanyakan lagi, jangan ragu ya. Semangat belajar! 🚀";
    }
    else {
        return "Halo! 👋 Saya SiaPel, asisten belajarmu. Coba tanya saya tentang:\n\n📌 Tips mengerjakan tugas\n📌 Cara belajar efektif\n📌 Motivasi belajar\n📌 Atau pertanyaan lain seputar belajar!\n\nAda yang bisa saya bantu? 😊";
    }
}

module.exports = { getAIResponse };