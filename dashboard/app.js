/* ==========================================================================
   KATANA Smart Cane - Web Serial Dashboard Application
   ========================================================================== */

// DOM Elements
const btnConnect = document.getElementById('btnConnect');
const btnDisconnect = document.getElementById('btnDisconnect');
const btnDemo = document.getElementById('btnDemo');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');

// Alert Banner Elements
const mainAlertBanner = document.getElementById('mainAlertBanner');
const alertIcon = document.getElementById('alertIcon');
const alertStateText = document.getElementById('alertStateText');
const alertDesc = document.getElementById('alertDesc');
const indMotor = document.getElementById('indMotor');
const valMotor = document.getElementById('valMotor');
const indBuzzer = document.getElementById('indBuzzer');
const valBuzzer = document.getElementById('valBuzzer');

// Metrics Elements
const valFront = document.getElementById('valFront');
const barFront = document.getElementById('barFront');
const chipFront = document.getElementById('chipFront');
const frontZoneLabel = document.getElementById('frontZoneLabel');

const valDown = document.getElementById('valDown');
const chipDown = document.getElementById('chipDown');
const valDeltaDown = document.getElementById('valDeltaDown');
const downStatusDesc = document.getElementById('downStatusDesc');

const valTilt = document.getElementById('valTilt');
const barTilt = document.getElementById('barTilt');
const chipMpu = document.getElementById('chipMpu');
const tiltStatusDesc = document.getElementById('tiltStatusDesc');

const valWater = document.getElementById('valWater');
const barWater = document.getElementById('barWater');
const chipWater = document.getElementById('chipWater');
const waterStatusDesc = document.getElementById('waterStatusDesc');

// Visualizer Elements
const caneObject = document.getElementById('caneObject');
const fallWarningOverlay = document.getElementById('fallWarningOverlay');
const sonarCone = document.getElementById('sonarCone');
const vibWaves = document.getElementById('vibWaves');

// Pin Badges
const badgeFront = document.getElementById('badgeFront');
const badgeDown = document.getElementById('badgeDown');
const badgeMpu = document.getElementById('badgeMpu');
const badgeWater = document.getElementById('badgeWater');
const badgeMotor = document.getElementById('badgeMotor');
const badgeBuzzer = document.getElementById('badgeBuzzer');

// Console Elements
const terminalBody = document.getElementById('terminalBody');
const chkAutoscroll = document.getElementById('chkAutoscroll');
const btnClearLog = document.getElementById('btnClearLog');

// Demo Drawer Elements
const demoDrawer = document.getElementById('demoDrawer');
const btnCloseDemo = document.getElementById('btnCloseDemo');
const rngDemoFront = document.getElementById('rngDemoFront');
const rngDemoDown = document.getElementById('rngDemoDown');
const rngDemoTilt = document.getElementById('rngDemoTilt');
const rngDemoWater = document.getElementById('rngDemoWater');
const lblDemoFront = document.getElementById('lblDemoFront');
const lblDemoDown = document.getElementById('lblDemoDown');
const lblDemoTilt = document.getElementById('lblDemoTilt');
const lblDemoWater = document.getElementById('lblDemoWater');

// Serial Port Variables
let port = null;
let reader = null;
let inputDone = null;
let inputStream = null;
let isDemoMode = false;

// ================= SERIAL CONNECTION =================

async function connectSerial() {
  if (!('serial' in navigator)) {
    alert('Browser ini belum mendukung Web Serial API. Silakan gunakan Google Chrome, Brave, atau Microsoft Edge versi terbaru.');
    return;
  }

  try {
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: 115200 });

    updateConnectionUI(true);
    addLogLine('[SISTEM] Port serial berhasil terhubung pada 115200 baud.', true);

    const textDecoder = new TextDecoderStream();
    inputDone = port.readable.pipeTo(textDecoder.writable);
    inputStream = textDecoder.readable;

    reader = inputStream.getReader();
    readLoop();
  } catch (err) {
    console.error('Koneksi dibatalkan atau gagal:', err);
    addLogLine(`[ERROR] Gagal membuka port: ${err.message}`);
    updateConnectionUI(false);
  }
}

