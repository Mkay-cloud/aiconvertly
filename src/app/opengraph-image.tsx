import { ImageResponse } from "next/og";
import { poppinsOgFonts } from "@/lib/ogFonts";
import { SITE_CATEGORY_SUMMARY } from "@/lib/site";

export const alt = `AI convertly — Convert files. Right in your browser. Free ${SITE_CATEGORY_SUMMARY} tools. No uploads, no sign-up.`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#08090B",
          padding: 80,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 40,
            fontWeight: 700,
            marginBottom: 32,
            fontFamily: "Poppins",
          }}
        >
          <span style={{ color: "#A8FF2A" }}>AI</span>
          <span style={{ color: "#FFFFFF" }}>&nbsp;convertly</span>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 64,
            fontWeight: 700,
            color: "#FFFFFF",
            textAlign: "center",
            lineHeight: 1.15,
            fontFamily: "Poppins",
          }}
        >
          Convert files. Right in your browser.
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 32,
            fontSize: 28,
            color: "#A7ABB4",
            fontFamily: "Poppins",
          }}
        >
          Free {SITE_CATEGORY_SUMMARY} tools. No uploads, no sign-up.
        </div>
      </div>
    ),
    { ...size, fonts: poppinsOgFonts() }
  );
}
