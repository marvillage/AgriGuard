#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <esp_task_wdt.h>
#include <esp_system.h>
#include <esp_timer.h>

#if __has_include("config.h")
#include "config.h"
#else
#error "config.h not found: copy config.example.h to config.h in this folder and edit it"
#endif

#if ENABLE_DHT22 && ENABLE_SHT31
#error "Enable only one air sensor: ENABLE_DHT22 or ENABLE_SHT31"
#endif

static_assert(SOIL_RAW_DRY != SOIL_RAW_WET, "SOIL_RAW_DRY and SOIL_RAW_WET must differ");

#if ENABLE_DS18B20
#include <OneWire.h>
#include <DallasTemperature.h>
#endif

#if ENABLE_DHT22
#include <DHT.h>
#endif

#if ENABLE_SHT31 || ENABLE_INA219
#include <Wire.h>
#endif

#if ENABLE_SHT31
#include <Adafruit_SHT31.h>
#endif

#if ENABLE_INA219
#include <Adafruit_INA219.h>
#endif

#if ENABLE_PZEM
#include <PZEM004Tv30.h>
#endif

#define FIRMWARE_VERSION "agriguard-node/1.0.0"

const uint32_t FLOW_SAMPLE_MS = 5000;
const uint32_t WIFI_RETRY_MS = 30000;
const uint32_t CALIBRATION_PRINT_MS = 3000;
const int32_t HTTP_CONNECT_TIMEOUT_MS = 8000;
const uint16_t HTTP_TIMEOUT_MS = 10000;
const unsigned long TLS_HANDSHAKE_TIMEOUT_S = 15;
const uint32_t MIN_REPORT_INTERVAL_S = 10;
const uint32_t MAX_REPORT_INTERVAL_S = 3600;

const float BATTERY_CURVE_V[] = {3.00f, 3.40f, 3.55f, 3.65f, 3.70f, 3.75f, 3.80f, 3.85f, 3.92f, 4.00f, 4.10f, 4.20f};
const float BATTERY_CURVE_PCT[] = {0.0f, 5.0f, 10.0f, 20.0f, 30.0f, 40.0f, 50.0f, 60.0f, 70.0f, 80.0f, 90.0f, 100.0f};

Preferences prefs;
WiFiClient plainClient;
WiFiClientSecure secureClient;
String telemetryUrl;
bool useHttps = false;

uint32_t reportIntervalS = REPORT_INTERVAL_S;
uint32_t lastReportMs = 0;
bool lastReportOk = false;
bool reportNow = true;
bool serverContact = false;
uint32_t lastServerOkMs = 0;

bool wifiWasConnected = false;
uint32_t lastWifiAttemptMs = 0;

bool pumpOn = false;
uint32_t pumpCommandMs = 0;
uint32_t pumpAllowedMs = 0;

volatile uint32_t flowPulseCount = 0;
portMUX_TYPE flowMux = portMUX_INITIALIZER_UNLOCKED;
uint32_t flowSampleMs = 0;
uint32_t flowPulsesSinceBoot = 0;
double flowTotalLitres = 0.0;
float flowRateLpm = 0.0f;
bool flowDirty = false;
uint32_t lastFlowSaveMs = 0;

#if ENABLE_DS18B20
OneWire oneWire(DS18B20_PIN);
DallasTemperature soilTempSensor(&oneWire);
#endif

#if ENABLE_DHT22
DHT dht(DHT_PIN, DHT22);
#endif

#if ENABLE_SHT31
Adafruit_SHT31 sht31;
bool sht31Ready = false;
#endif

#if ENABLE_INA219
Adafruit_INA219 ina219;
bool ina219Ready = false;
#endif

#if ENABLE_PZEM
PZEM004Tv30* pzem = nullptr;
#endif

void IRAM_ATTR onFlowPulse() {
  portENTER_CRITICAL_ISR(&flowMux);
  flowPulseCount = flowPulseCount + 1;
  portEXIT_CRITICAL_ISR(&flowMux);
}

