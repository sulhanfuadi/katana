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
  CheckCircle2,
  Trash2,
  X,
  Send,
  Terminal,
  Copy,
  Check,
  RotateCcw,
  Activity,
  Cpu,
  Radio
} from "lucide-react";

interface TelemetryData {
  frontConnected: boolean;
  frontCm: number | null;
  downConnected: boolean;
  downCm: number | null;
  mpuConnected: boolean;
  tiltDeg: number | null;
  waterVal: number;
  state: string;
  motor: string;
  buzzer: string;
}

export default function KatanaDashboard() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light" | "system">("dark");

  // Read saved theme on client mount
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem("katana_theme") as any;
      if (saved === "dark" || saved === "light" || saved === "system") {
        setTheme(saved);
      }
    } catch (e) {}
  }, []);

  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [portInfo, setPortInfo] = useState<string>("Belum Tersambung");

  // Telemetry data
  const [data, setData] = useState<TelemetryData>({
    frontConnected: false,
    frontCm: null,
    downConnected: false,
    downCm: null,
    mpuConnected: false,
    tiltDeg: null,
    waterVal: 240,
    state: "STANDBY",
    motor: "OFF",
    buzzer: "DIAM"
  });

  // Demo mode
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoFront, setDemoFront] = useState(85);
  const [demoDown, setDemoDown] = useState(0);
  const [demoTilt, setDemoTilt] = useState(12);
  const [demoWater, setDemoWater] = useState(210);

  // Command input state
  const [customCommand, setCustomCommand] = useState("");
  const [copiedLog, setCopiedLog] = useState(false);

  // Raw logs
  const [logs, setLogs] = useState<string[]>([
    "[SISTEM] KATANA Telemetry Engine v1.2.0 Siap.",
    "[INFO] Hubungkan USB Arduino Nano atau aktifkan Mode Demo untuk simulasi."
  ]);
  const [autoscroll, setAutoscroll] = useState(true);

  // Serial references
  const portRef = useRef<any>(null);
  const readerRef = useRef<any>(null);
  const writerRef = useRef<any>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Theme synchronization effect (only applies after mounted to avoid hydration conflict)
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    const applyTheme = (t: "dark" | "light" | "system") => {
      let isDark = false;
      if (t === "system") {
        isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      } else {
        isDark = t === "dark";
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
      addLog("[INFO] Perangkat USB terdeteksi. Klik 'Hubungkan Arduino' untuk menyambungkan.");
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
        next.waterVal = parseInt(water[1], 10);
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
    if (!isDemoMode || isConnected) return;

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
      waterVal: demoWater,
      state: st,
      motor: mot,
      buzzer: buz
    });
  }, [isDemoMode, demoFront, demoDown, demoTilt, demoWater]);

  // Derived banner styling and state descriptions
  const getBannerDetails = () => {
    const s = data.state.toUpperCase();
    if (s.includes("JATUH") || s.includes("FALL")) {
      return {
        type: "danger",
        tag: "[BAHAYA // PRIORITAS 1]",
        title: "TONGKAT TERJATUH // ALARM SOS AKTIF",
        desc: "Sudut kemiringan > 60 derajat selama > 2 detik. Motor haptic dimatikan dan buzzer memancarkan sinyal Morse SOS darurat."
      };
    }
    if (s.includes("TURUNAN") || s.includes("DROP")) {
      return {
        type: "warning",
        tag: "[PERINGATAN // PRIORITAS 2]",
        title: "TEPI TURUNAN / JURANG / LUBANG",
        desc: "Jarak elevasi lantai naik > 15 cm dari baseline. Aktuator memberikan 3 pulsa getar intensitas tinggi pada gagang."
      };
    }
    if (s.includes("BASAH") || s.includes("WATER")) {
      return {
        type: "warning",
        tag: "[PERHATIAN // PRIORITAS 3]",
        title: "GENANGAN AIR / PERMUKAAN BASAH",
        desc: "Pelat konduktivitas mendeteksi cairan (A0 > 650). Aktuator memberikan 2 kali getaran panjang pada pegangan."
      };
    }
    if (s.includes("DEKAT")) {
      return {
        type: "danger",
        tag: "[BAHAYA // PRIORITAS 4]",
        title: "RINTANGAN SANGAT DEKAT (< 30 CM)",
        desc: "Penghalang tepat di hadapan pengguna. Motor bergetar kontinu dengan frekuensi maksimal (PWM 240)."
      };
    }
    if (s.includes("SEDANG") || s.includes("WASPADA")) {
      return {
        type: "warning",
        tag: "[WASPADA // PRIORITAS 5]",
        title: "RINTANGAN TERDETEKSI DI DEPAN (30-100 CM)",
        desc: "Objek terdeteksi mendekat. Pulsa getaran ritmis di gagang memandu pengguna untuk memperlambat langkah."
      };
    }
    if (s.includes("NORMAL")) {
      return {
        type: "normal",
        tag: "[NORMAL // JALUR BERSIH]",
        title: "KONDISI AMAN // JALUR BEBAS HAMBATAN",
        desc: "Seluruh sensor berada dalam batas toleransi aman. Aktuator haptic dan buzzer dalam keadaan siaga."
      };
    }
    return {
      type: "standby",
      tag: "[STANDBY // MODE SIAGA]",
      title: "MENUNGGU SAMBUNGAN PERANGKAT FISIK",
      desc: "Hubungkan kabel serial USB Arduino Nano atau nyalakan Mode Demo untuk memulai pemantauan telemetri real-time."
    };
  };

  const banner = getBannerDetails();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Top Navbar */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white flex items-center justify-center shrink-0 shadow-xs">
              <img
                src="/katana-logo.png"
                alt="KATANA Logo"
                className="w-full h-full object-contain p-0.5"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base tracking-tight text-zinc-900 dark:text-white">
                  KATANA
                </h1>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 font-semibold">
                  TELEMETRI v1.2
                </span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    isConnected
                      ? "bg-emerald-500 animate-pulse"
                      : isDemoMode
                      ? "bg-amber-500 animate-pulse"
                      : "bg-zinc-400 dark:bg-zinc-600"
                  }`}
                  title={isConnected ? "Online Hardware" : isDemoMode ? "Mode Demo" : "Standby"}
                />
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Alat Bantu Navigasi Kruk Pintar Tunanetra // Web Serial Engine
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Theme Selector Segmented Control */}
            <div
              suppressHydrationWarning
              className="flex items-center bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-1 text-xs font-medium"
            >
              <button
                onClick={() => setTheme("dark")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  (mounted ? theme : "dark") === "dark"
                    ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs font-semibold"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                }`}
                title="Mode Gelap"
              >
                <Moon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Gelap</span>
              </button>
              <button
                onClick={() => setTheme("light")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  (mounted ? theme : "dark") === "light"
                    ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs font-semibold"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                }`}
                title="Mode Terang"
              >
                <Sun className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Terang</span>
              </button>
              <button
                onClick={() => setTheme("system")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  (mounted ? theme : "dark") === "system"
                    ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs font-semibold"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                }`}
                title="Ikuti Tema Sistem"
              >
                <Laptop className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Auto</span>
              </button>
            </div>

            {/* Connection Status Pill */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-2 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono">
              <Cpu className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-zinc-600 dark:text-zinc-300">{portInfo}</span>
            </div>

            {/* Serial Connect Button */}
            {!isConnected ? (
              <button
                onClick={handleConnect}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-950 font-semibold text-xs rounded-xl transition-all shadow-xs cursor-pointer"
              >
                <Usb className="w-4 h-4" />
                <span>Hubungkan Arduino</span>
              </button>
            ) : (
              <button
                onClick={handleDisconnect}
                className="flex items-center gap-2 px-4 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-900 font-semibold text-xs rounded-xl transition-all cursor-pointer"
              >
                <Unplug className="w-4 h-4" />
                <span>Putuskan USB</span>
              </button>
            )}

            {/* Interactive Demo Mode Toggle Pill */}
            <button
              onClick={() => toggleDemoMode(!isDemoMode)}
              className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                isDemoMode
                  ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-sm"
                  : "bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
              }`}
            >
              <div
                className={`w-6 h-3.5 rounded-full p-0.5 transition-colors ${
                  isDemoMode ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
                }`}
              >
                <div
                  className={`w-2.5 h-2.5 rounded-full bg-white transition-transform ${
                    isDemoMode ? "translate-x-2.5" : "translate-x-0"
                  }`}
                />
              </div>
              <span className="font-mono text-xs">
                DEMO:{" "}
                <b className={isDemoMode ? "text-emerald-400 dark:text-emerald-600 font-bold" : ""}>
                  {isDemoMode ? "AKTIF" : "MATI"}
                </b>
              </span>
            </button>
          </div>
        </header>

        {/* Master Telemetry State Banner */}
        <section
          className={`p-6 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xs ${
            banner.type === "danger"
              ? "bg-rose-50/80 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800/80"
              : banner.type === "warning"
              ? "bg-amber-50/80 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/80"
              : banner.type === "normal"
              ? "bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/80"
              : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
          }`}
        >
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded-md ${
                  banner.type === "danger"
                    ? "bg-rose-200 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300"
                    : banner.type === "warning"
                    ? "bg-amber-200 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300"
                    : banner.type === "normal"
                    ? "bg-emerald-200 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300"
                    : "bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400"
                }`}
              >
                {banner.tag}
              </span>
              {isDemoMode && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold">
                  MODE SIMULASI
                </span>
              )}
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
              {banner.title}
            </h2>
            <p className="text-xs md:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {banner.desc}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Haptic Actuator Indicator */}
            <div className="flex flex-col px-4 py-3 rounded-xl bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 min-w-[145px] shadow-xs">
              <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
                <span className="flex items-center gap-1 font-semibold">
                  <Vibrate className="w-3.5 h-3.5 text-zinc-500" /> HAPTIC
                </span>
                <span className="text-[9px] px-1.5 py-0.2 bg-zinc-100 dark:bg-zinc-800 rounded font-mono">D5 PWM</span>
              </span>
              <span
                className={`text-sm font-extrabold font-mono mt-1 ${
                  data.motor === "ON"
                    ? "text-amber-600 dark:text-amber-400 flex items-center gap-1.5"
                    : "text-zinc-500 dark:text-zinc-400"
                }`}
              >
                {data.motor === "ON" ? (
                  <>
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    BERGETAR
                  </>
                ) : (
                  "IDLE (OFF)"
                )}
              </span>
            </div>

            {/* Acoustic Buzzer SOS Indicator */}
            <div className="flex flex-col px-4 py-3 rounded-xl bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 min-w-[145px] shadow-xs">
              <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
                <span className="flex items-center gap-1 font-semibold">
                  <Volume2 className="w-3.5 h-3.5 text-zinc-500" /> BUZZER
                </span>
                <span className="text-[9px] px-1.5 py-0.2 bg-zinc-100 dark:bg-zinc-800 rounded font-mono">D6 BC547</span>
              </span>
              <span
                className={`text-sm font-extrabold font-mono mt-1 ${
                  data.buzzer.includes("SOS")
                    ? "text-rose-600 dark:text-rose-400 flex items-center gap-1.5"
                    : "text-zinc-500 dark:text-zinc-400"
                }`}
              >
                {data.buzzer.includes("SOS") ? (
                  <>
                    <span className="inline-block w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    ALARM SOS
                  </>
                ) : (
                  "DIAM (OFF)"
                )}
              </span>
            </div>
          </div>
        </section>

        {/* 4 Core Sensor Telemetry Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Front Obstacle HC-SR04 */}
          <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col justify-between space-y-4 shadow-xs">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-zinc-500" />
                  1. Rintangan Depan
                </span>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Ultrasonik lurus // HC-SR04
                </p>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold ${
                  data.frontConnected
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                    : "bg-zinc-100 dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800"
                }`}
              >
                {data.frontConnected ? "ONLINE" : "LEPAS"}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black font-mono tracking-tight text-zinc-900 dark:text-white tabular-nums">
                {data.frontConnected && data.frontCm !== null ? data.frontCm : "--"}
              </span>
              <span className="text-xs font-bold text-zinc-400 font-mono">CM</span>
            </div>

            <div className="space-y-1.5">
              <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden flex">
                <div
                  className={`h-full transition-all duration-200 ${
                    !data.frontConnected || data.frontCm === null
                      ? "bg-zinc-300 dark:bg-zinc-700"
                      : data.frontCm < 30
                      ? "bg-rose-500"
                      : data.frontCm < 60
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                  style={{
                    width: `${
                      data.frontConnected && data.frontCm !== null
                        ? Math.min(100, Math.max(5, (1 - data.frontCm / 150) * 100))
                        : 0
                    }%`
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                <span>0 cm (Dekat)</span>
                <span>60 cm</span>
                <span>&gt;100 cm (Aman)</span>
              </div>
            </div>

            <div className="pt-2.5 border-t border-zinc-100 dark:border-zinc-900 flex justify-between items-center text-xs">
              <span className="text-[11px] font-mono text-zinc-400">PIN D2/D3</span>
              <span className="font-medium text-xs text-zinc-800 dark:text-zinc-200">
                {!data.frontConnected
                  ? "Sensor Lepas"
                  : data.frontCm! < 30
                  ? "Bahaya Rintangan"
                  : data.frontCm! < 60
                  ? "Waspada Sedang"
                  : "Jalur Bersih"}
              </span>
            </div>
          </div>

          {/* Card 2: Ground Drop-off / Pothole HC-SR04 */}
          <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col justify-between space-y-4 shadow-xs">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <TrendingDown className="w-4 h-4 text-zinc-500" />
                  2. Turunan / Lubang
                </span>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Ultrasonik miring // HC-SR04
                </p>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold ${
                  data.downConnected
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                    : "bg-zinc-100 dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800"
                }`}
              >
                {data.downConnected ? "ONLINE" : "LEPAS"}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black font-mono tracking-tight text-zinc-900 dark:text-white tabular-nums">
                {data.downConnected && data.downCm !== null ? data.downCm : "--"}
              </span>
              <span className="text-xs font-bold text-zinc-400 font-mono">CM</span>
            </div>

            <div className="flex justify-between items-center px-3 py-1.5 bg-zinc-50 dark:bg-zinc-900/80 rounded-lg text-xs font-mono border border-zinc-200/50 dark:border-zinc-800/50">
              <span className="text-zinc-500 text-[11px]">Selisih Baseline:</span>
              <span
                className={`font-bold ${
                  data.downConnected && data.downCm !== null && data.downCm - 30 > 15
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-zinc-900 dark:text-zinc-100"
                }`}
              >
                +{data.downConnected && data.downCm !== null ? Math.max(0, data.downCm - 30) : 0} cm
              </span>
            </div>

            <div className="pt-2.5 border-t border-zinc-100 dark:border-zinc-900 flex justify-between items-center text-xs">
              <span className="text-[11px] font-mono text-zinc-400">PIN D10/D11</span>
              <span className="font-medium text-xs text-zinc-800 dark:text-zinc-200">
                {!data.downConnected
                  ? "Sensor Lepas"
                  : data.downCm! - 30 > 15
                  ? "Tepi Turunan Terbuka"
                  : "Lantai Normal"}
              </span>
            </div>
          </div>

          {/* Card 3: Cane Tilt & Fall Detection MPU6050 */}
          <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col justify-between space-y-4 shadow-xs">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-zinc-500" />
                  3. Kemiringan Tongkat
                </span>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Gyro / IMU 6-Axis // MPU6050
                </p>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold ${
                  data.mpuConnected
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                    : "bg-zinc-100 dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800"
                }`}
              >
                {data.mpuConnected ? "ONLINE" : "LEPAS"}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black font-mono tracking-tight text-zinc-900 dark:text-white tabular-nums">
                {data.mpuConnected && data.tiltDeg !== null ? data.tiltDeg.toFixed(1) : "--"}
              </span>
              <span className="text-xs font-bold text-zinc-400 font-mono">DERAJAT</span>
            </div>

            <div className="space-y-1.5">
              <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden flex">
                <div
                  className={`h-full transition-all duration-200 ${
                    !data.mpuConnected || data.tiltDeg === null
                      ? "bg-zinc-300 dark:bg-zinc-700"
                      : data.tiltDeg > 60
                      ? "bg-rose-500"
                      : "bg-zinc-900 dark:bg-white"
                  }`}
                  style={{
                    width: `${
                      data.mpuConnected && data.tiltDeg !== null
                        ? Math.min(100, Math.max(5, (data.tiltDeg / 90) * 100))
                        : 0
                    }%`
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                <span>0° (Tegak)</span>
                <span>Ambang 60°</span>
                <span>90° (Rebah)</span>
              </div>
            </div>

            <div className="pt-2.5 border-t border-zinc-100 dark:border-zinc-900 flex justify-between items-center text-xs">
              <span className="text-[11px] font-mono text-zinc-400">PIN A4/A5 I2C</span>
              <span className="font-medium text-xs text-zinc-800 dark:text-zinc-200">
                {!data.mpuConnected
                  ? "Sensor Lepas"
                  : data.tiltDeg! > 60
                  ? "Posisi Jatuh (SOS)"
                  : "Tongkat Siap"}
              </span>
            </div>
          </div>

          {/* Card 4: Water Surface Sensor */}
          <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col justify-between space-y-4 shadow-xs">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Droplets className="w-4 h-4 text-zinc-500" />
                  4. Deteksi Air / Genangan
                </span>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Pelat kontak konduktif FR-4
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                ONLINE
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black font-mono tracking-tight text-zinc-900 dark:text-white tabular-nums">
                {data.waterVal}
              </span>
              <span className="text-xs font-bold text-zinc-400 font-mono">/ 1023</span>
            </div>

            <div className="space-y-1.5">
              <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden flex">
                <div
                  className={`h-full transition-all duration-200 ${
                    data.waterVal > 650 ? "bg-sky-500" : "bg-zinc-400 dark:bg-zinc-600"
                  }`}
                  style={{
                    width: `${Math.min(100, Math.max(5, (data.waterVal / 1023) * 100))}%`
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                <span>0 (Kering)</span>
                <span>Ambang 650</span>
                <span>1023</span>
              </div>
            </div>

            <div className="pt-2.5 border-t border-zinc-100 dark:border-zinc-900 flex justify-between items-center text-xs">
              <span className="text-[11px] font-mono text-zinc-400">PIN A0 ANALOG</span>
              <span className="font-medium text-xs text-zinc-800 dark:text-zinc-200">
                {data.waterVal > 650 ? "Genangan Air Terdeteksi" : "Permukaan Kering"}
              </span>
            </div>
          </div>
        </section>

        {/* CAD Blueprint & Wiring Verification Section */}
        <section className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          
          {/* Visual 2D Cane CAD Representation */}
          <div className="lg:col-span-3 p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-zinc-500" />
                  Visualisasi Gerakan Nyata Rangka Tongkat (2D CAD)
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Rangka kruk siku berputar secara fisik mengikuti sudut orientasi MPU6050 terhadap garis lantai datar
                </p>
              </div>
              <span className="font-mono text-xs font-bold px-3 py-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl self-start sm:self-auto">
                SUDUT: {data.mpuConnected && data.tiltDeg !== null ? data.tiltDeg.toFixed(1) : "0.0"}°
              </span>
            </div>

            {/* CAD Simulation Canvas with Blueprint Grid */}
            <div className="h-72 bg-blueprint-grid bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 relative flex items-center justify-center overflow-hidden">
              
              {/* Technical Protractor Guidelines */}
              <div className="absolute bottom-8 w-72 h-36 border-t border-l border-r border-dashed border-zinc-300 dark:border-zinc-800 rounded-t-full pointer-events-none" />
              <div className="absolute bottom-8 w-48 h-24 border-t border-l border-r border-dashed border-zinc-200 dark:border-zinc-850 rounded-t-full pointer-events-none" />

              {/* Angle Tick Marks */}
              <span className="absolute bottom-9 left-10 text-[9px] font-mono text-zinc-400">80°</span>
              <span className="absolute bottom-28 left-20 text-[9px] font-mono text-zinc-400">60° (JATUH)</span>
              <span className="absolute top-10 text-[9px] font-mono text-zinc-400">0° (TEGAK)</span>
              <span className="absolute bottom-28 right-20 text-[9px] font-mono text-zinc-400">30° (JALAN)</span>

              {/* Floor Horizon Line */}
              <div className="absolute bottom-8 left-0 right-0 h-0.5 bg-zinc-300 dark:bg-zinc-700 flex justify-between px-4">
                <span className="text-[10px] text-zinc-400 font-mono -mt-4">LANTAI RUJUKAN (0 CM)</span>
                <span className="text-[10px] text-zinc-400 font-mono -mt-4">HORIZON PLANAR</span>
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
                <div className="w-3 h-3 rounded-full bg-emerald-500 -left-0.75 top-22 absolute border border-white shadow-xs" title="HC-SR04 Depan" />
                <div className="w-3 h-3 rounded-full bg-sky-500 -left-0.75 bottom-8 absolute border border-white shadow-xs" title="HC-SR04 Bawah" />
                
                {/* Rubber Tip Foot */}
                <div className="w-3.5 h-2.5 bg-zinc-800 dark:bg-zinc-200 -left-1 -bottom-1 absolute rounded-xs" />
              </div>

              {/* Fall Alert Overlay */}
              {data.mpuConnected && data.tiltDeg !== null && data.tiltDeg > 60 && (
                <div className="absolute top-4 px-4 py-2 bg-rose-600 text-white font-extrabold text-xs rounded-xl shadow-lg border border-rose-500 animate-bounce tracking-wide flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  [PERINGATAN] TONGKAT TERJATUH // ALARM SOS AKTIF
                </div>
              )}
            </div>
          </div>

          {/* Quick Hardware Pin Checker Deck */}
          <div className="lg:col-span-2 p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-4 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-zinc-500" />
                Integritas Sambungan Kabel Fisik
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Pemeriksaan status sambungan pin ke modul hardware secara real-time
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs">
                <div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">1. Sensor Depan (HC-SR04)</div>
                  <div className="text-[11px] font-mono text-zinc-500">Pin D3 (Trig) & D2 (Echo)</div>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                    data.frontConnected
                      ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                      : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500"
                  }`}
                >
                  {data.frontConnected ? "TERHUBUNG" : "LEPAS"}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs">
                <div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">2. Sensor Bawah (HC-SR04)</div>
                  <div className="text-[11px] font-mono text-zinc-500">Pin D11 (Trig) & D10 (Echo)</div>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                    data.downConnected
                      ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                      : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500"
                  }`}
                >
                  {data.downConnected ? "TERHUBUNG" : "LEPAS"}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs">
                <div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">3. Sensor IMU (MPU6050)</div>
                  <div className="text-[11px] font-mono text-zinc-500">Pin A4 (SDA) & A5 (SCL)</div>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                    data.mpuConnected
                      ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                      : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500"
                  }`}
                >
                  {data.mpuConnected ? "TERHUBUNG" : "LEPAS"}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs">
                <div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">4. Sensor Air (Pelat FR-4)</div>
                  <div className="text-[11px] font-mono text-zinc-500">Pin A0 (Analog)</div>
                </div>
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  TERHUBUNG
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs">
                <div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">5. Motor Getar (PWM)</div>
                  <div className="text-[11px] font-mono text-zinc-500">Pin D5 (Modul Driver)</div>
                </div>
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                  SIAP
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs">
                <div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">6. Buzzer Darurat SOS</div>
                  <div className="text-[11px] font-mono text-zinc-500">Pin D6 (Transistor BC547)</div>
                </div>
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                  SIAP
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Raw Log Terminal Drawer with Interactive Command Input */}
        <section className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3.5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-zinc-500" />
              <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                TERMINAL TELEMETRI SERIAL (115200 BAUD)
              </span>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 text-xs">
                <input
                  type="checkbox"
                  checked={autoscroll}
                  onChange={(e) => setAutoscroll(e.target.checked)}
                  className="rounded text-zinc-900"
                />
                <span>Autoscroll</span>
              </label>
              <button
                onClick={handleCopyLogs}
                className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1 cursor-pointer font-medium"
              >
                {copiedLog ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLog ? "Tersalin" : "Salin Log"}</span>
              </button>
              <button
                onClick={() => setLogs([])}
                className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1 cursor-pointer font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Bersihkan</span>
              </button>
            </div>
          </div>

          <div
            ref={logContainerRef}
            className="h-36 bg-zinc-100 dark:bg-zinc-900 rounded-xl p-3.5 overflow-y-auto font-mono text-xs text-zinc-700 dark:text-zinc-300 space-y-1 border border-zinc-200 dark:border-zinc-800"
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

          {/* Interactive Command Input Bar */}
          <form onSubmit={handleSendCommand} className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-2.5 text-zinc-400 font-mono text-xs">&gt;</span>
              <input
                type="text"
                value={customCommand}
                onChange={(e) => setCustomCommand(e.target.value)}
                placeholder="Ketik perintah serial (contoh: HELP, FALL, DROP, FRONT 15, TILT 75, DEMO OFF)..."
                className="w-full bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-xs font-mono text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-1 focus:ring-zinc-400"
              />
            </div>
            <button
              type="submit"
              disabled={!customCommand.trim()}
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Kirim</span>
            </button>
          </form>

          {/* Quick Command Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-zinc-500 pt-1">
            <span className="text-[10px] text-zinc-400 font-semibold">Pintasan:</span>
            <button
              type="button"
              onClick={() => sendSerial("HELP")}
              className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 cursor-pointer font-medium"
            >
              HELP
            </button>
            <button
              type="button"
              onClick={() => triggerPreset("FALL")}
              className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-900 cursor-pointer font-medium"
            >
              JATUH (SOS)
            </button>
            <button
              type="button"
              onClick={() => triggerPreset("DROP")}
              className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900 cursor-pointer font-medium"
            >
              TURUNAN
            </button>
            <button
              type="button"
              onClick={() => triggerPreset("WET")}
              className="px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/40 text-sky-600 dark:text-sky-300 border border-sky-200 dark:border-sky-900 cursor-pointer font-medium"
            >
              AIR BASAH
            </button>
            <button
              type="button"
              onClick={() => triggerPreset("NEAR")}
              className="px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-900 cursor-pointer font-medium"
            >
              OBJEK DEKAT
            </button>
            <button
              type="button"
              onClick={() => triggerPreset("NORMAL")}
              className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 cursor-pointer font-medium"
            >
              NORMAL
            </button>
            <button
              type="button"
              onClick={() => toggleDemoMode(false)}
              className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 text-zinc-500 border border-zinc-200 dark:border-zinc-800 cursor-pointer ml-auto font-medium"
            >
              TUTUP DEMO
            </button>
          </div>
        </section>

      </div>

      {/* Manual Demo Slider Drawer (Wokwi Style Interactive Simulator) */}
      {isDemoMode && (
        <aside className="fixed bottom-6 right-6 w-92 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border border-zinc-300 dark:border-zinc-700 rounded-2xl shadow-2xl p-5 z-50 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-xs text-zinc-900 dark:text-white block">
                  Simulasi Sensor (Wokwi Style)
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                  {isConnected ? "[ONLINE] Terhubung ke Arduino USB" : "[OFFLINE] Mode UI Interaktif"}
                </span>
              </div>
            </div>
            <button
              onClick={() => toggleDemoMode(false)}
              className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer p-1 rounded-lg"
              title="Tutup Mode Demo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Scenario Buttons */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono font-bold tracking-wider text-zinc-400 uppercase block">
              Skenario Cepat Instan:
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => triggerPreset("FALL")}
                className="px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 font-semibold text-left cursor-pointer transition-colors shadow-2xs"
              >
                Tongkat Jatuh (SOS)
              </button>
              <button
                type="button"
                onClick={() => triggerPreset("DROP")}
                className="px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-300 font-semibold text-left cursor-pointer transition-colors shadow-2xs"
              >
                Tepi Jurang (+25cm)
              </button>
              <button
                type="button"
                onClick={() => triggerPreset("WET")}
                className="px-3 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/50 border border-sky-200 dark:border-sky-900 text-sky-700 dark:text-sky-300 font-semibold text-left cursor-pointer transition-colors shadow-2xs"
              >
                Genangan Air (&gt;650)
              </button>
              <button
                type="button"
                onClick={() => triggerPreset("NEAR")}
                className="px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 font-semibold text-left cursor-pointer transition-colors shadow-2xs"
              >
                Objek Dekat (14cm)
              </button>
            </div>
            <button
              type="button"
              onClick={() => triggerPreset("NORMAL")}
              className="w-full px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 font-bold text-center text-xs cursor-pointer transition-colors shadow-2xs"
            >
              Reset ke Kondisi Normal Aman
            </button>
          </div>

          {/* Precision Sliders */}
          <div className="space-y-3.5 pt-3 border-t border-zinc-200 dark:border-zinc-800 text-xs">
            <span className="text-[10px] font-mono font-bold tracking-wider text-zinc-400 uppercase block">
              Pengaturan Parameter Presisi:
            </span>

            <div className="space-y-1">
              <div className="flex justify-between font-mono">
                <span className="text-zinc-500">Jarak Depan (HC-SR04):</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">{demoFront} cm</span>
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

            <div className="space-y-1">
              <div className="flex justify-between font-mono">
                <span className="text-zinc-500">Turunan Bawah (+Delta):</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">+{demoDown} cm</span>
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

            <div className="space-y-1">
              <div className="flex justify-between font-mono">
                <span className="text-zinc-500">Kemiringan MPU6050:</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">{demoTilt}°</span>
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

            <div className="space-y-1">
              <div className="flex justify-between font-mono">
                <span className="text-zinc-500">Sensor Air (A0):</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">{demoWater > 650 ? `${demoWater} (Basah)` : `${demoWater} (Kering)`}</span>
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
        </aside>
      )}
    </div>
  );
}
