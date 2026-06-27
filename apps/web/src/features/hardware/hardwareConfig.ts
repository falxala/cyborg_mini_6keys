export const HARDWARE_CONFIG = {
  productName: "Cyborg Mini 8 Keys",
  keyCount: 8,
  layerCount: 6,
  virtualGroundCount: 2,
  externalRgbLed: false,
  oled: false,
  encoder: {
    enabled: false,
    reservedForFuture: true,
  },
  keyPins: [
    { id: "k1", label: "K1", bit: 0 },
    { id: "k2", label: "K2", bit: 1 },
    { id: "k3", label: "K3", bit: 2 },
    { id: "k4", label: "K4", bit: 3 },
    { id: "k5", label: "K5", bit: 4 },
    { id: "k6", label: "K6", bit: 5 },
    { id: "k7", label: "K7", bit: 6 },
    { id: "k8", label: "K8", bit: 7 },
  ],
} as const;
