/* ==========================================================================
   KATANA Technical Console - Serial Engine & State Coordinator
   High-Contrast Monochrome Edition
   ========================================================================== */

// Top Controls
const btnConnect = document.getElementById('btnConnect');
const btnDisconnect = document.getElementById('btnDisconnect');
const btnDemo = document.getElementById('btnDemo');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');

// State Banner
const mainAlertBanner = document.getElementById('mainAlertBanner');
const alertStateText = document.getElementById('alertStateText');
const alertDesc = document.getElementById('alertDesc');
const valMotor = document.getElementById('valMotor');
const valBuzzer = document.getElementById('valBuzzer');

// Metrics
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

// Visualizer
const caneObject = document.getElementById('caneObject');
const fallWarningOverlay = document.getElementById('fallWarningOverlay');

// Matrix Badges
const badgeFront = document.getElementById('badgeFront');
const badgeDown = document.getElementById('badgeDown');
const badgeMpu = document.getElementById('badgeMpu');
const badgeWater = document.getElementById('badgeWater');
const badgeMotor = document.getElementById('badgeMotor');
const badgeBuzzer = document.getElementById('badgeBuzzer');

// Console Log
const terminalBody = document.getElementById('terminalBody');
const chkAutoscroll = document.getElementById('chkAutoscroll');
const btnClearLog = document.getElementById('btnClearLog');

// Demo Drawer
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

// ================= SERIAL CONNECTION =================

async function connectSerial() {
  if (!('serial' in navigator)) {
    alert('Browser ini belum mendukung Web Serial API. Gunakan Chrome, Brave, atau Edge.');
    return;
  }

  try {
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: 115200 });

    updateConnectionUI(true);
    addLogLine('[SYS] PORT OPENED @ 115200 BAUD // READY', true);

    const textDecoder = new TextDecoderStream();
    inputDone = port.readable.pipeTo(textDecoder.writable);
    inputStream = textDecoder.readable;

    reader = inputStream.getReader();
    readLoop();
  } catch (err) {
    console.error('Serial connection error:', err);
    addLogLine(`[ERR] PORT FAILURE: ${err.message}`);
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
  addLogLine('[SYS] PORT CLOSED // DISCONNECTED', true);
}

function updateConnectionUI(connected) {
  if (connected) {
    statusDot.className = 'indicator-glyph live';
    statusText.textContent = 'ONLINE // 115200';
    btnConnect.style.display = 'none';
    btnDisconnect.style.display = 'inline-flex';
  } else {
    statusDot.className = 'indicator-glyph';
    statusText.textContent = 'OFFLINE';
    btnConnect.style.display = 'inline-flex';
    btnDisconnect.style.display = 'none';
  }
}

// ================= TELEMETRY PARSER =================

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
    buzzer: 'IDLE'
  };

  const frontMatch = line.match(/Depan:RIIL\((\d+)cm\)/);
  if (frontMatch) {
    data.frontConnected = true;
    data.frontCm = parseInt(frontMatch[1], 10);
  }

  const downMatch = line.match(/Bawah:RIIL\((\d+)cm\)/);
  if (downMatch) {
    data.downConnected = true;
    data.downCm = parseInt(downMatch[1], 10);
  }

  const imuMatch = line.match(/IMU:RIIL\(([0-9.]+)°\)/);
  if (imuMatch) {
    data.mpuConnected = true;
    data.tiltDeg = parseFloat(imuMatch[1]);
  }

  const waterMatch = line.match(/Air:RIIL\((\d+)\)/);
  if (waterMatch) {
    data.waterVal = parseInt(waterMatch[1], 10);
  }

  const stateMatch = line.match(/STATE:\s*([^|]+)/);
  if (stateMatch) {
    data.state = stateMatch[1].trim();
  }

  const motorMatch = line.match(/Motor:\s*(ON|OFF)/);
  if (motorMatch) data.motor = motorMatch[1];

  const buzzerMatch = line.match(/Buzzer:\s*(SOS|DIAM)/);
  if (buzzerMatch) {
    data.buzzer = buzzerMatch[1] === 'SOS' ? 'ALERT_SOS' : 'IDLE';
  }

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
    buzzer: 'IDLE'
  };

  for (const part of pairs) {
    if (part.startsWith('state=')) data.state = part.replace('state=', '');
    if (part.startsWith('depan=')) data.frontCm = parseInt(part.replace(/[^0-9]/g, ''), 10);
    if (part.startsWith('air=')) data.waterVal = parseInt(part.replace(/[^0-9]/g, ''), 10);
    if (part.startsWith('tilt=')) data.tiltDeg = parseFloat(part.replace('tilt=', ''));
    if (part.startsWith('MOTOR=')) data.motor = part.replace('MOTOR=', '');
    if (part.startsWith('BUZZER=')) data.buzzer = part.includes('SOS') ? 'ALERT_SOS' : 'IDLE';
  }

  if (data.frontCm >= 390) data.frontConnected = false;
  renderUI(data);
}

