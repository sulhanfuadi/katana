"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Usb,
  Unplug,
  Compass,
  Eye,
  TrendingDown,
  Droplets,
  Vibrate,
  Volume2,
  Sliders,
  Moon,
  Sun,
  Laptop,
  AlertTriangle,
  Trash2,
  X,
  Send,
  Terminal,
  Copy,
  Check,
  Activity,
  Cpu,
  Layers
} from "lucide-react";

interface TelemetryData {
  frontConnected: boolean;
  frontCm: number | null;
  downConnected: boolean;
  downCm: number | null;
  mpuConnected: boolean;
  tiltDeg: number | null;
  waterConnected: boolean;
  waterVal: number | null;
  state: string;
  motor: string;
  buzzer: string;
}

const initialTelemetryState: TelemetryData = {
  frontConnected: false,
  frontCm: null,
  downConnected: false,
  downCm: null,
  mpuConnected: false,
  tiltDeg: null,
  waterConnected: false,
  waterVal: null,
  state: "STANDBY",
  motor: "OFF",
  buzzer: "DIAM"
};

const translations = {
  id: {
    appTitle: "Katana Dashboard",
    badge: "v1.2",
    subtitle: "Alat Bantu Navigasi Kruk Pintar Tunanetra // Web Serial Engine",
    connectedStatus: "ONLINE // 115200 BAUD",
    disconnectedStatus: "OFFLINE // STANDBY",
    demoStatus: "SIMULASI // AKTIF",
    connectBtn: "Hubungkan Arduino",
    disconnectBtn: "Putuskan USB",
    demoOn: "Demo: AKTIF",
    demoOff: "Demo: MATI",
    demoTag: "MODE SIMULASI",
    haptic: "HAPTIC",
    buzzer: "BUZZER",
    vibrating: "BERGETAR",
    idle: "IDLE (OFF)",
    sosAlarm: "ALARM SOS",
    silent: "DIAM (OFF)",
    frontObstacle: "Rintangan Depan",
    frontSub: "HC-SR04 Lurus // Pin D2/D3",
    downDrop: "Turunan / Lubang",
    downSub: "HC-SR04 Miring // Pin D10/D11",
    caneTilt: "Kemiringan Tongkat",
    caneSub: "MPU6050 IMU // Pin A4/A5",
    waterSensor: "Deteksi Air / Genangan",
    waterSub: "Pelat FR-4 // Pin A0",
    online: "ONLINE",
    offline: "LEPAS",
    frontHazard: "Bahaya Rintangan",
    frontCaution: "Waspada Sedang",
    frontClear: "Jalur Bersih",
    downHazard: "Tepi Turunan Terbuka",
    downClear: "Lantai Normal",
    tiltHazard: "Posisi Jatuh (SOS)",
    tiltReady: "Tongkat Siap",
    waterHazard: "Genangan Air Terdeteksi",
    waterClear: "Permukaan Kering",
    sensorDisconnected: "Sensor Lepas",
    baselineDelta: "Selisih Lantai",
    degrees: "DERAJAT",
    cadTitle: "Visualisasi Orientasi Tongkat (2D CAD)",
    cadDesc: "Rangka kruk siku berputar secara fisik mengikuti sudut MPU6050 terhadap lantai datar",
    cadAngle: "SUDUT:",
    floorRef: "LANTAI RUJUKAN (0 CM)",
    horizonPlanar: "HORIZON PLANAR",
    fallWarning: "[PERINGATAN] TONGKAT TERJATUH // ALARM SOS AKTIF",
    wiringTitle: "Integritas Pin Modul Hardware",
    wiringDesc: "Status kelistrikan dan kontinuitas sensor ke board Arduino Nano",
    connectedTag: "TERHUBUNG",
    disconnectedTag: "LEPAS",
    readyTag: "SIAP",
    terminalTitle: "Terminal Telemetri Serial",
    autoscroll: "Autoscroll",
    copyLogs: "Salin",
    copied: "Tersalin",
    clear: "Bersihkan",
    send: "Kirim",
    inputPlaceholder: "Ketik perintah serial (HELP, FALL, DROP, FRONT 15, DEMO OFF)...",
    shortcuts: "Pintasan:",
    fallPreset: "JATUH (SOS)",
    dropPreset: "TURUNAN",
    wetPreset: "AIR BASAH",
    nearPreset: "OBJEK DEKAT",
    normalPreset: "NORMAL",
    closeDemo: "TUTUP DEMO",
    simTitle: "Panel Simulasi Hardware (Wokwi Style)",
    simOnline: "[ONLINE] Perintah diteruskan ke Arduino fisik",
    simOffline: "[OFFLINE] Mode UI interaktif",
    instantScenarios: "Skenario Bahaya:",
    caneFallSOS: "Tongkat Jatuh (SOS)",
    cliffEdge: "Tepi Jurang (+25cm)",
    puddleWater: "Genangan Air (>650)",
    nearObstacle: "Objek Dekat (14cm)",
    resetNormal: "Reset Kondisi Normal",
    precisionSliders: "Pengaturan Nilai Presisi:",
    frontDistLabel: "Jarak Depan:",
    downDeltaLabel: "Turunan Bawah (+Delta):",
    tiltLabel: "Kemiringan MPU:",
    waterLabel: "Sensor Air (A0):",
    wetState: "(Basah)",
    dryState: "(Kering)",
    darkTheme: "Gelap",
    lightTheme: "Terang",
    autoTheme: "Auto"
  },
  en: {
    appTitle: "Katana Dashboard",
    badge: "v1.2",
    subtitle: "Smart Navigation Forearm Crutch Assistant // Web Serial Engine",
    connectedStatus: "ONLINE // 115200 BAUD",
    disconnectedStatus: "OFFLINE // STANDBY",
    demoStatus: "SIMULATION // ACTIVE",
    connectBtn: "Connect Arduino",
    disconnectBtn: "Disconnect USB",
    demoOn: "Demo: ON",
    demoOff: "Demo: OFF",
    demoTag: "SIMULATION MODE",
    haptic: "HAPTIC",
    buzzer: "BUZZER",
    vibrating: "VIBRATING",
    idle: "IDLE (OFF)",
    sosAlarm: "SOS ALARM",
    silent: "SILENT (OFF)",
    frontObstacle: "Front Obstacle",
    frontSub: "Forward HC-SR04 // Pin D2/D3",
    downDrop: "Drop-off / Pothole",
    downSub: "Angled HC-SR04 // Pin D10/D11",
    caneTilt: "Cane Orientation",
    caneSub: "MPU6050 IMU // Pin A4/A5",
    waterSensor: "Water / Puddle",
    waterSub: "FR-4 Plate // Pin A0",
    online: "ONLINE",
    offline: "OFFLINE",
    frontHazard: "Hazardous Obstacle",
    frontCaution: "Moderate Caution",
    frontClear: "Clear Path",
    downHazard: "Drop-off Edge Detected",
    downClear: "Normal Floor",
    tiltHazard: "Fallen Position (SOS)",
    tiltReady: "Upright & Ready",
    waterHazard: "Puddle Detected",
    waterClear: "Dry Surface",
    sensorDisconnected: "Disconnected",
    baselineDelta: "Floor Delta",
    degrees: "DEGREES",
    cadTitle: "Cane Orientation Visualizer (2D CAD)",
    cadDesc: "Forearm crutch rotates physically tracking MPU6050 orientation relative to ground plane",
    cadAngle: "ANGLE:",
    floorRef: "GROUND REFERENCE (0 CM)",
    horizonPlanar: "PLANAR HORIZON",
    fallWarning: "[WARNING] CANE FALL DETECTED // SOS ALARM ACTIVE",
    wiringTitle: "Hardware Module Pin Diagnostics",
    wiringDesc: "Physical electrical continuity status across Arduino Nano pins",
    connectedTag: "CONNECTED",
    disconnectedTag: "DISCONNECTED",
    readyTag: "READY",
    terminalTitle: "Serial Telemetry Terminal",
    autoscroll: "Autoscroll",
    copyLogs: "Copy",
    copied: "Copied",
    clear: "Clear",
    send: "Send",
    inputPlaceholder: "Enter serial command (HELP, FALL, DROP, FRONT 15, DEMO OFF)...",
    shortcuts: "Shortcuts:",
    fallPreset: "FALL (SOS)",
    dropPreset: "DROP-OFF",
    wetPreset: "WET PUDDLE",
    nearPreset: "NEAR OBSTACLE",
    normalPreset: "NORMAL",
    closeDemo: "CLOSE DEMO",
    simTitle: "Hardware Simulation Panel (Wokwi Style)",
    simOnline: "[ONLINE] Commands dispatched to physical Arduino",
    simOffline: "[OFFLINE] Interactive UI mode",
    instantScenarios: "Hazard Scenarios:",
    caneFallSOS: "Cane Fall (SOS)",
    cliffEdge: "Drop-off Edge (+25cm)",
    puddleWater: "Water Puddle (>650)",
    nearObstacle: "Near Obstacle (14cm)",
    resetNormal: "Reset to Safe State",
    precisionSliders: "Precision Parameter Sliders:",
    frontDistLabel: "Front Distance:",
    downDeltaLabel: "Floor Drop (+Delta):",
    tiltLabel: "Cane Tilt (MPU):",
    waterLabel: "Water Sensor (A0):",
    wetState: "(Wet)",
    dryState: "(Dry)",
    darkTheme: "Dark",
    lightTheme: "Light",
    autoTheme: "Auto"
  }
};

