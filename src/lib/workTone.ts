export function toneClass(tone: string) {
  const tones: Record<string, string> = {
    graphite:
      "bg-[radial-gradient(circle_at_70%_25%,rgba(121,199,189,0.36),transparent_30%),linear-gradient(135deg,#11151a,#22262c_46%,#08090a)]",
    bronze:
      "bg-[radial-gradient(circle_at_70%_30%,rgba(216,176,123,0.38),transparent_32%),linear-gradient(135deg,#0b0f12,#2b2119_52%,#080808)]",
    warm:
      "bg-[radial-gradient(circle_at_72%_18%,rgba(241,231,214,0.22),transparent_30%),linear-gradient(135deg,#15110e,#392b21_52%,#080707)]",
    mono:
      "bg-[radial-gradient(circle_at_68%_26%,rgba(243,246,243,0.22),transparent_32%),linear-gradient(135deg,#060606,#303030_50%,#0a0a0a)]",
    red: "bg-[radial-gradient(circle_at_70%_22%,rgba(197,85,66,0.42),transparent_30%),linear-gradient(135deg,#100f0f,#341a17_48%,#080707)]",
    blue: "bg-[radial-gradient(circle_at_68%_24%,rgba(111,166,217,0.38),transparent_32%),linear-gradient(135deg,#080d14,#172a3c_48%,#07090c)]",
    cyan: "bg-[radial-gradient(circle_at_68%_24%,rgba(139,215,205,0.38),transparent_32%),linear-gradient(135deg,#07100f,#102d2b_48%,#050606)]",
    orange:
      "bg-[radial-gradient(circle_at_68%_24%,rgba(242,109,33,0.36),transparent_32%),linear-gradient(135deg,#100b07,#2b160d_48%,#060504)]",
  };

  return tones[tone] ?? tones.graphite;
}
