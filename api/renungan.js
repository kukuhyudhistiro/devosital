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
        {
            judul: "Ia Makin Besar: Ukuran Sejati Pelayanan",
            ayatInti: "Yohanes 3:30; Lukas 10:20; Matius 7:21–23",
            inti: "Pelayanan yang berhasil membuat orang makin melihat Yesus, bukan makin melihat kita. Yesus bahkan mengingatkan bahwa orang bisa melakukan banyak hal dalam nama-Nya tanpa sungguh mengenal Dia.",
            arah: "Sebelum bekerja atau melayani, tanyakan pada diri sendiri: siapa yang akan dipermuliakan dari apa yang saya kerjakan hari ini?"
        },
        {
            judul: "Rumah sebagai Mimbar Pertama",
            ayatInti: "1 Timotius 3:4–5; 1 Timotius 5:8; Ulangan 6:6–7",
            inti: "Kualitas pelayanan diuji di meja makan, bukan di mimbar. Kesabaran, kelembutan, dan keteladanan di rumah adalah khotbah yang paling lama didengar anak dan pasangan.",
            arah: "Sebelum melayani orang lain, layani dulu satu orang di rumah dengan sengaja, lewat sapaan, doa singkat, atau maaf yang tertunda."
        },
        {
            judul: "Aku dan Seisi Rumahku: Kesepakatan yang Dipersembahkan",
            ayatInti: "Yosua 24:15; Amos 3:3; Matius 18:19–20",
            inti: "Kesepakatan keluarga adalah keputusan bersama untuk beribadah kepada Tuhan, bukan sekadar tidak bertengkar. Kesepakatan itu dibangun lewat percakapan, doa bersama, dan arah hidup yang sama.",
            arah: "Adakah satu hal yang perlu disepakati bersama keluarga minggu ini (waktu doa, prioritas, keputusan) dan diserahkan kepada Tuhan?"
        },
        {
            judul: "Sehati yang Benar: Bukan Sekadar Rukun",
            ayatInti: "Mazmur 133:1; Filipi 2:2–4; Kisah 5:1–11; Kejadian 11:1–9",
            inti: "Kesatuan bisa membangun Kerajaan Allah, tetapi bisa juga membangun “menara” kita sendiri. Kesehatian yang diberkati lahir dari kerendahan hati, yaitu saling merendahkan diri di dalam takut akan Kristus (Ef 5:21), bukan dari keseragaman atau ambisi bersama.",
            arah: "Periksa kesepakatan kita, baik di rumah maupun di pelayanan: untuk siapa sebenarnya kita bersepakat?"
        },
        {
            judul: "Setia Walau Rumah Belum Sehati",
            ayatInti: "Yohanes 7:5; 1 Petrus 3:1–2; Mazmur 127:1; Galatia 6:9",
            inti: "Renungan ini untuk mereka yang melayani sementara pasangan, orang tua, atau anak belum seiman atau belum sejalan. Tuhanlah yang membangun rumah. Bagian kita adalah setia, mengasihi, dan tidak jemu-jemu berbuat baik.",
            arah: "Serahkan anggota keluarga yang belum sehati kepada Tuhan, lalu lakukan satu tindakan kasih untuknya hari ini tanpa berkhotbah."
        }
    ];

    const daftarKategori = [
        "Perjanjian Lama (Kitab Taurat, Sejarah, Puisi, atau Nabi)",
        "Perjanjian Baru (Injil, Kisah Para Rasul, atau Surat-Surat)"
    ];

    // Mengambil tema acak & acak angka seed setiap panggilan
    const tema = daftarTema[Math.floor(Math.random() * daftarTema.length)];
    const temaAcak = tema.judul;
    const kategoriAcak = daftarKategori[Math.floor(Math.random() * daftarKategori.length)];
    const randomSeed = Math.floor(Math.random() * 100000);

    // 3. Prompt dinamis yang menyertakan tanggal dan tema acak
    const promptText = `
        Buatkan 1 renungan Kristen harian khusus untuk hari ini, ${hariIni}.

        FOKUS TEMA KHUSUS: "${temaAcak}"
        AYAT INTI (rujukan tema): ${tema.ayatInti}
        INTI RENUNGAN: ${tema.inti}
        ARAH PAGI INI: ${tema.arah}
        SUMBER AYAT: Utamakan dari ${kategoriAcak}.
        ID REFERENSI ACAK: ${randomSeed}

        ATURAN PENULISAN:
        1. Gunakan bahasa Indonesia yang baik dan baku.
        2. Jangan gunakan kata "Kamu". Gunakan "Anda", "kita", atau sapaan yang lebih tepat dan sopan. 
            Jangan ubah teks Alkitab jika ada kata "kamu" di dalam teks Alkitab asli.
        3. Renungan harus berpusat pada Alkitab, bersifat menguatkan, aplikatif, dan relevan dengan fokus tema "${temaAcak}".
        4. Panjang isi_renungan sekitar 150–200 kata. Terdiri dari 3 paragraf: pembuka disertai pertanyaan retorik dan reflektif ke kehidupan sehari-hari
            yang mengarah pada pemahaman bagian ayat nats, penjelasan ayat, dan aplikasi praktis.
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
                model: 'qwen/qwen3.8-27b', //'meta-llama/llama-prompt-guard-2-22m', //'openai/gpt-oss-120b',
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