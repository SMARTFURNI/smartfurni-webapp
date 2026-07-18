import type { CapacitorConfig } from "@capacitor/cli";

const productionUrl = process.env.CAPACITOR_SERVER_URL || "https://www.smartfurni.com.vn/dashboard";

const config: CapacitorConfig = {
  appId: "vn.com.smartfurni.bed",
  appName: "SmartFurni Bed",
  webDir: "native-shell",
  server: {
    url: productionUrl,
    cleartext: false,
    allowNavigation: ["smartfurni.com.vn", "www.smartfurni.com.vn"],
  },
  ios: {
    contentInset: "automatic",
    preferredContentMode: "mobile",
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    BluetoothLe: {
      displayStrings: {
        scanning: "Đang tìm thiết bị SmartFurni…",
        cancel: "Hủy",
        availableDevices: "Thiết bị khả dụng",
        noDeviceFound: "Chưa tìm thấy thiết bị",
      },
    },
  },
};

export default config;
