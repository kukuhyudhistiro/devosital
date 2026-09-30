export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'GROQ_API_KEY belum dikonfigurasi di Vercel.' });
    }

    const hariIni = new Date().toLocaleDateString('id-ID', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });

    const promptText = `
        Buatkan renungan Kristen harian untuk 1 hari pada tanggal ${hariIni}.

        ATURAN PENULISAN:
        1. Gunakan bahasa Indonesia yang baik dan baku.
        2. Jangan gunakan kata "Kamu". Gunakan "Anda", "kita", atau sapaan yang lebih tepat dan sopan.
        3. Renungan harus berpusat pada Alkitab, bersifat membangun, aplikatif, dan relevan untuk kehidupan sehari-hari.
        4. Panjang isi_renungan sekitar 250–400 kata, terdiri dari paragraf pembuka, penjelasan ayat, dan aplikasi praktis.
        5. Panjang doa sekitar 60–100 kata, menggunakan kata ganti "kami" atau "kita", ditutup dengan "dalam nama Yesus Kristus. Amin."

        ATURAN AYAT ALKITAB (PENTING):
        1. Ayat WAJIB dikutip dari Alkitab versi TERJEMAHAN BARU (TB) terbitan LAI (Lembaga Alkitab Indonesia).
        2. Sertakan ISI AYAT LENGKAP, bukan hanya referensinya. Tuliskan teks ayat apa adanya sesuai Terjemahan Baru Lembaga Alkitab Indonesia.
        3. Jika ayat yang dipilih mencakup lebih dari satu ayat, tuliskan seluruh teks ayat tersebut secara berurutan.
        4. Cantumkan referensi dalam format "Nama Kitab Pasal:Ayat" (contoh: "Yohanes 3:16" atau "Mazmur 23:1-3").
        5. Jangan mengutip dari versi lain (BIS, TMV, KJV, NIV, dll). Hanya gunakan TB LAI.
        6. Jika ragu terhadap teks persis TB LAI, pilih ayat yang umum dan mudah diverifikasi (mis. Yohanes 3:16, Mazmur 23:1, Filipi 4:13) agar kutipan tetap akurat.

        Kembalikan output HANYA berupa JSON objek (tanpa penjelasan tambahan, tanpa markdown code block) dengan key "renungan" yang berisi daftar 1 renungan.

        Struktur JSON WAJIB:
        {
        "renungan": [
            {
            "tanggal": "YYYY-MM-DD",
            "judul": "Judul renungan yang singkat dan menarik",
            "ayat": "Nama Kitab Pasal:Ayat",
            "ayat_teks": "Isi ayat lengkap versi Terjemahan Baru (TB) LAI",
            "isi_renungan": "Isi renungan lengkap...",
            "doa": "Doa penutup..."
            }
        ]
        }

        Pastikan JSON valid, tidak ada trailing comma, dan semua string menggunakan tanda kutip ganda.
    `;
   /*  const promptText = `
        Buatkan renungan Kristen harian untuk 1 hari pada tanggal ${hariIni}. 
        Jangan gunakan kata Kamu, ganti dengan Anda, kita atau yang lebih tepat.
        
        Kembalikan output berupa JSON objek dengan key "renungan" yang berisi daftar 1 renungan.
        Struktur JSON wajib:
        {
          "renungan": [
            {
              "tanggal": "...",
              "judul": "...",
              "ayat": "Tokoh Pasal:Ayat",
              "isi_renungan": "...",
              "doa": "..."
            }
          ]
        }
    `; */

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey.trim()}`
            },
            body: JSON.stringify({
                model: 'qwen/qwen3.8-27b', //openai/gpt-oss-120b',
                messages: [
                    { 
                        role: 'system', 
                        content: 'Kamu adalah penyusun renungan Kristen yang selalu merespons dalam format JSON murni.' 
                    },
                    { role: 'user', content: promptText }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = errorText;

            try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.error?.message || errorData.message || errorText;
            } catch {
                // Keep the original response when Groq does not return JSON.
            }

            return res.status(response.status).json({ error: errorMessage });
        }

        const data = await response.json();
        const rawContent = data.choices[0].message.content;
        const parsedData = JSON.parse(rawContent);
        
        res.status(200).json(parsedData.renungan || parsedData);

    } catch (error) {
        console.error('Error Internal:', error.message);
        res.status(500).json({ error: `Gagal di server: ${error.message}` });
    }
}

/* export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'API Key Gemini belum dikonfigurasi di Vercel.' });
    }

    const hariIni = new Date().toLocaleDateString('id-ID', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });

    const promptText = `
        Buatkan renungan Kristen harian untuk 1 hari ini, tanggal ${hariIni}. 
        Setiap renungan harus memiliki tema yang saling berkaitan atau membangun untuk satu minggu kedepan.
        
        KEMBALIKAN HANYA DALAM FORMAT ARRAY JSON MURNI tanpa markdown.
        Struktur JSON yang diharapkan:
        [
          {
            "tanggal": "...",
            "judul": "...",
            "ayat": "Tokoh Pasal:Ayat",
            "isi_renungan": "...",
            "doa": "..."
          }
        ]
    `;

    const cleanApiKey = apiKey.trim();
    
    // Daftar model yang akan dicoba berurutan jika salah satu sedang High Demand (503)
    const models = ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'];

    let lastError = null;

    for (const model of models) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanApiKey}`;
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: promptText }] }],
                    generationConfig: {
                        temperature: 0.7,
                        responseMimeType: "application/json"
                    }
                })
            });

            // Jika server sibuk (503), abaikan dan lanjut ke model cadangan berikutnya
            if (response.status === 503) {
                console.warn(`Model ${model} sibuk (503), mencoba model cadangan...`);
                lastError = `Model ${model} sedang sibuk (503 High Demand).`;
                continue;
            }

            if (!response.ok) {
                const errorText = await response.text();
                lastError = `Error Google (${response.status}): ${errorText}`;
                continue;
            }
            
            const data = await response.json();
            let rawJson = data.candidates[0].content.parts[0].text;
            
            rawJson = rawJson.replace(/```json/gi, '').replace(/```/gi, '').trim();

            const renunganList = JSON.parse(rawJson);
            
            // Berhasil mendapatkan data, hentikan perulangan dan kirim ke frontend
            return res.status(200).json(renunganList);

        } catch (error) {
            console.error(`Gagal pada model ${model}:`, error.message);
            lastError = error.message;
        }
    }

    // Kirim pesan error jika seluruh model cadangan sedang sibuk
    return res.status(503).json({ 
        error: `Server Google sedang sangat padat di semua model. Silakan coba beberapa saat lagi. Detail: ${lastError}` 
    });
} */

