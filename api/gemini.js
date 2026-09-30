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
        Buatkan renungan Kristen harian untuk 1 hari ini, dimulai dari tanggal ${hariIni}. 
        Setiap renungan harus memiliki tema yang saling berkaitan atau membangun untuk satu minggu ke depan.
        
        KEMBALIKAN HANYA DALAM FORMAT ARRAY JSON MURNI tanpa markdown (jangan gunakan \`\`\`json).
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
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
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

        if (!response.ok) {
            throw new Error(`Google API responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Mengambil teks JSON murni dari balasan Gemini
        const rawJson = data.candidates[0].content.parts[0].text;
        const renunganList = JSON.parse(rawJson);

        // Kirim hasil ke frontend
        res.status(200).json(renunganList);

    } catch (error) {
        console.error('Error in API route:', error);
        res.status(500).json({ error: 'Gagal memproses data dari Gemini.' });
    }
}