/* ==========================================================================
   KATANA Dashboard Controller
   Mudah Dipahami Orang Awam • Pendeteksi Sensor • Multi-Tema
   ========================================================================== */

// Kontrol Utama & Tema
const themeSelect = document.getElementById('themeSelect');
const btnConnect = document.getElementById('btnConnect');
const btnDisconnect = document.getElementById('btnDisconnect');
const btnDemo = document.getElementById('btnDemo');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');

// Banner Status Utama
const mainAlertBanner = document.getElementById('mainAlertBanner');
const alertStateText = document.getElementById('alertStateText');
const alertDesc = document.getElementById('alertDesc');
const valMotor = document.getElementById('valMotor');
const valBuzzer = document.getElementById('valBuzzer');

// Kartu Metrik
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
const lblAngleCoordinate = document.getElementById('lblAngleCoordinate');

const valWater = document.getElementById('valWater');
const barWater = document.getElementById('barWater');
const chipWater = document.getElementById('chipWater');
const waterStatusDesc = document.getElementById('waterStatusDesc');

// Visual Tongkat & Alarm
const caneObject = document.getElementById('caneObject');
const fallWarningOverlay = document.getElementById('fallWarningOverlay');

// Badge Checklist Kabel
const badgeFront = document.getElementById('badgeFront');
const badgeDown = document.getElementById('badgeDown');
const badgeMpu = document.getElementById('badgeMpu');
const badgeWater = document.getElementById('badgeWater');
const badgeMotor = document.getElementById('badgeMotor');
const badgeBuzzer = document.getElementById('badgeBuzzer');

// Terminal Log
const terminalBody = document.getElementById('terminalBody');
const chkAutoscroll = document.getElementById('chkAutoscroll');
const btnClearLog = document.getElementById('btnClearLog');

// Panel Demo
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

let port = null;
let reader = null;
let inputDone = null;
let inputStream = null;
let isDemoMode = false;
let buffer = '';

// ================= SISTEM TEMA =================

function initTheme() {
  const savedTheme = localStorage.getItem('katana_theme') || 'dark';
  applyTheme(savedTheme);
  themeSelect.value = savedTheme;
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('katana_theme', theme);
}

themeSelect.addEventListener('change', (e) => {
  applyTheme(e.target.value);
});

initTheme();

// ================= KONEKSI SERIAL =================

async function connectSerial() {
  if (!('serial' in navigator)) {
    alert('Browser Anda belum mendukung Web Serial API. Silakan buka halaman ini di Google Chrome, Brave, atau Microsoft Edge.');
    return;
  }

  try {
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: 115200 });

    updateConnectionUI(true);
    addLogLine('[SISTEM] Port USB berhasil terhubung pada kecepatan 115200 baud.', true);

    const textDecoder = new TextDecoderStream();
    inputDone = port.readable.pipeTo(textDecoder.writable);
    inputStream = textDecoder.readable;

    reader = inputStream.getReader();
    readLoop();
  } catch (err) {
    console.error('Koneksi dibatalkan:', err);
    addLogLine(`[INFO] Koneksi tidak dibuka: ${err.message}`);
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
  addLogLine('[SISTEM] Kabel Arduino diputuskan.', true);
}

function updateConnectionUI(connected) {
  if (connected) {
    statusDot.className = 'indicator-glyph connected';
    statusText.textContent = 'Terhubung (115200)';
    btnConnect.style.display = 'none';
    btnDisconnect.style.display = 'inline-flex';
  } else {
    statusDot.className = 'indicator-glyph';
    statusText.textContent = 'Belum Tersambung';
    btnConnect.style.display = 'inline-flex';
    btnDisconnect.style.display = 'none';
  }
}

// ================= PARSER DATA TELEMETRI =================

async function readLoop() {
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) {
      buffer += value;
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        const clean = line.trim();
        if (clean.length > 0) {
          parseTelemetryLine(clean);
          addLogLine(clean);
        }
      }
    }
  }
}

