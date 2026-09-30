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
        Setiap renungan harus memiliki tema yang saling berkaitan atau membangun untuk satu minggu tersebut.
        
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

    // Pastikan tidak ada spasi tersembunyi di dalam API Key menggunakan trim()
    const cleanApiKey = apiKey.trim();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${cleanApiKey}`;

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

        // JIKA GAGAL: Kita ambil teks error aslinya dari Google dan kirim ke frontend
        if (!response.ok) {
            const errorText = await response.text();
            console.error("Error Detail dari Google:", errorText);
            return res.status(response.status).json({ 
                error: `Error Google (${response.status}): ${errorText}` 
            });
        }
        
        const data = await response.json();
        let rawJson = data.candidates[0].content.parts[0].text;
        
        // Pembersihan karakter markdown jika AI membandel
        rawJson = rawJson.replace(/```json/gi, '').replace(/```/gi, '').trim();

        const renunganList = JSON.parse(rawJson);
        res.status(200).json(renunganList);

    } catch (error) {
        console.error('Error Internal:', error.message);
        res.status(500).json({ error: `Gagal di server: ${error.message}` });
    }
}