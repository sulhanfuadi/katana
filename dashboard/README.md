# KATANA Telemetry Dashboard

> **Web Serial Live Telemetry & Hardware Simulation Interface**  
> Built with Next.js 15, React 19, Tailwind CSS v4, and Lucide Icons. Designed for real-time monitoring, diagnostic logging, and bidirectional simulation of the KATANA smart navigation cane.

---

## Key Features

### 1. Robust Web Serial API Integration (115200 Baud)
- **Direct Stream Locking**: Uses direct `ReadableStreamDefaultReader` and `WritableStreamDefaultWriter` with explicit `releaseLock()` handling, eliminating stream deadlocks and ensuring clean disconnects.
- **Hardware Hotplug Listeners**: Automatically tracks USB plug and unplug events via `navigator.serial.addEventListener('connect' | 'disconnect')`.
- **Port Conflict Handling**: Gracefully detects when another program (such as the Arduino IDE Serial Monitor) is occupying the USB port, prompting the user with actionable instructions.

### 2. Live Telemetry & CAD Visualizer
- **2D CAD Cane Blueprint**: Renders a dynamic vector representation of the physical forearm crutch, tilting in real time according to the MPU6050 accelerometer vector against the ground plane.
- **Environmental Gauge Grid**:
  - Front Obstacle Distance: Real-time proximity readings with multi-tier danger warnings (`[NEAR]`, `[MEDIUM]`, `[CAUTION]`, `[CLEAR]`).
  - Ground Drop-off Delta: Continuous deviation monitoring relative to baseline calibration to flag potholes, down-steps, or curb edges.
  - Surface Moisture: Analog conductivity index to detect puddles or standing water.
  - Actuator States: Real-time feedback for handle haptic motor duty cycle and acoustic SOS buzzer status.
- **Hardware Connection Badges**: Monitors each individual sensor connection (`RIIL` for active reading, `LEPAS` for cable disconnect/standby).

### 3. Bidirectional Hardware Simulation (Wokwi-Style)
- When USB is connected, toggling **Demo Mode: ON** allows developers to inject simulated sensor data directly into the Arduino Nano firmware via serial commands.
- Overriding states triggers the physical vibration motor (pin D5) and emergency buzzer (pin D6) on the actual cane.
- **One-Click Hazard Presets**:
  - `FALL (SOS)`: Forces tilt angle to 75 deg and triggers the acoustic Morse SOS pattern.
  - `DROP-OFF`: Increases ground distance by +25 cm and triggers 3 sharp haptic pulses.
  - `WET SURFACE`: Sets moisture level to 850 and triggers 2 long vibration pulses.
  - `NEAR OBSTACLE`: Sets frontal obstacle distance to 12 cm and triggers critical high-frequency vibration.
  - `NORMAL`: Restores all sensors to nominal walking conditions.
- **Precision Sliders**: Manual adjustments for frontal distance (0-200 cm), ground distance (0-100 cm), tilt angle (0-90 deg), and moisture (0-1023).

### 4. Interactive Serial Terminal & Command Console
- Built-in command prompt to send raw serial commands directly to the microcontroller.
- Quick-command pills for `HELP`, `DEMO ON`, `DEMO OFF`, `FALL`, `DROP`, `WET`, `NEAR`, and `RESET`.
- Auto-scrolling terminal with pause toggle, clear function, and monospace formatting.

### 5. Monochrome Design System & Accessibility
- Clean high-contrast aesthetic tailored for technical readability and accessibility.
- Zero-emoji UI policy: all indicators use official Lucide monochrome SVG icons and clear textual tags (`[ALERT]`, `[OK]`, `[STANDBY]`).
- Three-way theme switcher: **Dark** (slate/zinc high contrast), **Light** (crisp editorial paper), and **System** auto-detection.

---

## Getting Started

### Prerequisites
- **Node.js** v18.18 or higher (v20+ recommended).
- A Chromium-based browser supporting the Web Serial API:
  - Google Chrome (Desktop)
  - Brave Browser
  - Microsoft Edge
  - Opera

### Installation & Development Server

1. Navigate to the dashboard directory:
   ```bash
   cd dashboard
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Next.js development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Operating Instructions

1. **Connect Hardware**:
   - Plug the Arduino Nano into your computer using a USB cable.
   - Ensure the Arduino IDE Serial Monitor is closed.
   - Click the **Hubungkan Arduino** button in the dashboard header.
   - Select your serial device (e.g., `USB Serial` or `/dev/cu.usbserial-110`) from the browser popup dialog.
2. **Inspect Live Data**:
   - Once connected, sensor readings and the CAD cane orientation update automatically.
3. **Run Simulation**:
   - Click the **Mode Demo: AKTIF / NONAKTIF** toggle button.
   - Use the scenario presets or sliders to test firmware responses and verify actuator output on the physical cane.
4. **Disconnecting**:
   - Click the **Putus Koneksi** button at any time. The serial reader and writer locks release immediately without requiring a browser refresh.
