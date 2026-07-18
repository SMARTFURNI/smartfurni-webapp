export type BedProductFamily = "ergonomic_bed" | "electric_mattress";
export type BedZone = "all" | "left" | "right";

export interface BedDeviceCapabilities {
  head: boolean;
  foot: boolean;
  dualZone: boolean;
  led: boolean;
  massage: boolean;
  sleepSensor: boolean;
  maxHeadAngle: number;
  maxFootAngle: number;
}

export interface BedDeviceProfile {
  id: string;
  productId: string;
  family: BedProductFamily;
  name: string;
  shortName: string;
  image: string;
  skuPrefix: string;
  capabilities: BedDeviceCapabilities;
}

/**
 * Hồ sơ điều khiển được đối chiếu với các dòng sản phẩm đang hiển thị trên website.
 * Các capability quyết định tính năng nào xuất hiện trong app và giới hạn góc an toàn.
 */
export const BED_DEVICE_PROFILES: BedDeviceProfile[] = [
  {
    id: "ergonomic-basic",
    productId: "p1",
    family: "ergonomic_bed",
    name: "Giường Công Thái Học Điều Chỉnh Điện SmartFurni Basic",
    shortName: "SmartFurni Basic",
    image: "/uploads/products/smartfurni-bed-main.webp",
    skuPrefix: "SFB",
    capabilities: {
      head: true,
      foot: true,
      dualZone: false,
      led: false,
      massage: false,
      sleepSensor: false,
      maxHeadAngle: 70,
      maxFootAngle: 45,
    },
  },
  {
    id: "ergonomic-pro-2026",
    productId: "p4",
    family: "ergonomic_bed",
    name: "Giường Công Thái Học Điều Chỉnh Điện SmartFurni Pro 2026",
    shortName: "SmartFurni Pro 2026",
    image: "/uploads/products/smartfurni-bed-main.webp",
    skuPrefix: "SFP",
    capabilities: {
      head: true,
      foot: true,
      dualZone: true,
      led: true,
      massage: true,
      sleepSensor: true,
      maxHeadAngle: 70,
      maxFootAngle: 45,
    },
  },
  {
    id: "ergonomic-elite",
    productId: "p3",
    family: "ergonomic_bed",
    name: "Giường Công Thái Học Điều Chỉnh Điện SmartFurni Elite",
    shortName: "SmartFurni Elite",
    image: "/uploads/products/smartfurni-bed-main.webp",
    skuPrefix: "SFE",
    capabilities: {
      head: true,
      foot: true,
      dualZone: true,
      led: true,
      massage: true,
      sleepSensor: true,
      maxHeadAngle: 70,
      maxFootAngle: 45,
    },
  },
  {
    id: "mattress-comfort",
    productId: "electric-mattress-comfort",
    family: "electric_mattress",
    name: "Nệm Thông Minh Điều Chỉnh Điện SmartFurni Comfort",
    shortName: "Nệm Comfort",
    image: "/uploads/products/electric-mattress/smartfurni-electric-mattress-comfort.webp",
    skuPrefix: "SF-MC",
    capabilities: {
      head: true,
      foot: true,
      dualZone: true,
      led: false,
      massage: false,
      sleepSensor: false,
      maxHeadAngle: 65,
      maxFootAngle: 35,
    },
  },
  {
    id: "mattress-plus",
    productId: "electric-mattress-plus",
    family: "electric_mattress",
    name: "Nệm Thông Minh Điều Chỉnh Điện SmartFurni Plus",
    shortName: "Nệm Plus",
    image: "/uploads/products/electric-mattress/smartfurni-electric-mattress-plus.webp",
    skuPrefix: "SF-MP",
    capabilities: {
      head: true,
      foot: true,
      dualZone: true,
      led: true,
      massage: false,
      sleepSensor: false,
      maxHeadAngle: 65,
      maxFootAngle: 35,
    },
  },
  {
    id: "mattress-premium",
    productId: "electric-mattress-premium",
    family: "electric_mattress",
    name: "Nệm Thông Minh Điều Chỉnh Điện SmartFurni Premium",
    shortName: "Nệm Premium",
    image: "/uploads/products/electric-mattress/smartfurni-electric-mattress-premium.webp",
    skuPrefix: "SF-MPR",
    capabilities: {
      head: true,
      foot: false,
      dualZone: true,
      led: true,
      massage: true,
      sleepSensor: false,
      maxHeadAngle: 65,
      maxFootAngle: 0,
    },
  },
  {
    id: "mattress-dual",
    productId: "electric-mattress-dual",
    family: "electric_mattress",
    name: "Nệm Thông Minh Điều Chỉnh Điện SmartFurni Dual",
    shortName: "Nệm Dual",
    image: "/uploads/products/electric-mattress/smartfurni-electric-mattress-dual.webp",
    skuPrefix: "SF-MD",
    capabilities: {
      head: true,
      foot: true,
      dualZone: true,
      led: true,
      massage: true,
      sleepSensor: true,
      maxHeadAngle: 65,
      maxFootAngle: 35,
    },
  },
];

export const DEFAULT_BED_DEVICE_PROFILE_ID = "ergonomic-elite";

export function getBedDeviceProfile(profileId: string): BedDeviceProfile {
  return BED_DEVICE_PROFILES.find((profile) => profile.id === profileId)
    ?? BED_DEVICE_PROFILES.find((profile) => profile.id === DEFAULT_BED_DEVICE_PROFILE_ID)
    ?? BED_DEVICE_PROFILES[0];
}
