#pragma once

// Copy this file to config.h (same folder) and edit it. config.h holds secrets; do not commit it.

// ---- Network ----
#define WIFI_SSID "YourWiFiName"
#define WIFI_PASSWORD "YourWiFiPassword"

// Local test: "http://<laptop-LAN-IP>:5000" (no trailing slash). Production: "https://api.yourdomain.in"
#define API_BASE_URL "http://192.168.1.50:5000"

// From the AgriGuard app: Field -> Devices -> Add device
#define DEVICE_KEY "paste-your-device-key-here"

// HTTPS only.
// 0 = encrypt but skip certificate verification (setInsecure). Hackathon/demo only: anyone on the
//     network path could impersonate the server and switch your pump.
// 1 = verify the server against ROOT_CA_PEM below (recommended for real deployments).
#define TLS_VERIFY_SERVER 0
static const char ROOT_CA_PEM[] = R"PEM(
-----BEGIN CERTIFICATE-----
paste the root CA of your server's certificate chain here
-----END CERTIFICATE-----
)PEM";

// ---- Timing (seconds) ----
#define REPORT_INTERVAL_S 60        // normal telemetry interval; the server can override it
#define PUMP_REPORT_INTERVAL_S 15   // interval while the pump is running
#define RETRY_INTERVAL_S 15         // retry delay after a failed report
#define FAILSAFE_S 600              // pump forced OFF after this long without a good server response
#define MAX_RUN_S 7200              // upper clamp for a single runSeconds command
#define FLOW_SAVE_INTERVAL_S 300    // how often the flow total is written to flash
#define WDT_TIMEOUT_S 60            // watchdog reboots the board if loop() stalls this long

// 1 = print raw sensor values every 3 s for calibration; no WiFi, no reports, pump stays OFF
#define CALIBRATION_MODE 0

// ---- Feature flags (1 = fitted, 0 = not fitted; libraries for disabled sensors are not needed) ----
#define ENABLE_SOIL_MOISTURE 1
#define ENABLE_DS18B20 1
#define ENABLE_DHT22 1
#define ENABLE_SHT31 0              // alternative to DHT22; enable only one of the two
#define ENABLE_NPK 1
#define ENABLE_FLOW 1
#define ENABLE_PZEM 1
#define ENABLE_TANK_LEVEL 1
#define ENABLE_INA219 1
#define ENABLE_BATTERY 1
#define ENABLE_PUMP_RELAY 1

// ---- Pins (ESP32 DevKit V1 / ESP32-WROOM-32) ----
#define SOIL_MOISTURE_PIN 34        // must be an ADC1 pin (32-39); ADC2 does not work with WiFi on
#define BATTERY_PIN 35              // ADC1, via 100k/100k divider
#define DS18B20_PIN 4
#define DHT_PIN 27
#define I2C_SDA_PIN 21              // INA219 and SHT31
#define I2C_SCL_PIN 22
#define RS485_RX_PIN 16             // Serial2 RX <- MAX485 RO
#define RS485_TX_PIN 17             // Serial2 TX -> MAX485 DI
#define RS485_DE_PIN 18             // MAX485 DE+RE tied together; -1 for auto-direction modules
#define PZEM_RX_PIN 25              // Serial1 RX <- PZEM TX
#define PZEM_TX_PIN 26              // Serial1 TX -> PZEM RX
#define FLOW_PIN 13
#define TANK_TRIG_PIN 23
#define TANK_ECHO_PIN 19
#define RELAY_PIN 32
#define RELAY_ACTIVE_LOW 1          // most opto relay modules switch ON when IN is pulled LOW
#define STATUS_LED_PIN 2            // onboard LED; -1 to disable

// ---- Soil moisture calibration (see README) ----
#define SOIL_RAW_DRY 3000           // averaged raw ADC in dry soil
#define SOIL_RAW_WET 1300           // averaged raw ADC in saturated soil
#define SOIL_VWC_DRY 5.0            // volumetric water content % assigned to SOIL_RAW_DRY
#define SOIL_VWC_WET 45.0           // volumetric water content % assigned to SOIL_RAW_WET
#define SOIL_SAMPLES 10

// ---- NPK sensor (RS485 Modbus RTU) ----
#define NPK_MODBUS_ADDRESS 0x01
#define NPK_BAUD 4800               // most JXCT-type sensors ship at 4800; some at 9600
#define NPK_REG_NITROGEN 0x001E     // 3-in-1 JXCT map; common 7-in-1 map is N=0x0004, P=0x0005, K=0x0006
#define NPK_REG_PHOSPHORUS 0x001F
#define NPK_REG_POTASSIUM 0x0020
#define NPK_SCALE 1.0               // multiply raw register value to get mg/kg
#define NPK_TIMEOUT_MS 300

// ---- Flow meter ----
#define FLOW_PULSES_PER_LITRE 450.0 // YF-S201 nominal; calibrate with a bucket test

// ---- Energy meter ----
#define ENERGY_PHASE_MULTIPLIER 1.0 // 3.0 when one PZEM measures one phase of a balanced 3-phase motor

// ---- Tank / sump level (distances from the sensor face, cm) ----
#define TANK_EMPTY_CM 250.0         // distance to the water when the tank is empty (also enter in the app)
#define TANK_FULL_CM 30.0           // distance to the water when the tank is full (keep > 25 cm blind zone)
#define TANK_MIN_VALID_CM 20.0
#define TANK_MAX_VALID_CM 600.0

// ---- Battery ----
#define BATTERY_DIVIDER_RATIO 2.0   // (R1 + R2) / R2; 100k/100k = 2.0
#define BATTERY_CORRECTION 1.0      // multimeter reading / reported voltage
