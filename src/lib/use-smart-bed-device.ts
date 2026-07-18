"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_SMART_BED_PROTOCOL_CONFIG,
  loadSmartBedProtocolConfig,
  saveSmartBedProtocolConfig,
  SmartBedDeviceClient,
  type BedConnectionStatus,
  type BedTransport,
  type SmartBedCommand,
  type SmartBedConnectionSnapshot,
  type SmartBedProtocolConfig,
  type SmartBedTelemetry,
} from "./smart-bed-device";

const INITIAL_CONNECTION: SmartBedConnectionSnapshot = {
  status: "idle",
  transport: null,
  deviceName: "",
  deviceId: "",
  error: "",
  lastLatencyMs: null,
  lastReceivedAt: null,
  bluetoothSupported: false,
  nativeBridgeAvailable: false,
};

export function useSmartBedDevice(onTelemetry: (telemetry: SmartBedTelemetry) => void) {
  const [config, setConfigState] = useState<SmartBedProtocolConfig>(DEFAULT_SMART_BED_PROTOCOL_CONFIG);
  const [connection, setConnection] = useState<SmartBedConnectionSnapshot>(INITIAL_CONNECTION);
  const telemetryRef = useRef(onTelemetry);
  telemetryRef.current = onTelemetry;
  const clientRef = useRef<SmartBedDeviceClient | null>(null);

  useEffect(() => {
    const loadedConfig = loadSmartBedProtocolConfig();
    setConfigState(loadedConfig);
    const client = new SmartBedDeviceClient(
      loadedConfig,
      (telemetry) => {
        telemetryRef.current(telemetry);
        setConnection((current) => ({
          ...current,
          lastReceivedAt: Date.now(),
          deviceName: telemetry.deviceName || current.deviceName,
          deviceId: telemetry.deviceId || current.deviceId,
        }));
      },
      (message) => setConnection((current) => ({ ...current, status: "idle", transport: null, error: message || "" })),
    );
    clientRef.current = client;
    setConnection((current) => ({
      ...current,
      bluetoothSupported: "bluetooth" in navigator,
      nativeBridgeAvailable: Boolean(window.SmartFurniNative),
    }));
    void import("./native-smart-bed-bridge")
      .then(({ installNativeSmartBedBridge }) => installNativeSmartBedBridge())
      .then((available) => {
        setConnection((current) => ({ ...current, nativeBridgeAvailable: available }));
      })
      .catch(() => undefined);
    return () => {
      void client.disconnect();
      clientRef.current = null;
    };
  }, []);

  const setConfig = useCallback((next: SmartBedProtocolConfig) => {
    setConfigState(next);
    saveSmartBedProtocolConfig(next);
    clientRef.current?.updateConfig(next);
  }, []);

  const connect = useCallback(async (transport: BedTransport) => {
    const client = clientRef.current;
    if (!client) return false;
    setConnection((current) => ({ ...current, status: "connecting", transport, error: "" }));
    try {
      const startedAt = Date.now();
      const result = transport === "bluetooth"
        ? await client.connectBluetooth()
        : transport === "wifi"
          ? await client.connectWifi()
          : transport === "native"
            ? await client.connectNative()
            : await client.connectSimulator();
      const latencyMs = "latencyMs" in result && typeof result.latencyMs === "number"
        ? result.latencyMs
        : Date.now() - startedAt;
      setConnection((current) => ({
        ...current,
        status: "connected",
        transport,
        deviceId: result.deviceId,
        deviceName: result.deviceName,
        lastLatencyMs: latencyMs,
        lastReceivedAt: Date.now(),
        error: "",
      }));
      return true;
    } catch (error) {
      const message = error instanceof Error
        ? error.name === "AbortError" ? "Gateway không phản hồi trong 8 giây." : error.message
        : "Không thể kết nối thiết bị.";
      setConnection((current) => ({ ...current, status: "error", error: message }));
      return false;
    }
  }, []);

  const disconnect = useCallback(async () => {
    await clientRef.current?.disconnect();
    setConnection((current) => ({ ...current, status: "idle", transport: null, error: "" }));
  }, []);

  const send = useCallback(async (command: SmartBedCommand) => {
    if (connection.status !== "connected" || !clientRef.current) return false;
    const startedAt = Date.now();
    try {
      await clientRef.current.send(command);
      setConnection((current) => ({ ...current, lastLatencyMs: Date.now() - startedAt, error: "" }));
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không gửi được lệnh.";
      setConnection((current) => ({ ...current, error: message }));
      return false;
    }
  }, [connection.status]);

  return { config, setConfig, connection, connect, disconnect, send };
}

export type { BedConnectionStatus, BedTransport, SmartBedProtocolConfig, SmartBedTelemetry };
