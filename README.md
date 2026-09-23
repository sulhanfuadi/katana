# KATANA (Kawan Tunanetra)

> **Tongkat Pintar untuk Navigasi Lebih Gacor**  
> Prototype tongkat navigasi berbasis retrofit kruk siku bekas dengan integrasi multi-sensor: deteksi objek depan, deteksi turunan/lubang, sensor air/genangan, haptic vibration feedback, dan buzzer darurat SOS saat terjatuh.

Simulasi daring: [Wokwi KATANA Simulation](https://wokwi.com/projects/474342215789115393)

---

## Struktur Repositori

```text
katana/
├── katana.ino            # Firmware utama untuk hardware Arduino Nano fisik
├── REAL_WIRING.md        # Panduan pinout fisik, skema transistor BC547 & checklist
├── README.md             # Dokumentasi proyek & panduan penggunaan
├── .gitignore            # Filter file build dan temporary
├── dashboard/            # Web Serial Live Telemetry Dashboard (Next.js 15 + Tailwind)
│   ├── src/app/page.tsx  # Interactive UI (Visual kemiringan 2D, radar, status pin, logs)
│   ├── package.json      # Dependencies (lucide-react, next, react, tailwindcss)
│   └── README.md         # Petunjuk menjalankan dashboard Next.js
└── wokwi/                # Paket simulasi virtual Wokwi
    ├── sketch.ino        # Kode simulasi dengan preset WOKWI_SIMULATION = 1
    ├── diagram.json      # Skema wiring virtual komponen Wokwi
    ├── wokwi.toml        # Konfigurasi emulator Wokwi
    └── wokwi-project.txt # Metadata sumber proyek Wokwi
```

---

## Logika Peringatan & Urutan Prioritas

Jika beberapa kondisi bahaya terjadi secara bersamaan, sistem menerapkan **prioritas tunggal** tertinggi agar tidak membingungkan pengguna:

| Prioritas | Skenario | Sensor Terlibat | Indikator Respons | Umpan Balik |
|:---:|---|---|---|---|
| **1 (Tertinggi)** | **Tongkat Jatuh / Tergeletak** | MPU6050 (Kemiringan > 60° selama > 2 detik) | `TONGKAT_JATUH` | Motor mati, Buzzer pola Morse SOS (`... --- ...`) |
| **2** | **Tepi Turunan / Lubang / Tangga** | HC-SR04 Bawah (Kenaikan jarak > 15 cm dari baseline) | `TEPI_TURUNAN` | 3 getaran pulsa kuat pada gagang |
| **3** | **Genangan Air / Area Basah** | Pelat Sensor Air (Analog A0 > 650) | `PERMUKAAN_BASAH` | 2 getaran panjang pada gagang |
| **4** | **Objek Rintangan di Depan** | HC-SR04 Depan (Jarak < 100 cm) | `OBJEK_WASPADA` / `SEDANG` / `DEKAT` | Pulsa getar berjenjang (makin dekat objek, getaran makin rapat) |
| **-** | **Kondisi Normal** | Semua sensor dalam batas aman | `NORMAL` | Motor diam, buzzer diam |

---

## Panduan Penggunaan

### 1. Upload ke Hardware Fisik (Arduino Nano)
1. Buka file [katana.ino](katana.ino) di Arduino IDE.
2. Pastikan baris konfigurasi berikut bernilai `0` (sudah default):
   ```cpp
   #define WOKWI_SIMULATION 0
   ```
3. Pilih board **Arduino Nano** dan port serial Anda (contoh: `/dev/cu.usbserial-110`).
4. Jika menggunakan chip clone CH340, pilih **Tools > Processor > ATmega328P (Old Bootloader)**.
5. Tekan tombol **Upload**.
6. Buka **Serial Monitor** pada kecepatan **115200 baud** untuk melihat stream data.

> **Tips Kalibrasi Sensor Bawah:**  
> Saat pertama kali dinyalakan (`setup`), sistem membaca rata-rata 12 sampel jarak lantai sebagai nilai `baseline` (~30 cm). Pastikan tongkat dipegang pada posisi sudut jalan normal selama 1-2 detik pertama setelah dinyalakan.

### 2. Menjalankan Dashboard Telemetri (Next.js)
1. Masuk ke folder dashboard dan jalankan server lokal:
   ```bash
   cd dashboard
   npm run dev
   ```
2. Buka browser **Google Chrome**, **Brave**, atau **Edge** di [http://localhost:3000](http://localhost:3000).
3. Klik tombol **Hubungkan Arduino**, lalu pilih port USB Arduino Nano Anda (contoh: `/dev/cu.usbserial-110`).
4. Telemetri visual real-time (sudut kruk 2D CAD, indikator jarak, deteksi kabel lepas, switch demo) langsung aktif!
*(Tips: Tutup tab Serial Monitor di Arduino IDE sebelum menghubungkan agar port serial tidak bentrok).*

### 3. Mode Simulasi & Perintah Serial Interaktif (Seperti di Wokwi)
Firmware KATANA kini mendukung mode pengujian override sensor langsung melalui serial. Anda dapat menguji seluruh skenario bahaya tanpa harus menggerakkan hardware fisik:

- **Melalui Dashboard Next.js:**  
  Klik toggle **Mode Demo: AKTIF** dan gunakan tombol skenario instan (`JATUH (SOS)`, `TURUNAN`, `AIR`, `DEKAT`, `NORMAL`) atau geser slider presisi. Jika Arduino terhubung ke USB, perintah override otomatis terkirim dan membunyikan buzzer / menggetarkan motor fisik secara nyata!
- **Melalui Serial Monitor Arduino IDE:**  
  Buka Serial Monitor pada 115200 baud dan kirim perintah berikut:
  - `HELP` : Menampilkan panduan perintah lengkap.
  - `DEMO ON` / `DEMO OFF` : Mengaktifkan/menonaktifkan mode simulasi.
  - `FALL` : Mensimulasikan tongkat jatuh (kemiringan 75°, membunyikan alarm Morse SOS).
  - `DROP` : Mensimulasikan tepi turunan / lubang (delta +25 cm, 3 pulsa getar).
  - `WET` : Mensimulasikan genangan air (nilai sensor 850, 2 pulsa getar panjang).
  - `NEAR` : Mensimulasikan rintangan sangat dekat (jarak 15 cm).
  - `FRONT <cm>` / `DOWN <cm>` / `TILT <deg>` / `WATER <val>` : Mengatur nilai sensor manual.

### 4. Menjalankan Simulasi Wokwi
- **Opsi A (Browser):** Buka langsung tautan [https://wokwi.com/projects/474342215789115393](https://wokwi.com/projects/474342215789115393).
- **Opsi B (Lokal via VS Code):** Buka folder `wokwi/` menggunakan ekstensi Wokwi for VS Code.

---

## Referensi Terkait
- [Panduan Pengkabelan Lengkap (REAL_WIRING.md)](REAL_WIRING.md)
- [Petunjuk Dashboard Web (dashboard/README.md)](dashboard/README.md)
