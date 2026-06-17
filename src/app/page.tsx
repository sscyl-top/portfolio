import { CapabilityBands } from "@/components/home/CapabilityBands";
import { HeroShowcase } from "@/components/home/HeroShowcase";
import { resume } from "@/data/portfolio";

export default function Home() {
  return (
    <main>
      <HeroShowcase />
      <CapabilityBands strengths={resume.strengths} />
    </main>
  );
}
