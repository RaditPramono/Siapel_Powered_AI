const Groq = require('groq-sdk');

async function chatWithAI(userMessage, userName) {
    console.log('🤖 AI Assistant dengan Groq...');
    console.log('Pesan:', userMessage);
    
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        console.error('❌ GROQ_API_KEY tidak ditemukan!');
        return "Maaf, API key tidak ditemukan.";
    }
    
    const groq = new Groq({ apiKey });
    
    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: `Kamu adalah asisten belajar AI bernama SiaPel. Bantu pelajar bernama ${userName}. Gunakan bahasa Indonesia.`
                },
                {
                    role: 'user',
                    content: userMessage
                }
            ],
            model: 'llama-3.1-8b-instant',
            temperature: 0.7,
            max_tokens: 500
        });
        
        const reply = chatCompletion.choices[0]?.message?.content;
        if (!reply) {
            throw new Error('Response kosong dari Groq');
        }
        
        console.log('✅ AI Assistant berhasil:', reply.substring(0, 50));
        return reply;
        
    } catch (error) {
        console.error('❌ Groq error:', error.message || error);
        
        // Coba pake model llama-3.3-70b-versatile
        try {
            console.log('🔄 Mencoba model llama-3.3-70b-versatile...');
            const fallback = await groq.chat.completions.create({
                messages: [
                    {
                        role: 'system',
                        content: `Kamu asisten belajar SiaPel. Bantu ${userName}.`
                    },
                    {
                        role: 'user',
                        content: userMessage
                    }
                ],
                model: 'llama-3.3-70b-versatile',
                temperature: 0.7,
                max_tokens: 500
            });
            return fallback.choices[0]?.message?.content || "Maaf, coba lagi ya!";
        } catch (err) {
            console.error('❌ Fallback error:', err.message);
            return "Maaf, layanan AI sedang sibuk. Coba lagi ya! 😊";
        }
    }
}

module.exports = { chatWithAI };