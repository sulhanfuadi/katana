/*
  KATANA (Kawan Tunanetra) - Smart Cane Prototype
  Target Board: Arduino Nano V3 (ATmega328P)

  Fitur Diagnosa Otomatis & Sensor Presence:
  - Mendeteksi secara langsung apakah sensor fisik terhubung (RIIL) atau terlepas (LEPAS).
  - Mencegah false alarm (misal alarm TEPI_TURUNAN tidak akan berbunyi jika sensor bawah memang belum dicolok).
  - Menampilkan status koneksi real-time setiap sensor di Serial Monitor.
*/

#include <Arduino.h>
#include <Wire.h>
#include <math.h>

// Set ke 0 untuk hardware fisik (Buzzer aktif 3-5V via transistor BC547)
// Set ke 1 jika simulasi di Wokwi
#define WOKWI_SIMULATION 0

// ================= PIN MAPPING =================
const byte PIN_FRONT_ECHO = 2;    // HC-SR04 Depan Echo
const byte PIN_FRONT_TRIG = 3;    // HC-SR04 Depan Trig
const byte PIN_FALL_TEST  = 4;    // Wokwi test button (D4 ke GND)
const byte PIN_VIBRATION  = 5;    // PWM Motor Getar SIG
const byte PIN_BUZZER     = 6;    // Active Buzzer via BC547 base
const byte PIN_DOWN_ECHO  = 10;   // HC-SR04 Bawah Echo
const byte PIN_DOWN_TRIG  = 11;   // HC-SR04 Bawah Trig
const byte PIN_WATER_RAW  = A0;   // Sensor Air Analog (A0)

const byte MPU_ADDR = 0x68;       // Alamat I2C MPU6050 (A4=SDA, A5=SCL)

// ================= PARAMETER AMBANG =================
const int FRONT_LOW_CM        = 100;
const int FRONT_MEDIUM_CM     = 50;
const int FRONT_NEAR_CM       = 20;
const int DROP_DELTA_LIMIT_CM = 15;
const int WATER_LIMIT         = 650;
const float DROP_TILT_MAX_DEG = 45.0;
const float FALL_TILT_LIMIT_DEG = 60.0;
const unsigned long DROP_DEBOUNCE_MS = 200;
const unsigned long FALL_CONFIRM_MS  = 2000;

enum AlertState {
  STANDBY,        // Sensor utama belum terpasang
  NORMAL,         // Semua sensor terpasang dan dalam batas aman
  OBJECT_LOW,     // Objek depan mulai terdeteksi (waspada)
  OBJECT_MEDIUM,  // Objek depan sedang
  OBJECT_NEAR,    // Objek depan sangat dekat (bahaya)
  WATER_ALERT,    // Genangan air / permukaan basah
  DROP_ALERT,     // Tepi turunan / lubang
  FALL_ALERT      // Tongkat jatuh / tergeletak
};

AlertState activeState = STANDBY;
unsigned long dropStartMs = 0;
unsigned long fallStartMs = 0;
unsigned long lastReportMs = 0;

// Data sensor & status koneksi hardware
bool frontConnected = false;
bool downConnected  = false;
bool mpuConnected   = false;
bool waterConnected = true;

float frontCm = -1.0;
float downCm  = -1.0;
int dropDeltaCm = 0;
float downBaselineCm = 30.0;
int waterValue = 0;
float tiltDeg = -1.0;

bool dropConfirmed  = false;
bool fallConfirmed  = false;
bool vibrationOn    = false;

// Mode Simulasi / Override Serial (seperti di Wokwi)
bool demoMode       = false;
float simFrontCm    = 80.0;
float simDownCm     = 30.0;
float simTiltDeg    = 12.0;
int simWaterVal     = 220;
String serialBuffer = "";

void processSerialCommand(String cmd);
void checkSerialInput();

void writeMPU(byte reg, byte value) {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(reg);
  Wire.write(value);
  Wire.endTransmission(true);
}

void setupMPU() {
  Wire.begin();
  writeMPU(0x6B, 0x00); // Wake MPU6050
  writeMPU(0x1C, 0x00); // Accelerometer range +/-2g
}

