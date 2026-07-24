// craco.config.js
const fs = require("fs");
const path = require("path");
const materializeHardening = require("../scripts/churvox_hardening_v8_materialize.cjs");
materializeHardening();

// V8 remains the operating engine. Replace only the rendered shell after the
// verified hardening package is materialised, so future bundle refreshes cannot
// silently restore the rejected layout.
const gatePath = path.resolve(__dirname, "src/churvox-product/ProductAppV7Gate.jsx");
if (fs.existsSync(gatePath)) {
  const currentGate = fs.readFileSync(gatePath, "utf8");
  const controlRoomGate = currentGate
    .replace(/import ProductAppV8 from ["']\.\/ProductAppV8["'];?/, 'import ProductAppV9 from "./ProductAppV9";')
    .replace(/<ProductAppV8\s*\/>/g, "<ProductAppV9 />");
  if (!controlRoomGate.includes('ProductAppV9 from "./ProductAppV9"')) {
    throw new Error("Churvox Control Room V9 could not take ownership of the product gate");
  }
  fs.writeFileSync(gatePath, controlRoomGate, "utf8");
}

try {
  require("dotenv").config();
} catch (err) {
  if (err.code !== "MODULE_NOT_FOUND") throw err;
}

const isDevServer = process.env.NODE_ENV !== "production";
const config = {
  enableHealthCheck: process.env.ENABLE_HEALTH_CHECK === "true",
};

let WebpackHealthPlugin;
let setupHealthEndpoints;
let healthPluginInstance;

if (config.enableHealthCheck) {
  WebpackHealthPlugin = require("./plugins/health-check/webpack-health-plugin");
  setupHealthEndpoints = require("./plugins/health-check/health-endpoints");
  healthPluginInstance = new WebpackHealthPlugin();
}

let webpackConfig = {
  eslint: {
    configure: {
      extends: ["plugin:react-hooks/recommended"],
      rules: {
        "react-hooks/rules-of-hooks": "error",
        "react-hooks/exhaustive-deps": "warn",
      },
    },
  },
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    configure: (webpackConfig) => {
      webpackConfig.watchOptions = {
        ...webpackConfig.watchOptions,
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/build/**',
          '**/dist/**',
          '**/coverage/**',
          '**/public/**',
        ],
      };

      if (config.enableHealthCheck && healthPluginInstance) {
        webpackConfig.plugins.push(healthPluginInstance);
      }
      return webpackConfig;
    },
  },
};

webpackConfig.devServer = (devServerConfig) => {
  if (config.enableHealthCheck && setupHealthEndpoints && healthPluginInstance) {
    const originalSetupMiddlewares = devServerConfig.setupMiddlewares;
    devServerConfig.setupMiddlewares = (middlewares, devServer) => {
      if (originalSetupMiddlewares) {
        middlewares = originalSetupMiddlewares(middlewares, devServer);
      }
      setupHealthEndpoints(devServer, healthPluginInstance);
      return middlewares;
    };
  }
  return devServerConfig;
};

if (isDevServer) {
  try {
    const { withVisualEdits } = require("@emergentbase/visual-edits/craco");
    webpackConfig = withVisualEdits(webpackConfig);
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND' && err.message.includes('@emergentbase/visual-edits/craco')) {
      console.warn("[visual-edits] @emergentbase/visual-edits not installed — visual editing disabled.");
    } else {
      throw err;
    }
  }
}

module.exports = webpackConfig;
