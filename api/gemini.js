

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'GROQ_API_KEY belum dikonfigurasi di Vercel.' });
    }

    const hariIni = new Date().toLocaleDateString('id-ID', { 
        weekday: 'long', year: 'numeric', month: 'numeric', day: 'numeric' 
    });

    const promptText = `
        Buatkan renungan Kristen harian untuk 1 hari pada tanggal ${hariIni} waktu Indonesia (UTC+7).

        ATURAN PENULISAN:
        1. Gunakan bahasa Indonesia yang baik dan baku.
        2. Jangan gunakan kata "Kamu". Gunakan "Anda", "kita", atau sapaan yang lebih tepat dan sopan.
        3. Renungan harus berpusat pada Alkitab, bersifat membangun, aplikatif, dan relevan untuk kehidupan sehari-hari.
        4. Panjang isi_renungan sekitar 150–200 kata. Terdiri dari paragraf pembuka, penjelasan ayat, dan aplikasi praktis.
        5. Sebut Yesus dengan Tuhan Yesus, bukan hanya Yesus.
        6. Panjang doa sekitar 40–70 kata, ditutup dengan "dalam nama Yesus Kristus. Amin."
        7. Sertakan ayat Alkitab yang relevan dengan renungan, beserta teks lengkapnya (dari versi Terjemahan Baru LAI).
  
        ATURAN AYAT ALKITAB (PENTING):
        1. Ayat WAJIB dikutip dari Alkitab versi TERJEMAHAN BARU (TB) terbitan LAI (Lembaga Alkitab Indonesia).
        2. Sertakan ISI AYAT LENGKAP, bukan hanya referensinya. Tuliskan teks ayat apa adanya sesuai TB LAI.
        3. Jika ayat yang dipilih mencakup lebih dari satu ayat, tuliskan seluruh teks ayat tersebut secara berurutan.
        4. Cantumkan referensi dalam format "Nama Kitab Pasal:Ayat" (contoh: "Yohanes 3:16" atau "Mazmur 23:1-3").
        5. Jangan mengutip dari versi lain (BIS, TMV, KJV, NIV, dll). Hanya gunakan TB LAI.
        6. Jika ragu terhadap teks persis TB LAI, pilih ayat yang umum dan mudah diverifikasi (mis. Yohanes 3:16, Mazmur 23:1, Filipi 4:13) agar kutipan tetap akurat.

        Kembalikan output HANYA berupa JSON objek (tanpa penjelasan tambahan, tanpa markdown code block) dengan key "renungan" yang berisi daftar 1 renungan.

        Struktur JSON WAJIB:
        {
        "renungan": [
            {
            "tanggal": "DD MMM YYYY",
            "judul": "Judul renungan yang singkat dan menarik",
            "ayat": "Nama Kitab Pasal:Ayat",
            "ayat_teks": "Isi ayat lengkap hasil respons API Alkitab (TB)",
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
                model: 'openai/gpt-oss-120b',//'qwen/qwen3.8-27b', //openai/gpt-oss-120b',
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