export default function KatanaDashboard() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light" | "system">("light");
  const [lang, setLang] = useState<"id" | "en">("id");

  // Read saved preferences on client mount
  useEffect(() => {
    setMounted(true);
    try {
      const savedTheme = localStorage.getItem("katana_theme") as any;
      if (savedTheme === "dark" || savedTheme === "light" || savedTheme === "system") {
        setTheme(savedTheme);
      } else {
        setTheme("light");
      }

      const savedLang = localStorage.getItem("katana_lang") as any;
      if (savedLang === "id" || savedLang === "en") {
        setLang(savedLang);
      }
    } catch (e) {}
  }, []);

  const t = translations[lang];

  const handleSetLang = (newLang: "id" | "en") => {
    setLang(newLang);
    try {
      localStorage.setItem("katana_lang", newLang);
    } catch (e) {}
  };

  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [portInfo, setPortInfo] = useState<string>("Belum Tersambung");

  // Telemetry data (starts fully disconnected)
  const [data, setData] = useState<TelemetryData>(initialTelemetryState);

  // Demo mode
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoFront, setDemoFront] = useState(85);
  const [demoDown, setDemoDown] = useState(0);
  const [demoTilt, setDemoTilt] = useState(12);
  const [demoWater, setDemoWater] = useState(210);

  // Command input & terminal state
  const [customCommand, setCustomCommand] = useState("");
  const [copiedLog, setCopiedLog] = useState(false);
  const [logs, setLogs] = useState<string[]>([
    "[SISTEM] KATANA Telemetry Engine v1.2 Siap.",
    "[INFO] Hubungkan kabel serial USB Arduino Nano atau aktifkan Mode Demo untuk pemantauan."
  ]);
  const [autoscroll, setAutoscroll] = useState(true);

  // Serial references
  const portRef = useRef<any>(null);
  const readerRef = useRef<any>(null);
  const writerRef = useRef<any>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Theme synchronization effect
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    const applyTheme = (currentTheme: "dark" | "light" | "system") => {
      let isDark = false;
      if (currentTheme === "system") {
        isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      } else {
        isDark = currentTheme === "dark";
      }
      root.classList.toggle("dark", isDark);
    };

    applyTheme(theme);
    try {
      localStorage.setItem("katana_theme", theme);
    } catch (e) {}

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyTheme("system");
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }
  }, [theme, mounted]);

  // Log autoscroll
  useEffect(() => {
    if (autoscroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoscroll]);

  // Send serial command helper
  const sendSerial = async (command: string) => {
    if (writerRef.current) {
      try {
        const encoder = new TextEncoder();
        await writerRef.current.write(encoder.encode(command + "\n"));
        addLog(`[KIRIM] >> ${command}`);
      } catch (err: any) {
        console.error("Gagal mengirim perintah serial:", err);
        addLog(`[ERROR] Gagal kirim perintah: ${err.message}`);
      }
    }
  };

  // Monitor physical USB plug/unplug events
  useEffect(() => {
    if (typeof window === "undefined" || !("serial" in navigator)) return;

    const onDisconnect = () => {
      addLog("[PERINGATAN] Kabel USB Arduino dicabut dari komputer.");
      setIsConnected(false);
      setPortInfo("USB Terputus (Kabel Dicabut)");
      setData(initialTelemetryState);
      if (writerRef.current) {
        try { writerRef.current.releaseLock(); } catch (e) {}
        writerRef.current = null;
      }
      if (readerRef.current) {
        try { readerRef.current.releaseLock(); } catch (e) {}
        readerRef.current = null;
      }
      portRef.current = null;
    };

    const onConnect = () => {
      addLog("[INFO] Perangkat USB terdeteksi kembali. Klik 'Hubungkan Arduino' untuk menyambungkan.");
    };

    (navigator as any).serial.addEventListener("disconnect", onDisconnect);
    (navigator as any).serial.addEventListener("connect", onConnect);

    return () => {
      (navigator as any).serial.removeEventListener("disconnect", onDisconnect);
      (navigator as any).serial.removeEventListener("connect", onConnect);
    };
  }, []);

  // Serial connection handlers
  const handleConnect = async () => {
    if (!("serial" in navigator)) {
      alert("Browser ini belum mendukung Web Serial API. Gunakan Google Chrome, Brave, atau Edge.");
      return;
    }

    try {
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: 115200 });
      portRef.current = port;
      setIsConnected(true);
      setPortInfo("Terhubung // 115200 Baud");
      addLog("[SISTEM] Port serial USB berhasil tersambung pada 115200 baud.");

      const writer = port.writable.getWriter();
      writerRef.current = writer;

      const reader = port.readable.getReader();
      readerRef.current = reader;

      readLoop(reader);
    } catch (err: any) {
      console.error(err);
      if (err.name === "NotFoundError") {
        addLog("[INFO] Pemilihan port dibatalkan pengguna.");
      } else if (
        err.message &&
        (err.message.includes("busy") ||
          err.message.includes("denied") ||
          err.message.includes("Failed to open") ||
          err.message.includes("already open"))
      ) {
        alert(
          "Port USB sedang sibuk atau dipakai aplikasi lain!\n\nPastikan Serial Monitor di Arduino IDE sudah DITUTUP sebelum mengklik 'Hubungkan Arduino' di website."
        );
        addLog("[ERROR] Port serial sedang dipakai aplikasi lain (tutup Serial Monitor di Arduino IDE).");
      } else {
        addLog(`[INFO] Sambungan tidak dapat dibuka: ${err.message}`);
      }
      setIsConnected(false);
      setData(initialTelemetryState);
    }
  };

  const handleDisconnect = async () => {
    try {
      if (writerRef.current) {
        try {
          await writerRef.current.close();
        } catch (e) {
          try { writerRef.current.releaseLock(); } catch (e2) {}
        }
        writerRef.current = null;
      }
      if (readerRef.current) {
        try {
          await readerRef.current.cancel();
        } catch (e) {
          try { readerRef.current.releaseLock(); } catch (e2) {}
        }
        readerRef.current = null;
      }
      if (portRef.current) {
        try {
          await portRef.current.close();
        } catch (e) {
          console.error("Error closing port:", e);
        }
        portRef.current = null;
      }
      setIsConnected(false);
      setPortInfo("Belum Tersambung");
      setData(initialTelemetryState);
      addLog("[SISTEM] Sambungan USB diputuskan secara bersih.");
    } catch (err: any) {
      console.error(err);
    }
  };

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev.slice(-150), msg]);
  };

  const handleCopyLogs = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(logs.join("\n"));
      setCopiedLog(true);
      setTimeout(() => setCopiedLog(false), 2000);
    }
  };

  let buffer = "";
  const readLoop = async (reader: any) => {
    const decoder = new TextDecoder();
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() || "";
          for (const rawLine of lines) {
            const line = rawLine.trim();
            if (line.length > 0) {
              parseLine(line);
              addLog(line);
            }
          }
        }
      }
    } catch (err: any) {
      console.error("Read loop selesai:", err);
    } finally {
      try {
        reader.releaseLock();
      } catch (e) {}
    }
  };

  const parseLine = (line: string) => {
    if (line.includes("[KONEKSI]") || line.includes("[SIMULASI]")) {
      const isSim = line.includes("[SIMULASI]");
      const next: TelemetryData = { ...data };

      const front = line.match(/Depan:(?:RIIL|SIM)\((\d+)cm\)/);
      if (front) {
        next.frontConnected = true;
        next.frontCm = parseInt(front[1], 10);
      } else if (line.includes("Depan:LEPAS")) {
        next.frontConnected = false;
        next.frontCm = null;
      }

      const down = line.match(/Bawah:(?:RIIL|SIM)\((\d+)cm\)/);
      if (down) {
        next.downConnected = true;
        next.downCm = parseInt(down[1], 10);
      } else if (line.includes("Bawah:LEPAS")) {
        next.downConnected = false;
        next.downCm = null;
      }

      const imu = line.match(/IMU:(?:RIIL|SIM)\(([0-9.]+)°\)/);
      if (imu) {
        next.mpuConnected = true;
        next.tiltDeg = parseFloat(imu[1]);
      } else if (line.includes("IMU:LEPAS")) {
        next.mpuConnected = false;
        next.tiltDeg = null;
      }

      const water = line.match(/Air:(?:RIIL|SIM)\((\d+)\)/);
      if (water) {
        next.waterConnected = true;
        next.waterVal = parseInt(water[1], 10);
      } else if (line.includes("Air:LEPAS")) {
        next.waterConnected = false;
        next.waterVal = null;
      }

      const st = line.match(/STATE:\s*([^|]+)/);
      if (st) next.state = st[1].trim();

      const motor = line.match(/Motor:\s*(ON|OFF)/);
      if (motor) next.motor = motor[1];

      const buz = line.match(/Buzzer:\s*(SOS|DIAM)/);
      if (buz) next.buzzer = buz[1];

      setData(next);

      if (isSim && !isDemoMode) {
        setIsDemoMode(true);
      }
    }
  };

  // Demo mode bidirectional sync
  const toggleDemoMode = (enabled: boolean) => {
    setIsDemoMode(enabled);
    if (enabled) {
      sendSerial("DEMO ON");
      sendSerial(`FRONT ${demoFront}`);
      sendSerial(`DOWN ${30 + demoDown}`);
      sendSerial(`TILT ${demoTilt}`);
      sendSerial(`WATER ${demoWater}`);
    } else {
      sendSerial("DEMO OFF");
      if (!isConnected) {
        setData(initialTelemetryState);
      }
    }
  };

  const triggerPreset = (scenario: "FALL" | "DROP" | "WET" | "NEAR" | "NORMAL") => {
    setIsDemoMode(true);
    if (scenario === "FALL") {
      setDemoTilt(75);
      sendSerial("FALL");
    } else if (scenario === "DROP") {
      setDemoDown(25);
      setDemoTilt(14);
      sendSerial("DROP");
    } else if (scenario === "WET") {
      setDemoWater(850);
      sendSerial("WET");
    } else if (scenario === "NEAR") {
      setDemoFront(14);
      sendSerial("NEAR");
    } else if (scenario === "NORMAL") {
      setDemoFront(120);
      setDemoDown(0);
      setDemoTilt(10);
      setDemoWater(180);
      sendSerial("NORMAL");
    }
  };

  const handleSliderFront = (val: number) => {
    setDemoFront(val);
    sendSerial(`FRONT ${val}`);
  };

  const handleSliderDown = (val: number) => {
    setDemoDown(val);
    sendSerial(`DOWN ${30 + val}`);
  };

  const handleSliderTilt = (val: number) => {
    setDemoTilt(val);
    sendSerial(`TILT ${val}`);
  };

  const handleSliderWater = (val: number) => {
    setDemoWater(val);
    sendSerial(`WATER ${val}`);
  };

  const handleSendCommand = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customCommand.trim()) return;
    const cmd = customCommand.trim();
    sendSerial(cmd);
    setCustomCommand("");
  };

  // Demo fallback simulation tick when USB is not connected
  useEffect(() => {
    if (!isDemoMode) {
      if (!isConnected) {
        setData(initialTelemetryState);
      }
      return;
    }
    if (isConnected) return;

    let st = "NORMAL";
    let mot = "OFF";
    let buz = "DIAM";

    if (demoTilt > 60) {
      st = "TONGKAT_JATUH";
      buz = "SOS";
    } else if (demoDown > 15) {
      st = "TEPI_TURUNAN";
      mot = "ON";
    } else if (demoWater > 650) {
      st = "PERMUKAAN_BASAH";
      mot = "ON";
    } else if (demoFront < 20) {
      st = "OBJEK_DEKAT";
      mot = "ON";
    } else if (demoFront < 50) {
      st = "OBJEK_SEDANG";
      mot = "ON";
    } else if (demoFront < 100) {
      st = "OBJEK_WASPADA";
    }

    setData({
      frontConnected: true,
      frontCm: demoFront,
      downConnected: true,
      downCm: 30 + demoDown,
      mpuConnected: true,
      tiltDeg: demoTilt,
      waterConnected: true,
      waterVal: demoWater,
      state: st,
      motor: mot,
      buzzer: buz
    });
  }, [isDemoMode, isConnected, demoFront, demoDown, demoTilt, demoWater]);

  // Derived banner styling and state descriptions with full i18n
  const getBannerDetails = () => {
    const s = data.state.toUpperCase();
    const isId = lang === "id";

    if (s.includes("JATUH") || s.includes("FALL")) {
      return {
        type: "danger",
        tag: isId ? "[BAHAYA // PRIORITAS 1]" : "[DANGER // PRIORITY 1]",
        title: isId ? "TONGKAT TERJATUH // ALARM SOS AKTIF" : "CANE FALL DETECTED // SOS ALARM ACTIVE",
        desc: isId
          ? "Sudut kemiringan > 60 derajat selama > 2 detik. Motor haptic dimatikan dan buzzer memancarkan sinyal Morse SOS darurat."
          : "Tilt angle exceeded 60 degrees for over 2 seconds. Haptic motor deactivated and acoustic Morse SOS alarm sounding."
      };
    }
    if (s.includes("TURUNAN") || s.includes("DROP")) {
      return {
        type: "warning",
        tag: isId ? "[PERINGATAN // PRIORITAS 2]" : "[WARNING // PRIORITY 2]",
        title: isId ? "TEPI TURUNAN / JURANG / LUBANG" : "EDGE DROP-OFF / POTHOLE DETECTED",
        desc: isId
          ? "Jarak elevasi lantai naik > 15 cm dari baseline. Aktuator memberikan 3 pulsa getar intensitas tinggi pada gagang."
          : "Floor elevation distance increased by > 15 cm above calibrated baseline. 3 high-intensity vibration pulses issued at handle."
      };
    }
    if (s.includes("BASAH") || s.includes("WATER")) {
      return {
        type: "warning",
        tag: isId ? "[PERHATIAN // PRIORITAS 3]" : "[CAUTION // PRIORITY 3]",
        title: isId ? "GENANGAN AIR / PERMUKAAN BASAH" : "SURFACE WATER / PUDDLE DETECTED",
        desc: isId
          ? "Pelat konduktivitas mendeteksi cairan (A0 > 650). Aktuator memberikan 2 kali getaran panjang pada pegangan."
          : "Conductive probe detected surface moisture (A0 > 650). 2 sustained vibration pulses issued to alert the user."
      };
    }
    if (s.includes("DEKAT")) {
      return {
        type: "danger",
        tag: isId ? "[BAHAYA // PRIORITAS 4]" : "[DANGER // PRIORITY 4]",
        title: isId ? "RINTANGAN SANGAT DEKAT (< 30 CM)" : "OBSTACLE VERY CLOSE (< 30 CM)",
        desc: isId
          ? "Penghalang tepat di hadapan pengguna. Motor bergetar kontinu dengan frekuensi maksimal (PWM 240)."
          : "Critical obstacle directly ahead. Handle motor vibrating continuously at peak duty cycle (PWM 240)."
      };
    }
    if (s.includes("SEDANG") || s.includes("WASPADA")) {
      return {
        type: "warning",
        tag: isId ? "[WASPADA // PRIORITAS 5]" : "[ALERT // PRIORITY 5]",
        title: isId ? "RINTANGAN TERDETEKSI DI DEPAN (30-100 CM)" : "FRONTAL OBSTACLE DETECTED (30-100 CM)",
        desc: isId
          ? "Objek terdeteksi mendekat. Pulsa getaran ritmis di gagang memandu pengguna untuk memperlambat langkah."
          : "Approaching obstacle detected. Rhythmic haptic pulses guide the user to slow down navigation."
      };
    }
    if (s.includes("NORMAL")) {
      return {
        type: "normal",
        tag: isId ? "[NORMAL // JALUR BERSIH]" : "[NORMAL // PATH CLEAR]",
        title: isId ? "KONDISI AMAN // JALUR BEBAS HAMBATAN" : "SAFE WALKING PATH // CLEAR OF HAZARDS",
        desc: isId
          ? "Seluruh sensor berada dalam batas toleransi aman. Aktuator haptic dan buzzer dalam keadaan siaga."
          : "All sensory inputs are within safe nominal thresholds. Haptic and acoustic alerts in standby."
      };
    }
    return {
      type: "standby",
      tag: isId ? "[STANDBY // MODE SIAGA]" : "[STANDBY // AWAITING HARDWARE]",
      title: isId ? "MENUNGGU SAMBUNGAN PERANGKAT FISIK" : "WAITING FOR HARDWARE CONNECTION",
      desc: isId
        ? "Hubungkan kabel serial USB Arduino Nano atau nyalakan Mode Demo untuk memulai pemantauan telemetri real-time."
        : "Connect Arduino Nano via USB serial or toggle Demo Mode to start real-time telemetry streaming."
    };
  };

  const banner = getBannerDetails();

  return (
    <div className="min-h-screen bg-zinc-100/60 dark:bg-black text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-4">
        
        {/* Streamlined Single-Line Header */}
        <header className="flex items-center justify-between px-4 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xs">
          
          {/* Brand Left */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white flex items-center justify-center shrink-0">
              <img
                src="/katana-logo.png"
                alt="KATANA Logo"
                className="w-full h-full object-contain p-0.5"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-zinc-950 dark:text-white">
                {t.appTitle}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 font-semibold">
                {t.badge}
              </span>
            </div>
          </div>

          {/* Controls Right - All on one sleek horizontal row */}
          <div className="flex items-center gap-2">
            
            {/* Connection Status Pill */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-mono">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected
                    ? "bg-emerald-500 animate-pulse"
                    : isDemoMode
                    ? "bg-amber-500 animate-pulse"
                    : "bg-zinc-400 dark:bg-zinc-600"
                }`}
              />
              <span className="text-zinc-600 dark:text-zinc-400 text-[11px] font-semibold">
                {isConnected ? t.connectedStatus : isDemoMode ? t.demoStatus : t.disconnectedStatus}
              </span>
            </div>

            {/* Language Switcher [ID | EN] */}
            <div
              suppressHydrationWarning
              className="flex items-center bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-0.5 text-xs font-mono font-medium"
            >
              <button
                onClick={() => handleSetLang("id")}
                className={`px-2 py-1 rounded-md transition-all cursor-pointer text-[11px] ${
                  lang === "id"
                    ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-2xs font-bold"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                }`}
                title="Bahasa Indonesia"
              >
                ID
              </button>
              <button
                onClick={() => handleSetLang("en")}
                className={`px-2 py-1 rounded-md transition-all cursor-pointer text-[11px] ${
                  lang === "en"
                    ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-2xs font-bold"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                }`}
                title="English"
              >
                EN
              </button>
            </div>

            {/* Theme Selector */}
            <div
              suppressHydrationWarning
              className="flex items-center bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-0.5 text-xs font-medium"
            >
              <button
                onClick={() => setTheme("light")}
                className={`px-2 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                  (mounted ? theme : "light") === "light"
                    ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-2xs font-semibold"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                }`}
                title="Mode Terang"
              >
                <Sun className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={`px-2 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                  (mounted ? theme : "light") === "dark"
                    ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-2xs font-semibold"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                }`}
                title="Mode Gelap"
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTheme("system")}
                className={`px-2 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                  (mounted ? theme : "light") === "system"
                    ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-2xs font-semibold"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                }`}
                title="Ikuti Sistem"
              >
                <Laptop className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Demo Toggle Button */}
            <button
              onClick={() => toggleDemoMode(!isDemoMode)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono font-medium transition-all cursor-pointer ${
                isDemoMode
                  ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-2xs"
                  : "bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isDemoMode ? "bg-emerald-400 animate-pulse" : "bg-zinc-400"
                }`}
              />
              <span className="text-[11px] font-semibold">{isDemoMode ? t.demoOn : t.demoOff}</span>
            </button>

            {/* Connect USB Button */}
            {!isConnected ? (
              <button
                onClick={handleConnect}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-950 font-semibold text-xs rounded-lg transition-all shadow-2xs cursor-pointer"
              >
                <Usb className="w-3.5 h-3.5" />
                <span>{t.connectBtn}</span>
              </button>
            ) : (
              <button
                onClick={handleDisconnect}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-900 font-semibold text-xs rounded-lg transition-all cursor-pointer"
              >
                <Unplug className="w-3.5 h-3.5" />
                <span>{t.disconnectBtn}</span>
              </button>
            )}
          </div>
        </header>

        {/* Master Telemetry Workstation Console (Unified Surface, Anti-Slop) */}
        <main className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden divide-y divide-zinc-200 dark:divide-zinc-800">
          
          {/* Sub-Header: Mission Status Ribbon */}
          <div
            className={`px-5 py-4 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 ${
              banner.type === "danger"
                ? "bg-rose-50/80 dark:bg-rose-950/30"
                : banner.type === "warning"
                ? "bg-amber-50/80 dark:bg-amber-950/30"
                : banner.type === "normal"
                ? "bg-emerald-50/80 dark:bg-emerald-950/30"
                : "bg-zinc-50/50 dark:bg-zinc-900/40"
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded ${
                    banner.type === "danger"
                      ? "bg-rose-200 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300"
                      : banner.type === "warning"
                      ? "bg-amber-200 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300"
                      : banner.type === "normal"
                      ? "bg-emerald-200 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300"
                      : "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  {banner.tag}
                </span>
                {isDemoMode && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold">
                    {t.demoTag}
                  </span>
                )}
              </div>
              <h2 className="text-lg md:text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
                {banner.title}
              </h2>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                {banner.desc}
              </p>
            </div>

            {/* Actuator Status Badges */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
                <Vibrate className="w-4 h-4 text-zinc-500" />
                <div>
                  <div className="text-[9px] font-mono text-zinc-400 uppercase font-semibold">
                    {t.haptic} (D5 PWM)
                  </div>
                  <div
                    className={`text-xs font-mono font-bold ${
                      data.motor === "ON"
                        ? "text-amber-600 dark:text-amber-400 animate-pulse"
                        : "text-zinc-500"
                    }`}
                  >
                    {data.motor === "ON" ? t.vibrating : t.idle}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
                <Volume2 className="w-4 h-4 text-zinc-500" />
                <div>
                  <div className="text-[9px] font-mono text-zinc-400 uppercase font-semibold">
                    {t.buzzer} (D6 BC547)
                  </div>
                  <div
                    className={`text-xs font-mono font-bold ${
                      data.buzzer.includes("SOS")
                        ? "text-rose-600 dark:text-rose-400 animate-pulse"
                        : "text-zinc-500"
                    }`}
                  >
                    {data.buzzer.includes("SOS") ? t.sosAlarm : t.silent}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Workspace: 2-Column Split Console */}
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-zinc-200 dark:divide-zinc-800">
            
            {/* Left 7 Columns: 2D CAD Blueprint & Integrated Sensor Strip */}
            <div className="lg:col-span-7 flex flex-col justify-between">
              
              {/* CAD Canvas Header */}
              <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-zinc-500" />
                    {t.cadTitle}
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {t.cadDesc}
                  </p>
                </div>
                <span className="font-mono text-xs font-bold px-2.5 py-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md">
                  {t.cadAngle} {data.mpuConnected && data.tiltDeg !== null ? data.tiltDeg.toFixed(1) : "--"}°
                </span>
              </div>

              {/* 2D CAD Blueprint Simulation Canvas */}
              <div className="h-72 bg-blueprint-grid bg-zinc-50 dark:bg-zinc-950 relative flex items-center justify-center overflow-hidden">
                
                {/* Protractor Guidelines */}
                <div className="absolute bottom-8 w-72 h-36 border-t border-l border-r border-dashed border-zinc-300 dark:border-zinc-800 rounded-t-full pointer-events-none" />
                <div className="absolute bottom-8 w-48 h-24 border-t border-l border-r border-dashed border-zinc-200 dark:border-zinc-850 rounded-t-full pointer-events-none" />

                {/* Angle Tick Marks */}
                <span className="absolute bottom-9 left-10 text-[9px] font-mono text-zinc-400">80°</span>
                <span className="absolute bottom-28 left-20 text-[9px] font-mono text-zinc-400">60°</span>
                <span className="absolute top-8 text-[9px] font-mono text-zinc-400">0°</span>
                <span className="absolute bottom-28 right-20 text-[9px] font-mono text-zinc-400">30°</span>

                {/* Floor Horizon Line */}
                <div className="absolute bottom-8 left-0 right-0 h-0.5 bg-zinc-300 dark:bg-zinc-700 flex justify-between px-4">
                  <span className="text-[10px] text-zinc-400 font-mono -mt-4">{t.floorRef}</span>
                  <span className="text-[10px] text-zinc-400 font-mono -mt-4">{t.horizonPlanar}</span>
                </div>

                {/* Virtual Cane Vector */}
                <div
                  className="w-1.5 bg-zinc-900 dark:bg-white h-48 absolute bottom-8 origin-bottom transition-transform duration-200 ease-out"
                  style={{
                    transform: `rotate(${Math.min(85, data.mpuConnected && data.tiltDeg !== null ? data.tiltDeg : 0)}deg)`
                  }}
                >
                  {/* Arm Cuff & Handle Bracket */}
                  <div className="w-8 h-2 bg-zinc-900 dark:bg-white -left-6.5 -top-3 absolute rounded-xs" />
                  <div className="w-7 h-2 bg-zinc-900 dark:bg-white -left-5.5 top-12 absolute rounded-xs shadow-xs" />
                  
                  {/* Ultrasonic Sensor Nodes */}
                  <div
                    className={`w-3 h-3 rounded-full -left-0.75 top-22 absolute border border-white shadow-xs ${
                      data.frontConnected ? "bg-emerald-500" : "bg-zinc-400"
                    }`}
                    title="HC-SR04 Depan"
                  />
                  <div
                    className={`w-3 h-3 rounded-full -left-0.75 bottom-8 absolute border border-white shadow-xs ${
                      data.downConnected ? "bg-sky-500" : "bg-zinc-400"
                    }`}
                    title="HC-SR04 Bawah"
                  />
                  
                  {/* Rubber Tip Foot */}
                  <div className="w-3.5 h-2.5 bg-zinc-800 dark:bg-zinc-200 -left-1 -bottom-1 absolute rounded-xs" />
                </div>

                {/* Fall Alert Overlay */}
                {data.mpuConnected && data.tiltDeg !== null && data.tiltDeg > 60 && (
                  <div className="absolute top-4 px-4 py-2 bg-rose-600 text-white font-extrabold text-xs rounded-xl shadow-lg border border-rose-500 animate-bounce tracking-wide flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    {t.fallWarning}
                  </div>
                )}
              </div>

              {/* Integrated 4-Sensor Metric Strip (Hairline Divided, NOT repetitive cards) */}
              <div className="border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-2 sm:grid-cols-4 divide-x divide-zinc-200 dark:divide-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/30">
                
                {/* Metric 1: Front Obstacle */}
                <div className="p-3.5 flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                      <Eye className="w-3 h-3 text-zinc-500" />
                      {t.frontObstacle}
                    </span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                        data.frontConnected
                          ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400"
                          : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500"
                      }`}
                    >
                      {data.frontConnected ? t.online : t.offline}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black font-mono tracking-tight text-zinc-900 dark:text-white tabular-nums">
                      {data.frontConnected && data.frontCm !== null ? data.frontCm : "--"}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">cm</span>
                  </div>
                  <div className="text-[10px] text-zinc-500 truncate font-medium">
                    {!data.frontConnected
                      ? t.sensorDisconnected
                      : data.frontCm! < 30
                      ? t.frontHazard
                      : data.frontCm! < 60
                      ? t.frontCaution
                      : t.frontClear}
                  </div>
                </div>

                {/* Metric 2: Drop-off */}
                <div className="p-3.5 flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                      <TrendingDown className="w-3 h-3 text-zinc-500" />
                      {t.downDrop}
                    </span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                        data.downConnected
                          ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400"
                          : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500"
                      }`}
                    >
                      {data.downConnected ? t.online : t.offline}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black font-mono tracking-tight text-zinc-900 dark:text-white tabular-nums">
                      {data.downConnected && data.downCm !== null ? data.downCm : "--"}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">cm</span>
                  </div>
                  <div className="text-[10px] text-zinc-500 truncate font-medium">
                    {!data.downConnected
                      ? t.sensorDisconnected
                      : data.downCm! - 30 > 15
                      ? t.downHazard
                      : t.downClear}
                  </div>
                </div>

                {/* Metric 3: Cane Tilt */}
                <div className="p-3.5 flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                      <Compass className="w-3 h-3 text-zinc-500" />
                      {t.caneTilt}
                    </span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                        data.mpuConnected
                          ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400"
                          : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500"
                      }`}
                    >
                      {data.mpuConnected ? t.online : t.offline}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black font-mono tracking-tight text-zinc-900 dark:text-white tabular-nums">
                      {data.mpuConnected && data.tiltDeg !== null ? data.tiltDeg.toFixed(1) : "--"}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">°</span>
                  </div>
                  <div className="text-[10px] text-zinc-500 truncate font-medium">
                    {!data.mpuConnected
                      ? t.sensorDisconnected
                      : data.tiltDeg! > 60
                      ? t.tiltHazard
                      : t.tiltReady}
                  </div>
                </div>

                {/* Metric 4: Water Sensor (Fixed disconnect logic) */}
                <div className="p-3.5 flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                      <Droplets className="w-3 h-3 text-zinc-500" />
                      {t.waterSensor}
                    </span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                        data.waterConnected && data.waterVal !== null
                          ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400"
                          : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500"
                      }`}
                    >
                      {data.waterConnected && data.waterVal !== null ? t.online : t.offline}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black font-mono tracking-tight text-zinc-900 dark:text-white tabular-nums">
                      {data.waterConnected && data.waterVal !== null ? data.waterVal : "--"}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">/ 1023</span>
                  </div>
                  <div className="text-[10px] text-zinc-500 truncate font-medium">
                    {!data.waterConnected || data.waterVal === null
                      ? t.sensorDisconnected
                      : data.waterVal > 650
                      ? t.waterHazard
                      : t.waterClear}
                  </div>
                </div>

              </div>
            </div>

            {/* Right 5 Columns: Diagnostics Deck & Live Terminal */}
            <div className="lg:col-span-5 flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800 bg-zinc-50/20 dark:bg-zinc-900/10">
              
              {/* Hardware Pin Status Deck */}
              <div className="p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-zinc-500" />
                    {t.wiringTitle}
                  </h3>
                  <span className="text-[10px] font-mono text-zinc-400">ATmega328P</span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  
                  {/* Pin 1: Front */}
                  <div className="p-2 bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-semibold">Sensor Depan</div>
                      <div className="text-[10px] font-mono text-zinc-400">D2/D3</div>
                    </div>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                        data.frontConnected
                          ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                      }`}
                    >
                      {data.frontConnected ? t.connectedTag : t.disconnectedTag}
                    </span>
                  </div>

                  {/* Pin 2: Down */}
                  <div className="p-2 bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-semibold">Sensor Bawah</div>
                      <div className="text-[10px] font-mono text-zinc-400">D10/D11</div>
                    </div>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                        data.downConnected
                          ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                      }`}
                    >
                      {data.downConnected ? t.connectedTag : t.disconnectedTag}
                    </span>
                  </div>

                  {/* Pin 3: IMU */}
                  <div className="p-2 bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-semibold">Sensor IMU</div>
                      <div className="text-[10px] font-mono text-zinc-400">A4/A5 I2C</div>
                    </div>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                        data.mpuConnected
                          ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                      }`}
                    >
                      {data.mpuConnected ? t.connectedTag : t.disconnectedTag}
                    </span>
                  </div>

                  {/* Pin 4: Water (Fixed to reflect actual connection) */}
                  <div className="p-2 bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-semibold">Sensor Air</div>
                      <div className="text-[10px] font-mono text-zinc-400">A0 Analog</div>
                    </div>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                        data.waterConnected && data.waterVal !== null
                          ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                      }`}
                    >
                      {data.waterConnected && data.waterVal !== null ? t.connectedTag : t.disconnectedTag}
                    </span>
                  </div>

                  {/* Pin 5: Motor */}
                  <div className="p-2 bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-semibold">Motor Getar</div>
                      <div className="text-[10px] font-mono text-zinc-400">D5 PWM</div>
                    </div>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                      {t.readyTag}
                    </span>
                  </div>

                  {/* Pin 6: Buzzer */}
                  <div className="p-2 bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-semibold">Buzzer SOS</div>
                      <div className="text-[10px] font-mono text-zinc-400">D6 BC547</div>
                    </div>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                      {t.readyTag}
                    </span>
                  </div>

                </div>
              </div>

              {/* Live Serial Console */}
              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-zinc-500" />
                    {t.terminalTitle}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyLogs}
                      className="text-[11px] text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1 cursor-pointer font-medium"
                    >
                      {copiedLog ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedLog ? t.copied : t.copyLogs}</span>
                    </button>
                    <button
                      onClick={() => setLogs([])}
                      className="text-[11px] text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>{t.clear}</span>
                    </button>
                  </div>
                </div>

                {/* Log Terminal Window */}
                <div
                  ref={logContainerRef}
                  className="h-36 bg-zinc-100/90 dark:bg-zinc-900/90 rounded-lg p-2.5 overflow-y-auto font-mono text-[11px] text-zinc-700 dark:text-zinc-300 space-y-1 border border-zinc-200 dark:border-zinc-800"
                >
                  {logs.map((line, i) => (
                    <div key={i} className="leading-relaxed">
                      {line.startsWith("[KIRIM]") ? (
                        <span className="text-sky-600 dark:text-sky-400 font-semibold">{line}</span>
                      ) : line.startsWith("[ERROR]") ? (
                        <span className="text-rose-600 dark:text-rose-400 font-semibold">{line}</span>
                      ) : line.startsWith("[SIMULASI]") ? (
                        <span className="text-purple-600 dark:text-purple-400 font-semibold">{line}</span>
                      ) : line.startsWith("[KONEKSI]") ? (
                        <span className="text-emerald-600 dark:text-emerald-400">{line}</span>
                      ) : (
                        <span>{line}</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Terminal Command Input */}
                <form onSubmit={handleSendCommand} className="flex gap-1.5 pt-1">
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-2 text-zinc-400 font-mono text-xs">&gt;</span>
                    <input
                      type="text"
                      value={customCommand}
                      onChange={(e) => setCustomCommand(e.target.value)}
                      placeholder={t.inputPlaceholder}
                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-6 pr-2.5 py-1.5 text-xs font-mono text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-1 focus:ring-zinc-400"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!customCommand.trim()}
                    className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                  >
                    <Send className="w-3 h-3" />
                    <span>{t.send}</span>
                  </button>
                </form>

                {/* Command Shortcuts */}
                <div className="flex flex-wrap items-center gap-1 text-[10px] font-mono text-zinc-500 pt-0.5">
                  <span className="text-zinc-400 font-semibold">{t.shortcuts}</span>
                  <button
                    type="button"
                    onClick={() => sendSerial("HELP")}
                    className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 cursor-pointer"
                  >
                    HELP
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerPreset("FALL")}
                    className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-900 cursor-pointer"
                  >
                    {t.fallPreset}
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerPreset("DROP")}
                    className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900 cursor-pointer"
                  >
                    {t.dropPreset}
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerPreset("WET")}
                    className="px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 text-sky-600 dark:text-sky-300 border border-sky-200 dark:border-sky-900 cursor-pointer"
                  >
                    {t.wetPreset}
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerPreset("NEAR")}
                    className="px-2 py-0.5 rounded bg-red-50 dark:bg-red-950/40 hover:bg-red-100 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-900 cursor-pointer"
                  >
                    {t.nearPreset}
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerPreset("NORMAL")}
                    className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 cursor-pointer"
                  >
                    {t.normalPreset}
                  </button>
                </div>

              </div>
            </div>

          </div>

          {/* Integrated Simulation Controls (Visible when Demo Mode is Active) */}
          {isDemoMode && (
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/60 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold text-zinc-900 dark:text-white">
                    {t.simTitle}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                    {isConnected ? t.simOnline : t.simOffline}
                  </span>
                </div>
                <button
                  onClick={() => toggleDemoMode(false)}
                  className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white cursor-pointer font-medium"
                >
                  {t.closeDemo}
                </button>
              </div>

              {/* Preset Scenario Buttons & Precision Sliders in an integrated horizontal grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                
                {/* Slider 1: Front */}
                <div className="p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg space-y-1">
                  <div className="flex justify-between font-mono text-[11px]">
                    <span className="text-zinc-500">{t.frontDistLabel}</span>
                    <span className="font-bold">{demoFront} cm</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="180"
                    value={demoFront}
                    onChange={(e) => handleSliderFront(parseInt(e.target.value, 10))}
                    className="w-full accent-zinc-900 dark:accent-white cursor-pointer"
                  />
                </div>

                {/* Slider 2: Down */}
                <div className="p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg space-y-1">
                  <div className="flex justify-between font-mono text-[11px]">
                    <span className="text-zinc-500">{t.downDeltaLabel}</span>
                    <span className="font-bold">+{demoDown} cm</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="45"
                    value={demoDown}
                    onChange={(e) => handleSliderDown(parseInt(e.target.value, 10))}
                    className="w-full accent-zinc-900 dark:accent-white cursor-pointer"
                  />
                </div>

                {/* Slider 3: Tilt */}
                <div className="p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg space-y-1">
                  <div className="flex justify-between font-mono text-[11px]">
                    <span className="text-zinc-500">{t.tiltLabel}</span>
                    <span className="font-bold">{demoTilt}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="85"
                    value={demoTilt}
                    onChange={(e) => handleSliderTilt(parseInt(e.target.value, 10))}
                    className="w-full accent-zinc-900 dark:accent-white cursor-pointer"
                  />
                </div>

                {/* Slider 4: Water */}
                <div className="p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg space-y-1">
                  <div className="flex justify-between font-mono text-[11px]">
                    <span className="text-zinc-500">{t.waterLabel}</span>
                    <span className="font-bold">
                      {demoWater > 650 ? `${demoWater} ${t.wetState}` : `${demoWater} ${t.dryState}`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    value={demoWater}
                    onChange={(e) => handleSliderWater(parseInt(e.target.value, 10))}
                    className="w-full accent-zinc-900 dark:accent-white cursor-pointer"
                  />
                </div>

              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