const char* resetReasonText(esp_reset_reason_t reason) {
  switch (reason) {
    case ESP_RST_POWERON: return "power-on";
    case ESP_RST_EXT: return "external pin";
    case ESP_RST_SW: return "software restart";
    case ESP_RST_PANIC: return "crash/panic";
    case ESP_RST_INT_WDT: return "interrupt watchdog";
    case ESP_RST_TASK_WDT: return "task watchdog";
    case ESP_RST_WDT: return "other watchdog";
    case ESP_RST_DEEPSLEEP: return "deep sleep wake";
    case ESP_RST_BROWNOUT: return "brownout (weak power supply)";
    default: return "unknown";
  }
}

void setupWatchdog() {
  esp_task_wdt_config_t wdtConfig = {};
  wdtConfig.timeout_ms = WDT_TIMEOUT_S * 1000;
  wdtConfig.idle_core_mask = 0;
  wdtConfig.trigger_panic = true;
  esp_err_t err = esp_task_wdt_reconfigure(&wdtConfig);
  if (err == ESP_ERR_INVALID_STATE) {
    err = esp_task_wdt_init(&wdtConfig);
  }
  if (err == ESP_OK) {
    err = esp_task_wdt_add(NULL);
  }
  if (err == ESP_OK) {
    Serial.printf("[wdt] watchdog armed, %d s\n", WDT_TIMEOUT_S);
  } else {
    Serial.printf("[wdt] setup failed: %s\n", esp_err_to_name(err));
  }
}

uint8_t relayLevel(bool on) {
#if RELAY_ACTIVE_LOW
  return on ? LOW : HIGH;
#else
  return on ? HIGH : LOW;
#endif
}

void setupRelay() {
#if ENABLE_PUMP_RELAY
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, relayLevel(false));
  Serial.printf("[pump] relay on GPIO%d (%s), starting OFF\n", RELAY_PIN, RELAY_ACTIVE_LOW ? "active-low" : "active-high");
#endif
}

void setupStatusLed() {
#if STATUS_LED_PIN >= 0
  pinMode(STATUS_LED_PIN, OUTPUT);
  digitalWrite(STATUS_LED_PIN, LOW);
#endif
}

void printFeatures() {
  Serial.print("[boot] features:");
#if ENABLE_SOIL_MOISTURE
  Serial.print(" soil-moisture");
#endif
#if ENABLE_DS18B20
  Serial.print(" ds18b20");
#endif
#if ENABLE_DHT22
  Serial.print(" dht22");
#endif
#if ENABLE_SHT31
  Serial.print(" sht31");
#endif
#if ENABLE_NPK
  Serial.print(" npk");
#endif
#if ENABLE_FLOW
  Serial.print(" flow");
#endif
#if ENABLE_PZEM
  Serial.print(" pzem");
#endif
#if ENABLE_TANK_LEVEL
  Serial.print(" tank");
#endif
#if ENABLE_INA219
  Serial.print(" ina219");
#endif
#if ENABLE_BATTERY
  Serial.print(" battery");
#endif
#if ENABLE_PUMP_RELAY
  Serial.print(" relay");
#endif
  Serial.println();
}