bool readMPUAccel(float &ax, float &ay, float &az) {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x3B);
  if (Wire.endTransmission(false) != 0) return false;
  if (Wire.requestFrom((int)MPU_ADDR, 6, true) != 6) return false;

  int16_t rawX = (Wire.read() << 8) | Wire.read();
  int16_t rawY = (Wire.read() << 8) | Wire.read();
  int16_t rawZ = (Wire.read() << 8) | Wire.read();
  ax = rawX / 16384.0;
  ay = rawY / 16384.0;
  az = rawZ / 16384.0;
  return true;
}

// Mengembalikan jarak cm jika tersambung, atau -1.0 jika timeout/lepas
float readUltrasonicCm(byte trigPin, byte echoPin, bool &connected) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  unsigned long pulse = pulseIn(echoPin, HIGH, 25000UL);
  if (pulse == 0) {
    connected = false;
    return -1.0;
  }
  connected = true;
  return pulse / 58.0;
}

void calibrateDownBaseline() {
  float total = 0.0;
  byte valid = 0;
  bool isConn = false;
  for (byte i = 0; i < 12; i++) {
    float value = readUltrasonicCm(PIN_DOWN_TRIG, PIN_DOWN_ECHO, isConn);
    if (isConn && value >= 5.0 && value <= 120.0) {
      total += value;
      valid++;
    }
    delay(35);
  }
  if (valid >= 6) {
    downBaselineCm = total / valid;
  }
}

void processSerialCommand(String cmd) {
  cmd.trim();
  if (cmd.length() == 0) return;

  String upper = cmd;
  upper.toUpperCase();

  if (upper == "HELP" || upper == "?") {
    Serial.println(F("\n=================================================="));
    Serial.println(F("       KATANA SERIAL SIMULATION CONSOLE           "));
    Serial.println(F("=================================================="));
    Serial.println(F("Perintah Dasar:"));
    Serial.println(F("  DEMO ON   -> Aktifkan mode simulasi / override"));
    Serial.println(F("  DEMO OFF  -> Kembali ke sensor fisik asli"));
    Serial.println(F(""));
    Serial.println(F("Atur Sensor Manual:"));
    Serial.println(F("  FRONT <cm>   -> Jarak depan (misal: FRONT 15)"));
    Serial.println(F("  DOWN <cm>    -> Jarak bawah/turunan (misal: DOWN 55)"));
    Serial.println(F("  TILT <deg>   -> Kemiringan tongkat (misal: TILT 75)"));
    Serial.println(F("  WATER <val>  -> Sensor air 0-1023 (misal: WATER 750)"));
    Serial.println(F(""));
    Serial.println(F("Skenario Cepat (Preset Wokwi):"));
    Serial.println(F("  FALL    -> Simulasi Tongkat Jatuh (Alarm SOS)"));
    Serial.println(F("  DROP    -> Simulasi Tepi Turunan / Lubang"));
    Serial.println(F("  WET     -> Simulasi Genangan Air"));
    Serial.println(F("  NEAR    -> Simulasi Objek Sangat Dekat"));
    Serial.println(F("  NORMAL  -> Simulasi Kondisi Aman Normal"));
    Serial.println(F("==================================================\n"));
    return;
  }

  if (upper == "DEMO ON" || upper == "DEMO:ON" || upper == "SIM 1" || upper == "SIM ON") {
    demoMode = true;
    Serial.println(F("[SISTEM] >>> MODE DEMO AKTIF: Nilai sensor di-override via serial <<<"));
    return;
  }

  if (upper == "DEMO OFF" || upper == "DEMO:OFF" || upper == "SIM 0" || upper == "SIM OFF") {
    demoMode = false;
    Serial.println(F("[SISTEM] >>> MODE DEMO NONAKTIF: Kembali membaca sensor fisik <<<"));
    return;
  }

  if (upper == "FALL" || upper == "DEMO:FALL") {
    demoMode = true;
    simTiltDeg = 75.0;
    Serial.println(F("[SISTEM] PRESET AKTIF: Tongkat Terjatuh (Kemiringan 75°)"));
    return;
  }

  if (upper == "DROP" || upper == "DEMO:DROP") {
    demoMode = true;
    simDownCm = downBaselineCm + 25.0;
    simTiltDeg = 15.0;
    Serial.println(F("[SISTEM] PRESET AKTIF: Tepi Turunan / Lubang (+25cm delta)"));
    return;
  }

  if (upper == "WET" || upper == "WATER_ALERT" || upper == "DEMO:WET") {
    demoMode = true;
    simWaterVal = 850;
    Serial.println(F("[SISTEM] PRESET AKTIF: Genangan Air (Nilai 850)"));
    return;
  }

  if (upper == "NEAR" || upper == "DEMO:NEAR") {
    demoMode = true;
    simFrontCm = 15.0;
    Serial.println(F("[SISTEM] PRESET AKTIF: Rintangan Depan Sangat Dekat (15cm)"));
    return;
  }

  if (upper == "NORMAL" || upper == "RESET" || upper == "DEMO:NORMAL") {
    demoMode = true;
    simFrontCm = 120.0;
    simDownCm = downBaselineCm;
    simTiltDeg = 12.0;
    simWaterVal = 180;
    Serial.println(F("[SISTEM] PRESET AKTIF: Kondisi Aman Normal"));
    return;
  }

  // Handle format: DEMO:KEY=VAL atau KEY=VAL atau KEY VAL
  if (upper.startsWith("DEMO:")) {
    upper = upper.substring(5);
  }

  int sep = upper.indexOf('=');
  if (sep == -1) sep = upper.indexOf(' ');
  if (sep != -1) {
    String key = upper.substring(0, sep);
    key.trim();
    String valStr = upper.substring(sep + 1);
    valStr.trim();
    float val = valStr.toFloat();

    demoMode = true; // Otomatis aktifkan demo jika ada nilai yang diset

    if (key == "FRONT" || key == "DEPAN") {
      simFrontCm = val;
      Serial.print(F("[SIM] Jarak Depan diset ke: "));
      Serial.print(simFrontCm, 0);
      Serial.println(F(" cm"));
    } else if (key == "DOWN" || key == "BAWAH") {
      simDownCm = val;
      Serial.print(F("[SIM] Jarak Bawah diset ke: "));
      Serial.print(simDownCm, 0);
      Serial.println(F(" cm"));
    } else if (key == "TILT" || key == "SUDUT") {
      simTiltDeg = val;
      Serial.print(F("[SIM] Kemiringan diset ke: "));
      Serial.print(simTiltDeg, 1);
      Serial.println(F("°"));
    } else if (key == "WATER" || key == "AIR") {
      simWaterVal = (int)val;
      Serial.print(F("[SIM] Sensor Air diset ke: "));
      Serial.println(simWaterVal);
    }
  }
}

