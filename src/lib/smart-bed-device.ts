import type { BedZone } from "./bed-device-profiles";

export type BedTransport = "bluetooth" | "wifi" | "native" | "simulator";
export type BedConnectionStatus = "idle" | "connecting" | "connected" | "error";

export interface SmartBedProtocolConfig {
  bleServiceUuid: string;
  bleWriteCharacteristicUuid: string;
  bleNotifyCharacteristicUuid: string;
  wifiGatewayUrl: string;
  wifiApiToken: string;
  deviceNamePrefix: string;
}

export interface SmartBedTelemetry {
  deviceId?: string;
  deviceName?: string;
  firmware?: string;
  batteryLevel?: number;
  headAngle?: number;
  footAngle?: number;
  ledOn?: boolean;
  ledColor?: string;
  ledBrightness?: number;
  massageLevel?: number;
  online?: boolean;
  temperature?: number;
  obstructionDetected?: boolean;
  overloadDetected?: boolean;
  occupancyDetected?: boolean;
  sensorStatus?: "unavailable" | "ready" | "active";
  connectionQuality?: number;
  motorCycles?: number;
  errorCode?: string;
}

export type SmartBedCommand =
  | { type: "sync_state"; zone: BedZone; profileId: string; headAngle: number; footAngle: number; led: { on: boolean; color: string; brightness: number }; massage: { on: boolean; level: number; mode: string }; childLock: boolean }
  | { type: "stop_flat"; zone: BedZone }
  | { type: "set_routine"; enabled: boolean; bedtime: string; wakeTime: string; sleepPresetId: string; wakePresetId: string; ledAtBedtime: boolean; days?: number[]; gradualWakeMinutes?: number; massageAtBedtime?: boolean; massageMinutes?: number; ledAtWake?: boolean }
  | { type: "set_sleep_settings"; antiSnoreEnabled: boolean; antiSnoreRaiseDegrees: number; outOfBedAlerts: boolean; smartAlarmEnabled: boolean; smartAlarmWindowMinutes: number }
  | { type: "set_safety"; maxHeadAngle: number; maxFootAngle: number; obstructionAlerts: boolean; overloadAlerts: boolean; caregiverAlerts: boolean; holdToMove: boolean }
  | { type: "emergency_flat"; zone: BedZone }
  | { type: "request_diagnostics" }
  | { type: "ping" };

export interface SmartBedConnectionSnapshot {
  status: BedConnectionStatus;
  transport: BedTransport | null;
  deviceName: string;
  deviceId: string;
  error: string;
  lastLatencyMs: number | null;
  lastReceivedAt: number | null;
  bluetoothSupported: boolean;
  nativeBridgeAvailable: boolean;
}

interface BluetoothCharacteristicLike {
  value?: DataView;
  startNotifications?: () => Promise<BluetoothCharacteristicLike>;
  writeValue?: (value: BufferSource) => Promise<void>;
  writeValueWithoutResponse?: (value: BufferSource) => Promise<void>;
  addEventListener: (type: string, listener: EventListener) => void;
  removeEventListener: (type: string, listener: EventListener) => void;
}

interface BluetoothServiceLike {
  getCharacteristic(uuid: string): Promise<BluetoothCharacteristicLike>;
}

interface BluetoothServerLike {
  connected: boolean;
  getPrimaryService(uuid: string): Promise<BluetoothServiceLike>;
  disconnect(): void;
}

interface BluetoothDeviceLike extends EventTarget {
  id: string;
  name?: string;
  gatt?: { connect(): Promise<BluetoothServerLike> };
}

interface BluetoothNavigatorLike {
  requestDevice(options: {
    filters?: Array<{ namePrefix: string }>;
    acceptAllDevices?: boolean;
    optionalServices: string[];
  }): Promise<BluetoothDeviceLike>;
}

export interface SmartFurniNativeBridge {
  connect(config: SmartBedProtocolConfig): Promise<{ deviceId?: string; deviceName?: string }>;
  disconnect(): Promise<void>;
  send(command: SmartBedCommand): Promise<void>;
  onTelemetry?(callback: (telemetry: SmartBedTelemetry) => void): () => void;
}

declare global {
  interface Window {
    SmartFurniNative?: SmartFurniNativeBridge;
  }
}

export const DEFAULT_SMART_BED_PROTOCOL_CONFIG: SmartBedProtocolConfig = {
  bleServiceUuid: process.env.NEXT_PUBLIC_SMARTFURNI_BLE_SERVICE_UUID || "0000fff0-0000-1000-8000-00805f9b34fb",
  bleWriteCharacteristicUuid: process.env.NEXT_PUBLIC_SMARTFURNI_BLE_WRITE_UUID || "0000fff2-0000-1000-8000-00805f9b34fb",
  bleNotifyCharacteristicUuid: process.env.NEXT_PUBLIC_SMARTFURNI_BLE_NOTIFY_UUID || "0000fff1-0000-1000-8000-00805f9b34fb",
  wifiGatewayUrl: process.env.NEXT_PUBLIC_SMARTFURNI_WIFI_GATEWAY || "",
  wifiApiToken: "",
  deviceNamePrefix: "SmartFurni",
};