void setupSensors() {
#if ENABLE_SOIL_MOISTURE || ENABLE_BATTERY
  analogReadResolution(12);
#endif

#if ENABLE_DS18B20
  soilTempSensor.begin();
  Serial.printf("[ds18b20] %d sensor(s) found on GPIO%d\n", soilTempSensor.getDeviceCount(), DS18B20_PIN);
#endif

#if ENABLE_DHT22
  dht.begin();
#endif

#if ENABLE_SHT31 || ENABLE_INA219
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
#endif

#if ENABLE_SHT31
  sht31Ready = sht31.begin(0x44);
  Serial.printf("[sht31] %s\n", sht31Ready ? "found at 0x44" : "NOT found, check SDA/SCL wiring");
#endif

#if ENABLE_INA219
  ina219Ready = ina219.begin();
  Serial.printf("[ina219] %s\n", ina219Ready ? "found at 0x40" : "NOT found, check SDA/SCL wiring");
#endif

#if ENABLE_NPK
  Serial2.begin(NPK_BAUD, SERIAL_8N1, RS485_RX_PIN, RS485_TX_PIN);
#if RS485_DE_PIN >= 0
  pinMode(RS485_DE_PIN, OUTPUT);
  digitalWrite(RS485_DE_PIN, LOW);
#endif
  Serial.printf("[npk] RS485 on Serial2, %d baud, address 0x%02X\n", NPK_BAUD, NPK_MODBUS_ADDRESS);
#endif

#if ENABLE_PZEM
  pzem = new PZEM004Tv30(Serial1, PZEM_RX_PIN, PZEM_TX_PIN);
  Serial.println("[pzem] PZEM-004T on Serial1");
#endif

#if ENABLE_TANK_LEVEL
  pinMode(TANK_TRIG_PIN, OUTPUT);
  digitalWrite(TANK_TRIG_PIN, LOW);
  pinMode(TANK_ECHO_PIN, INPUT);
#endif

#if ENABLE_FLOW
  flowTotalLitres = prefs.isKey("flowTotalL") ? prefs.getDouble("flowTotalL", 0.0) : 0.0;
  pinMode(FLOW_PIN, INPUT);
  attachInterrupt(digitalPinToInterrupt(FLOW_PIN), onFlowPulse, FALLING);
  flowSampleMs = millis();
  lastFlowSaveMs = millis();
  Serial.printf("[flow] restored total %.2f L, %.1f pulses/L\n", flowTotalLitres, (double)FLOW_PULSES_PER_LITRE);
#endif
}

void setupNetwork() {
  String base = API_BASE_URL;
  base.trim();
  while (base.endsWith("/")) {
    base.remove(base.length() - 1);
  }
  telemetryUrl = base + "/api/device/telemetry";
  String lower = base;
  lower.toLowerCase();
  useHttps = lower.startsWith("https://");

  if (useHttps) {
#if TLS_VERIFY_SERVER
    secureClient.setCACert(ROOT_CA_PEM);
    Serial.println("[tls] HTTPS with certificate verification");
#else
    secureClient.setInsecure();
    Serial.println("[tls] HTTPS WITHOUT certificate verification (TLS_VERIFY_SERVER 0, demo only)");
#endif
    secureClient.setHandshakeTimeout(TLS_HANDSHAKE_TIMEOUT_S);
  }
  Serial.printf("[net] telemetry endpoint %s\n", telemetryUrl.c_str());

  WiFi.persistent(false);
  WiFi.setHostname("agriguard-node");
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  lastWifiAttemptMs = millis();
  Serial.printf("[wifi] connecting to \"%s\"\n", WIFI_SSID);
}

void maintainWifi() {
  uint32_t now = millis();
  bool connected = WiFi.status() == WL_CONNECTED;
  if (connected && !wifiWasConnected) {
    Serial.printf("[wifi] connected, IP %s, RSSI %d dBm\n", WiFi.localIP().toString().c_str(), WiFi.RSSI());
    reportNow = true;
  } else if (!connected && wifiWasConnected) {
    Serial.println("[wifi] connection lost");
    lastWifiAttemptMs = now;
  }
  wifiWasConnected = connected;

  if (!connected && now - lastWifiAttemptMs >= WIFI_RETRY_MS) {
    lastWifiAttemptMs = now;
    Serial.printf("[wifi] still offline (status %d), retrying\n", (int)WiFi.status());
    WiFi.disconnect();
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  }
}

void updateFlow() {
#if ENABLE_FLOW
  uint32_t now = millis();
  uint32_t elapsed = now - flowSampleMs;
  if (elapsed < FLOW_SAMPLE_MS) {
    return;
  }
  flowSampleMs = now;

  portENTER_CRITICAL(&flowMux);
  uint32_t pulses = flowPulseCount;
  flowPulseCount = 0;
  portEXIT_CRITICAL(&flowMux);

  double litres = pulses / (double)FLOW_PULSES_PER_LITRE;
  flowPulsesSinceBoot += pulses;
  flowTotalLitres += litres;
  flowRateLpm = (float)(litres * 60000.0 / elapsed);
  if (pulses > 0) {
    flowDirty = true;
  }
#endif
}

