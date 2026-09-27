# AgriGuard field node (ESP32)

Solar-powered ESP32 node that measures soil, weather, water and energy, posts it to the AgriGuard backend every minute, and switches the irrigation pump starter on the server's command, with local safety cut-offs.

```
sensors ──> ESP32 ──(WiFi, JSON)──> POST /api/device/telemetry ──> AgriGuard backend
                 <── { pump: ON/OFF, runSeconds, reportEverySeconds } ──┘
ESP32 ──> relay module ──> existing pump starter / contactor coil ──> motor
```

Files in this folder:

| File | Purpose |
|---|---|
| `agriguard-node.ino` | Firmware (Arduino IDE 2.x, ESP32 core 3.x) |
| `config.example.h` | Settings template. Copy it to `config.h` and edit it. Keep `config.h` out of git, because it holds your WiFi password and device key |
| `README.md` | This guide |

Quick start:

1. Buy the parts ([bill of materials](#1-bill-of-materials)) and wire them ([wiring](#2-wiring)).
2. Install Arduino IDE, the ESP32 core and the libraries ([Arduino IDE setup](#5-arduino-ide-setup)).
3. Register the node in the AgriGuard app and copy its device key ([register the device](#6-register-the-device-in-the-agriguard-app)).
4. Copy `config.example.h` to `config.h`. Fill in WiFi, `API_BASE_URL` and `DEVICE_KEY`, and set a feature flag to `0` for each sensor you have not fitted.
5. Calibrate with `CALIBRATION_MODE 1` ([calibration](#7-sensor-calibration)), then set it back to `0` and upload.

---

## 1. Bill of materials

Approximate Indian retail prices from Robu.in, Robocraze, Amazon.in and electronics markets such as Lamington Road and SP Road (2026). Prices vary a lot between sellers. Buy 18650 cells and NPK sensors only from reputable sellers, because fakes are common.

| # | Part | Qty | Approx. price (INR) | Notes |
|---|---|---|---|---|
| 1 | ESP32 DevKit V1 (ESP32-WROOM-32, 30 or 38 pin, CP2102 or CH340 USB) | 1 | 350 – 450 | Avoid WROVER boards, or move the RS485 pins (GPIO16/17 are used by PSRAM) |
| 2 | Capacitive soil moisture sensor v1.2 / v2.0 | 1 | 60 – 120 | Buy 2, because some clones are faulty |
| 3 | DS18B20 waterproof probe (1 m to 3 m cable) | 1 | 120 – 200 | Plus a 4.7 kΩ resistor |
| 4 | DHT22 / AM2302 module | 1 | 250 – 350 | Or item 5 |
| 5 | SHT31 module (alternative to DHT22, more accurate) | 0/1 | 350 – 500 | Optional |
| 6 | RS485 soil NPK sensor, 3-in-1 (JXCT type) | 0/1 | 3,500 – 6,500 | 7-in-1 (with pH/EC/moisture): 6,000 – 12,000 |
| 7 | MAX485 TTL-to-RS485 module | 1 | 40 – 70 | A MAX3485 (3.3 V) module (₹80 – 150) is better for long cables |
| 8 | YF-S201 water flow sensor, 1/2" (1 – 30 L/min) | 1 | 250 – 400 | For a pump main line use YF-DN40/DN50 (₹1,500 – 2,500) |
| 9 | PZEM-004T v3.0, 100 A with CT coil | 0/1 | 1,000 – 1,500 | Single-phase energy meter |
| 10 | JSN-SR04T waterproof ultrasonic sensor | 1 | 350 – 550 | For a tank or sump |
| 11 | INA219 current/voltage module | 0/1 | 150 – 250 | Solar input monitor |
| 12 | 4-channel logic level shifter (BSS138) | 1 | 40 – 70 | 5 V ↔ 3.3 V signals |
| 13 | 1-channel 5 V relay module with optocoupler (10 A 250 VAC) | 1 | 60 – 100 | Low-level trigger |
| 14 | Solar panel 6 V, 6 W (10 W if the NPK sensor is fitted) | 1 | 450 – 1,000 | |
| 15 | CN3791 MPPT solar Li-ion charger module (6 V panel, 4.2 V version) | 1 | 200 – 350 | |
| 16 | 18650 Li-ion cell, 2600 – 3000 mAh (genuine) | 2 – 3 | 200 – 350 each | Connected in parallel |
| 17 | 18650 holder (2 or 3 slot) | 1 | 40 – 80 | |
| 18 | 1S Li-ion protection board (DW01 + 8205A), or protected cells | 1 | 20 – 40 | The CN3791 has no over-discharge protection |
| 19 | MT3608 boost converter (one for 5 V, one for 12 V for NPK) | 1 – 2 | 40 – 60 each | |
| 20 | Resistors (2 × 100 kΩ, 4.7 kΩ, 10 kΩ), 100 nF, 1000 µF/16 V, 2 A fuse and holder, toggle switch | – | 80 – 150 | |
| 21 | IP65 junction box (about 200 × 150 × 100 mm) and cable glands | 1 | 300 – 600 | |
| 22 | Perfboard, screw terminals, wire, heat-shrink | – | 200 – 300 | |

Rough totals: a minimal node (moisture, DS18B20, DHT22, flow, tank, relay, solar) costs about **₹4,000 – 4,500**. The full node with NPK, PZEM and INA219 costs about **₹10,000**, most of which is the NPK sensor.

---

## 2. Wiring

All grounds are common. **3V3** means the ESP32 3.3 V pin. **5V** means the 5 V boost output that also feeds the ESP32 `VIN`/`5V` pin.

| Sensor / module | Module pin | Connect to | Notes |
|---|---|---|---|
| Capacitive soil moisture | VCC / GND / AOUT | 3V3 / GND / **GPIO34** | Must be an ADC1 pin (GPIO32 – 39). ADC2 stops working when WiFi is on |
| DS18B20 probe | Red / Black / Yellow | 3V3 / GND / **GPIO4** | 4.7 kΩ from yellow (data) to 3V3 |
| DHT22 | VCC / DATA / GND | 3V3 / **GPIO27** / GND | Modules have a pull-up. For a bare sensor add 10 kΩ from DATA to 3V3 |
| SHT31 (alt.) | VIN / GND / SDA / SCL | 3V3 / GND / **GPIO21** / **GPIO22** | Address 0x44 |
| INA219 | VCC / GND / SDA / SCL | 3V3 / GND / **GPIO21** / **GPIO22** | Address 0x40, shares the I2C bus with SHT31 |
| INA219 power side | VIN+ / VIN− | Solar panel + / CN3791 IN+ | High-side, in series with the panel |
| MAX485 | VCC / GND | 3V3 / GND | |
| MAX485 | RO / DI | **GPIO16** (RX2) / **GPIO17** (TX2) | |
| MAX485 | DE + RE (bridged) | **GPIO18** | Set `RS485_DE_PIN -1` for auto-direction modules |
| MAX485 | A / B | NPK sensor A (usually yellow) / B (usually blue) | Twisted pair. Swap A/B if there is no reply |
| NPK sensor | Brown / Black | 12 V boost + / GND | Check your sensor's label: some accept 5 – 30 V, many need 12 V |
| PZEM-004T (TTL side) | 5V / GND | 5V / GND | |
| PZEM-004T | TX → | Level shifter HV1, LV1 → **GPIO25** (RX1) | |
| PZEM-004T | RX ← | Level shifter HV2, LV2 ← **GPIO26** (TX1) | |
| PZEM-004T (AC side) | L / N, CT | Supply side of the starter; CT around one motor phase wire | **Electrician only.** See [section 4](#4-pump-relay-and-starter-safety) |
| YF-S201 | Red / Black / Yellow | 5V / GND / level shifter HV3, LV3 → **GPIO13** | The arrow on the body shows the flow direction |
| JSN-SR04T | 5V / GND | 5V / GND | |
| JSN-SR04T | TRIG | **GPIO23** (direct) | 3.3 V trigger is enough |
| JSN-SR04T | ECHO | Level shifter HV4, LV4 → **GPIO19** | The echo output is 5 V |
| Level shifter | HV / LV / GND | 5V / 3V3 / GND | |
| Relay module | VCC / GND / IN | 5V / GND / **GPIO32** | `RELAY_ACTIVE_LOW 1` for low-trigger modules |
| Relay module | COM / NO | Starter control circuit | **Electrician only** |
| Battery divider | – | Battery + → 100 kΩ → **GPIO35** → 100 kΩ → GND | Add 100 nF from GPIO35 to GND |
| Status LED | – | GPIO2 (on-board LED) | |

Pins to avoid for your own changes: GPIO0, 2, 5, 12 and 15 (boot strapping pins), GPIO6 – 11 (flash) and GPIO34 – 39 as outputs (they are input-only).

Cable tips: keep the capacitive sensor cable under about 2 m. Run the RS485 pair up to 100 m or more. Keep all sensor cables away from 230 V wiring, and never run them in the same conduit.

---

## 3. Power design

```
6V 6W solar panel (+) ──> INA219 VIN+ ─[shunt]─> INA219 VIN- ──> CN3791 IN+
6V 6W solar panel (-) ─────────────────────────────────────────> CN3791 IN-   (system GND)

CN3791 BAT+/BAT- ──> protection board P+/P- <── B+/B- ── 2-3 x 18650 in parallel

P+ ──> 2 A fuse ──> switch ──┬──> MT3608 #1 set to 5.1 V ──> ESP32 VIN/5V, 5 V rail (+1000 uF)
                             ├──> MT3608 #2 set to 12 V  ──> NPK sensor (only if fitted)
                             └──> 100k ──┬── 100k ──> GND
                                         └──> GPIO35 (+100 nF to GND)

ESP32 3V3 pin ──> 3.3 V rail: moisture, DS18B20, DHT22/SHT31, INA219, MAX485, level shifter LV
```

- **Charger:** the CN3791 is an MPPT charger made for 6 V panels, so use it with a 6 V panel. Do not connect a 6 V panel straight to a TP4056: its open-circuit voltage (about 7 – 7.5 V) is close to the TP4056 absolute maximum of 8 V. A TP4056 (with protection, ₹30 – 50) is fine only with a 5 V panel or behind a 5 V regulator.
- **Battery:** cells in parallel (1S) at 3.0 – 4.2 V. Use the protection board, or protected cells, so the battery cannot be drained below about 2.5 V.
- **Boost to 5 V:** set the MT3608 with a multimeter *before* connecting the ESP32 (5.0 – 5.1 V). The DevKit's AMS1117 regulator then makes the 3.3 V. Do not feed the raw 3.7 V battery into `VIN`, because the AMS1117 needs at least about 4.4 V.
- **Brownouts:** WiFi transmit peaks (about 300 mA) and the relay coil can pull the rail down. Put a 1000 µF capacitor across 5 V/GND next to the ESP32.
- **Heat:** Li-ion cells should not be charged above 45 °C, and a box in Indian summer sun can reach 60 °C or more. Mount the box in shade (behind the panel), use a white or light-grey box and add a vented gland.

Power budget (approximate, measured at the battery):

| Load | Current |
|---|---|
| ESP32 on WiFi (modem sleep, 60 s reports) through boost and regulator | 50 – 80 mA |
| 3.3 V / 5 V sensors, level shifter, PZEM TTL side | 20 – 35 mA |
| NPK sensor on 12 V boost | 60 – 120 mA |
| Relay coil, only while the pump runs | 90 – 110 mA |

Without NPK the node uses about 2 – 3 Ah per day, which a 6 V 6 W panel (about 3 – 5 Ah per sunny day) covers. Two cells (about 5.5 Ah) give roughly two cloudy days. With the NPK sensor powered all the time, use a 10 W panel and 3 cells.

If the pump house has reliable mains, a 5 V 2 A adapter into the 5 V rail can replace the solar parts. Keep a battery anyway so the node rides through power cuts and does not reboot.

---

## 4. Pump relay and starter safety

> **Warning:** pump starters run at 230 V or 415 V AC, which can kill. Get a licensed electrician to do all mains wiring. Switch off and lock the main isolator before anyone opens the starter.

- **Never switch the motor with the relay module.** A 10 A relay module cannot carry a pump motor's starting current (5 – 7 times the running current), its contacts will weld, and it provides no overload protection. The relay only **replaces the push of the START button**, by switching the *coil* of the existing starter's contactor. The contactor switches the motor.
- **Keep every protection device:** overload relay, single-phasing preventer, dry-run relay, MCB/fuse and earth. The relay contact goes *in series with* them, not around them.
- **Typical DOL starter integration** (the electrician adapts it to your starter): add an **AUTO / MANUAL selector switch**. In MANUAL the starter works exactly as before. In AUTO the relay's COM–NO contact feeds the contactor coil through the STOP button and the overload relay's NC contact (95-96), and the hold-in (13-14) contact is not used. The contactor stays energised only while AgriGuard holds the relay ON, so an ESP32 failsafe or reboot always stops the motor.
- **Check the coil voltage.** Many 3-phase starters use a **415 V** coil, and the relay module is rated only 250 VAC. In that case use an interposing relay or contactor with a 230 V AC coil (or a 24 V control circuit) rated for the job, or have the coil changed.
- **Suppress switching noise:** put an RC snubber (100 Ω + 0.1 µF X2) or a MOV across the contactor coil. Noise from the coil is the most common cause of random ESP32 resets.
- **Plan for power returning after a cut:** if the grid returns while the relay is still ON (within the commanded `runSeconds`), the motor restarts straight away. For submersible pumps, ask the electrician about a restart-delay timer (about 3 minutes).
- **Keep high and low voltage apart:** mount the relay module in the starter panel or in a separate compartment. Do not run 230 V wires next to sensor wiring. Use lugs, 1.5 mm² wire and proper glands. For best isolation, remove the relay module's JD-VCC jumper and feed the coil side from its own 5 V supply.
- **Bench-test first:** before connecting to the starter, check the relay contacts with a multimeter in continuity mode while you send commands from the app.

---

## 5. Arduino IDE setup

1. Install **Arduino IDE 2.x** from arduino.cc.
2. **Boards Manager** → search `esp32` → install **esp32 by Espressif Systems**, version **3.0.0 or newer**. Core 2.x will not compile this sketch because the watchdog API changed. If the core is not listed, add `https://espressif.github.io/arduino-esp32/package_esp32_index.json` under *File → Preferences → Additional boards manager URLs*.
3. **Library Manager** → install the libraries below. Install only the ones whose flag is `1`. When asked to install dependencies, choose "Install all".

| Library Manager name | Author | Needed when |
|---|---|---|
| **ArduinoJson** (7.x) | Benoit Blanchon | Always |
| **OneWire** (2.3.8 or newer) | Paul Stoffregen | `ENABLE_DS18B20`. Older versions do not compile on ESP32 core 3.x |
| **DallasTemperature** | Miles Burton | `ENABLE_DS18B20` |
| **DHT sensor library** | Adafruit | `ENABLE_DHT22`, plus its dependency **Adafruit Unified Sensor** |
| **Adafruit SHT31 Library** | Adafruit | `ENABLE_SHT31`, plus **Adafruit BusIO** |
| **Adafruit INA219** | Adafruit | `ENABLE_INA219`, plus **Adafruit BusIO** |
| **PZEM-004T-v30** | Jakub Mandula | `ENABLE_PZEM` |

   `WiFi`, `HTTPClient`, `WiFiClientSecure`, `Preferences` and `Wire` come with the ESP32 core.

4. Open `agriguard-node/agriguard-node.ino`. The folder name must stay `agriguard-node`.
5. *Tools* settings:
   - Board: **ESP32 Dev Module**
   - Upload Speed: 921600 (use 115200 if uploads fail)
   - Partition Scheme: *Default 4MB with spiffs*. If you get "Sketch too big", choose *Minimal SPIFFS (1.9MB APP with OTA)*
   - **Erase All Flash Before Sketch Upload: Disabled**. Enabling it wipes the saved flow total
   - Port: the COM port of the board. Install the CP210x or CH340 driver if no port appears
6. Copy `config.example.h` to `config.h`, edit it, then Upload and open *Serial Monitor* at **115200** baud.

---

## 6. Register the device in the AgriGuard app

1. Sign in to the AgriGuard web app and open the **farm → field** where the node will be installed.
2. Go to **Devices → Add device**. Give it a name such as "North plot node".
3. Tick the hardware that matches your feature flags: **flow meter**, **energy meter**, **tank sensor**, **solar**.
4. If you fitted a tank sensor, enter the **tank height in cm** (use `TANK_EMPTY_CM`, the distance from the sensor face to the water at the empty level), the **tank capacity in litres** and the **dry-run level %**.
5. Save. The app shows the **device key**. Copy it into `DEVICE_KEY` in `config.h`.
6. Treat the key like a password: anyone who has it can post data as this node and receive its pump commands. If it leaks, delete the device and add it again to get a new key.
7. Choose the pump mode (Auto or Manual) in the app. The node simply follows whatever the server returns.

For local testing, run the backend on your laptop and set `API_BASE_URL` to `http://<laptop-LAN-IP>:5000`. Find the IP with `ipconfig` (Windows) or `ip addr` (Linux/macOS). The laptop and the ESP32 must be on the same 2.4 GHz network.

You can simulate the node without hardware:

```bash
curl -X POST http://localhost:5000/api/device/telemetry \
  -H "Content-Type: application/json" -H "X-Device-Key: YOUR_KEY" \
  -d '{"soilMoisture":21.5,"soilTemp":27.1,"airTemp":31.4,"humidity":58,"flowTotalL":1520.4,"flowRateLpm":0,"tankDistanceCm":132.4,"batteryPct":81,"rssi":-63,"pumpOn":false,"firmware":"agriguard-node/1.0.0","uptimeSec":3600}'
```

---

## 7. Sensor calibration

Set `#define CALIBRATION_MODE 1`, then upload. The node prints one `[cal]` line every 3 s with raw values. WiFi and the pump stay off in this mode. Set it back to `0` when you are done.

### Capacitive soil moisture → volumetric water content (%)

The firmware averages 10 ADC samples and maps them linearly: `SOIL_RAW_DRY → SOIL_VWC_DRY (5 %)` and `SOIL_RAW_WET → SOIL_VWC_WET (45 %)`. The raw value *falls* as the soil gets wetter.

1. Take about 1 kg of soil from the field at root depth. Dry it in the sun for 2 – 3 days (or in an oven at 105 °C for 24 h), and pack it into a container at about field firmness.
2. Push the probe in up to the marked line; the electronics must stay above the soil. Wait 1 minute and note the average `soilRaw`. That is **`SOIL_RAW_DRY`**.
3. Add water slowly until the soil is saturated and water starts to pond. Let it drain for 30 minutes, then note `soilRaw` again. That is **`SOIL_RAW_WET`**.
4. Keep `SOIL_VWC_DRY 5.0`. Set `SOIL_VWC_WET` to your soil's saturation: about 35 – 40 for sandy soil, 45 for loam, 50 for clay.
5. Quick demo alternative: probe in air = dry, probe in a glass of water = wet. This gives a working display, but the percentages are not accurate for soil.

Always insert the probe to the same depth. Seal the top electronics with heat-shrink or conformal coating (nail polish works). Readings drift with temperature and salinity, so recalibrate each season.

### Flow meter pulses per litre

1. In calibration mode, note `flowPulses`.
2. Fill a container of known volume (for example a 20 L can marked with a measuring jug) at your normal operating flow.
3. `FLOW_PULSES_PER_LITRE = (pulses after − pulses before) / litres`. Repeat 3 times and average.

Nominal values: YF-S201 about 450 pulses/L (F = 7.5 × Q). For other sensors, check the datasheet. Examples: YF-DN40 F = 0.45 × Q → 27 pulses/L; YF-DN50 F = 0.2 × Q → 12 pulses/L. Always do the bucket test.

The cumulative total is saved to flash every `FLOW_SAVE_INTERVAL_S` (5 min) and whenever the pump stops, so it survives reboots. A reset can lose up to 5 minutes of counting.

### Tank / sump level (JSN-SR04T)

1. Mount the probe pointing straight down, near the centre of the tank, away from walls, the inlet and ladders. Its face must stay at least 25 cm above the highest water level (blind zone).
2. With the tank empty, or by measuring down to the bottom with a tape, note `tank=` → **`TANK_EMPTY_CM`**. Enter the same value as the tank height in the app.
3. With the tank full, note it again → **`TANK_FULL_CM`**.
4. The node reports the raw distance (`tankDistanceCm`, median of 5 readings, temperature-compensated when an air sensor is fitted). The backend converts it to level and litres. The serial log also prints an approximate % for checking.

### Battery voltage

Measure the battery with a multimeter and compare it to the `battery=` value. Set `BATTERY_CORRECTION = multimeter / reported` (typically 0.95 – 1.05). The percentage comes from a resting Li-ion curve, so it reads a little high while the battery is charging.

### NPK sensor

- Default settings match the common JXCT 3-in-1 sensor: address `0x01`, 4800 baud, N/P/K in registers `0x1E`/`0x1F`/`0x20`. Many 7-in-1 sensors use `0x04`/`0x05`/`0x06`. Always check the register table from your seller, and set `NPK_SCALE` if the values need scaling.
- Push the probe fully into moist soil. Readings in dry soil or air are meaningless. Compare once with a soil lab test (Soil Health Card) and treat the sensor as a trend indicator.

### Energy meter (PZEM-004T)

The PZEM keeps its kWh counter in its own memory. For a balanced 3-phase motor measured on one phase, set `ENERGY_PHASE_MULTIPLIER 3.0`. This is an approximation; use one PZEM per phase for accurate figures.

---

## 8. How the node behaves

- **Reporting:** every `REPORT_INTERVAL_S` (60 s, or the server's `reportEverySeconds`, clamped to 10 – 3600 s). While the pump runs it reports every 15 s. After a failed report it retries after 15 s. It also reports immediately after WiFi connects and after any local pump shut-off.
- **Payload:** only the fields of fitted, working sensors are sent. A sensor that fails to read is left out, never sent as 0.
- **Pump ON:** the relay closes and a local countdown of `runSeconds` starts, clamped to `MAX_RUN_S`. Every new ON restarts the countdown. When the countdown ends the pump switches off, even if the server is unreachable. An ON with a missing or zero `runSeconds` is treated as OFF.
- **Pump OFF:** the relay opens immediately.
- **Failsafe:** if no successful server response arrives for `FAILSAFE_S` (600 s), the pump is forced OFF.
- **Boot:** the relay always starts OFF. The server re-commands it if needed.
- **Watchdog:** if `loop()` stalls for `WDT_TIMEOUT_S` (60 s) the board reboots, which also switches the pump off. The reset reason is printed at boot.
- **Status LED (GPIO2):** fast blink = no WiFi, slow blink = WiFi up but server failing, solid = last report OK.

Sample serial log:

```
[boot] agriguard-node/1.0.0, reset reason: power-on
[pump] relay on GPIO32 (active-low), starting OFF
[wdt] watchdog armed, 60 s
[wifi] connected, IP 192.168.1.77, RSSI -61 dBm
[tank] 132.4 cm, about 53% full
[report] POST http://192.168.1.50:5000/api/device/telemetry
[report] {"airTemp":31.4,"humidity":58,"soilMoisture":17.2,...}
[report] OK: pump=ON runSeconds=900 reason="soil below 18%" serverTime=2026-09-26T06:30:00.000Z
[pump] switched ON (soil below 18%)
[pump] ON, local countdown 900 s
```

---

## 9. Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| `config.h not found` when compiling | Copy `config.example.h` to `config.h` in the sketch folder |
| `esp_task_wdt_config_t` does not name a type | ESP32 core 2.x is installed. Update to **esp32 by Espressif 3.x** |
| OneWire compile errors (`rtc_gpio_desc`, `GPIO.out_w1ts`) | Update **OneWire** to 2.3.8 or newer |
| "Sketch too big" | Partition Scheme → *Minimal SPIFFS (1.9MB APP with OTA)* |
| "Failed to connect to ESP32" on upload | Use a data (not charge-only) USB cable and install the CP210x/CH340 driver. Hold **BOOT** when "Connecting…" appears |
| WiFi never connects (status 1 = SSID not found, 4 = failed, 6 = disconnected) | ESP32 supports 2.4 GHz only; turn on 2.4 GHz on a dual-band router or phone hotspot. Check SSID and password case. Move closer, or use an external-antenna board |
| `request failed: connection refused` | Backend not reachable from the LAN. It must listen on `0.0.0.0`, not `localhost`. Allow port 5000 in Windows Defender Firewall (inbound TCP rule). Check that the laptop IP has not changed. Phone hotspots sometimes block device-to-device traffic |
| `request failed: read Timeout` | Server slow or overloaded. Check the backend logs |
| HTTP 401 / 403 | Wrong `DEVICE_KEY`, or the device was deleted in the app |
| HTTP 404 | `API_BASE_URL` must be only the base (`http://ip:5000`), without `/api` |
| HTTPS fails, works with HTTP | With `TLS_VERIFY_SERVER 1`, `ROOT_CA_PEM` must be the **root** certificate of your host's chain (for example ISRG Root X1 for Let's Encrypt). Export it from the browser padlock → certificate → root → Base64 PEM. Test with `TLS_VERIFY_SERVER 0` first |
| `soilMoisture` missing, or stuck at one value | Sensor on an ADC2 pin (use GPIO32 – 39). Loose AOUT wire. Some v1.2 clones are faulty (wrong timer chip, missing resistor): check `soilRaw` in air and in water, and replace the sensor if it does not change |
| Soil moisture always 0 % or 100 % | Calibration swapped or wrong. Redo [calibration](#capacitive-soil-moisture--volumetric-water-content-) |
| `soilTemp` missing | 4.7 kΩ pull-up missing (reads −127), or wiring wrong. A value of exactly 85 °C is the power-on value and is rejected; check the power wiring |
| `airTemp`/`humidity` missing | DHT22 needs a pull-up and 3.3 V, with a cable under 5 m. For SHT31, check SDA/SCL and address 0x44 |
| `[npk] no valid reply` | A/B swapped, wrong baud (try 9600), wrong address or register map, sensor not powered at 12 V, or GND not common. Check the DE/RE wire to GPIO18. The probe must be in soil |
| `energyTotalKwh`/`powerW` missing | The PZEM only answers when its AC voltage terminals are live. Wire L/N to the **supply side** of the contactor so it still answers (0 W) when the pump is off. Check that TX and RX are crossed through the level shifter |
| Flow always 0 | Level shifter channel wrong. Sensor fitted against the arrow. Flow below the sensor minimum (YF-S201 needs more than 1 L/min). Water must fill the pipe |
| Flow counts when no water moves | Electrical noise on a long cable. Use shielded cable, keep it away from motor cables, and add 100 nF from GPIO13 to GND |
| Flow total reset to 0 after upload | "Erase All Flash Before Sketch Upload" was enabled |
| `tankDistanceCm` missing | Water closer than 20 – 25 cm (blind zone), echo not level-shifted, probe tilted, or the water surface is foamy or turbulent. JSN-SR04T v3 must be in its default mode (no mode resistor fitted) |
| `solarW`/`solarV` missing | INA219 not found at boot (see `[ina219]` line). Check SDA/SCL, 3V3 and GND |
| Battery % wrong | Set `BATTERY_CORRECTION`. Check the divider ratio (100 k/100 k → 2.0) and the 100 nF capacitor |
| Relay clicks the wrong way (on at boot, off when commanded ON) | Flip `RELAY_ACTIVE_LOW` |
| Relay LED lights but the relay does not switch, or it never releases | 5 V relay modules can be marginal with 3.3 V logic. Remove the JD-VCC jumper and power the coil side from 5 V, or use a 3.3 V-compatible module |
| Board resets when the pump starts or stops (`reset reason: brownout`, or `crash/panic`) | Add the 1000 µF capacitor, fit an RC snubber or MOV across the contactor coil, separate the mains and sensor wiring, and check the 5 V boost output under load |
| `reset reason: task watchdog` | Something blocked `loop()` for 60 s, usually a network hang. Check the WiFi signal. Raise `WDT_TIMEOUT_S` if the server is very slow |
| Pump stops after about 10 minutes | This is the failsafe: the node got no good server response for `FAILSAFE_S`. Check WiFi, the backend and the device key |
| Pump stops early | Its `runSeconds` countdown ran out. The server must send a new ON with more `runSeconds` to keep it running |
