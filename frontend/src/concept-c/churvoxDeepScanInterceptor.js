import axios from "axios";

axios.interceptors.request.use((config) => {
  if (typeof config?.url === "string" && config.url.endsWith("/api/ai/operator/scan")) {
    config.url = config.url.replace("/api/ai/operator/scan", "/api/ai/operator/scan-deep");
  }
  return config;
});

export default null;
