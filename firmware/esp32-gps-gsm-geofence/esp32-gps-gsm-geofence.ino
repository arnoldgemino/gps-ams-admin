#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <ArduinoHttpClient.h>
#include <TinyGPSPlus.h>
#include <HardwareSerial.h>

// =========================
// WIFI SETTINGS
// =========================
const char* ssid = "SORRY I'M NOT";
const char* password = "arnold124";

// =========================
// SERVER SETTINGS
// =========================
const char* serverHost = "gps-ams-admin.vercel.app";
const int serverPort = 443;
const char* serverPath = "/api/telemetry";

// =========================
// DEVICE AUTH
// Must match ESP32_DEVICE_TOKEN or the Device apiKey in the database.
// =========================
const char* deviceToken = "gps-001";

// =========================
// DIRECT IDs FROM ADMIN
// =========================
const char* deviceId = "cmpbb8y9z0000jl0a3fdgnesq";
const char* paroleeId = "cmp5ryjfs0000l40awg35h58p";

// =========================
// GPS UART
// GPS TX -> ESP32 GPIO16
// GPS RX -> ESP32 GPIO17
// =========================
const int GPS_RX_PIN = 16;
const int GPS_TX_PIN = 17;
HardwareSerial gpsSerial(2);
TinyGPSPlus gps;

// =========================
// GSM UART
// GSM TX -> ESP32 GPIO26
// GSM RX -> ESP32 GPIO27
// Use a separate 4V/2A supply for SIM800/SIM900 style modules.
// =========================
const int GSM_RX_PIN = 26;
const int GSM_TX_PIN = 27;
HardwareSerial gsmSerial(1);

// =========================
// BATTERY ADC
// Battery+ -> R1 -> GPIO34 -> R2 -> GND
// Adjust R1/R2 and calibration using a multimeter.
// Example below: 100k top, 100k bottom, max battery 4.20V.
// =========================
const int BATTERY_ADC_PIN = 34;
const float BATTERY_R1_OHMS = 100000.0;
const float BATTERY_R2_OHMS = 100000.0;
const float ADC_REF_VOLTAGE = 3.30;
const float BATTERY_CALIBRATION = 1.00;
const float BATTERY_EMPTY_VOLTAGE = 3.20;
const float BATTERY_FULL_VOLTAGE = 4.20;

// Optional tamper switch. LOW = tamper if using INPUT_PULLUP.
const int TAMPER_PIN = 33;
const bool TAMPER_ENABLED = false;

WiFiClientSecure wifiClient;
HttpClient http(wifiClient, serverHost, serverPort);

unsigned long lastSend = 0;
const unsigned long sendIntervalMs = 10000;

String currentGeofenceAlertId = "";
int geofenceWarningCount = 0;
bool callPlacedForCurrentBreach = false;

struct TelemetryResult {
  bool ok;
  int statusCode;
  String response;
};

void printDivider() {
  Serial.println("==============================");
}

String jsonEscape(String value) {
  value.replace("\\", "\\\\");
  value.replace("\"", "\\\"");
  value.replace("\n", " ");
  value.replace("\r", " ");
  return value;
}

String extractJsonString(const String& json, const String& key) {
  String marker = "\"" + key + "\":";
  int keyIndex = json.indexOf(marker);
  if (keyIndex < 0) return "";

  int valueIndex = keyIndex + marker.length();
  while (valueIndex < json.length() && json[valueIndex] == ' ') valueIndex++;
  if (valueIndex >= json.length() || json[valueIndex] != '"') return "";

  valueIndex++;
  String result = "";
  bool escaped = false;

  for (int i = valueIndex; i < json.length(); i++) {
    char c = json[i];

    if (escaped) {
      result += c;
      escaped = false;
      continue;
    }

    if (c == '\\') {
      escaped = true;
      continue;
    }

    if (c == '"') return result;
    result += c;
  }

  return "";
}

bool extractJsonBool(const String& json, const String& key) {
  String marker = "\"" + key + "\":";
  int keyIndex = json.indexOf(marker);
  if (keyIndex < 0) return false;

  int valueIndex = keyIndex + marker.length();
  while (valueIndex < json.length() && json[valueIndex] == ' ') valueIndex++;

  return json.substring(valueIndex, valueIndex + 4) == "true";
}

bool connectWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  unsigned long startAttempt = millis();

  while (WiFi.status() != WL_CONNECTED && millis() - startAttempt < 30000) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("WiFi connected");
    Serial.print("ESP32 IP: ");
    Serial.println(WiFi.localIP());
    return true;
  }

  Serial.println("WiFi connection failed");
  return false;
}

void ensureWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.println("WiFi lost. Reconnecting...");
  WiFi.disconnect();
  WiFi.begin(ssid, password);

  unsigned long startAttempt = millis();

  while (WiFi.status() != WL_CONNECTED && millis() - startAttempt < 15000) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("WiFi reconnected");
  } else {
    Serial.println("WiFi reconnect failed");
  }
}