async function disconnectSerial() {
  if (reader) {
    await reader.cancel();
    await inputDone.catch(() => {});
    reader = null;
    inputDone = null;
  }
  if (port) {
    await port.close();
    port = null;
  }
  updateConnectionUI(false);
  addLogLine('[SISTEM] Port serial diputuskan.', true);
}

function updateConnectionUI(connected) {
  if (connected) {
    statusDot.className = 'status-dot connected';
    statusText.textContent = 'Terhubung (115200)';
    btnConnect.style.display = 'none';
    btnDisconnect.style.display = 'inline-flex';
  } else {
    statusDot.className = 'status-dot disconnected';
    statusText.textContent = 'Terputus';
    btnConnect.style.display = 'inline-flex';
    btnDisconnect.style.display = 'none';
  }
}

// ================= STREAM PARSER =================

let buffer = '';

async function readLoop() {
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) {
      buffer += value;
      const lines = buffer.split('\n');
      buffer = lines.pop(); // simpan sisa karakter belum utuh
      for (const line of lines) {
        const cleanLine = line.trim();
        if (cleanLine.length > 0) {
          parseTelemetryLine(cleanLine);
          addLogLine(cleanLine);
        }
      }
    }
  }
}

function parseTelemetryLine(line) {
  // Format Baru: [KONEKSI] Depan:RIIL(15cm) | Bawah:LEPAS | IMU:RIIL(1.2°) | Air:RIIL(242) || STATE: OBJEK_DEKAT | Motor: ON | Buzzer: DIAM
  if (line.includes('[KONEKSI]')) {
    parseFormatBaru(line);
    return;
  }

  // Format Lama / Diagnosa: state=TEPI_TURUNAN | depan=400cm | delta_bawah=...
  if (line.includes('state=')) {
    parseFormatLama(line);
  }
}

function parseFormatBaru(line) {
  const data = {
    frontConnected: false,
    frontCm: null,
    downConnected: false,
    downCm: null,
    mpuConnected: false,
    tiltDeg: null,
    waterVal: 0,
    state: 'STANDBY',
    motor: 'OFF',
    buzzer: 'DIAM'
  };

  // Depan
  const frontMatch = line.match(/Depan:RIIL\((\d+)cm\)/);
  if (frontMatch) {
    data.frontConnected = true;
    data.frontCm = parseInt(frontMatch[1], 10);
  }

  // Bawah
  const downMatch = line.match(/Bawah:RIIL\((\d+)cm\)/);
  if (downMatch) {
    data.downConnected = true;
    data.downCm = parseInt(downMatch[1], 10);
  }

  // IMU
  const imuMatch = line.match(/IMU:RIIL\(([0-9.]+)°\)/);
  if (imuMatch) {
    data.mpuConnected = true;
    data.tiltDeg = parseFloat(imuMatch[1]);
  }

  // Air
  const waterMatch = line.match(/Air:RIIL\((\d+)\)/);
  if (waterMatch) {
    data.waterVal = parseInt(waterMatch[1], 10);
  }

  // State
  const stateMatch = line.match(/STATE:\s*([^|]+)/);
  if (stateMatch) {
    data.state = stateMatch[1].trim();
  }

  // Motor & Buzzer
  const motorMatch = line.match(/Motor:\s*(ON|OFF)/);
  if (motorMatch) data.motor = motorMatch[1];

  const buzzerMatch = line.match(/Buzzer:\s*(SOS|DIAM)/);
  if (buzzerMatch) data.buzzer = buzzerMatch[1];

  renderUI(data);
}

function parseFormatLama(line) {
  const pairs = line.split('|').map(s => s.trim());
  const data = {
    frontConnected: true,
    frontCm: 400,
    downConnected: true,
    downCm: 30,
    mpuConnected: true,
    tiltDeg: 0,
    waterVal: 0,
    state: 'NORMAL',
    motor: 'OFF',
    buzzer: 'DIAM'
  };

  for (const part of pairs) {
    if (part.startsWith('state=')) data.state = part.replace('state=', '');
    if (part.startsWith('depan=')) data.frontCm = parseInt(part.replace(/[^0-9]/g, ''), 10);
    if (part.startsWith('air=')) data.waterVal = parseInt(part.replace(/[^0-9]/g, ''), 10);
    if (part.startsWith('tilt=')) data.tiltDeg = parseFloat(part.replace('tilt=', ''));
    if (part.startsWith('MOTOR=')) data.motor = part.replace('MOTOR=', '');
    if (part.startsWith('BUZZER=')) data.buzzer = part.replace('BUZZER=', '');
  }

  if (data.frontCm >= 390) data.frontConnected = false;
  renderUI(data);
}

