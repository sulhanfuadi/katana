# Blueprint Wiring Fisik KATANA (Kawan Tunanetra)

Dokumen ini adalah acuan pengkabelan modul fisik nyata KATANA ke **Arduino Nano V3 (ATmega328P)**. Label pin di tabel ini disesuaikan persis dengan tulisan sablon (silkscreen) pada PCB modul yang dibeli.

---

## 1. Tabel Pinout Persis Sesuai Tulisan Modul

| Komponen | Tulisan di Modul | Terhubung ke Arduino Nano | Keterangan Fungsi |
|---|:---:|:---:|---|
| **Sensor Air (Water Sensor)** | **`S`** | **A0** | Sinyal Analog (Signal) |
| | **`+`** | **5V** | Daya positif |
| | **`-`** | **GND** | Ground |
| **HC-SR04 Depan** | **`VCC`** | **5V** | Daya positif |
| | **`TRIG`** | **D3** | Pemicu ultrasonik depan |
| | **`ECHO`** | **D2** | Penerima pantulan depan |
| | **`GND`** | **GND** | Ground |
| **HC-SR04 Bawah** | **`VCC`** | **5V** | Daya positif |
| | **`TRIG`** | **D11** | Pemicu ultrasonik bawah |
| | **`ECHO`** | **D10** | Penerima pantulan bawah |
| | **`GND`** | **GND** | Ground |
| **MPU6050 (GY-521)** | **`VCC`** | **5V** | Daya positif |
| | **`GND`** | **GND** | Ground |
| | **`SCL`** | **A5** | I2C Clock |
| | **`SDA`** | **A4** | I2C Data |
| | *XDA, XCL, AD0, INT* | *(Kosong)* | Tidak perlu dihubungkan |
| **Modul Motor Getar PWM** | **`IN` / `SIG` / `S`** | **D5** | Sinyal PWM getaran |
| | **`VCC` / `+`** | **5V** | Daya positif |
| | **`GND` / `-`** | **GND** | Ground |
| **Active Buzzer (Bare 3-5V)** | **Kaki Panjang (+)** | **5V** | Daya positif |
| | **Kaki Pendek (-)** | **Kolektor BC547** | Masuk ke kaki Kolektor transistor |

---

## 2. Rangkaian Driver Buzzer (Transistor BC547)

Buzzer aktif membutuhkan transistor BC547 agar tidak menarik arus berlebih dari pin Arduino:

```
               +5V ------------ (+) Kaki Panjang Buzzer (-)
                                      |
                                      | (Kaki Kolektor)
Pin D6 Arduino --- [ Resistor 1kΩ ] --- (Kaki Basis)    BC547 (NPN)
                                      | (Kaki Emitor)
                                     GND
```

*Cara mengenali kaki BC547 (sisi datar menghadap ke Anda):*
- Kaki 1 (kiri): **Kolektor (C)** → ke Negatif Buzzer
- Kaki 2 (tengah): **Basis (B)** → ke Resistor 1kΩ → Pin D6
- Kaki 3 (kanan): **Emitor (E)** → ke GND

---

## 3. Ringkasan Rel Daya (Breadboard)

- **Semua pin 5V** dari sensor air (`+`), motor (`+`), HC-SR04 (`VCC`), MPU6050 (`VCC`), dan buzzer (`+`) disatukan ke rel **5V** Arduino Nano.
- **Semua pin GND** dari sensor air (`-`), motor (`-`), HC-SR04 (`GND`), MPU6050 (`GND`), dan emitor BC547 disatukan ke rel **GND** Arduino Nano.
- Daya utama Nano berasal dari kabel USB Type-C yang dicolok ke Power Bank 5V.

---

## 4. Penempatan Fisik pada Kruk Siku

1. **Kotak Elektronik (ABS / wadah dekat gagang)**: Berisi Arduino Nano, MPU6050, mini breadboard, resistor 1kΩ, transistor BC547, dan buzzer.
2. **Motor Getar**: Ditempel di bawah grip/gagang agar getaran langsung terasa di tangan.
3. **HC-SR04 Depan**: Dipasang 55–65 cm dari lantai, menghadap lurus ke depan (0°).
4. **HC-SR04 Bawah**: Dipasang 15–20 cm di atas karet kaki tongkat, miring 35°–45° menghadap bawah-depan.
5. **Sensor Air**: Dipasang 2–3 cm di atas karet kaki tongkat. Pelat garis tembaga menghadap depan dan tidak menopang beban fisik.
