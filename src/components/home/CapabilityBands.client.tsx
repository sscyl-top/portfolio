"use client";

import dynamic from "next/dynamic";
import type { CapabilityTextOverrides } from "./CapabilityBands";

const CapabilityBandsClient = dynamic(
  () => import("./CapabilityBands").then((mod) => mod.CapabilityBands),
  { ssr: false, loading: () => <div className="min-h-screen" aria-hidden="true" /> },
);

export function CapabilityBands(props: {
  strengths: string[];
  textOverrides?: CapabilityTextOverrides;
}) {
  return <CapabilityBandsClient {...props} />;
}
