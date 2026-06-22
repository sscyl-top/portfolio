import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          borderRadius: "6px",
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="2" y="2" width="20" height="20" rx="4" fill="#0a0a0a" />
          <path
            d="M7 17.5V6.5L17 12L7 17.5Z"
            fill="#c9a27f"
          />
          <rect x="17" y="15" width="2" height="2" rx="0.5" fill="#8bd7cd" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
