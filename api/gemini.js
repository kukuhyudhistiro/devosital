export default async function handler(req, res) {
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
}