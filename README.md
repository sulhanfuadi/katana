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
├── dashboard/            # Web Serial Live Telemetry Dashboard (Buka di Chrome/Brave)
│   ├── index.html        # UI dashboard interaktif (Visual radar, kemiringan 2D, pin status)
│   ├── style.css         # Styling dark mode & glassmorphism
│   └── app.js            # Web Serial API handler & parser
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
3. Pilih board **Arduino Nano** dan port serial Anda (contoh: `/dev/cu.usbserial-10`).
4. Jika menggunakan chip clone CH340, pilih **Tools > Processor > ATmega328P (Old Bootloader)**.
5. Tekan tombol **Upload**.
6. Buka **Serial Monitor** pada kecepatan **115200 baud**.

> **Tips Kalibrasi Sensor Bawah:**  
> Saat pertama kali dinyalakan (`setup`), sistem membaca rata-rata 12 sampel jarak lantai sebagai nilai `baseline` (~30 cm). Pastikan tongkat dipegang pada posisi sudut jalan normal selama 1-2 detik pertama setelah dinyalakan.

### 2. Membuka Web Serial Live Dashboard
1. Buka browser **Google Chrome** atau **Brave**.
2. Buka file `dashboard/index.html` langsung di browser:
   ```bash
   open dashboard/index.html
   ```
3. Klik tombol **Hubungkan Arduino**, lalu pilih port USB Anda (contoh: `/dev/cu.usbserial-110`).
4. Telemetri visual real-time (radar, sudut kemiringan kruk 2D, status pin) akan langsung aktif!
*(Tips: Tutup tab Serial Monitor di Arduino IDE sebelum menghubungkan agar port serial tidak rebutan).*

### 3. Menjalankan Simulasi Wokwi
- **Opsi A (Browser):** Buka langsung tautan [https://wokwi.com/projects/474342215789115393](https://wokwi.com/projects/474342215789115393).
- **Opsi B (Lokal via VS Code):** Buka folder `wokwi/` menggunakan ekstensi Wokwi for VS Code.

---

## Referensi Terkait
- [Panduan Pengkabelan Lengkap (REAL_WIRING.md)](REAL_WIRING.md)
