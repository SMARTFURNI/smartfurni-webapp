"use client";

import { Capacitor } from "@capacitor/core";
import { BleClient } from "@capacitor-community/bluetooth-le";
import type {
  SmartBedCommand,
  SmartBedProtocolConfig,
  SmartBedTelemetry,
  SmartFurniNativeBridge,
} from "./smart-bed-device";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function dataViewFor(bytes: Uint8Array) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function readTelemetry(value: string): SmartBedTelemetry | null {
  try {
    const parsed = JSON.parse(value) as SmartBedTelemetry | { telemetry?: SmartBedTelemetry };
    if ("telemetry" in parsed) return parsed.telemetry || null;
    return parsed as SmartBedTelemetry;
  } catch {
    return null;
  }
}

class CapacitorSmartBedBridge implements SmartFurniNativeBridge {
  private deviceId = "";
  private deviceName = "";
  private config: SmartBedProtocolConfig | null = null;
  private notificationBuffer = "";
  private telemetryListeners = new Set<(telemetry: SmartBedTelemetry) => void>();

  async connect(config: SmartBedProtocolConfig) {
    this.config = config;
    await BleClient.initialize({ androidNeverForLocation: true });
    await BleClient.setDisplayStrings({
      scanning: "Đang tìm thiết bị SmartFurni…",
      cancel: "Hủy",
      availableDevices: "Thiết bị khả dụng",
      noDeviceFound: "Chưa tìm thấy thiết bị",
    });

    const serviceUuid = config.bleServiceUuid.trim();
    const device = await BleClient.requestDevice({
      namePrefix: config.deviceNamePrefix.trim() || undefined,
      services: [serviceUuid],
      optionalServices: [serviceUuid],
    });
    await BleClient.connect(device.deviceId, () => {
      this.deviceId = "";
      this.emit({ online: false });
    });

    this.deviceId = device.deviceId;
    this.deviceName = device.name || "SmartFurni Bed";
    if (config.bleNotifyCharacteristicUuid.trim()) {
      await BleClient.startNotifications(
        device.deviceId,
        serviceUuid,
        config.bleNotifyCharacteristicUuid.trim(),
        this.handleNotification,
      );
    }
    this.emit({ deviceId: this.deviceId, deviceName: this.deviceName, online: true });
    return { deviceId: this.deviceId, deviceName: this.deviceName };
  }

  async disconnect() {
    const config = this.config;
    const deviceId = this.deviceId;
    if (!deviceId) return;
    if (config?.bleNotifyCharacteristicUuid.trim()) {
      await BleClient.stopNotifications(
        deviceId,
        config.bleServiceUuid.trim(),
        config.bleNotifyCharacteristicUuid.trim(),
      ).catch(() => undefined);
    }
    await BleClient.disconnect(deviceId).catch(() => undefined);
    this.deviceId = "";
    this.emit({ online: false });
  }

  async send(command: SmartBedCommand) {
    if (!this.deviceId || !this.config) throw new Error("Thiết bị Bluetooth chưa được kết nối.");
    const envelope = {
      protocol: "smartfurni-bed-v1",
      requestId: crypto.randomUUID(),
      sentAt: new Date().toISOString(),
      command,
    };
    const bytes = encoder.encode(`${JSON.stringify(envelope)}\n`);
    for (let offset = 0; offset < bytes.length; offset += 180) {
      const chunk = bytes.slice(offset, offset + 180);
      await BleClient.writeWithoutResponse(
        this.deviceId,
        this.config.bleServiceUuid.trim(),
        this.config.bleWriteCharacteristicUuid.trim(),
        dataViewFor(chunk),
      );
    }
  }

  onTelemetry(callback: (telemetry: SmartBedTelemetry) => void) {
    this.telemetryListeners.add(callback);
    return () => this.telemetryListeners.delete(callback);
  }

  private emit(telemetry: SmartBedTelemetry) {
    for (const listener of this.telemetryListeners) listener(telemetry);
  }

  private handleNotification = (value: DataView) => {
    this.notificationBuffer += decoder.decode(
      new Uint8Array(value.buffer, value.byteOffset, value.byteLength),
      { stream: true },
    );
    const messages = this.notificationBuffer.split("\n");
    this.notificationBuffer = messages.pop() || "";
    for (const message of messages) {
      const telemetry = readTelemetry(message.trim());
      if (telemetry) this.emit(telemetry);
    }
  };
}

let installed = false;

export async function installNativeSmartBedBridge() {
  if (typeof window === "undefined" || !Capacitor.isNativePlatform()) return false;
  if (!installed) {
    window.SmartFurniNative = new CapacitorSmartBedBridge();
    installed = true;
  }
  return true;
}
