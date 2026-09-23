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
  Clock,
  Trash2,
  X
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
  // Theme state
  const [theme, setTheme] = useState<"dark" | "light" | "system">("dark");

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
  const [demoFront, setDemoFront] = useState(80);
  const [demoDown, setDemoDown] = useState(0);
  const [demoTilt, setDemoTilt] = useState(12);
  const [demoWater, setDemoWater] = useState(220);

  // Raw logs
  const [logs, setLogs] = useState<string[]>([
    "[SISTEM] KATANA Next.js Console Siap. Klik 'Hubungkan Arduino' atau aktifkan 'Mode Demo'."
  ]);
  const [autoscroll, setAutoscroll] = useState(true);

  // Serial references
  const portRef = useRef<any>(null);
  const readerRef = useRef<any>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Theme effect
  useEffect(() => {
    const saved = localStorage.getItem("katana_theme") as "dark" | "light" | "system" | null;
    if (saved) setTheme(saved);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") {
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", systemDark);
    } else {
      root.classList.toggle("dark", theme === "dark");
    }
    localStorage.setItem("katana_theme", theme);
  }, [theme]);

  // Log autoscroll
  useEffect(() => {
    if (autoscroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoscroll]);

  // Serial connection handlers
  const handleConnect = async () => {
    if (!("serial" in navigator)) {
      alert("Browser ini belum mendukung Web Serial API. Silakan gunakan Google Chrome, Brave, atau Edge.");
      return;
    }

    try {
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: 115200 });
      portRef.current = port;
      setIsConnected(true);
      setPortInfo("Terhubung (115200 Baud)");
      addLog("[SISTEM] Port serial berhasil tersambung pada 115200 baud.");

      const textDecoder = new (window as any).TextDecoderStream();
      port.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();
      readerRef.current = reader;

      readLoop(reader);
    } catch (err: any) {
      console.error(err);
      addLog(`[INFO] Koneksi dibatalkan: ${err.message}`);
      setIsConnected(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      if (readerRef.current) {
        await readerRef.current.cancel();
        readerRef.current = null;
      }
      if (portRef.current) {
        await portRef.current.close();
        portRef.current = null;
      }
      setIsConnected(false);
      setPortInfo("Belum Tersambung");
      addLog("[SISTEM] Sambungan USB diputuskan.");
    } catch (err: any) {
      console.error(err);
    }
  };

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev.slice(-120), msg]);
  };

  let buffer = "";
  const readLoop = async (reader: any) => {
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          buffer += value;
          const lines = buffer.split("\n");
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
      console.error("Read loop error:", err);
      setIsConnected(false);
    }
  };

  const parseLine = (line: string) => {
    if (isDemoMode) return; // Prioritize demo sliders if demo is on

    if (line.includes("[KONEKSI]")) {
      const next: TelemetryData = { ...data };

      const front = line.match(/Depan:RIIL\((\d+)cm\)/);
      if (front) {
        next.frontConnected = true;
        next.frontCm = parseInt(front[1], 10);
      } else if (line.includes("Depan:LEPAS")) {
        next.frontConnected = false;
        next.frontCm = null;
      }

      const down = line.match(/Bawah:RIIL\((\d+)cm\)/);
      if (down) {
        next.downConnected = true;
        next.downCm = parseInt(down[1], 10);
      } else if (line.includes("Bawah:LEPAS")) {
        next.downConnected = false;
        next.downCm = null;
      }

      const imu = line.match(/IMU:RIIL\(([0-9.]+)°\)/);
      if (imu) {
        next.mpuConnected = true;
        next.tiltDeg = parseFloat(imu[1]);
      } else if (line.includes("IMU:LEPAS")) {
        next.mpuConnected = false;
        next.tiltDeg = null;
      }

      const water = line.match(/Air:RIIL\((\d+)\)/);
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
    }
  };

  // Demo tick
  useEffect(() => {
    if (!isDemoMode) return;

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

  // Derived helper status
  const getBannerDetails = () => {
    const s = data.state.toUpperCase();
    if (s.includes("JATUH") || s.includes("FALL")) {
      return {
        type: "danger",
        title: "🚨 PERINGATAN: TONGKAT TERJATUH! (ALARM SOS AKTIF)",
        desc: "Buzzer fisik berbunyi dengan pola Morse SOS. Segera tegakkan tongkat kembali."
      };
    }
    if (s.includes("TURUNAN") || s.includes("DROP")) {
      return {
        type: "warning",
        title: "⚠️ WASPADA: ADA TEPI TURUNAN / JURANG DI DEPAN",
        desc: "Perubahan elevasi lantai > 15 cm. Motor getar memberikan 3 kali pulsa kuat."
      };
    }
    if (s.includes("BASAH") || s.includes("WATER")) {
      return {
        type: "warning",
        title: "💧 PERHATIAN: MENDETEKSI GENANGAN AIR DI DEPAN",
        desc: "Pelat sensor mendeteksi area basah. Motor getar memberikan 2 kali getaran panjang."
      };
    }
    if (s.includes("DEKAT")) {
      return {
        type: "danger",
        title: "🛑 BAHAYA: RINTANGAN SANGAT DEKAT (< 20 CM)",
        desc: "Ada objek penghalang tepat di depan badan pengguna. Hentikan langkah!"
      };
    }
    if (s.includes("SEDANG") || s.includes("WASPADA")) {
      return {
        type: "warning",
        title: "🚶 PERHATIAN: RINTANGAN DI DEPAN (50-100 CM)",
        desc: "Objek terdeteksi mendekat. Pulsa getaran motor di gagang mulai terasa bertahap."
      };
    }
    if (s.includes("NORMAL")) {
      return {
        type: "normal",
        title: "✅ JALUR AMAN & BEBAS HAMBATAN",
        desc: "Semua sensor dalam batas aman normal. Pengguna dapat melangkah leluasa."
      };
    }
    return {
      type: "standby",
      title: "⏳ MENUNGGU SENSOR TERHUBUNG",
      desc: "Sistem online. Tancapkan kabel modul sensor fisik ke Arduino untuk mulai pemindaian."
    };
  };

  const banner = getBannerDetails();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Top Navbar */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-black flex items-center justify-center font-mono font-bold text-sm tracking-wider">
              KT
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base tracking-tight">KATANA</h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 font-mono border border-zinc-200 dark:border-zinc-800">
                  v1.2.0
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Monitor Tongkat Pintar Tunanetra // Web Serial Telemetry
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Theme Selector */}
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-0.5 text-xs font-medium">
              <button
                onClick={() => setTheme("dark")}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all ${
                  theme === "dark"
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                }`}
                title="Mode Gelap"
              >
                <Moon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Gelap</span>
              </button>
              <button
                onClick={() => setTheme("light")}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all ${
                  theme === "light"
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                }`}
                title="Mode Terang"
              >
                <Sun className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Terang</span>
              </button>
              <button
                onClick={() => setTheme("system")}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all ${
                  theme === "system"
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                }`}
                title="Ikuti Sistem"
              >
                <Laptop className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sistem</span>
              </button>
            </div>

            {/* Connection Status Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-mono">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? "bg-emerald-500 animate-pulse" : "bg-zinc-400 dark:bg-zinc-600"
                }`}
              />
              <span className="text-zinc-600 dark:text-zinc-300">{portInfo}</span>
            </div>

            {/* Serial Button */}
            {!isConnected ? (
              <button
                onClick={handleConnect}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-950 font-medium text-xs rounded-lg transition-all shadow-xs cursor-pointer"
              >
                <Usb className="w-4 h-4" />
                Hubungkan Arduino
              </button>
            ) : (
              <button
                onClick={handleDisconnect}
                className="flex items-center gap-2 px-4 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-900 font-medium text-xs rounded-lg transition-all cursor-pointer"
              >
                <Unplug className="w-4 h-4" />
                Putuskan
              </button>
            )}

            {/* Intuitive Demo Toggle Button */}
            <button
              onClick={() => setIsDemoMode(!isDemoMode)}
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                isDemoMode
                  ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-sm"
                  : "bg-white dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
              }`}
            >
              <div
                className={`w-7 h-4 rounded-full p-0.5 transition-colors ${
                  isDemoMode ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
                }`}
              >
                <div
                  className={`w-3 h-3 rounded-full bg-white transition-transform ${
                    isDemoMode ? "translate-x-3" : "translate-x-0"
                  }`}
                />
              </div>
              <span>
                Mode Demo:{" "}
                <b className={isDemoMode ? "text-emerald-400 dark:text-emerald-600 font-bold" : ""}>
                  {isDemoMode ? "AKTIF" : "MATI"}
                </b>
              </span>
            </button>
          </div>
        </header>

        {/* Master State Banner */}
        <section
          className={`p-5 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
            banner.type === "danger"
              ? "bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800"
              : banner.type === "warning"
              ? "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800"
              : banner.type === "normal"
              ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800"
              : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
          }`}
        >
          <div>
            <div className="text-[11px] font-bold tracking-wider text-zinc-500 dark:text-zinc-400 font-mono uppercase">
              STATUS SISTEM TONGKAT
            </div>
            <h2 className="text-lg md:text-xl font-extrabold tracking-tight mt-0.5 text-zinc-900 dark:text-zinc-50">
              {banner.title}
            </h2>
            <p className="text-xs md:text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              {banner.desc}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex flex-col px-3.5 py-2 rounded-lg bg-zinc-100/70 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 min-w-[130px]">
              <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                <Vibrate className="w-3 h-3" /> GETARAN (D5)
              </span>
              <span
                className={`text-sm font-bold font-mono mt-0.5 ${
                  data.motor === "ON" ? "text-amber-600 dark:text-amber-400" : "text-zinc-900 dark:text-zinc-100"
                }`}
              >
                {data.motor === "ON" ? "BERGETAR" : "DIAM"}
              </span>
            </div>

            <div className="flex flex-col px-3.5 py-2 rounded-lg bg-zinc-100/70 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 min-w-[130px]">
              <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                <Volume2 className="w-3 h-3" /> BUZZER (D6)
              </span>
              <span
                className={`text-sm font-bold font-mono mt-0.5 ${
                  data.buzzer.includes("SOS") ? "text-rose-600 dark:text-rose-400" : "text-zinc-900 dark:text-zinc-100"
                }`}
              >
                {data.buzzer.includes("SOS") ? "ALARM SOS" : "DIAM"}
              </span>
            </div>
          </div>
        </section>

        {/* 4 Primary Sensor Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Front Obstacle */}
          <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl flex flex-col justify-between space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-zinc-500" />
                  1. Rintangan Depan
                </span>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Sensor atas lurus (HC-SR04)
                </p>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                  data.frontConnected
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                    : "bg-zinc-100 dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800"
                }`}
              >
                {data.frontConnected ? "Tersambung" : "Belum Dicolok"}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold font-mono tracking-tight text-zinc-900 dark:text-white">
                {data.frontConnected && data.frontCm !== null ? data.frontCm : "--"}
              </span>
              <span className="text-xs font-bold text-zinc-500">CM</span>
            </div>

            <div className="space-y-1.5">
              <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-zinc-900 dark:bg-white transition-all duration-200"
                  style={{
                    width: `${
                      data.frontConnected && data.frontCm !== null
                        ? Math.min(100, Math.max(0, (1 - data.frontCm / 150) * 100))
                        : 0
                    }%`
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                <span>0 cm</span>
                <span>50 cm</span>
                <span>&gt;100 cm</span>
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-900 flex justify-between items-center text-xs">
              <span className="text-[11px] font-mono text-zinc-400">Pin D2/D3</span>
              <span className="font-medium text-xs text-zinc-700 dark:text-zinc-300">
                {!data.frontConnected
                  ? "Kabel Belum Dicolok"
                  : data.frontCm! < 20
                  ? "Bahaya Dekat"
                  : data.frontCm! < 50
                  ? "Waspada Sedang"
                  : "Jalur Bebas"}
              </span>
            </div>
          </div>

          {/* Card 2: Floor Drop / Pothole */}
          <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl flex flex-col justify-between space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <TrendingDown className="w-4 h-4 text-zinc-500" />
                  2. Jurang / Turunan
                </span>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Sensor bawah miring (HC-SR04)
                </p>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                  data.downConnected
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                    : "bg-zinc-100 dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800"
                }`}
              >
                {data.downConnected ? "Tersambung" : "Belum Dicolok"}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold font-mono tracking-tight text-zinc-900 dark:text-white">
                {data.downConnected && data.downCm !== null ? data.downCm : "--"}
              </span>
              <span className="text-xs font-bold text-zinc-500">CM</span>
            </div>

            <div className="flex justify-between items-center px-3 py-1.5 bg-zinc-50 dark:bg-zinc-900 rounded-lg text-xs font-mono">
              <span className="text-zinc-500">Selisih Lantai:</span>
              <span className="font-bold text-zinc-900 dark:text-zinc-100">
                +{data.downConnected && data.downCm !== null ? Math.max(0, data.downCm - 30) : 0} cm
              </span>
            </div>

            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-900 flex justify-between items-center text-xs">
              <span className="text-[11px] font-mono text-zinc-400">Pin D10/D11</span>
              <span className="font-medium text-xs text-zinc-700 dark:text-zinc-300">
                {!data.downConnected
                  ? "Kabel Belum Dicolok"
                  : data.downCm! - 30 > 15
                  ? "Ada Turunan / Lubang"
                  : "Lantai Normal"}
              </span>
            </div>
          </div>

          {/* Card 3: Cane Tilt (MPU6050) */}
          <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl flex flex-col justify-between space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-zinc-500" />
                  3. Kemiringan Tongkat
                </span>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Deteksi jatuh (MPU6050 Gyro)
                </p>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                  data.mpuConnected
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                    : "bg-zinc-100 dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800"
                }`}
              >
                {data.mpuConnected ? "Tersambung" : "Belum Dicolok"}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold font-mono tracking-tight text-zinc-900 dark:text-white">
                {data.mpuConnected && data.tiltDeg !== null ? data.tiltDeg.toFixed(1) : "--"}
              </span>
              <span className="text-xs font-bold text-zinc-500">DERAJAT (°)</span>
            </div>

            <div className="space-y-1.5">
              <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-zinc-900 dark:bg-white transition-all duration-200"
                  style={{
                    width: `${
                      data.mpuConnected && data.tiltDeg !== null
                        ? Math.min(100, Math.max(0, (data.tiltDeg / 90) * 100))
                        : 0
                    }%`
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                <span>Tegak 0°</span>
                <span>Batas Jatuh 60°</span>
                <span>90°</span>
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-900 flex justify-between items-center text-xs">
              <span className="text-[11px] font-mono text-zinc-400">Pin A4/A5</span>
              <span className="font-medium text-xs text-zinc-700 dark:text-zinc-300">
                {!data.mpuConnected
                  ? "Kabel Belum Dicolok"
                  : data.tiltDeg! > 60
                  ? "Posisi Rebah / Jatuh"
                  : "Tongkat Tegak Siap"}
              </span>
            </div>
          </div>

          {/* Card 4: Water Surface */}
          <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl flex flex-col justify-between space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Droplets className="w-4 h-4 text-zinc-500" />
                  4. Sensor Air / Genangan
                </span>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Pelat kontak air di kaki kruk
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                Tersambung
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold font-mono tracking-tight text-zinc-900 dark:text-white">
                {data.waterVal}
              </span>
              <span className="text-xs font-bold text-zinc-500">/ 1023</span>
            </div>

            <div className="space-y-1.5">
              <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-zinc-900 dark:bg-white transition-all duration-200"
                  style={{
                    width: `${Math.min(100, Math.max(0, (data.waterVal / 1023) * 100))}%`
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                <span>Kering (0)</span>
                <span>Ambang Basah (650)</span>
                <span>1023</span>
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-900 flex justify-between items-center text-xs">
              <span className="text-[11px] font-mono text-zinc-400">Pin A0</span>
              <span className="font-medium text-xs text-zinc-700 dark:text-zinc-300">
                {data.waterVal > 650 ? "Genangan Air Terdeteksi!" : "Permukaan Kering"}
              </span>
            </div>
          </div>
        </section>

        {/* CAD Blueprint & Wiring Checklist */}
        <section className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          
          {/* Visual 2D Cane CAD Representation */}
          <div className="lg:col-span-3 p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Visualisasi Gerakan Nyata Tongkat
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Gambar tongkat ini berputar secara fisik mengikuti sudut tangan Anda di dunia nyata
                </p>
              </div>
              <span className="font-mono text-xs font-semibold px-2.5 py-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                Sudut: {data.mpuConnected && data.tiltDeg !== null ? data.tiltDeg.toFixed(1) : "0.0"}°
              </span>
            </div>

            <div className="h-64 bg-zinc-100/60 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800 relative flex items-center justify-center overflow-hidden">
              {/* Floor Horizon */}
              <div className="absolute bottom-8 left-0 right-0 h-0.5 bg-zinc-300 dark:bg-zinc-700 flex justify-end px-4">
                <span className="text-[10px] text-zinc-400 font-mono -mt-4">LANTAI DATAR</span>
              </div>

              {/* Angle Protractor */}
              <div className="absolute bottom-8 w-64 h-32 border-t border-l border-r border-dashed border-zinc-300 dark:border-zinc-700 rounded-t-full pointer-events-none" />

              {/* Virtual Cane */}
              <div
                className="w-1 bg-zinc-900 dark:bg-white h-44 absolute bottom-8 origin-bottom transition-transform duration-200 ease-out"
                style={{
                  transform: `rotate(${Math.min(85, data.mpuConnected && data.tiltDeg !== null ? data.tiltDeg : 0)}deg)`
                }}
              >
                {/* Handle */}
                <div className="w-6 h-1.5 bg-zinc-900 dark:bg-white -left-5 -top-2 absolute rounded-xs" />
                {/* Rubber Tip */}
                <div className="w-2.5 h-2 bg-zinc-900 dark:bg-white -left-0.5 -bottom-1 absolute rounded-xs" />
              </div>

              {/* Fall Alert Overlay */}
              {data.mpuConnected && data.tiltDeg !== null && data.tiltDeg > 60 && (
                <div className="absolute top-4 px-4 py-2 bg-rose-600 text-white font-bold text-xs rounded-lg shadow-lg animate-bounce">
                  ⚠️ PERINGATAN: TONGKAT TERJATUH! (SUARA SOS AKTIF)
                </div>
              )}
            </div>
          </div>

          {/* Quick Hardware Pin Checker */}
          <div className="lg:col-span-2 p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-4">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Pemeriksaan Sambungan Kabel
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Status jujur apakah kabel Anda sudah tertancap ke pin Arduino
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs">
                <div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">1. Sensor Depan (HC-SR04)</div>
                  <div className="text-[11px] font-mono text-zinc-500">Pin D3 (Trig) & D2 (Echo)</div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium ${
                    data.frontConnected
                      ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                      : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500"
                  }`}
                >
                  {data.frontConnected ? "Tersambung" : "Belum Dicolok"}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs">
                <div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">2. Sensor Bawah (HC-SR04)</div>
                  <div className="text-[11px] font-mono text-zinc-500">Pin D11 (Trig) & D10 (Echo)</div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium ${
                    data.downConnected
                      ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                      : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500"
                  }`}
                >
                  {data.downConnected ? "Tersambung" : "Belum Dicolok"}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs">
                <div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">3. Sensor Kemiringan (MPU6050)</div>
                  <div className="text-[11px] font-mono text-zinc-500">Pin A4 (SDA) & A5 (SCL)</div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium ${
                    data.mpuConnected
                      ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                      : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500"
                  }`}
                >
                  {data.mpuConnected ? "Tersambung" : "Belum Dicolok"}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs">
                <div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">4. Sensor Air (Pelat)</div>
                  <div className="text-[11px] font-mono text-zinc-500">Pin A0 (Analog)</div>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  Tersambung
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs">
                <div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">5. Motor Getar (PWM)</div>
                  <div className="text-[11px] font-mono text-zinc-500">Pin D5 (Modul Driver)</div>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                  Siap
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs">
                <div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">6. Buzzer Suara SOS</div>
                  <div className="text-[11px] font-mono text-zinc-500">Pin D6 (Transistor BC547)</div>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                  Siap
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Raw Log Terminal Drawer */}
        <section className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono font-semibold text-zinc-600 dark:text-zinc-400">
              TERMINAL LOG DATA RAW (115200 BAUD)
            </span>
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
                onClick={() => setLogs([])}
                className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Bersihkan</span>
              </button>
            </div>
          </div>

          <div
            ref={logContainerRef}
            className="h-28 bg-zinc-100 dark:bg-zinc-900 rounded-lg p-3 overflow-y-auto font-mono text-xs text-zinc-700 dark:text-zinc-300 space-y-1"
          >
            {logs.map((line, i) => (
              <div key={i} className="leading-relaxed">
                {line}
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* Manual Demo Slider Drawer */}
      {isDemoMode && (
        <aside className="fixed bottom-6 right-6 w-80 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl shadow-2xl p-4 z-50 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-500" />
              <span className="font-bold text-xs text-zinc-900 dark:text-white">
                Simulasi Manual (Coba Tampilan)
              </span>
            </div>
            <button
              onClick={() => setIsDemoMode(false)}
              className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <div className="flex justify-between font-mono">
                <span className="text-zinc-500">Jarak Depan:</span>
                <span className="font-bold">{demoFront} cm</span>
              </div>
              <input
                type="range"
                min="5"
                max="180"
                value={demoFront}
                onChange={(e) => setDemoFront(parseInt(e.target.value, 10))}
                className="w-full accent-zinc-900 dark:accent-white cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between font-mono">
                <span className="text-zinc-500">Turunan / Jurang:</span>
                <span className="font-bold">+{demoDown} cm</span>
              </div>
              <input
                type="range"
                min="0"
                max="45"
                value={demoDown}
                onChange={(e) => setDemoDown(parseInt(e.target.value, 10))}
                className="w-full accent-zinc-900 dark:accent-white cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between font-mono">
                <span className="text-zinc-500">Kemiringan Tongkat:</span>
                <span className="font-bold">{demoTilt}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="85"
                value={demoTilt}
                onChange={(e) => setDemoTilt(parseInt(e.target.value, 10))}
                className="w-full accent-zinc-900 dark:accent-white cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between font-mono">
                <span className="text-zinc-500">Sensor Air:</span>
                <span className="font-bold">{demoWater > 650 ? `${demoWater} (Basah)` : `${demoWater} (Kering)`}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1000"
                value={demoWater}
                onChange={(e) => setDemoWater(parseInt(e.target.value, 10))}
                className="w-full accent-zinc-900 dark:accent-white cursor-pointer"
              />
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