const CONFIG_STORAGE_KEY = "smartfurni-device-protocol-v1";
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function normalizeGatewayUrl(url: string) {
  return url.trim().replace(/\/+$/, "");
}

function readJsonSafely(value: string): SmartBedTelemetry | null {
  try {
    const parsed = JSON.parse(value) as SmartBedTelemetry | { telemetry?: SmartBedTelemetry };
    if ("telemetry" in parsed) return parsed.telemetry || null;
    return parsed as SmartBedTelemetry;
  } catch {
    return null;
  }
}

export function loadSmartBedProtocolConfig(): SmartBedProtocolConfig {
  if (typeof window === "undefined") return DEFAULT_SMART_BED_PROTOCOL_CONFIG;
  try {
    const stored = window.localStorage.getItem(CONFIG_STORAGE_KEY);
    return stored
      ? { ...DEFAULT_SMART_BED_PROTOCOL_CONFIG, ...(JSON.parse(stored) as Partial<SmartBedProtocolConfig>) }
      : DEFAULT_SMART_BED_PROTOCOL_CONFIG;
  } catch {
    return DEFAULT_SMART_BED_PROTOCOL_CONFIG;
  }
}

export function saveSmartBedProtocolConfig(config: SmartBedProtocolConfig) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  }
}

export class SmartBedDeviceClient {
  private config: SmartBedProtocolConfig;
  private transport: BedTransport | null = null;
  private bluetoothDevice: BluetoothDeviceLike | null = null;
  private bluetoothServer: BluetoothServerLike | null = null;
  private writeCharacteristic: BluetoothCharacteristicLike | null = null;
  private notifyCharacteristic: BluetoothCharacteristicLike | null = null;
  private notificationBuffer = "";
  private nativeUnsubscribe: (() => void) | null = null;
  private telemetryHandler: (telemetry: SmartBedTelemetry) => void;
  private disconnectHandler: (message?: string) => void;

  constructor(
    config: SmartBedProtocolConfig,
    telemetryHandler: (telemetry: SmartBedTelemetry) => void,
    disconnectHandler: (message?: string) => void,
  ) {
    this.config = config;
    this.telemetryHandler = telemetryHandler;
    this.disconnectHandler = disconnectHandler;
  }

  updateConfig(config: SmartBedProtocolConfig) {
    this.config = config;
  }

  get activeTransport() {
    return this.transport;
  }

  async connectBluetooth() {
    const bluetooth = (navigator as Navigator & { bluetooth?: BluetoothNavigatorLike }).bluetooth;
    if (!bluetooth) {
      throw new Error("Trình duyệt này chưa hỗ trợ Web Bluetooth. Trên iPhone, hãy dùng ứng dụng SmartFurni hoặc kết nối Wi‑Fi.");
    }
    const serviceUuid = this.config.bleServiceUuid.trim();
    if (!serviceUuid) throw new Error("Chưa có UUID dịch vụ Bluetooth.");
    const device = await bluetooth.requestDevice({
      filters: this.config.deviceNamePrefix.trim() ? [{ namePrefix: this.config.deviceNamePrefix.trim() }] : undefined,
      acceptAllDevices: !this.config.deviceNamePrefix.trim(),
      optionalServices: [serviceUuid],
    });
    if (!device.gatt) throw new Error("Thiết bị không cung cấp kết nối GATT.");
    device.addEventListener("gattserverdisconnected", this.handleBluetoothDisconnect);
    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(serviceUuid);
    const writeCharacteristic = await service.getCharacteristic(this.config.bleWriteCharacteristicUuid.trim());
    let notifyCharacteristic: BluetoothCharacteristicLike | null = null;
    if (this.config.bleNotifyCharacteristicUuid.trim()) {
      try {
        notifyCharacteristic = await service.getCharacteristic(this.config.bleNotifyCharacteristicUuid.trim());
        await notifyCharacteristic.startNotifications?.();
        notifyCharacteristic.addEventListener("characteristicvaluechanged", this.handleBluetoothNotification);
      } catch {
        notifyCharacteristic = null;
      }
    }
    this.transport = "bluetooth";
    this.bluetoothDevice = device;
    this.bluetoothServer = server;
    this.writeCharacteristic = writeCharacteristic;
    this.notifyCharacteristic = notifyCharacteristic;
    return { deviceId: device.id, deviceName: device.name || "SmartFurni Bluetooth" };
  }

  async connectNative() {
    if (!window.SmartFurniNative) throw new Error("Ứng dụng native SmartFurni chưa được cài đặt.");
    const device = await window.SmartFurniNative.connect(this.config);
    this.nativeUnsubscribe = window.SmartFurniNative.onTelemetry?.(this.telemetryHandler) ?? null;
    this.transport = "native";
    return { deviceId: device.deviceId || "native-bed", deviceName: device.deviceName || "SmartFurni Bed" };
  }