void saveFlowTotal() {
#if ENABLE_FLOW
  if (!flowDirty) {
    return;
  }
  prefs.putDouble("flowTotalL", flowTotalLitres);
  flowDirty = false;
  lastFlowSaveMs = millis();
  Serial.printf("[flow] total %.2f L saved to flash\n", flowTotalLitres);
#endif
}

void persistFlowPeriodically() {
  if (millis() - lastFlowSaveMs >= FLOW_SAVE_INTERVAL_S * 1000UL) {
    saveFlowTotal();
  }
}

void setPump(bool on, const char* why) {
  if (on == pumpOn) {
    return;
  }
  pumpOn = on;
#if ENABLE_PUMP_RELAY
  digitalWrite(RELAY_PIN, relayLevel(on));
#endif
  Serial.printf("[pump] switched %s (%s)\n", on ? "ON" : "OFF", why);
  if (!on) {
    saveFlowTotal();
  }
}

void enforcePumpSafety() {
  if (!pumpOn) {
    return;
  }
  uint32_t now = millis();
  if (now - pumpCommandMs >= pumpAllowedMs) {
    setPump(false, "run time elapsed");
    reportNow = true;
  } else if (!serverContact || now - lastServerOkMs >= FAILSAFE_S * 1000UL) {
    setPump(false, "FAILSAFE: no server response");
    reportNow = true;
  }
}

void applyPumpCommand(const char* command, float runSeconds, const char* reason) {
#if ENABLE_PUMP_RELAY
  if (strcasecmp(command, "ON") == 0) {
    if (runSeconds < 1.0f) {
      Serial.println("[pump] ON without a positive runSeconds, keeping pump OFF");
      setPump(false, "ON without runSeconds");
      return;
    }
    uint32_t seconds = runSeconds > MAX_RUN_S ? (uint32_t)MAX_RUN_S : (uint32_t)runSeconds;
    pumpCommandMs = millis();
    pumpAllowedMs = seconds * 1000UL;
    setPump(true, reason);
    Serial.printf("[pump] ON, local countdown %lu s\n", (unsigned long)seconds);
  } else if (strcasecmp(command, "OFF") == 0) {
    setPump(false, reason);
  } else {
    Serial.printf("[pump] unknown command \"%s\", ignored\n", command);
  }
#else
  (void)runSeconds;
  (void)reason;
  if (strcasecmp(command, "ON") == 0) {
    Serial.println("[pump] server asked for ON but ENABLE_PUMP_RELAY is 0, ignored");
  }
#endif
}

void applyReportInterval(float seconds) {
  if (seconds < 1.0f) {
    return;
  }
  uint32_t value = (uint32_t)seconds;
  if (value < MIN_REPORT_INTERVAL_S) {
    value = MIN_REPORT_INTERVAL_S;
  }
  if (value > MAX_REPORT_INTERVAL_S) {
    value = MAX_REPORT_INTERVAL_S;
  }
  if (value != reportIntervalS) {
    reportIntervalS = value;
    Serial.printf("[report] server set interval to %lu s\n", (unsigned long)reportIntervalS);
  }
}

float readSoilRaw() {
  uint32_t sum = 0;
  for (int i = 0; i < SOIL_SAMPLES; i++) {
    sum += analogRead(SOIL_MOISTURE_PIN);
    delay(10);
  }
  return sum / (float)SOIL_SAMPLES;
}

float soilRawToVwc(float raw) {
  if (raw < 50.0f || raw > 4090.0f) {
    return NAN;
  }
  float vwc = SOIL_VWC_DRY + (raw - SOIL_RAW_DRY) * (SOIL_VWC_WET - SOIL_VWC_DRY) / (float)(SOIL_RAW_WET - SOIL_RAW_DRY);
  return constrain(vwc, 0.0f, 100.0f);
}

float readSoilTemp() {
#if ENABLE_DS18B20
  soilTempSensor.requestTemperatures();
  float celsius = soilTempSensor.getTempCByIndex(0);
  if (celsius < -55.0f || celsius > 125.0f || celsius == 85.0f) {
    return NAN;
  }
  return celsius;
#else
  return NAN;
#endif
}