void checkSerialInput() {
  while (Serial.available()) {
    char c = (char)Serial.read();
    if (c == '\n' || c == '\r') {
      if (serialBuffer.length() > 0) {
        processSerialCommand(serialBuffer);
        serialBuffer = "";
      }
    } else {
      if (serialBuffer.length() < 64) {
        serialBuffer += c;
      }
    }
  }
}

void updateInputs() {
  checkSerialInput();

  unsigned long now = millis();
  
  if (demoMode) {
    // Mode Simulasi / Override Serial
    frontConnected = true;
    downConnected  = true;
    mpuConnected   = true;
    waterConnected = true;

    frontCm     = simFrontCm;
    downCm      = simDownCm;
    tiltDeg     = simTiltDeg;
    waterValue  = simWaterVal;

    dropDeltaCm = (int)(downCm - downBaselineCm);
    if (dropDeltaCm < 0) dropDeltaCm = 0;
  } else {
    // Mode Fisik Nyata: Baca sensor fisik
    // 1. Baca sensor depan
    frontCm = readUltrasonicCm(PIN_FRONT_TRIG, PIN_FRONT_ECHO, frontConnected);
    delayMicroseconds(2500); // Cegah cross-talk ultrasonik
    
    // 2. Baca sensor bawah
    downCm = readUltrasonicCm(PIN_DOWN_TRIG, PIN_DOWN_ECHO, downConnected);
    
    // Hitung delta bawah hanya jika sensor bawah terhubung
    if (downConnected) {
      dropDeltaCm = (int)(downCm - downBaselineCm);
      if (dropDeltaCm < 0) dropDeltaCm = 0;
    } else {
      dropDeltaCm = 0;
    }

    // 3. Baca sensor air
    waterValue = analogRead(PIN_WATER_RAW);

    // 4. Baca MPU6050
    float ax = 0.0, ay = 0.0, az = 1.0;
    if (readMPUAccel(ax, ay, az)) {
      mpuConnected = true;
      float magnitude = sqrt(ax * ax + ay * ay + az * az);
      if (magnitude > 0.05) {
        float ratio = fabs(az) / magnitude;
        ratio = constrain(ratio, 0.0f, 1.0f);
        tiltDeg = acos(ratio) * 180.0 / PI;
      }
    } else {
      mpuConnected = false;
      tiltDeg = -1.0;
    }
  }

  // Filter deteksi turunan: HANYA aktif jika sensor bawah benar-benar TERHUBUNG (bukan lepas)
  bool dropCandidate = downConnected && (dropDeltaCm > DROP_DELTA_LIMIT_CM) && (!mpuConnected || tiltDeg < DROP_TILT_MAX_DEG);
  if (dropCandidate) {
    if (dropStartMs == 0) dropStartMs = now;
    dropConfirmed = (now - dropStartMs >= DROP_DEBOUNCE_MS);
  } else {
    dropStartMs = 0;
    dropConfirmed = false;
  }

  // Deteksi tongkat jatuh: HANYA aktif jika MPU6050 TERHUBUNG (kemiringan > 60 deg selama > 2 detik)
  bool fallButton = (digitalRead(PIN_FALL_TEST) == LOW);
  bool fallCandidate = mpuConnected && (tiltDeg > FALL_TILT_LIMIT_DEG);
  if (fallCandidate) {
    if (fallStartMs == 0) fallStartMs = now;
    fallConfirmed = (now - fallStartMs >= FALL_CONFIRM_MS);
  } else {
    fallStartMs = 0;
    fallConfirmed = false;
  }
  if (fallButton) fallConfirmed = true;
}

