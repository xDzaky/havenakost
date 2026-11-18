"use client";

import React, { useState } from "react";
import kostsData from "@/data/kost-300.json";
import { CAMPUSES, AREAS } from "@/data/landmarks";
import type { KostListing, Landmark } from "@/types/kost";

import { SvgIcons } from "@/components/layout/SvgIcons";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/landing/HeroSection";
import { TrustbandSection } from "@/components/landing/TrustbandSection";
import { FilterSection } from "@/components/landing/FilterSection";
import { StepsSection } from "@/components/landing/StepsSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { FaqSection } from "@/components/landing/FaqSection";
import { CtaSection } from "@/components/landing/CtaSection";
import { DetailModal } from "@/components/landing/DetailModal";

const allKosts = kostsData as KostListing[];

export default function HomePage() {
  const [selectedDest, setSelectedDest] = useState<Landmark>(CAMPUSES[0]);
  const [selectedKostId, setSelectedKostId] = useState<string | null>(null);

  const activeKost = selectedKostId
    ? allKosts.find((k) => k.id === selectedKostId) || null
    : null;

  const handleSelectCampus = (campus: Landmark) => {
    setSelectedDest(campus);
    const el = document.getElementById("filter-section");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const handleSearchSubmit = (query: string) => {
    const q = query.toLowerCase().trim();
    const matchedCampus = CAMPUSES.find(
      (c) => c.name.toLowerCase().includes(q) || c.short.toLowerCase().includes(q)
    );
    if (matchedCampus) {
      setSelectedDest(matchedCampus);
    }
  };

  return (
    <>
      <SvgIcons />
      <Navbar />
      <main id="viewPublic" style={{ paddingTop: 68 }}>
        <HeroSection
          campuses={CAMPUSES}
          selectedDest={selectedDest}
          onSelectCampus={handleSelectCampus}
          onSearchSubmit={handleSearchSubmit}
        />
        <TrustbandSection />
        <FilterSection
          kosts={allKosts}
          campuses={CAMPUSES}
          areas={AREAS}
          selectedDest={selectedDest}
          onSelectDest={setSelectedDest}
          onOpenDetail={(id) => setSelectedKostId(id)}
        />
        <StepsSection />
        <FeaturesSection />
        <TestimonialsSection />
        <FaqSection />
        <CtaSection />
      </main>
      <Footer />

      {/* DETAIL MODAL */}
      <DetailModal
        kost={activeKost}
        dest={selectedDest}
        onClose={() => setSelectedKostId(null)}
      />
    </>
  );
}