void readAir(float& temp, float& humidity) {
  temp = NAN;
  humidity = NAN;
#if ENABLE_DHT22
  temp = dht.readTemperature();
  humidity = dht.readHumidity();
#elif ENABLE_SHT31
  if (sht31Ready) {
    temp = sht31.readTemperature();
    humidity = sht31.readHumidity();
  }
#endif
}

uint16_t modbusCrc(const uint8_t* data, size_t length) {
  uint16_t crc = 0xFFFF;
  for (size_t i = 0; i < length; i++) {
    crc ^= data[i];
    for (int bit = 0; bit < 8; bit++) {
      crc = (crc & 1) ? (crc >> 1) ^ 0xA001 : crc >> 1;
    }
  }
  return crc;
}

void rs485Transmit(bool enable) {
#if RS485_DE_PIN >= 0
  digitalWrite(RS485_DE_PIN, enable ? HIGH : LOW);
#endif
}

bool modbusReadRegister(uint16_t reg, uint16_t& value) {
#if ENABLE_NPK
  uint8_t request[8] = {NPK_MODBUS_ADDRESS, 0x03, (uint8_t)(reg >> 8), (uint8_t)(reg & 0xFF), 0x00, 0x01, 0x00, 0x00};
  uint16_t crc = modbusCrc(request, 6);
  request[6] = crc & 0xFF;
  request[7] = crc >> 8;

  while (Serial2.available()) {
    Serial2.read();
  }
  rs485Transmit(true);
  Serial2.write(request, sizeof(request));
  Serial2.flush();
  rs485Transmit(false);

  uint8_t response[7];
  size_t received = 0;
  uint32_t start = millis();
  while (received < sizeof(response) && millis() - start < NPK_TIMEOUT_MS) {
    if (!Serial2.available()) {
      delay(1);
      continue;
    }
    uint8_t b = Serial2.read();
    if (received == 0 && b != NPK_MODBUS_ADDRESS) {
      continue;  // skip line noise before the frame starts
    }
    response[received++] = b;
  }
  if (received < sizeof(response)) {
    return false;
  }
  uint16_t responseCrc = response[5] | (response[6] << 8);
  if (response[1] != 0x03 || response[2] != 2 || responseCrc != modbusCrc(response, 5)) {
    return false;
  }
  value = (response[3] << 8) | response[4];
  return true;
#else
  (void)reg;
  (void)value;
  return false;
#endif
}

float readNpkValue(uint16_t reg) {
  uint16_t raw = 0;
  for (int attempt = 0; attempt < 2; attempt++) {
    if (modbusReadRegister(reg, raw)) {
      return raw * (float)NPK_SCALE;
    }
    delay(50);
  }
  Serial.printf("[npk] no valid reply for register 0x%04X\n", reg);
  return NAN;
}

void sortFloats(float* values, int count) {
  for (int i = 1; i < count; i++) {
    float key = values[i];
    int j = i - 1;
    while (j >= 0 && values[j] > key) {
      values[j + 1] = values[j];
      j--;
    }
    values[j + 1] = key;
  }
}

float readTankDistance(float airTemp) {
#if ENABLE_TANK_LEVEL
  float celsius = isnan(airTemp) ? 25.0f : airTemp;
  float cmPerUs = (331.3f + 0.606f * celsius) / 10000.0f;
  float samples[5];
  int count = 0;
  for (int i = 0; i < 5; i++) {
    digitalWrite(TANK_TRIG_PIN, LOW);
    delayMicroseconds(5);
    digitalWrite(TANK_TRIG_PIN, HIGH);
    delayMicroseconds(20);
    digitalWrite(TANK_TRIG_PIN, LOW);
    unsigned long echoUs = pulseIn(TANK_ECHO_PIN, HIGH, 40000UL);
    float cm = echoUs * cmPerUs / 2.0f;
    if (echoUs > 0 && cm >= TANK_MIN_VALID_CM && cm <= TANK_MAX_VALID_CM) {
      samples[count++] = cm;
    }
    delay(60);
  }
  if (count < 3) {
    return NAN;
  }
  sortFloats(samples, count);
  if (count % 2 == 1) {
    return samples[count / 2];
  }
  return (samples[count / 2 - 1] + samples[count / 2]) / 2.0f;
#else
  (void)airTemp;
  return NAN;
#endif
}