String readGsmResponse(unsigned long timeoutMs) {
  String response = "";
  unsigned long start = millis();

  while (millis() - start < timeoutMs) {
    while (gsmSerial.available()) {
      response += char(gsmSerial.read());
    }
    delay(10);
  }

  response.trim();
  if (response.length()) {
    Serial.print("GSM response: ");
    Serial.println(response);
  }

  return response;
}

bool sendGsmCommand(const String& command, const String& expected, unsigned long timeoutMs) {
  gsmSerial.println(command);
  String response = readGsmResponse(timeoutMs);
  return expected.length() == 0 || response.indexOf(expected) >= 0;
}

bool initGsm() {
  Serial.println("Initializing GSM...");
  bool ok = sendGsmCommand("AT", "OK", 2000);
  ok = sendGsmCommand("ATE0", "OK", 2000) && ok;
  ok = sendGsmCommand("AT+CMGF=1", "OK", 2000) && ok;
  ok = sendGsmCommand("AT+CSCS=\"GSM\"", "OK", 2000) && ok;

  if (ok) {
    Serial.println("GSM ready");
  } else {
    Serial.println("GSM init failed. Check power, SIM, antenna, RX/TX pins.");
  }

  return ok;
}

bool sendSms(const String& phoneNumber, const String& message) {
  if (phoneNumber.length() == 0) {
    Serial.println("No officer phone number. SMS skipped.");
    return false;
  }

  Serial.print("Sending SMS to ");
  Serial.println(phoneNumber);

  sendGsmCommand("AT+CMGF=1", "OK", 2000);
  gsmSerial.print("AT+CMGS=\"");
  gsmSerial.print(phoneNumber);
  gsmSerial.println("\"");
  readGsmResponse(1500);
  gsmSerial.print(message);
  gsmSerial.write(26);

  String response = readGsmResponse(12000);
  bool ok = response.indexOf("OK") >= 0 || response.indexOf("+CMGS") >= 0;

  Serial.print("SMS sent: ");
  Serial.println(ok ? "YES" : "NO");
  return ok;
}

bool callOfficer(const String& phoneNumber) {
  if (phoneNumber.length() == 0) {
    Serial.println("No officer phone number. Call skipped.");
    return false;
  }

  Serial.print("Calling officer: ");
  Serial.println(phoneNumber);

  gsmSerial.print("ATD");
  gsmSerial.print(phoneNumber);
  gsmSerial.println(";");
  readGsmResponse(5000);

  delay(20000);

  gsmSerial.println("ATH");
  readGsmResponse(3000);
  Serial.println("Call ended");
  return true;
}

float readBatteryVoltage() {
  analogSetPinAttenuation(BATTERY_ADC_PIN, ADC_11db);

  const int samples = 30;
  uint32_t total = 0;

  for (int i = 0; i < samples; i++) {
    total += analogRead(BATTERY_ADC_PIN);
    delay(3);
  }

  float raw = total / float(samples);
  float adcVoltage = (raw / 4095.0) * ADC_REF_VOLTAGE;
  float dividerRatio = (BATTERY_R1_OHMS + BATTERY_R2_OHMS) / BATTERY_R2_OHMS;

  return adcVoltage * dividerRatio * BATTERY_CALIBRATION;
}

int batteryPercentFromVoltage(float voltage) {
  float pct =
    ((voltage - BATTERY_EMPTY_VOLTAGE) /
     (BATTERY_FULL_VOLTAGE - BATTERY_EMPTY_VOLTAGE)) *
    100.0;

  if (pct < 0) pct = 0;
  if (pct > 100) pct = 100;

  return int(pct + 0.5);
}

String readTamperStatus() {
  if (!TAMPER_ENABLED) return "OK";
  return digitalRead(TAMPER_PIN) == LOW ? "TAMPER" : "OK";
}

TelemetryResult sendTelemetry(
  double lat,
  double lng,
  double speedKmph,
  int batteryLevel,
  float batteryVoltage,
  const String& tamperStatus
) {
  TelemetryResult result;
  result.ok = false;
  result.statusCode = 0;
  result.response = "";

  ensureWiFi();

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected");
    return result;
  }

  int signalRssiDbm = WiFi.RSSI();

  String json = "{";
  json += "\"deviceId\":\"" + String(deviceId) + "\",";
  json += "\"paroleeId\":\"" + String(paroleeId) + "\",";
  json += "\"lat\":" + String(lat, 6) + ",";
  json += "\"lng\":" + String(lng, 6) + ",";
  json += "\"speedKmph\":" + String(speedKmph, 2) + ",";
  json += "\"batteryLevel\":" + String(batteryLevel) + ",";
  json += "\"batteryVoltage\":" + String(batteryVoltage, 3) + ",";
  json += "\"signalRssiDbm\":" + String(signalRssiDbm) + ",";
  json += "\"tamperStatus\":\"" + jsonEscape(tamperStatus) + "\"";
  json += "}";

  Serial.println("Sending JSON:");
  Serial.println(json);
  Serial.print("JSON Length: ");
  Serial.println(json.length());

  http.stop();
  delay(300);

  http.setTimeout(30000);

  http.beginRequest();
  http.post(serverPath);
  http.sendHeader("User-Agent", "ESP32-GPS-GSM");
  http.sendHeader("Content-Type", "application/json; charset=utf-8");
  http.sendHeader("Accept", "application/json");
  http.sendHeader("x-device-token", deviceToken);
  http.sendHeader("Connection", "close");
  http.sendHeader("Content-Length", json.length());
  http.beginBody();
  http.print(json);
  http.endRequest();

  result.statusCode = http.responseStatusCode();
  result.response = http.responseBody();
  result.ok = result.statusCode >= 200 && result.statusCode < 300;

  Serial.print("HTTP Code: ");
  Serial.println(result.statusCode);
  Serial.print("Response: ");
  Serial.println(result.response);

  http.stop();
  return result;
}

