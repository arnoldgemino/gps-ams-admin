# SIM800 Plain HTTP Proxy

This proxy accepts plain HTTP requests from SIM800 devices and forwards them to the HTTPS backend.

## Run

```bash
node proxy-server.js
```

Or with custom settings:

```bash
TARGET_HOST=gps-ams-admin.vercel.app TARGET_PATH=/api/telemetry TARGET_PROTOCOL=https: PORT=8080 node proxy-server.js
```

## SIM800 settings

Use the IP or hostname where this proxy is reachable from the SIM800.

Example Arduino settings:

```cpp
const char serverHost[] = "YOUR_PROXY_HOST_OR_IP";
const int serverPort = 8080;
const char serverPath[] = "/telemetry";
```

## Health check

Open:

```
http://<proxy-host>:8080/health
```

If it returns JSON, the proxy is running.