AlertState decideState() {
  // Jika seluruh sensor belum dicolok, tetap di mode STANDBY (cegah getar palsu)
  if (!frontConnected && !downConnected && !mpuConnected) {
    return STANDBY;
  }

  // Prioritas tunggal: Jatuh > Tepi Turunan > Genangan Air > Objek Depan
  if (fallConfirmed) return FALL_ALERT;
  if (dropConfirmed) return DROP_ALERT;
  if (waterValue > WATER_LIMIT) return WATER_ALERT;
  
  if (frontConnected) {
    if (frontCm < FRONT_NEAR_CM)   return OBJECT_NEAR;
    if (frontCm < FRONT_MEDIUM_CM) return OBJECT_MEDIUM;
    if (frontCm < FRONT_LOW_CM)    return OBJECT_LOW;
  }

  return NORMAL;
}

bool pulseWindow(unsigned long phase, unsigned long startMs, unsigned long endMs) {
  return phase >= startMs && phase < endMs;
}

bool vibrationPattern(AlertState state, unsigned long now) {
  switch (state) {
    case OBJECT_LOW:
      return (now % 1000UL) < 100UL;
    case OBJECT_MEDIUM:
      return (now % 400UL) < 120UL;
    case OBJECT_NEAR:
      return (now % 220UL) < 110UL;
    case WATER_ALERT: {
      unsigned long p = now % 1900UL;
      return pulseWindow(p, 0, 500) || pulseWindow(p, 750, 1250);
    }
    case DROP_ALERT: {
      unsigned long p = now % 1300UL;
      return pulseWindow(p, 0, 160) || pulseWindow(p, 280, 440) || pulseWindow(p, 560, 720);
    }
    default:
      return false;
  }
}

bool buzzerPattern(AlertState state, unsigned long now) {
  if (state != FALL_ALERT) return false;

  // Pola SOS Morse (... --- ...)
  unsigned long p = now % 3600UL;
  return pulseWindow(p, 0, 140) || pulseWindow(p, 240, 380) || pulseWindow(p, 480, 620) ||
         pulseWindow(p, 820, 1220) || pulseWindow(p, 1340, 1740) || pulseWindow(p, 1860, 2260) ||
         pulseWindow(p, 2460, 2600) || pulseWindow(p, 2700, 2840) || pulseWindow(p, 2940, 3080);
}

void driveBuzzer(bool on) {
#if WOKWI_SIMULATION
  if (on) tone(PIN_BUZZER, 1000);
  else noTone(PIN_BUZZER);
#else
  digitalWrite(PIN_BUZZER, on ? HIGH : LOW);
#endif
}

