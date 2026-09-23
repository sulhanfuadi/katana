/*
  KATANA - Hardware Diagnostic & Wiring Doctor
  Target: Arduino Nano V3 (ATmega328P)
  Baud Rate: 115200

  Skrip ini melakukan uji kesehatan sambungan kabel (wiring check)
  pada semua sensor dan komponen secara otomatis tanpa perlu menebak.
*/

#include <Arduino.h>
#include <Wire.h>

const byte PIN_FRONT_ECHO = 2;
const byte PIN_FRONT_TRIG = 3;
const byte PIN_VIBRATION  = 5;
const byte PIN_BUZZER     = 6;
const byte PIN_DOWN_ECHO  = 10;
const byte PIN_DOWN_TRIG  = 11;
const byte PIN_WATER_RAW  = A0;

void runDiagnostics();
void checkMPU6050();
void checkUltrasonic(const char* label, byte trigPin, byte echoPin, const char* pinsInfo);
void checkWaterSensor();
void testActuators();

void setup() {
  Serial.begin(115200);
  while (!Serial) delay(10);

  pinMode(PIN_FRONT_TRIG, OUTPUT);
  pinMode(PIN_FRONT_ECHO, INPUT);
  pinMode(PIN_DOWN_TRIG, OUTPUT);
  pinMode(PIN_DOWN_ECHO, INPUT);
  pinMode(PIN_VIBRATION, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);

  Wire.begin();

  Serial.println(F("============================================"));
  Serial.println(F("       KATANA HARDWARE DIAGNOSTIC TOOL      "));
  Serial.println(F("============================================"));
  Serial.println(F("Memulai pemeriksaan sambungan kabel...\n"));
  delay(1000);

  runDiagnostics();
}

void checkMPU6050() {
  Serial.print(F("1. MPU6050 (Pin A4=SDA, A5=SCL)   : "));
  Wire.beginTransmission(0x68);
  byte error = Wire.endTransmission();

  if (error == 0) {
    Serial.println(F("[ PASS ] Terhubung sempurna di alamat I2C 0x68!"));
  } else {
    Wire.beginTransmission(0x69);
    error = Wire.endTransmission();
    if (error == 0) {
      Serial.println(F("[ PASS ] Terhubung di alamat I2C 0x69 (AD0 High)!"));
    } else {
      Serial.println(F("[ GAGAL ] Kabel lepas atau belum ada daya."));
      Serial.println(F("   -> Cek: VCC ke 5V, GND ke GND, SDA ke A4, SCL ke A5."));
      Serial.println(F("   -> Pastikan lampu LED kecil di papan MPU6050 menyala."));
    }
  }
}

void checkUltrasonic(const char* label, byte trigPin, byte echoPin, const char* pinsInfo) {
  Serial.print(label);
  Serial.print(F(" : "));

  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  unsigned long duration = pulseIn(echoPin, HIGH, 30000UL);

  if (duration == 0) {
    Serial.println(F("[ GAGAL ] Timeout / Tidak ada respons!"));
    Serial.print(F("   -> Cek kabel "));
    Serial.println(pinsInfo);
  } else {
    float dist = duration / 58.0;
    Serial.print(F("[ PASS ] Terhubung! Jarak terbaca = "));
    Serial.print(dist, 1);
    Serial.println(F(" cm"));
  }
}

void checkWaterSensor() {
  Serial.print(F("4. Sensor Air (Pin A0)             : "));
  int val = analogRead(PIN_WATER_RAW);
  Serial.print(F("[ PASS ] Terbaca nilai analog = "));
  Serial.print(val);
  if (val < 100) {
    Serial.println(F(" (Kering / Terhubung ke GND)"));
  } else if (val < 650) {
    Serial.println(F(" (Kering / Siap mendeteksi)"));
  } else {
    Serial.println(F(" (BASAH / Terdeteksi genangan air!)"));
  }
}

void testActuators() {
  Serial.println(F("\n5. Uji Buzzer & Transistor BC547 (Pin D6):"));
  Serial.println(F("   -> Mengirim sinyal bunyi 'BEEP' singkat sekarang..."));
  digitalWrite(PIN_BUZZER, HIGH);
  delay(300);
  digitalWrite(PIN_BUZZER, LOW);
  Serial.println(F("   -> Jika berbunyi, rangkaian transistor BC547 & buzzer OK!"));

  delay(500);
  Serial.println(F("\n6. Uji Motor Getar (Pin D5):"));
  Serial.println(F("   -> Mengirim getaran singkat sekarang..."));
  analogWrite(PIN_VIBRATION, 220);
  delay(300);
  analogWrite(PIN_VIBRATION, 0);
  Serial.println(F("   -> Jika bergetar, modul motor OK!"));
}

void runDiagnostics() {
  checkMPU6050();
  delay(200);
  checkUltrasonic("2. HC-SR04 Depan (D3 Trig, D2 Echo)", PIN_FRONT_TRIG, PIN_FRONT_ECHO, "VCC=5V, GND=GND, TRIG=D3, ECHO=D2");
  delay(200);
  checkUltrasonic("3. HC-SR04 Bawah (D11 Trig, D10 Echo)", PIN_DOWN_TRIG, PIN_DOWN_ECHO, "VCC=5V, GND=GND, TRIG=D11, ECHO=D10");
  delay(200);
  checkWaterSensor();
  delay(200);
  testActuators();

  Serial.println(F("\n============================================"));
  Serial.println(F(" Pemeriksaan selesai. Loop pemantauan live: "));
  Serial.println(F("============================================"));
}

void loop() {
  // Mode live scanner: pantau respon tiap 1 detik
  int water = analogRead(PIN_WATER_RAW);
  
  digitalWrite(PIN_FRONT_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PIN_FRONT_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_FRONT_TRIG, LOW);
  unsigned long dFront = pulseIn(PIN_FRONT_ECHO, HIGH, 30000UL);

  Wire.beginTransmission(0x68);
  bool mpuOk = (Wire.endTransmission() == 0);

  Serial.print(F("LIVE -> MPU6050: "));
  Serial.print(mpuOk ? F("OK") : F("PUTUS"));
  Serial.print(F(" | Depan: "));
  if (dFront == 0) Serial.print(F("LEPAS"));
  else {
    Serial.print((int)(dFront / 58.0));
    Serial.print(F("cm"));
  }
  Serial.print(F(" | Sensor Air: "));
  Serial.println(water);

  delay(1000);
}