// ================= MONOCHROME RENDERER =================

function renderUI(data) {
  // 1. Front Sensor
  if (data.frontConnected && data.frontCm !== null) {
    chipFront.className = 'panel-status status-ok';
    chipFront.textContent = 'ACTIVE';
    valFront.textContent = data.frontCm;
    badgeFront.className = 'col-state state-connected';
    badgeFront.textContent = `${data.frontCm} CM`;

    const fillPct = Math.min(100, Math.max(0, (1 - (data.frontCm / 150)) * 100));
    barFront.style.width = `${fillPct}%`;

    if (data.frontCm < 20) {
      frontZoneLabel.textContent = 'CRITICAL PROXIMITY (<20CM)';
    } else if (data.frontCm < 50) {
      frontZoneLabel.textContent = 'OBJECT DETECTED (<50CM)';
    } else if (data.frontCm < 100) {
      frontZoneLabel.textContent = 'APPROACHING (<100CM)';
    } else {
      frontZoneLabel.textContent = 'CLEAR PATH (>100CM)';
    }
  } else {
    chipFront.className = 'panel-status status-nc';
    chipFront.textContent = 'UNPLUGGED';
    valFront.textContent = '--';
    barFront.style.width = '0%';
    badgeFront.className = 'col-state state-disconnected';
    badgeFront.textContent = 'NC';
    frontZoneLabel.textContent = 'DISCONNECTED';
  }

  // 2. Down Sensor (Drop / Pothole)
  if (data.downConnected && data.downCm !== null) {
    chipDown.className = 'panel-status status-ok';
    chipDown.textContent = 'ACTIVE';
    valDown.textContent = data.downCm;
    badgeDown.className = 'col-state state-connected';
    badgeDown.textContent = `${data.downCm} CM`;

    const delta = Math.max(0, data.downCm - 30);
    valDeltaDown.textContent = `+${delta} CM`;

    if (delta > 15) {
      downStatusDesc.textContent = 'DROP HAZARD DETECTED';
    } else {
      downStatusDesc.textContent = 'LEVEL SURFACE';
    }
  } else {
    chipDown.className = 'panel-status status-nc';
    chipDown.textContent = 'UNPLUGGED';
    valDown.textContent = '--';
    valDeltaDown.textContent = '0 CM';
    badgeDown.className = 'col-state state-disconnected';
    badgeDown.textContent = 'NC';
    downStatusDesc.textContent = 'DISCONNECTED';
  }

  // 3. MPU6050 (Tilt)
  if (data.mpuConnected && data.tiltDeg !== null) {
    chipMpu.className = 'panel-status status-ok';
    chipMpu.textContent = 'ACTIVE';
    valTilt.textContent = data.tiltDeg.toFixed(1);
    badgeMpu.className = 'col-state state-connected';
    badgeMpu.textContent = `${data.tiltDeg.toFixed(1)}°`;

    const tiltPct = Math.min(100, Math.max(0, (data.tiltDeg / 90) * 100));
    barTilt.style.width = `${tiltPct}%`;

    caneObject.style.transform = `rotate(${Math.min(85, data.tiltDeg)}deg)`;
    lblAngleCoordinate.textContent = `ROTATION: ${data.tiltDeg.toFixed(2)}°`;

    if (data.tiltDeg > 60) {
      tiltStatusDesc.textContent = 'HORIZONTAL RECLINE';
      fallWarningOverlay.style.display = 'block';
    } else {
      tiltStatusDesc.textContent = 'NORMAL AXIS';
      fallWarningOverlay.style.display = 'none';
    }
  } else {
    chipMpu.className = 'panel-status status-nc';
    chipMpu.textContent = 'UNPLUGGED';
    valTilt.textContent = '--';
    barTilt.style.width = '0%';
    badgeMpu.className = 'col-state state-disconnected';
    badgeMpu.textContent = 'NC';
    tiltStatusDesc.textContent = 'DISCONNECTED';
    caneObject.style.transform = `rotate(0deg)`;
    lblAngleCoordinate.textContent = `ROTATION: 0.00°`;
    fallWarningOverlay.style.display = 'none';
  }

  // 4. Water Sensor
  valWater.textContent = data.waterVal;
  const waterPct = Math.min(100, Math.max(0, (data.waterVal / 1023) * 100));
  barWater.style.width = `${waterPct}%`;

  if (data.waterVal > 650) {
    waterStatusDesc.textContent = 'MOISTURE DETECTED';
    badgeWater.className = 'col-state state-connected';
    badgeWater.textContent = 'WET';
  } else {
    waterStatusDesc.textContent = 'DRY SURFACE';
    badgeWater.className = 'col-state state-connected';
    badgeWater.textContent = `${data.waterVal}`;
  }

  // 5. Actuators
  valMotor.textContent = data.motor;
  valMotor.className = data.motor === 'ON' ? 'cell-value active' : 'cell-value';

  valBuzzer.textContent = data.buzzer;
  valBuzzer.className = data.buzzer.includes('SOS') ? 'cell-value alert' : 'cell-value';

  // 6. State Banner
  updateBanner(data.state);
}