  async connectWifi() {
    const baseUrl = normalizeGatewayUrl(this.config.wifiGatewayUrl);
    if (!baseUrl) throw new Error("Hãy nhập địa chỉ Wi‑Fi Gateway của giường.");
    const startedAt = Date.now();
    const response = await this.fetchGateway(`${baseUrl}/api/v1/status`, { method: "GET" });
    if (!response.ok) throw new Error(`Gateway phản hồi lỗi ${response.status}.`);
    const status = await response.json() as SmartBedTelemetry;
    this.transport = "wifi";
    this.telemetryHandler(status);
    return {
      deviceId: status.deviceId || baseUrl,
      deviceName: status.deviceName || "SmartFurni Wi‑Fi",
      latencyMs: Date.now() - startedAt,
    };
  }

  async connectSimulator() {
    await new Promise((resolve) => window.setTimeout(resolve, 350));
    this.transport = "simulator";
    const telemetry: SmartBedTelemetry = {
      deviceId: "sim-smartfurni-bed",
      deviceName: "SmartFurni Demo",
      firmware: "SIM-1.0",
      batteryLevel: 86,
      online: true,
    };
    this.telemetryHandler(telemetry);
    return { deviceId: telemetry.deviceId!, deviceName: telemetry.deviceName!, latencyMs: 8 };
  }

  async send(command: SmartBedCommand) {
    if (!this.transport) throw new Error("Chưa kết nối thiết bị.");
    const envelope = {
      protocol: "smartfurni-bed-v1",
      requestId: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}`,
      sentAt: new Date().toISOString(),
      command,
    };
    if (this.transport === "bluetooth") {
      if (!this.writeCharacteristic) throw new Error("Kênh ghi Bluetooth chưa sẵn sàng.");
      const bytes = encoder.encode(`${JSON.stringify(envelope)}\n`);
      const writer = this.writeCharacteristic.writeValueWithoutResponse?.bind(this.writeCharacteristic)
        ?? this.writeCharacteristic.writeValue?.bind(this.writeCharacteristic);
      if (!writer) throw new Error("Thiết bị không hỗ trợ nhận lệnh Bluetooth.");
      for (let offset = 0; offset < bytes.length; offset += 180) {
        await writer(bytes.slice(offset, offset + 180));
      }
      return;
    }
    if (this.transport === "wifi") {
      const baseUrl = normalizeGatewayUrl(this.config.wifiGatewayUrl);
      const response = await this.fetchGateway(`${baseUrl}/api/v1/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(envelope),
      });
      if (!response.ok) throw new Error(`Không gửi được lệnh tới Gateway (${response.status}).`);
      const result = await response.json().catch(() => null) as SmartBedTelemetry | null;
      if (result) this.telemetryHandler(result);
      return;
    }
    if (this.transport === "native") {
      if (!window.SmartFurniNative) throw new Error("Mất kết nối với cầu nối ứng dụng.");
      await window.SmartFurniNative.send(command);
      return;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 35));
  }

  async disconnect() {
    if (this.notifyCharacteristic) {
      this.notifyCharacteristic.removeEventListener("characteristicvaluechanged", this.handleBluetoothNotification);
    }
    if (this.bluetoothDevice) {
      this.bluetoothDevice.removeEventListener("gattserverdisconnected", this.handleBluetoothDisconnect);
    }
    if (this.bluetoothServer?.connected) this.bluetoothServer.disconnect();
    if (this.transport === "native" && window.SmartFurniNative) await window.SmartFurniNative.disconnect();
    this.nativeUnsubscribe?.();
    this.nativeUnsubscribe = null;
    this.bluetoothDevice = null;
    this.bluetoothServer = null;
    this.writeCharacteristic = null;
    this.notifyCharacteristic = null;
    this.transport = null;
  }

  private fetchGateway(input: string, init: RequestInit) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8_000);
    const headers = new Headers(init.headers);
    if (this.config.wifiApiToken.trim()) headers.set("Authorization", `Bearer ${this.config.wifiApiToken.trim()}`);
    return fetch(input, { ...init, headers, signal: controller.signal }).finally(() => window.clearTimeout(timeout));
  }

  private handleBluetoothDisconnect = () => {
    this.transport = null;
    this.disconnectHandler("Thiết bị Bluetooth đã ngắt kết nối.");
  };

  private handleBluetoothNotification = (event: Event) => {
    const characteristic = event.target as BluetoothCharacteristicLike | null;
    if (!characteristic?.value) return;
    this.notificationBuffer += decoder.decode(
      new Uint8Array(
        characteristic.value.buffer,
        characteristic.value.byteOffset,
        characteristic.value.byteLength,
      ),
      { stream: true },
    );
    const messages = this.notificationBuffer.split("\n");
    this.notificationBuffer = messages.pop() || "";
    for (const message of messages) {
      const telemetry = readJsonSafely(message.trim());
      if (telemetry) this.telemetryHandler(telemetry);
    }
  };
}