float tankLevelPct(float distanceCm) {
  if (isnan(distanceCm) || TANK_EMPTY_CM <= TANK_FULL_CM) {
    return NAN;
  }
  float pct = (TANK_EMPTY_CM - distanceCm) / (TANK_EMPTY_CM - TANK_FULL_CM) * 100.0f;
  return constrain(pct, 0.0f, 100.0f);
}

void readSolar(float& watts, float& volts) {
  watts = NAN;
  volts = NAN;
#if ENABLE_INA219
  if (!ina219Ready) {
    return;
  }
  float busV = ina219.getBusVoltage_V();
  float shuntMv = ina219.getShuntVoltage_mV();
  float milliwatts = ina219.getPower_mW();
  volts = busV + shuntMv / 1000.0f;
  watts = milliwatts > 0.0f ? milliwatts / 1000.0f : 0.0f;
#endif
}

float readBatteryVoltage() {
  uint32_t sumMv = 0;
  for (int i = 0; i < 16; i++) {
    sumMv += analogReadMilliVolts(BATTERY_PIN);
    delay(2);
  }
  float volts = sumMv / 16.0f / 1000.0f * BATTERY_DIVIDER_RATIO * BATTERY_CORRECTION;
  return volts < 2.0f ? NAN : volts;
}

float batteryPercent(float volts) {
  const int points = sizeof(BATTERY_CURVE_V) / sizeof(BATTERY_CURVE_V[0]);
  if (isnan(volts)) {
    return NAN;
  }
  if (volts <= BATTERY_CURVE_V[0]) {
    return 0.0f;
  }
  for (int i = 1; i < points; i++) {
    if (volts <= BATTERY_CURVE_V[i]) {
      float fraction = (volts - BATTERY_CURVE_V[i - 1]) / (BATTERY_CURVE_V[i] - BATTERY_CURVE_V[i - 1]);
      return BATTERY_CURVE_PCT[i - 1] + fraction * (BATTERY_CURVE_PCT[i] - BATTERY_CURVE_PCT[i - 1]);
    }
  }
  return 100.0f;
}

void readEnergy(float& watts, float& kwh) {
  watts = NAN;
  kwh = NAN;
#if ENABLE_PZEM
  if (pzem == nullptr) {
    return;
  }
  float power = pzem->power();
  float energy = pzem->energy();
  if (!isnan(power)) {
    watts = power * ENERGY_PHASE_MULTIPLIER;
  }
  if (!isnan(energy)) {
    kwh = energy * ENERGY_PHASE_MULTIPLIER;
  }
#endif
}

void addNumber(JsonDocument& doc, const char* key, double value, int decimals) {
  if (isnan(value)) {
    return;
  }
  double factor = pow(10.0, decimals);
  doc[key] = round(value * factor) / factor;
}

