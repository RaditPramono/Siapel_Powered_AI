const Groq = require('groq-sdk');

async function generateQuizFromNote(noteTitle, noteContent) {
    console.log('=== Generate Quiz dengan Groq (10 Soal) ===');
    console.log('Judul:', noteTitle);
    
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        console.error('❌ GROQ_API_KEY tidak ditemukan di .env!');
        return [];
    }

    const groq = new Groq({ apiKey });

    // PROMPT UNTUK 10 SOAL
    const prompt = `Buatkan 10 soal pilihan ganda dari materi berikut:

Judul: ${noteTitle}
Materi: ${noteContent.substring(0, 2000)}

Format output HARUS persis seperti ini, JANGAN TAMBAHKAN TEKS APAPUN:

SOAL 1: [pertanyaan soal 1]
A) [opsi A]
B) [opsi B]
C) [opsi C]
D) [opsi D]
JAWABAN: [huruf A/B/C/D]
PEMBAHASAN: [penjelasan singkat]

SOAL 2: [pertanyaan soal 2]
A) [opsi A]
B) [opsi B]
C) [opsi C]
D) [opsi D]
JAWABAN: [huruf A/B/C/D]
PEMBAHASAN: [penjelasan singkat]

SOAL 3: [pertanyaan soal 3]
A) [opsi A]
B) [opsi B]
C) [opsi C]
D) [opsi D]
JAWABAN: [huruf A/B/C/D]
PEMBAHASAN: [penjelasan singkat]

SOAL 4: [pertanyaan soal 4]
A) [opsi A]
B) [opsi B]
C) [opsi C]
D) [opsi D]
JAWABAN: [huruf A/B/C/D]
PEMBAHASAN: [penjelasan singkat]

SOAL 5: [pertanyaan soal 5]
A) [opsi A]
B) [opsi B]
C) [opsi C]
D) [opsi D]
JAWABAN: [huruf A/B/C/D]
PEMBAHASAN: [penjelasan singkat]

SOAL 6: [pertanyaan soal 6]
A) [opsi A]
B) [opsi B]
C) [opsi C]
D) [opsi D]
JAWABAN: [huruf A/B/C/D]
PEMBAHASAN: [penjelasan singkat]

SOAL 7: [pertanyaan soal 7]
A) [opsi A]
B) [opsi B]
C) [opsi C]
D) [opsi D]
JAWABAN: [huruf A/B/C/D]
PEMBAHASAN: [penjelasan singkat]

SOAL 8: [pertanyaan soal 8]
A) [opsi A]
B) [opsi B]
C) [opsi C]
D) [opsi D]
JAWABAN: [huruf A/B/C/D]
PEMBAHASAN: [penjelasan singkat]

SOAL 9: [pertanyaan soal 9]
A) [opsi A]
B) [opsi B]
C) [opsi C]
D) [opsi D]
JAWABAN: [huruf A/B/C/D]
PEMBAHASAN: [penjelasan singkat]

SOAL 10: [pertanyaan soal 10]
A) [opsi A]
B) [opsi B]
C) [opsi C]
D) [opsi D]
JAWABAN: [huruf A/B/C/D]
PEMBAHASAN: [penjelasan singkat]

Pastikan menghasilkan tepat 10 soal.`;

    try {
        console.log('Menghubungi Groq API...');
        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.1-8b-instant',
            temperature: 0.7,
            max_tokens: 3000
        });

        const aiResponse = chatCompletion.choices[0]?.message?.content || "";
        console.log('Response AI diterima, panjang:', aiResponse.length);
        
        // Parse response ke format soal
        const questions = [];
        const lines = aiResponse.split('\n');
        let currentQuestion = null;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line.startsWith('SOAL')) {
                if (currentQuestion && currentQuestion.question) {
                    questions.push(currentQuestion);
                }
                currentQuestion = {
                    question: line.replace(/^SOAL \d+:\s*/, ''),
                    options: { A: '', B: '', C: '', D: '' },
                    correct: '',
                    explanation: ''
                };
            } 
            else if (line.match(/^[A-D]\)/) && currentQuestion) {
                const letter = line[0];
                const text = line.substring(2).trim();
                currentQuestion.options[letter] = text;
            } 
            else if (line.startsWith('JAWABAN:') && currentQuestion) {
                currentQuestion.correct = line.replace('JAWABAN:', '').trim();
            } 
            else if (line.startsWith('PEMBAHASAN:') && currentQuestion) {
                currentQuestion.explanation = line.replace('PEMBAHASAN:', '').trim();
            }
        }
        
        if (currentQuestion && currentQuestion.question) {
            questions.push(currentQuestion);
        }
        
        console.log(`✅ Berhasil generate ${questions.length} soal dengan Groq`);
        return questions;
        
    } catch (error) {
        console.error('❌ Error Groq:', error.message);
        return [];
    }
}

module.exports = { generateQuizFromNote };