function updateBanner(state) {
  const st = state.toUpperCase();
  mainAlertBanner.className = 'state-banner';

  if (st.includes('JATUH') || st.includes('FALL')) {
    mainAlertBanner.classList.add('critical-fall');
    alertStateText.textContent = 'CRITICAL // CANE INCLINED PAST 60° (SOS ACTIVE)';
    alertDesc.textContent = 'Emergency acoustic locator beacon pulsing. Stand cane upright to reset.';
  } else if (st.includes('TURUNAN') || st.includes('DROP')) {
    mainAlertBanner.classList.add('alert-active');
    alertStateText.textContent = 'WARNING // FLOOR DROP-OFF DETECTED';
    alertDesc.textContent = 'Ground contour deviation > 15 cm. Triple haptic pulse pattern engaged.';
  } else if (st.includes('BASAH') || st.includes('WATER')) {
    mainAlertBanner.classList.add('alert-active');
    alertStateText.textContent = 'NOTICE // WATER SURFACE DETECTED';
    alertDesc.textContent = 'Electrode conductivity threshold exceeded. Dual extended haptic pulse engaged.';
  } else if (st.includes('DEKAT')) {
    mainAlertBanner.classList.add('alert-active');
    alertStateText.textContent = 'HAZARD // IMMEDIATE OBSTACLE PROXIMITY (<20 CM)';
    alertDesc.textContent = 'Obstacle directly in user movement corridor. High-frequency pulse active.';
  } else if (st.includes('SEDANG') || st.includes('WASPADA')) {
    mainAlertBanner.classList.add('alert-active');
    alertStateText.textContent = 'ATTENTION // OBSTACLE IN PATH';
    alertDesc.textContent = 'Object detected within 50-100 cm range.';
  } else if (st.includes('NORMAL')) {
    alertStateText.textContent = 'NOMINAL // CLEAR PATHWAY';
    alertDesc.textContent = 'All connected telemetry parameters within safe operation thresholds.';
  } else {
    alertStateText.textContent = 'STANDBY // WAITING FOR TELEMETRY';
    alertDesc.textContent = 'System online. Connect physical sensors to begin path scanning.';
  }
}

// ================= LOG CONSOLE =================

function addLogLine(text, isSystem = false) {
  const lineEl = document.createElement('div');
  lineEl.className = isSystem ? 'log-entry sys' : 'log-entry';
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

// ================= DEMO CONTROLLER =================

btnDemo.addEventListener('click', () => {
  isDemoMode = !isDemoMode;
  demoDrawer.style.display = isDemoMode ? 'block' : 'none';
  btnDemo.style.borderColor = isDemoMode ? 'var(--fg-pure)' : 'var(--line-mid)';
  btnDemo.style.color = isDemoMode ? 'var(--fg-pure)' : 'var(--fg-mid)';

  if (isDemoMode) {
    addLogLine('[SYS] DEMO MANUAL EMULATION ACTIVE', true);
    runDemoTick();
  }
});

btnCloseDemo.addEventListener('click', () => {
  isDemoMode = false;
  demoDrawer.style.display = 'none';
  btnDemo.style.borderColor = 'var(--line-mid)';
  btnDemo.style.color = 'var(--fg-mid)';
});

function runDemoTick() {
  if (!isDemoMode) return;

  const front = parseInt(rngDemoFront.value, 10);
  const downDelta = parseInt(rngDemoDown.value, 10);
  const tilt = parseFloat(rngDemoTilt.value);
  const water = parseInt(rngDemoWater.value, 10);

  lblDemoFront.textContent = `${front} CM`;
  lblDemoDown.textContent = `+${downDelta} CM`;
  lblDemoTilt.textContent = `${tilt}°`;
  lblDemoWater.textContent = `${water} RAW`;

  let state = 'NORMAL';
  let motor = 'OFF';
  let buzzer = 'IDLE';

  if (tilt > 60) {
    state = 'TONGKAT_JATUH';
    buzzer = 'ALERT_SOS';
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
