# KATANA Telemetry Dashboard (Next.js 15)

Dashboard telemetri live berbasis web untuk tongkat pintar tunanetra KATANA dengan integrasi Web Serial API, visualisasi CAD 2D kemiringan tongkat, serta **Mode Simulasi Interaktif dua arah (seperti di Wokwi)**.

---

## Fitur Utama

1. **Web Serial Telemetry (115200 Baud)**: Membaca dan mengirim data langsung ke Arduino Nano fisik melalui port USB browser (Chrome / Brave / Edge).
2. **Mode Simulasi / Demo Interaktif Dua Arah**:
   - Jika USB Arduino terhubung, slider dan tombol skenario di dashboard akan **mengirim perintah override ke Arduino** sehingga aktuator fisik (buzzer SOS di pin D6 & motor getar di pin D5) benar-benar berbunyi/bergetar di dunia nyata!
   - Stream log serial di Serial Monitor Arduino dan Dashboard terminal langsung menampilkan output `[SIMULASI] ...` secara real-time.
   - Jika USB tidak dicolok, dashboard tetap dapat disimulasikan secara offline di UI.
3. **Pintasan Skenario Cepat (Wokwi Style)**:
   - 🚨 `JATUH (SOS)`: Mengatur kemiringan tongkat ke 75° dan memicu alarm Morse SOS.
   - ⚠️ `TURUNAN`: Mengatur delta sensor bawah ke +25 cm dan memicu 3 pulsa getar.
   - 💧 `AIR BASAH`: Mengatur sensor air ke 850 dan memicu 2 getaran panjang.
   - 🛑 `OBJEK DEKAT`: Mengatur sensor depan ke 12 cm dan memicu getaran rapat bahaya.
   - ✅ `NORMAL`: Mengembalikan seluruh sensor ke kondisi aman jalan.
4. **Terminal Serial Monitor Interaktif**: Dilengkapi input bar dan tombol pintasan perintah serial (`HELP`, `FRONT <cm>`, `TILT <deg>`, `DEMO ON`, `DEMO OFF`).
5. **Visual CAD Rangka Tongkat 2D**: Bergerak secara fisik mengikuti derajat kemiringan MPU6050 terhadap garis lantai datar.
6. **Multi-Theme**: Mendukung Gelap (Dark), Terang (Paper Light), dan Otomatis (Sistem).

---

## Cara Menjalankan

1. Masuk ke direktori dashboard dan jalankan server pengembangan:
   ```bash
   cd dashboard
   npm run dev
   ```
2. Buka browser di [http://localhost:3000](http://localhost:3000).
3. Klik **Hubungkan Arduino** untuk menghubungkan port USB (misal `/dev/cu.usbserial-110`), atau klik **Mode Demo** untuk mencoba simulasi langsung.
