export default async function handler(req, res) {
    // Hanya izinkan metode GET (atau POST jika Anda ingin mengirim data dari frontend)
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Mengambil API Key dari Environment Variable Vercel
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'API Key Gemini belum dikonfigurasi di Vercel.' });
    }

    // Mendapatkan tanggal hari ini dalam format bahasa Indonesia
    const hariIni = new Date().toLocaleDateString('id-ID', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });

    const promptText = `
        Buatkan tepat satu renungan Kristen untuk hari ini, tanggal ${hariIni}.
        Renungan harus berfokus pada satu tema yang relevan untuk hari ini.
        
        KEMBALIKAN ARRAY JSON MURNI yang berisi tepat satu objek, tanpa markdown (jangan gunakan \`\`\`json).
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

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
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

       // ... (kode fetch sebelumnya tetap sama)
        
        if (!response.ok) {
            const errorData = await response.text();
            console.error("Error dari Google:", errorData);
            throw new Error(`Google API responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Mengambil teks balasan dari Gemini
        let rawJson = data.candidates[0].content.parts[0].text;
        
        // PENGAMANAN BARU: Bersihkan backticks markdown jika AI membandel
        rawJson = rawJson.replace(/```json/gi, '').replace(/```/gi, '').trim();

        const renunganList = JSON.parse(rawJson);

        // Kirim hasil ke frontend
        res.status(200).json(renunganList);

    } catch (error) {
        // Log ini akan muncul di tab "Logs" Vercel
        console.error('Error in API route:', error.message);
        res.status(500).json({ error: 'Gagal memproses data dari Gemini. Cek Logs Vercel.' });
    }
}