export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // 1. Mencegah caching oleh Browser maupun Vercel Edge Network
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'GROQ_API_KEY belum dikonfigurasi di Vercel.' });
    }

    const hariIni = new Date().toLocaleDateString('id-ID', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });

    // 2. Daftar tema acak untuk menjamin setiap generate memiliki fokus yang berbeda
    const daftarTema = [
        "Keberanian & Keteguhan Hati di Tengah Pergumulan",
        "Pengharapan yang Tak Goncang pada Janji Allah",
        "Kasih Setia Tuhan dan Rasa Syukur Harian",
        "Kesetiaan dalam Hal-Hal Kecil",
        "Pengampunan dan Kedamaian Hati",
        "Kerendahan Hati dan Pelayanan Bagi Sesama",
        "Hikmat dan Kebijaksanaan dalam Mengambil Keputusan",
        "Ketaatan dan Kepercayaan Sepenuhnya pada Rencana Tuhan",
        "Kekuatan dalam Kelemahan melalui Anugerah Kristus",
        "Penyertaan Tuhan di Lembah Kelam",
        "Persahabatan dan Komunitas yang Saling Menguatkan",
        "Pikiran yang Diperbarui dan Bebas dari Kecemasan"
    ];

    const daftarKategori = [
        "Perjanjian Lama (Kitab Taurat, Sejarah, Puisi, atau Nabi)",
        "Perjanjian Baru (Injil, Kisah Para Rasul, atau Surat-Surat)"
    ];

    // Mengambil tema acak & acak angka seed setiap panggilan
    const temaAcak = daftarTema[Math.floor(Math.random() * daftarTema.length)];
    const kategoriAcak = daftarKategori[Math.floor(Math.random() * daftarKategori.length)];
    const randomSeed = Math.floor(Math.random() * 100000);

    // 3. Prompt dinamis yang menyertakan tanggal dan tema acak
    const promptText = `
        Buatkan 1 renungan Kristen harian khusus untuk hari ini, ${hariIni}.

        FOKUS TEMA KHUSUS: "${temaAcak}"
        SUMBER AYAT: Utamakan dari ${kategoriAcak}.
        ID REFERENSI ACAK: ${randomSeed}

        ATURAN PENULISAN:
        1. Gunakan bahasa Indonesia yang baik dan baku.
        2. Jangan gunakan kata "Kamu". Gunakan "Anda", "kita", atau sapaan yang lebih tepat dan sopan. Jangan ubah teks Alkitab jika ada kata "kamu" di dalam teks Alkitab asli.
        3. Renungan harus berpusat pada Alkitab, bersifat menguatkan, aplikatif, dan relevan dengan fokus tema "${temaAcak}".
        4. Panjang isi_renungan sekitar 150–200 kata. Terdiri dari 3 paragraf: pembuka, penjelasan ayat, dan aplikasi praktis.
        5. Sebut Yesus dengan "Tuhan Yesus", bukan hanya "Yesus".
        6. Panjang doa sekitar 40–70 kata, ditutup dengan "dalam nama Yesus Kristus. Amin."
        7. Sertakan ayat Alkitab yang relevan dengan tema, beserta teks lengkapnya (versi Terjemahan Baru LAI).
        8. Gunakan Tokoh Alkitab yang relevan dengan tema "${temaAcak}" sebagai contoh/teladan.
  
        ATURAN AYAT ALKITAB (PENTING):
        1. Ayat WAJIB dikutip dari Alkitab versi TERJEMAHAN BARU (TB) terbitan LAI (Lembaga Alkitab Indonesia).
        2. Sertakan ISI AYAT LENGKAP, bukan hanya referensinya. Tuliskan teks ayat apa adanya sesuai TB LAI.
        3. Jika ayat yang dipilih mencakup lebih dari satu ayat, tuliskan seluruh teks ayat tersebut secara berurutan.
        4. Cantumkan referensi dalam format "Nama Kitab Pasal:Ayat".
        5. Bebas memilih kitab apa saja dari Perjanjian Lama atau Perjanjian Baru yang sesuai dengan tema.

        Kembalikan output HANYA berupa JSON objek (tanpa penjelasan tambahan, tanpa markdown code block) dengan key "renungan" yang berisi daftar 1 renungan.

        Struktur JSON WAJIB:
        {
          "renungan": [
            {
              "tanggal": "${hariIni}",
              "judul": "Judul renungan yang singkat dan menarik",
              "ayat": "Nama Kitab Pasal:Ayat",
              "ayat_teks": "Isi ayat lengkap...",
              "isi_renungan": "Isi renungan lengkap...",
              "doa": "Doa penutup..."
            }
          ]
        }
    `;

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey.trim()}`
            },
            body: JSON.stringify({
                model: 'openai/gpt-oss-120b',
                messages: [
                    { 
                        role: 'system', 
                        content: 'Kamu adalah penyusun renungan Kristen yang selalu merespons dalam format JSON murni.' 
                    },
                    { role: 'user', content: promptText }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.85 // Sedikit dinaikkan agar hasil lebih variatif
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = errorText;

            try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.error?.message || errorData.message || errorText;
            } catch {
                // Biarkan teks asli jika respons bukan JSON
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