function parseTelemetryLine(line) {
  if (line.includes('[KONEKSI]')) {
    parseFormatBaru(line);
    return;
  }
  if (line.includes('state='')) {
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

  // Sensor Depan
  const frontMatch = line.match(/Depan:RIIL\((\d+)cm\)/);
  if (frontMatch) {
    data.frontConnected = true;
    data.frontCm = parseInt(frontMatch[1], 10);
  }

  // Sensor Bawah
  const downMatch = line.match(/Bawah:RIIL\((\d+)cm\)/);
  if (downMatch) {
    data.downConnected = true;
    data.downCm = parseInt(downMatch[1], 10);
  }

  // IMU Kemiringan
  const imuMatch = line.match(/IMU:RIIL\(([0-9.]+)°\)/);
  if (imuMatch) {
    data.mpuConnected = true;
    data.tiltDeg = parseFloat(imuMatch[1]);
  }

  // Sensor Air
  const waterMatch = line.match(/Air:RIIL\((\d+)\)/);
  if (waterMatch) {
    data.waterVal = parseInt(waterMatch[1], 10);
  }

  // Status Utama
  const stateMatch = line.match(/STATE:\s*([^|]+)/);
  if (stateMatch) {
    data.state = stateMatch[1].trim();
  }

  // Aktuator
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

// ================= RENDER TAMPILAN RAMAH AWAM =================

function renderUI(data) {
  // 1. Sensor Depan
  if (data.frontConnected && data.frontCm !== null) {
    chipFront.className = 'badge-status badge-active';
    chipFront.textContent = 'Tersambung (Aktif)';
    valFront.textContent = data.frontCm;
    badgeFront.className = 'check-badge badge-active';
    badgeFront.textContent = `Tersambung (${data.frontCm} cm)`;

    const fillPct = Math.min(100, Math.max(0, (1 - (data.frontCm / 150)) * 100));
    barFront.style.width = `${fillPct}%`;

    if (data.frontCm < 20) {
      frontZoneLabel.textContent = '⚠️ Rintangan Sangat Dekat (<20 cm)';
      frontZoneLabel.style.color = 'var(--alert-red)';
    } else if (data.frontCm < 50) {
      frontZoneLabel.textContent = 'Waspada: Objek Sedang (<50 cm)';
      frontZoneLabel.style.color = 'var(--badge-text-warn)';
    } else if (data.frontCm < 100) {
      frontZoneLabel.textContent = 'Objek Terdeteksi (<100 cm)';
      frontZoneLabel.style.color = 'var(--text-body)';
    } else {
      frontZoneLabel.textContent = 'Jalur Bebas Hambatan';
      frontZoneLabel.style.color = 'var(--text-muted)';
    }
  } else {
    chipFront.className = 'badge-status badge-unplugged';
    chipFront.textContent = 'Kabel Belum Dicolok';
    valFront.textContent = '--';
    barFront.style.width = '0%';
    badgeFront.className = 'check-badge badge-unplugged';
    badgeFront.textContent = 'Kabel Belum Dicolok';
    frontZoneLabel.textContent = 'Sensor Tidak Terbaca';
    frontZoneLabel.style.color = 'var(--text-muted)';
  }

  // 2. Sensor Bawah (Turunan / Lubang)
  if (data.downConnected && data.downCm !== null) {
    chipDown.className = 'badge-status badge-active';
    chipDown.textContent = 'Tersambung (Aktif)';
    valDown.textContent = data.downCm;
    badgeDown.className = 'check-badge badge-active';
    badgeDown.textContent = `Tersambung (${data.downCm} cm)`;

    const delta = Math.max(0, data.downCm - 30);
    valDeltaDown.textContent = `+${delta} cm`;

    if (delta > 15) {
      downStatusDesc.textContent = '⚠️ WASPADA: ADA TURUNAN / LUBANG!';
      downStatusDesc.style.color = 'var(--badge-text-warn)';
    } else {
      downStatusDesc.textContent = 'Permukaan Datar Aman';
      downStatusDesc.style.color = 'var(--text-muted)';
    }
  } else {
    chipDown.className = 'badge-status badge-unplugged';
    chipDown.textContent = 'Kabel Belum Dicolok';
    valDown.textContent = '--';
    valDeltaDown.textContent = '+0 cm';
    badgeDown.className = 'check-badge badge-unplugged';
    badgeDown.textContent = 'Kabel Belum Dicolok';
    downStatusDesc.textContent = 'Sensor Tidak Terbaca';
    downStatusDesc.style.color = 'var(--text-muted)';
  }

  // 3. Sensor Kemiringan (MPU6050)
  if (data.mpuConnected && data.tiltDeg !== null) {
    chipMpu.className = 'badge-status badge-active';
    chipMpu.textContent = 'Tersambung (Aktif)';
    valTilt.textContent = data.tiltDeg.toFixed(1);
    badgeMpu.className = 'check-badge badge-active';
    badgeMpu.textContent = `Tersambung (${data.tiltDeg.toFixed(1)}°)`;

    const tiltPct = Math.min(100, Math.max(0, (data.tiltDeg / 90) * 100));
    barTilt.style.width = `${tiltPct}%`;

    caneObject.style.transform = `rotate(${Math.min(85, data.tiltDeg)}deg)`;
    lblAngleCoordinate.textContent = `Kemiringan: ${data.tiltDeg.toFixed(1)}°`;

    if (data.tiltDeg > 60) {
      tiltStatusDesc.textContent = '⚠️ TONGKAT REBAH / TERJATUH!';
      tiltStatusDesc.style.color = 'var(--alert-red)';
      fallWarningOverlay.style.display = 'block';
    } else {
      tiltStatusDesc.textContent = 'Tongkat Posisi Berdiri Normal';
      tiltStatusDesc.style.color = 'var(--text-muted)';
      fallWarningOverlay.style.display = 'none';
    }
  } else {
    chipMpu.className = 'badge-status badge-unplugged';
    chipMpu.textContent = 'Kabel Belum Dicolok';
    valTilt.textContent = '--';
    barTilt.style.width = '0%';
    badgeMpu.className = 'check-badge badge-unplugged';
    badgeMpu.textContent = 'Kabel Belum Dicolok';
    tiltStatusDesc.textContent = 'Sensor Tidak Terbaca';
    tiltStatusDesc.style.color = 'var(--text-muted)';
    caneObject.style.transform = `rotate(0deg)`;
    lblAngleCoordinate.textContent = `Kemiringan: 0.0°`;
    fallWarningOverlay.style.display = 'none';
  }

  // 4. Sensor Air
  valWater.textContent = data.waterVal;
  const waterPct = Math.min(100, Math.max(0, (data.waterVal / 1023) * 100));
  barWater.style.width = `${waterPct}%`;

  if (data.waterVal > 650) {
    waterStatusDesc.textContent = '⚠️ PERMUKAAN BASAH / ADA GENANGAN AIR';
    waterStatusDesc.style.color = 'var(--badge-text-warn)';
    badgeWater.className = 'check-badge badge-warning';
    badgeWater.textContent = 'Basah (Genangan Terdeteksi)';
  } else {
    waterStatusDesc.textContent = 'Permukaan Kering Normal';
    waterStatusDesc.style.color = 'var(--text-muted)';
    badgeWater.className = 'check-badge badge-active';
    badgeWater.textContent = 'Tersambung (Kering)';
  }

  // 5. Aktuator
  if (data.motor === 'ON') {
    valMotor.textContent = 'Bergetar (ON)';
    valMotor.className = 'act-state on';
  } else {
    valMotor.textContent = 'Diam (OFF)';
    valMotor.className = 'act-state';
  }

  if (data.buzzer === 'SOS' || data.buzzer.includes('SOS')) {
    valBuzzer.textContent = 'BERBUNYI SOS!';
    valBuzzer.className = 'act-state sos';
  } else {
    valBuzzer.textContent = 'Diam (Normal)';
    valBuzzer.className = 'act-state';
  }

  // 6. Banner Penjelasan Utama
  updateBanner(data.state);
}

function updateBanner(state) {
  const st = state.toUpperCase();
  mainAlertBanner.className = 'state-banner';

  if (st.includes('JATUH') || st.includes('FALL')) {
    mainAlertBanner.classList.add('banner-danger');
    alertStateText.textContent = '🚨 BAHAYA: TONGKAT TERJATUH! (ALARM SOS AKTIF)';
    alertDesc.textContent = 'Buzzer membunyikan sinyal Morse SOS berulang kali. Silakan tegakkan tongkat kembali untuk mematikan alarm.';
  } else if (st.includes('TURUNAN') || st.includes('DROP')) {
    mainAlertBanner.classList.add('banner-alert');
    alertStateText.textContent = '⚠️ PERINGATAN: ADA TEPI TURUNAN / JURANG DI DEPAN';
    alertDesc.textContent = 'Ketinggian lantai turun lebih dari 15 cm. Motor memberikan 3 kali getaran kuat pada gagang tangan.';
  } else if (st.includes('BASAH') || st.includes('WATER')) {
    mainAlertBanner.classList.add('banner-alert');
    alertStateText.textContent = '💧 PERINGATAN: MENDETEKSI GENANGAN AIR / AREA BASAH';
    alertDesc.textContent = 'Pelat sensor mendeteksi genangan air di depan ujung tongkat. Motor memberikan 2 kali getaran panjang.';
  } else if (st.includes('DEKAT')) {
    mainAlertBanner.classList.add('banner-danger');
    alertStateText.textContent = '🛑 BAHAYA: RINTANGAN SANGAT DEKAT (< 20 CM)';
    alertDesc.textContent = 'Ada tembok, tiang, atau orang tepat di depan badan Anda. Hentikan langkah!';
  } else if (st.includes('SEDANG') || st.includes('WASPADA')) {
    mainAlertBanner.classList.add('banner-alert');
    alertStateText.textContent = '🚶 PERHATIAN: OBJEK RINTANGAN DI DEPAN (50-100 CM)';
    alertDesc.textContent = 'Sensor atas mendeteksi hambatan di depan. Kecepatan pulsa getaran menyesuaikan jarak.';
  } else if (st.includes('NORMAL')) {
    alertStateText.textContent = '✅ JALUR AMAN & BEBAS HAMBATAN';
    alertDesc.textContent = 'Semua sensor membaca kondisi normal. Pengguna dapat melangkah dengan aman.';
  } else {
    alertStateText.textContent = '⏳ MENUNGGU SENSOR TERHUBUNG';
    alertDesc.textContent = 'Sistem online. Silakan tancapkan kabel sensor fisik ke pin Arduino untuk mulai pemindaian.';
  }
}

// ================= TERMINAL LOG =================

function addLogLine(text, isSystem = false) {
  const lineEl = document.createElement('div');
  lineEl.className = isSystem ? 'log-entry system-note' : 'log-entry';
  lineEl.textContent = `> ${text}`;
  terminalBody.appendChild(lineEl);

  if (chkAutoscroll.checked) {
    terminalBody.scrollTop = terminalBody.scrollHeight;
  }

  if (terminalBody.childElementCount > 150) {
    terminalBody.removeChild(terminalBody.firstChild);
  }
}

btnClearLog.addEventListener('click', () => {
  terminalBody.innerHTML = '';
});

// ================= PENGATUR MODE DEMO (SIMULASI) =================

btnDemo.addEventListener('click', () => {
  isDemoMode = !isDemoMode;
  demoDrawer.style.display = isDemoMode ? 'block' : 'none';

  if (isDemoMode) {
    addLogLine('[DEMO] Mode coba tampilan aktif. Geser slider untuk melihat perubahan dashboard.', true);
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
  lblDemoWater.textContent = water > 650 ? `${water} (Basah)` : `${water} (Kering)`;

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

// Event Listener
btnConnect.addEventListener('click', connectSerial);
btnDisconnect.addEventListener('click', disconnectSerial);