// ================= UI RENDERER =================

function renderUI(data) {
  // 1. Front Sensor
  if (data.frontConnected && data.frontCm !== null) {
    chipFront.className = 'chip chip-online';
    chipFront.textContent = 'RIIL';
    valFront.textContent = data.frontCm;
    badgeFront.className = 'pin-badge badge-ok';
    badgeFront.textContent = `${data.frontCm} cm`;

    const fillPct = Math.min(100, Math.max(0, (1 - (data.frontCm / 150)) * 100));
    barFront.style.width = `${fillPct}%`;

    if (data.frontCm < 20) {
      frontZoneLabel.textContent = 'BAHAYA DEKAT (<20cm)';
      frontZoneLabel.style.color = 'var(--accent-rose)';
    } else if (data.frontCm < 50) {
      frontZoneLabel.textContent = 'WASPADA SEDANG (<50cm)';
      frontZoneLabel.style.color = 'var(--accent-amber)';
    } else if (data.frontCm < 100) {
      frontZoneLabel.textContent = 'OBJEK TERDETEKSI (<100cm)';
      frontZoneLabel.style.color = 'var(--accent-violet)';
    } else {
      frontZoneLabel.textContent = 'Jalur Aman (>100cm)';
      frontZoneLabel.style.color = 'var(--text-muted)';
    }
  } else {
    chipFront.className = 'chip chip-offline';
    chipFront.textContent = 'LEPAS';
    valFront.textContent = '--';
    barFront.style.width = '0%';
    badgeFront.className = 'pin-badge badge-nc';
    badgeFront.textContent = 'KABEL LEPAS';
    frontZoneLabel.textContent = 'Sensor Tidak Terdeteksi';
    frontZoneLabel.style.color = 'var(--text-muted)';
  }

  // 2. Down Sensor (Drop / Pothole)
  if (data.downConnected && data.downCm !== null) {
    chipDown.className = 'chip chip-online';
    chipDown.textContent = 'RIIL';
    valDown.textContent = data.downCm;
    badgeDown.className = 'pin-badge badge-ok';
    badgeDown.textContent = `${data.downCm} cm`;

    const delta = Math.max(0, data.downCm - 30);
    valDeltaDown.textContent = `+${delta} cm`;

    if (delta > 15) {
      downStatusDesc.textContent = '⚠️ TERDETEKSI TURUNAN / LUBANG!';
      downStatusDesc.style.color = 'var(--accent-amber)';
    } else {
      downStatusDesc.textContent = 'Lantai Datar Normal';
      downStatusDesc.style.color = 'var(--text-muted)';
    }
  } else {
    chipDown.className = 'chip chip-offline';
    chipDown.textContent = 'LEPAS';
    valDown.textContent = '--';
    valDeltaDown.textContent = '0 cm';
    badgeDown.className = 'pin-badge badge-nc';
    badgeDown.textContent = 'KABEL LEPAS';
    downStatusDesc.textContent = 'Sensor Belum Dicolok';
    downStatusDesc.style.color = 'var(--text-muted)';
  }

  // 3. MPU6050 (Tilt)
  if (data.mpuConnected && data.tiltDeg !== null) {
    chipMpu.className = 'chip chip-online';
    chipMpu.textContent = 'RIIL';
    valTilt.textContent = data.tiltDeg.toFixed(1);
    badgeMpu.className = 'pin-badge badge-ok';
    badgeMpu.textContent = `${data.tiltDeg.toFixed(1)}°`;

    const tiltPct = Math.min(100, Math.max(0, (data.tiltDeg / 90) * 100));
    barTilt.style.width = `${tiltPct}%`;

    // Rotate virtual cane
    caneObject.style.transform = `rotate(${Math.min(85, data.tiltDeg)}deg)`;

    if (data.tiltDeg > 60) {
      tiltStatusDesc.textContent = '⚠️ TONGKAT REBAH / JATUH!';
      tiltStatusDesc.style.color = 'var(--accent-rose)';
      fallWarningOverlay.style.display = 'block';
    } else {
      tiltStatusDesc.textContent = 'Sudut Jalan Normal';
      tiltStatusDesc.style.color = 'var(--text-muted)';
      fallWarningOverlay.style.display = 'none';
    }
  } else {
    chipMpu.className = 'chip chip-offline';
    chipMpu.textContent = 'LEPAS';
    valTilt.textContent = '--';
    barTilt.style.width = '0%';
    badgeMpu.className = 'pin-badge badge-nc';
    badgeMpu.textContent = 'KABEL LEPAS';
    tiltStatusDesc.textContent = 'Sensor Belum Dicolok';
    tiltStatusDesc.style.color = 'var(--text-muted)';
    caneObject.style.transform = `rotate(0deg)`;
    fallWarningOverlay.style.display = 'none';
  }

  // 4. Water Sensor
  valWater.textContent = data.waterVal;
  const waterPct = Math.min(100, Math.max(0, (data.waterVal / 1023) * 100));
  barWater.style.width = `${waterPct}%`;

  if (data.waterVal > 650) {
    waterStatusDesc.textContent = '⚠️ AIR TERDETEKSI (GENANGAN)';
    waterStatusDesc.className = 'text-danger';
    waterStatusDesc.style.color = 'var(--accent-cyan)';
    badgeWater.className = 'pin-badge badge-ok';
    badgeWater.textContent = 'BASAH!';
  } else {
    waterStatusDesc.textContent = 'Permukaan Kering';
    waterStatusDesc.className = 'text-safe';
    waterStatusDesc.style.color = 'var(--text-muted)';
    badgeWater.className = 'pin-badge badge-ok';
    badgeWater.textContent = `${data.waterVal}`;
  }

  // 5. Actuators
  valMotor.textContent = data.motor;
  if (data.motor === 'ON') {
    indMotor.className = 'actuator-indicator active';
    if (vibWaves) vibWaves.style.display = 'block';
  } else {
    indMotor.className = 'actuator-indicator';
    if (vibWaves) vibWaves.style.display = 'none';
  }

  valBuzzer.textContent = data.buzzer;
  if (data.buzzer === 'SOS') {
    indBuzzer.className = 'actuator-indicator sos-active';
  } else {
    indBuzzer.className = 'actuator-indicator';
  }

  // 6. Main Alert Banner
  updateBanner(data.state);
}

