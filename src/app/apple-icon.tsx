import { ImageResponse } from "next/og";
import { poppinsOgFonts } from "@/lib/ogFonts";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#08090B",
        }}
      >
        <div
          style={{
            color: "#A8FF2A",
            fontSize: 88,
            fontWeight: 700,
            fontFamily: "Poppins",
          }}
        >
          AI
        </div>
      </div>
    ),
    { ...size, fonts: poppinsOgFonts() }
  );
}
