/*
  KATANA (Kawan Tunanetra) - Smart Cane Prototype
  Target Board: Arduino Nano V3 (ATmega328P)

  Deskripsi:
  Alat bantu navigasi berbasis retrofit kruk/tongkat siku untuk mendeteksi:
  1. Objek di depan (HC-SR04 depan) -> Getaran berjenjang (semakin dekat, semakin cepat)
  2. Tepi turunan / lubang (HC-SR04 bawah) -> 3 pulsa getar kuat
  3. Genangan air / permukaan basah (Sensor air analog) -> 2 pulsa getar panjang
  4. Tongkat jatuh / tergeletak (MPU6050) -> Buzzer pola SOS pencari tongkat

  PENTING UNTUK HARDWARE NYATA:
  - Ubah WOKWI_SIMULATION ke 0 sebelum upload ke Arduino Nano fisik.
  - Hubungkan Arduino Nano ke port USB (misal: /dev/cu.usbserial-10).
*/

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
  NORMAL,
  OBJECT_LOW,
  OBJECT_MEDIUM,
  OBJECT_NEAR,
  WATER_ALERT,
  DROP_ALERT,
  FALL_ALERT
};

AlertState activeState = NORMAL;
unsigned long dropStartMs = 0;
unsigned long fallStartMs = 0;
unsigned long lastReportMs = 0;

float frontCm = 400.0;
int dropDeltaCm = 0;
float downCm = 30.0;
float downBaselineCm = 30.0;
int waterValue = 0;
float tiltDeg = 0.0;
bool dropConfirmed = false;
bool fallConfirmed = false;
bool vibrationOn = false;

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

float readUltrasonicCm(byte trigPin, byte echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  unsigned long pulse = pulseIn(echoPin, HIGH, 25000UL);
  if (pulse == 0) return 400.0;
  return pulse / 58.0;
}

void calibrateDownBaseline() {
  float total = 0.0;
  byte valid = 0;
  for (byte i = 0; i < 12; i++) {
    float value = readUltrasonicCm(PIN_DOWN_TRIG, PIN_DOWN_ECHO);
    if (value >= 5.0 && value <= 120.0) {
      total += value;
      valid++;
    }
    delay(35);
  }
  if (valid >= 6) {
    downBaselineCm = total / valid;
  }
}

void updateInputs() {
  unsigned long now = millis();
  
  // Baca sensor depan
  frontCm = readUltrasonicCm(PIN_FRONT_TRIG, PIN_FRONT_ECHO);
  delayMicroseconds(2500); // Cegah cross-talk antar sensor ultrasonik
  
  // Baca sensor bawah
  downCm = readUltrasonicCm(PIN_DOWN_TRIG, PIN_DOWN_ECHO);
  waterValue = analogRead(PIN_WATER_RAW);
  dropDeltaCm = (int)(downCm - downBaselineCm);
  if (dropDeltaCm < 0) dropDeltaCm = 0;

  // Baca accelerometer MPU6050
  float ax = 0.0, ay = 0.0, az = 1.0;
  if (readMPUAccel(ax, ay, az)) {
    float magnitude = sqrt(ax * ax + ay * ay + az * az);
    if (magnitude > 0.05) {
      float ratio = fabs(az) / magnitude;
      ratio = constrain(ratio, 0.0f, 1.0f);
      tiltDeg = acos(ratio) * 180.0 / PI;
    }
  }

  // Filter deteksi turunan: hanya jika tongkat tidak sengaja diangkat/dimiringkan (>45 deg)
  bool dropCandidate = dropDeltaCm > DROP_DELTA_LIMIT_CM && tiltDeg < DROP_TILT_MAX_DEG;
  if (dropCandidate) {
    if (dropStartMs == 0) dropStartMs = now;
    dropConfirmed = (now - dropStartMs >= DROP_DEBOUNCE_MS);
  } else {
    dropStartMs = 0;
    dropConfirmed = false;
  }

  // Deteksi tongkat jatuh: kemiringan > 60 deg selama > 2 detik
  bool fallButton = digitalRead(PIN_FALL_TEST) == LOW;
  bool fallCandidate = tiltDeg > FALL_TILT_LIMIT_DEG;
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
  // Prioritas tunggal: Jatuh > Tepi Turunan > Genangan Air > Objek Depan
  if (fallConfirmed) return FALL_ALERT;
  if (dropConfirmed) return DROP_ALERT;
  if (waterValue > WATER_LIMIT) return WATER_ALERT;
  if (frontCm < FRONT_NEAR_CM) return OBJECT_NEAR;
  if (frontCm < FRONT_MEDIUM_CM) return OBJECT_MEDIUM;
  if (frontCm < FRONT_LOW_CM) return OBJECT_LOW;
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
  Serial.println(F("KATANA System Online"));
  Serial.println(F("HC-SR04 depan D2/D3 | HC-SR04 bawah D10/D11 | Water A0 | MPU A4/A5 | Buzzer D6 | Motor D5"));
}

void loop() {
  updateInputs();
  activeState = decideState();
  updateOutputs(activeState);

  unsigned long now = millis();
  if (now - lastReportMs >= 300) {
    lastReportMs = now;
    Serial.print(F("state="));
    Serial.print(stateName(activeState));
    Serial.print(F(" | depan="));
    Serial.print(frontCm, 0);
    Serial.print(F("cm | delta_bawah="));
    Serial.print(dropDeltaCm);
    Serial.print(F("cm (jarak="));
    Serial.print(downCm, 0);
    Serial.print(F("; baseline="));
    Serial.print(downBaselineCm, 0);
    Serial.print(F(")"));
    Serial.print(F(" | air="));
    Serial.print(waterValue);
    Serial.print(F(" | tilt="));
    Serial.print(tiltDeg, 1);
    Serial.print(F("deg | MOTOR="));
    Serial.print(vibrationOn ? F("ON") : F("OFF"));
    Serial.print(F(" | BUZZER="));
    Serial.println(activeState == FALL_ALERT ? F("SOS") : F("DIAM"));
  }
  delay(20);
}
