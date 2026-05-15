const http = require("http");
const https = require("https");
const { URL } = require("url");

const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;
const TARGET_PROTOCOL = process.env.TARGET_PROTOCOL || "https:";
const TARGET_HOST = process.env.TARGET_HOST || "gps-ams-admin.vercel.app";
const TARGET_PATH = process.env.TARGET_PATH || "/api/telemetry";

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function forwardRequest(body, headers) {
  return new Promise((resolve, reject) => {
    const reqOptions = {
      protocol: TARGET_PROTOCOL,
      hostname: TARGET_HOST,
      port: TARGET_PROTOCOL === "https:" ? 443 : 80,
      path: TARGET_PATH,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Connection": "close",
        "Host": TARGET_HOST,
        "Content-Length": Buffer.byteLength(body),
        "x-device-token": headers["x-device-token"] || headers["X-Device-Token"] || "",
      },
    };

    const proxy = TARGET_PROTOCOL === "https:" ? https : http;

    const proxyReq = proxy.request(reqOptions, (proxyRes) => {
      let responseBody = "";
      proxyRes.on("data", (chunk) => {
        responseBody += chunk.toString();
      });
      proxyRes.on("end", () => {
        resolve({
          statusCode: proxyRes.statusCode,
          headers: proxyRes.headers,
          body: responseBody,
        });
      });
    });

    proxyReq.on("error", (err) => {
      reject(err);
    });

    proxyReq.write(body);
    proxyReq.end();
  });
}

const server = http.createServer(async (req, res) => {
  const { method, url, headers } = req;

  if (method === "GET" && url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, proxy: true, target: `${TARGET_PROTOCOL}//${TARGET_HOST}${TARGET_PATH}` }));
    return;
  }

  if (method !== "POST" || url !== "/telemetry") {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
    return;
  }

  try {
    const body = await readBody(req);

    if (!body) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Empty request body" }));
      return;
    }

    console.log("Incoming /telemetry request");
    console.log("Headers:", headers);
    console.log("Body:", body);

    const result = await forwardRequest(body, headers);

    console.log(`Forwarded to ${TARGET_PROTOCOL}//${TARGET_HOST}${TARGET_PATH} -> ${result.statusCode}`);
    console.log("Response body:", result.body);

    res.writeHead(result.statusCode || 500, {
      "Content-Type": "application/json",
      ...result.headers,
    });
    res.end(result.body);
  } catch (error) {
    console.error("Proxy error:", error);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Proxy failure", message: error.message }));
  }
});

server.listen(PORT, () => {
  console.log(`SIM800 proxy listening on http://0.0.0.0:${PORT}`);
  console.log(`Forwarding POST /telemetry to ${TARGET_PROTOCOL}//${TARGET_HOST}${TARGET_PATH}`);
});
