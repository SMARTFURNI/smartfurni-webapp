import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SmartFurni — Giải Pháp Giấc Ngủ Thông Minh",
    short_name: "SmartFurni",
    description: "Giường công thái học, nệm thông minh điều chỉnh điện, sofa giường và phụ kiện SmartFurni.",
    start_url: "/",
    display: "standalone",
    background_color: "#17130A",
    theme_color: "#C9A84C",
    lang: "vi-VN",
    icons: [
      {
        src: "/smartfurni-icon.png",
        sizes: "128x128",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
