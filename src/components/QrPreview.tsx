import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QrPreview({ value, alt }: { value: string; alt: string }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    let active = true;

    QRCode.toDataURL(value, {
      margin: 1,
      width: 220,
      color: {
        dark: "#0f172a",
        light: "#f8fafc"
      }
    }).then((dataUrl) => {
      if (active) {
        setSrc(dataUrl);
      }
    });

    return () => {
      active = false;
    };
  }, [value]);

  if (!src) {
    return <div className="h-[220px] w-[220px] animate-pulse rounded-3xl bg-sand" />;
  }

  return <img src={src} alt={alt} className="h-[220px] w-[220px] rounded-3xl bg-white p-3 shadow-panel" />;
}