function updateBanner(state) {
  mainAlertBanner.className = 'alert-banner';
  const st = state.toUpperCase();

  if (st.includes('JATUH') || st.includes('FALL')) {
    mainAlertBanner.classList.add('danger-fall');
    alertIcon.textContent = '🚨';
    alertStateText.textContent = 'TONGKAT TERJATUH! (SOS AKTIF)';
    alertDesc.textContent = 'Buzzer pencari tongkat membunyikan pola SOS. Berhenti dan tegakkan tongkat.';
  } else if (st.includes('TURUNAN') || st.includes('DROP')) {
    mainAlertBanner.classList.add('danger-drop');
    alertIcon.textContent = '⚠️';
    alertStateText.textContent = 'PERINGATAN: TEPI TURUNAN / LUBANG';
    alertDesc.textContent = 'Perubahan kontur lantai > 15 cm terdeteksi. Motor bergetar 3 kali pulsa kuat.';
  } else if (st.includes('BASAH') || st.includes('WATER')) {
    mainAlertBanner.classList.add('danger-water');
    alertIcon.textContent = '💧';
    alertStateText.textContent = 'PERINGATAN: PERMUKAAN BASAH / GENANGAN';
    alertDesc.textContent = 'Pelat sensor mendeteksi genangan air di depan ujung tongkat.';
  } else if (st.includes('DEKAT')) {
    mainAlertBanner.classList.add('warn-object');
    alertIcon.textContent = '🛑';
    alertStateText.textContent = 'BAHAYA: RINTANGAN SANGAT DEKAT (<20 cm)';
    alertDesc.textContent = 'Objek tepat di depan badan pengguna. Pulsa getaran motor sangat rapat.';
  } else if (st.includes('SEDANG') || st.includes('WASPADA')) {
    mainAlertBanner.classList.add('warn-object');
    alertIcon.textContent = '🚶';
    alertStateText.textContent = 'OBJEK TERDETEKSI DI DEPAN';
    alertDesc.textContent = 'Ada rintangan atau pejalan kaki di jarak 50–100 cm.';
  } else if (st.includes('NORMAL')) {
    mainAlertBanner.classList.add('normal');
    alertIcon.textContent = '✅';
    alertStateText.textContent = 'SISTEM NORMAL & JALUR AMAN';
    alertDesc.textContent = 'Semua sensor aktif membaca dalam batas normal. Motor getar diam.';
  } else {
    mainAlertBanner.classList.add('standby');
    alertIcon.textContent = '⏳';
    alertStateText.textContent = 'MODE STANDBY (MENUNGGU SENSOR)';
    alertDesc.textContent = 'Sistem aktif. Sambungkan modul sensor fisik untuk pengujian navigasi.';
  }
}

