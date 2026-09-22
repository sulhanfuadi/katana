# Blueprint Wiring Fisik KATANA (Kawan Tunanetra)

Dokumen ini adalah acuan pengkabelan dan perakitan perangkat keras nyata KATANA menggunakan **Arduino Nano V3 (ATmega328P)**.

---

## 1. Tabel Pinout dan Komponen

| Komponen | Pin Modul | Terhubung ke Arduino Nano | Sumber Daya / Catatan |
|---|---|---|---|
| **HC-SR04 Depan** | VCC | 5V | Jalur 5V bersama |
| | GND | GND | Jalur GND bersama |
| | TRIG | D3 | Pin pemicu pulsa depan |
| | ECHO | D2 | Pin pembaca jarak depan |
| **HC-SR04 Bawah** | VCC | 5V | Jalur 5V bersama |
| | GND | GND | Jalur GND bersama |
| | TRIG | D11 | Pin pemicu pulsa bawah (dipicu bergantian) |
| | ECHO | D10 | Pin pembaca jarak lantai/turunan |
| **Sensor Air** | VCC | 5V | Jalur 5V bersama |
| | GND | GND | Jalur GND bersama |
| | AO (Analog) | A0 | Pembacaan resistansi pelat air |
| **MPU6050 (IMU)** | VCC | 5V | Jalur 5V bersama |
| | GND | GND | Jalur GND bersama |
| | SDA | A4 | I2C Data (0x68) |
| | SCL | A5 | I2C Clock |
| **Modul Motor Getar PWM** | VCC | 5V | Jalur 5V bersama |
| | GND | GND | Jalur GND bersama |
| | SIG (Control) | D5 | Kontrol pulsa PWM getaran gagang |
| **Active Buzzer 3-5V** | Positif (+) | 5V | Jalur 5V bersama |
| | Negatif (-) | Kolektor BC547 | Transistor driver NPN BC547 |
| | Resistor 1kΩ | D6 ke Basis BC547 | Membatasi arus basis dari GPIO D6 |
| | Emitor BC547 | GND | Jalur GND bersama |

---

## 2. Diagram Rangkaian Buzzer (Driver BC547)

```
       +5V ------------ (+) Buzzer Aktif (-)
                             |
                             | (Kolektor)
    Pin D6 --- [ 1kΩ ] ---> B (Basis)   BC547 (NPN)
                             | (Emitor)
                            GND
```

> **PERINGATAN**: Jangan menyambungkan Buzzer atau Motor getar langsung ke pin GPIO Arduino tanpa transistor atau modul driver, agar tidak merusak pin microcontroller akibat beban arus berlebih.

---

## 3. Penempatan Fisik pada Kruk Siku

1. **Kotak Elektronik (ABS 120x70x35 mm)**:
   - Pasang sedekat mungkin di bawah gagang kruk menggunakan 2 klem/velcro dan busa EVA 2-3 mm.
   - Jangan mengebor poros kruk!
   - Di dalamnya berisi: Arduino Nano, MPU6050, mini breadboard, resistor & transistor buzzer.
2. **Motor Getar**:
   - Ditempel di bawah genggaman (grip) tangan agar getaran terasa langsung di telapak pengguna.
3. **HC-SR04 Depan**:
   - Dipasang 55–65 cm dari lantai, menghadap lurus ke depan (sudut 0°).
4. **HC-SR04 Bawah**:
   - Dipasang 15–20 cm di atas karet kaki tongkat, menghadap 35°–45° ke arah bawah-depan.
5. **Pelat Sensor Air**:
   - Dipasang 2–3 cm di atas karet kaki tongkat di sisi depan. Pastikan pelat tidak menyentuh lantai secara langsung dan tidak menahan beban kruk.

---

## 4. Checklist Pra-Nyalakan (Pre-Power Check)

- [ ] Polaritas 5V dan GND tidak terbalik di seluruh modul.
- [ ] Seluruh jalur GND terhubung ke satu titik (common GND).
- [ ] Pin D2, D3, D10, D11 tidak saling tertukar antara sensor depan dan sensor bawah.
- [ ] Kabel tidak terjepit atau menutupi lubang pengatur tinggi kruk.
- [ ] Daya disuplai melalui port USB Type-C Arduino Nano dari Power Bank 5V (jangan suntik 5V ke pin VIN).