void collectTelemetry(JsonDocument& doc) {
  float airTemp = NAN;
  float humidity = NAN;

#if ENABLE_DHT22 || ENABLE_SHT31
  readAir(airTemp, humidity);
  addNumber(doc, "airTemp", airTemp, 1);
  addNumber(doc, "humidity", humidity, 1);
#endif

#if ENABLE_SOIL_MOISTURE
  addNumber(doc, "soilMoisture", soilRawToVwc(readSoilRaw()), 1);
#endif

#if ENABLE_DS18B20
  addNumber(doc, "soilTemp", readSoilTemp(), 1);
#endif

  esp_task_wdt_reset();

#if ENABLE_NPK
  addNumber(doc, "nitrogen", readNpkValue(NPK_REG_NITROGEN), 1);
  addNumber(doc, "phosphorus", readNpkValue(NPK_REG_PHOSPHORUS), 1);
  addNumber(doc, "potassium", readNpkValue(NPK_REG_POTASSIUM), 1);
  esp_task_wdt_reset();
#endif

#if ENABLE_FLOW
  addNumber(doc, "flowTotalL", flowTotalLitres, 2);
  addNumber(doc, "flowRateLpm", flowRateLpm, 2);
#endif

#if ENABLE_PZEM
  float powerW = NAN;
  float energyKwh = NAN;
  readEnergy(powerW, energyKwh);
  addNumber(doc, "energyTotalKwh", energyKwh, 3);
  addNumber(doc, "powerW", powerW, 1);
#endif

#if ENABLE_TANK_LEVEL
  float tankCm = readTankDistance(airTemp);
  addNumber(doc, "tankDistanceCm", tankCm, 1);
  if (!isnan(tankCm)) {
    Serial.printf("[tank] %.1f cm, about %.0f%% full\n", tankCm, tankLevelPct(tankCm));
  }
#endif

#if ENABLE_INA219
  float solarW = NAN;
  float solarV = NAN;
  readSolar(solarW, solarV);
  addNumber(doc, "solarW", solarW, 2);
  addNumber(doc, "solarV", solarV, 2);
#endif

#if ENABLE_BATTERY
  float batteryV = readBatteryVoltage();
  addNumber(doc, "batteryPct", batteryPercent(batteryV), 0);
  if (!isnan(batteryV)) {
    Serial.printf("[battery] %.2f V\n", batteryV);
  }
#endif

  doc["rssi"] = WiFi.RSSI();
  doc["pumpOn"] = pumpOn;
  doc["firmware"] = FIRMWARE_VERSION;
  doc["uptimeSec"] = (uint32_t)(esp_timer_get_time() / 1000000LL);
}

bool handleServerResponse(const String& payload) {
  JsonDocument resp;
  DeserializationError err = deserializeJson(resp, payload);
  if (err) {
    Serial.printf("[report] bad JSON from server: %s\n", err.c_str());
    return false;
  }
  bool success = resp["success"] | false;
  JsonObject data = resp["data"].as<JsonObject>();
  if (!success || data.isNull()) {
    Serial.printf("[report] server did not return success/data: %s\n", payload.c_str());
    return false;
  }

  const char* pump = data["pump"] | "";
  float runSeconds = data["runSeconds"] | 0.0f;
  const char* reason = data["reason"] | "";
  float reportEvery = data["reportEverySeconds"] | 0.0f;
  const char* serverTime = data["serverTime"] | "";

  serverContact = true;
  lastServerOkMs = millis();
  Serial.printf("[report] OK: pump=%s runSeconds=%.0f reason=\"%s\" serverTime=%s\n", pump, runSeconds, reason, serverTime);

  applyReportInterval(reportEvery);
  applyPumpCommand(pump, runSeconds, reason);
  return true;
}

bool sendTelemetry() {
  JsonDocument doc;
  collectTelemetry(doc);
  String body;
  serializeJson(doc, body);
  Serial.printf("[report] POST %s\n[report] %s\n", telemetryUrl.c_str(), body.c_str());

  HTTPClient http;
  http.setConnectTimeout(HTTP_CONNECT_TIMEOUT_MS);
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.setReuse(false);
  bool started = useHttps ? http.begin(secureClient, telemetryUrl) : http.begin(plainClient, telemetryUrl);
  if (!started) {
    Serial.println("[report] could not parse API_BASE_URL, check config.h");
    return false;
  }
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", DEVICE_KEY);

  esp_task_wdt_reset();
  int status = http.POST(body);
  esp_task_wdt_reset();
  String payload = status > 0 ? http.getString() : String();
  http.end();

  if (status <= 0) {
    Serial.printf("[report] request failed: %s\n", HTTPClient::errorToString(status).c_str());
    return false;
  }
  if (status != 200) {
    Serial.printf("[report] HTTP %d: %s\n", status, payload.c_str());
    if (status == 401 || status == 403) {
      Serial.println("[report] server rejected the device key, check DEVICE_KEY in config.h");
    } else if (status == 404) {
      Serial.println("[report] endpoint not found, API_BASE_URL must not include /api");
    }
    return false;
  }
  return handleServerResponse(payload);
}