// ================= LOG CONSOLE =================

function addLogLine(text, isSystem = false) {
  const lineEl = document.createElement('div');
  lineEl.className = isSystem ? 'log-line system-msg' : 'log-line';
  lineEl.textContent = text;
  terminalBody.appendChild(lineEl);

  if (chkAutoscroll.checked) {
    terminalBody.scrollTop = terminalBody.scrollHeight;
  }

  // Batasi maksimal 150 baris agar browser tetap ringan
  if (terminalBody.childElementCount > 150) {
    terminalBody.removeChild(terminalBody.firstChild);
  }
}

btnClearLog.addEventListener('click', () => {
  terminalBody.innerHTML = '';
});

// ================= DEMO MODE SIMULATION =================

btnDemo.addEventListener('click', () => {
  isDemoMode = !isDemoMode;
  demoDrawer.style.display = isDemoMode ? 'block' : 'none';
  btnDemo.style.borderColor = isDemoMode ? 'var(--accent-violet)' : 'var(--border-subtle)';
  btnDemo.style.color = isDemoMode ? 'var(--accent-violet)' : 'var(--text-secondary)';

  if (isDemoMode) {
    addLogLine('[DEMO] Mode simulasi diaktifkan. Geser slider untuk menguji animasi UI.', true);
    runDemoTick();
  }
});

btnCloseDemo.addEventListener('click', () => {
  isDemoMode = false;
  demoDrawer.style.display = 'none';
});

function runDemoTick() {
  if (!isDemoMode) return;

  const front = parseInt(rngDemoFront.value, 10);
  const downDelta = parseInt(rngDemoDown.value, 10);
  const tilt = parseFloat(rngDemoTilt.value);
  const water = parseInt(rngDemoWater.value, 10);

  lblDemoFront.textContent = `${front} cm`;
  lblDemoDown.textContent = `+${downDelta} cm`;
  lblDemoTilt.textContent = `${tilt}°`;
  lblDemoWater.textContent = water;

  let state = 'NORMAL';
  let motor = 'OFF';
  let buzzer = 'DIAM';

  if (tilt > 60) {
    state = 'TONGKAT_JATUH';
    buzzer = 'SOS';
  } else if (downDelta > 15) {
    state = 'TEPI_TURUNAN';
    motor = 'ON';
  } else if (water > 650) {
    state = 'PERMUKAAN_BASAH';
    motor = 'ON';
  } else if (front < 20) {
    state = 'OBJEK_DEKAT';
    motor = 'ON';
  } else if (front < 50) {
    state = 'OBJEK_SEDANG';
    motor = 'ON';
  } else if (front < 100) {
    state = 'OBJEK_WASPADA';
  }

  renderUI({
    frontConnected: true,
    frontCm: front,
    downConnected: true,
    downCm: 30 + downDelta,
    mpuConnected: true,
    tiltDeg: tilt,
    waterVal: water,
    state: state,
    motor: motor,
    buzzer: buzzer
  });
}

[rngDemoFront, rngDemoDown, rngDemoTilt, rngDemoWater].forEach(rng => {
  rng.addEventListener('input', runDemoTick);
});

// Event Listeners
btnConnect.addEventListener('click', connectSerial);
btnDisconnect.addEventListener('click', disconnectSerial);