String buildWarningSms(const String& serverMessage, int warningNumber) {
  String message = "GPS-AMS WARNING ";
  message += String(warningNumber);
  message += "/3: ";

  if (serverMessage.length() > 0) {
    message += serverMessage;
  } else {
    message += "Assigned parolee breached geofence.";
  }

  if (message.length() > 155) {
    message = message.substring(0, 155);
  }

  return message;
}

void handleServerDeviceAction(const TelemetryResult& telemetryResult) {
  if (!telemetryResult.ok) return;

  bool geofenceBreach = extractJsonBool(telemetryResult.response, "geofenceBreach");
  String alertId = extractJsonString(telemetryResult.response, "geofenceAlertId");
  String officerPhone = extractJsonString(telemetryResult.response, "officerPhone");
  String smsMessage = extractJsonString(telemetryResult.response, "smsMessage");

  if (!geofenceBreach) {
    if (geofenceWarningCount > 0) {
      Serial.println("Geofence normal again. Warning counter reset.");
    }
    geofenceWarningCount = 0;
    currentGeofenceAlertId = "";
    callPlacedForCurrentBreach = false;
    return;
  }

  if (alertId.length() == 0) {
    alertId = "local-geofence-breach";
  }

  if (alertId != currentGeofenceAlertId) {
    currentGeofenceAlertId = alertId;
    geofenceWarningCount = 0;
    callPlacedForCurrentBreach = false;
  }

  if (geofenceWarningCount < 3) {
    geofenceWarningCount++;
    Serial.print("Geofence warning count: ");
    Serial.println(geofenceWarningCount);

    sendSms(officerPhone, buildWarningSms(smsMessage, geofenceWarningCount));
  }

  if (geofenceWarningCount >= 3 && !callPlacedForCurrentBreach) {
    Serial.println("Warning limit reached. Calling assigned officer.");
    callOfficer(officerPhone);
    callPlacedForCurrentBreach = true;
  }
}

void setup() {
  Serial.begin(115200);
  delay(2000);

  Serial.println("ESP32 GPS + WIFI + GSM START");
  printDivider();

  if (TAMPER_ENABLED) {
    pinMode(TAMPER_PIN, INPUT_PULLUP);
  }

  gpsSerial.begin(9600, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  gsmSerial.begin(9600, SERIAL_8N1, GSM_RX_PIN, GSM_TX_PIN);
  delay(1000);

  wifiClient.setInsecure();

  connectWiFi();
  initGsm();

  printDivider();
}

void loop() {
  while (gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }

  if (millis() - lastSend < sendIntervalMs) {
    return;
  }

  lastSend = millis();
  printDivider();

  float batteryVoltage = readBatteryVoltage();
  int batteryLevel = batteryPercentFromVoltage(batteryVoltage);
  String tamperStatus = readTamperStatus();

  Serial.print("WiFi RSSI dBm: ");
  Serial.println(WiFi.RSSI());

  Serial.print("Battery voltage: ");
  Serial.print(batteryVoltage, 3);
  Serial.print(" V / ");
  Serial.print(batteryLevel);
  Serial.println("%");

  Serial.print("Tamper: ");
  Serial.println(tamperStatus);

  if (gps.satellites.isValid()) {
    Serial.print("Satellites: ");
    Serial.println(gps.satellites.value());
  } else {
    Serial.println("Satellites: N/A");
  }

  if (gps.location.isValid()) {
    double lat = gps.location.lat();
    double lng = gps.location.lng();
    double speedKmph = gps.speed.isValid() ? gps.speed.kmph() : 0.0;

    Serial.println("GPS FIX: YES");
    Serial.print("Latitude: ");
    Serial.println(lat, 6);
    Serial.print("Longitude: ");
    Serial.println(lng, 6);
    Serial.print("Speed km/h: ");
    Serial.println(speedKmph);

    TelemetryResult telemetryResult = sendTelemetry(
      lat,
      lng,
      speedKmph,
      batteryLevel,
      batteryVoltage,
      tamperStatus
    );

    Serial.print("Telemetry sent: ");
    Serial.println(telemetryResult.ok ? "YES" : "NO");

    handleServerDeviceAction(telemetryResult);
  } else {
    Serial.println("GPS FIX: NO");
    Serial.println("Waiting for GPS fix...");
  }

  printDivider();
}