void maybeReport() {
  uint32_t intervalS = pumpOn ? (uint32_t)PUMP_REPORT_INTERVAL_S : reportIntervalS;
  if (!lastReportOk && intervalS > (uint32_t)RETRY_INTERVAL_S) {
    intervalS = RETRY_INTERVAL_S;
  }
  if (!reportNow && millis() - lastReportMs < intervalS * 1000UL) {
    return;
  }
  reportNow = false;
  lastReportMs = millis();

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[report] skipped, WiFi offline");
    lastReportOk = false;
    return;
  }
  lastReportOk = sendTelemetry();
  lastReportMs = millis();
}

void printCalibration() {
  static uint32_t lastPrintMs = 0;
  if (millis() - lastPrintMs < CALIBRATION_PRINT_MS) {
    return;
  }
  lastPrintMs = millis();
  float airTemp = NAN;
  float humidity = NAN;

  Serial.print("[cal]");
#if ENABLE_DHT22 || ENABLE_SHT31
  readAir(airTemp, humidity);
  Serial.printf(" air=%.1fC rh=%.1f%%", airTemp, humidity);
#endif
#if ENABLE_SOIL_MOISTURE
  float raw = readSoilRaw();
  Serial.printf(" soilRaw=%.0f vwc=%.1f%%", raw, soilRawToVwc(raw));
#endif
#if ENABLE_DS18B20
  Serial.printf(" soilTemp=%.2fC", readSoilTemp());
#endif
#if ENABLE_NPK
  Serial.printf(" N=%.1f P=%.1f K=%.1f", readNpkValue(NPK_REG_NITROGEN), readNpkValue(NPK_REG_PHOSPHORUS), readNpkValue(NPK_REG_POTASSIUM));
#endif
#if ENABLE_FLOW
  Serial.printf(" flowPulses=%lu flowRate=%.2fLpm", (unsigned long)flowPulsesSinceBoot, flowRateLpm);
#endif
#if ENABLE_PZEM
  float powerW = NAN;
  float energyKwh = NAN;
  readEnergy(powerW, energyKwh);
  Serial.printf(" power=%.1fW energy=%.3fkWh", powerW, energyKwh);
#endif
#if ENABLE_TANK_LEVEL
  float tankCm = readTankDistance(airTemp);
  Serial.printf(" tank=%.1fcm level=%.0f%%", tankCm, tankLevelPct(tankCm));
#endif
#if ENABLE_INA219
  float solarW = NAN;
  float solarV = NAN;
  readSolar(solarW, solarV);
  Serial.printf(" solar=%.2fW/%.2fV", solarW, solarV);
#endif
#if ENABLE_BATTERY
  float batteryV = readBatteryVoltage();
  Serial.printf(" battery=%.2fV/%.0f%%", batteryV, batteryPercent(batteryV));
#endif
  Serial.println();
}

void updateStatusLed() {
#if STATUS_LED_PIN >= 0
  uint32_t now = millis();
  bool lit;
  if (WiFi.status() != WL_CONNECTED) {
    lit = (now / 200) % 2;
  } else if (!lastReportOk) {
    lit = (now / 1000) % 2;
  } else {
    lit = true;
  }
  digitalWrite(STATUS_LED_PIN, lit ? HIGH : LOW);
#endif
}

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println();
  Serial.printf("[boot] %s, reset reason: %s\n", FIRMWARE_VERSION, resetReasonText(esp_reset_reason()));

  setupRelay();
  setupWatchdog();
  setupStatusLed();
  if (!prefs.begin("agriguard", false)) {
    Serial.println("[nvs] could not open Preferences, flow total will not persist");
  }
  printFeatures();
  setupSensors();

#if CALIBRATION_MODE
  Serial.println("[cal] CALIBRATION_MODE 1: no WiFi, no reports, pump stays OFF");
#else
  setupNetwork();
#endif
}

void loop() {
  esp_task_wdt_reset();
  updateFlow();

#if CALIBRATION_MODE
  printCalibration();
#else
  maintainWifi();
  enforcePumpSafety();
  maybeReport();
  enforcePumpSafety();
  persistFlowPeriodically();
#endif

  updateStatusLed();
  delay(10);
}