void updateOutputs(AlertState state) {
  unsigned long now = millis();
  vibrationOn = vibrationPattern(state, now);
  analogWrite(PIN_VIBRATION, vibrationOn ? 220 : 0);
  driveBuzzer(buzzerPattern(state, now));
}

const __FlashStringHelper *stateName(AlertState state) {
  switch (state) {
    case STANDBY:       return F("STANDBY (Sensor Lepas)");
    case OBJECT_LOW:    return F("OBJEK_WASPADA");
    case OBJECT_MEDIUM: return F("OBJEK_SEDANG");
    case OBJECT_NEAR:   return F("OBJEK_DEKAT");
    case WATER_ALERT:   return F("PERMUKAAN_BASAH");
    case DROP_ALERT:    return F("TEPI_TURUNAN");
    case FALL_ALERT:    return F("TONGKAT_JATUH");
    default:            return F("NORMAL");
  }
}

void selfTest() {
  analogWrite(PIN_VIBRATION, 200);
  driveBuzzer(true);
  delay(160);
  analogWrite(PIN_VIBRATION, 0);
  driveBuzzer(false);
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_FRONT_TRIG, OUTPUT);
  pinMode(PIN_FRONT_ECHO, INPUT);
  pinMode(PIN_DOWN_TRIG, OUTPUT);
  pinMode(PIN_DOWN_ECHO, INPUT);
  pinMode(PIN_FALL_TEST, INPUT_PULLUP);
  pinMode(PIN_VIBRATION, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);

  setupMPU();
  calibrateDownBaseline();
  selfTest();
  Serial.println(F("=================================================="));
  Serial.println(F("      KATANA SMART CANE - SYSTEM ONLINE           "));
  Serial.println(F("  Ketik HELP di Serial Monitor untuk Mode Demo    "));
  Serial.println(F("=================================================="));
}

void loop() {
  updateInputs();
  activeState = decideState();
  updateOutputs(activeState);

  unsigned long now = millis();
  if (now - lastReportMs >= 400) {
    lastReportMs = now;

    if (demoMode) {
      // Telemetri Khusus Mode Simulasi / Override Serial
      Serial.print(F("[SIMULASI] "));
      Serial.print(F("Depan:SIM("));
      Serial.print(frontCm, 0);
      Serial.print(F("cm) "));

      Serial.print(F("| Bawah:SIM("));
      Serial.print(downCm, 0);
      Serial.print(F("cm) "));

      Serial.print(F("| IMU:SIM("));
      Serial.print(tiltDeg, 1);
      Serial.print(F("°) "));

      Serial.print(F("| Air:SIM("));
      Serial.print(waterValue);
      Serial.print(F(")"));
    } else {
      // Telemetri Hardware Fisik Riil
      Serial.print(F("[KONEKSI] "));
      
      // Sensor Depan
      Serial.print(F("Depan:"));
      if (frontConnected) {
        Serial.print(F("RIIL("));
        Serial.print(frontCm, 0);
        Serial.print(F("cm) "));
      } else {
        Serial.print(F("LEPAS "));
      }

      // Sensor Bawah
      Serial.print(F("| Bawah:"));
      if (downConnected) {
        Serial.print(F("RIIL("));
        Serial.print(downCm, 0);
        Serial.print(F("cm) "));
      } else {
        Serial.print(F("LEPAS "));
      }

      // MPU6050
      Serial.print(F("| IMU:"));
      if (mpuConnected) {
        Serial.print(F("RIIL("));
        Serial.print(tiltDeg, 1);
        Serial.print(F("°) "));
      } else {
        Serial.print(F("LEPAS "));
      }

      // Sensor Air
      Serial.print(F("| Air:RIIL("));
      Serial.print(waterValue);
      Serial.print(F(")"));
    }

    // Status Keputusan & Aktuator Fisik
    Serial.print(F(" || STATE: "));
    Serial.print(stateName(activeState));
    Serial.print(F(" | Motor: "));
    Serial.print(vibrationOn ? F("ON") : F("OFF"));
    Serial.print(F(" | Buzzer: "));
    Serial.println(activeState == FALL_ALERT ? F("SOS") : F("DIAM"));
  }
  delay(20);
}
