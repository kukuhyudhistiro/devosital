export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const groqKey = process.env.GROQ_API_KEY;
    const alkitabKey = process.env.APIINDONESIA_KEY;

    if (!groqKey) return res.status(500).json({ error: 'GROQ_API_KEY belum dikonfigurasi.' });
    if (!alkitabKey) return res.status(500).json({ error: 'APIINDONESIA_KEY belum dikonfigurasi.' });

    const hariIni = new Date().toLocaleDateString('id-ID', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
    const MODEL = 'qwen/qwen3.8-27b';

    async function callGroq(prompt, systemPrompt, temperature = 0.7) {
        const r = await fetch(GROQ_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${groqKey.trim()}`
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt }
                ],
                response_format: { type: 'json_object' },
                temperature
            })
        });
        if (!r.ok) {
            const t = await r.text();
            throw new Error(`Groq ${r.status}: ${t}`);
        }
        const d = await r.json();
        return JSON.parse(d.choices[0].message.content);
    }

    try {
        // ============ LANGKAH 1: Minta referensi ayat saja ============
        const pilihan = await callGroq(
            `Pilih SATU ayat Alkitab yang cocok untuk renungan harian pada ${hariIni}.
             Kembalikan JSON: {"kitab":"Yohanes","pasal":3,"ayat_mulai":16,"ayat_selesai":16}
             Aturan:
             - Nama kitab dalam bahasa Indonesia (contoh: Yohanes, Mazmur, Filipi, Roma).
             - Jika hanya 1 ayat, ayat_selesai = ayat_mulai.
             - Rentang maksimal 3 ayat.`,
            'Anda memilih referensi ayat Alkitab dan merespons hanya dengan JSON murni.',
            0.8
        );

        const { kitab, pasal, ayat_mulai, ayat_selesai = ayat_mulai } = pilihan;
        if (!kitab || !pasal || !ayat_mulai) {
            throw new Error('LLM tidak mengembalikan referensi ayat yang valid.');
        }

        // ============ LANGKAH 2: Ambil teks ayat asli dari API ============
        const potonganTeks = [];
        for (let a = ayat_mulai; a <= ayat_selesai; a++) {
            const url = `https://use.apiindonesia.id/api/v1/alkitab?kitab=${encodeURIComponent(kitab)}&pasal=${pasal}&ayat=${a}`;
            const r = await fetch(url, { headers: { 'x-api-key': alkitabKey } });
            if (!r.ok) {
                console.warn(`Gagal ambil ${kitab} ${pasal}:${a} → HTTP ${r.status}`);
                continue;
            }
            const j = await r.json();
            // ⚠️ Sesuaikan path field ini dengan struktur respons aktual API
            const teks = j?.data?.teks ?? j?.data?.text ?? j?.data?.ayat ?? '';
            if (teks) potonganTeks.push(String(teks).trim());
        }

        const ayatTeks = potonganTeks.join(' ');
        const ayatReferensi = ayat_mulai === ayat_selesai
            ? `${kitab} ${pasal}:${ayat_mulai}`
            : `${kitab} ${pasal}:${ayat_mulai}-${ayat_selesai}`;

        // ============ LANGKAH 3: Susun renungan dengan teks ayat nyata ============
        const renungan = await callGroq(
            `Buatkan renungan Kristen harian untuk tanggal ${hariIni}.

             REFERENSI AYAT: ${ayatReferensi}
             TEKS AYAT (dari API, JANGAN diubah): "${ayatTeks || '(teks tidak tersedia)'}"

             ATURAN:
             1. Bahasa Indonesia baku. Jangan gunakan "Kamu"; gunakan "Anda" atau "kita".
             2. isi_renungan 150–250 kata, aplikatif untuk kehidupan sehari-hari.
             3. doa 60–80 kata, ditutup "dalam nama Yesus Kristus. Amin."
             4. JANGAN mengubah, menambah, atau mengurangi teks ayat di atas.

             Kembalikan JSON murni:
             {"judul":"...","isi_renungan":"...","doa":"..."}`,
            'Anda penyusun renungan Kristen yang merespons hanya dengan JSON murni.',
            0.7
        );

        return res.status(200).json({
            renungan: [{
                tanggal: hariIni,
                judul: renungan.judul,
                ayat: ayatReferensi,
                ayat_teks: ayatTeks,
                isi_renungan: renungan.isi_renungan,
                doa: renungan.doa
            }]
        });

    } catch (error) {
        console.error('Error Internal:', error);
        return res.status(500).json({ error: `Gagal di server: ${error.message}` });
    }
}

