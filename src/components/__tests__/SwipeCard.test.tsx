import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SwipeCard, { type DiscoverProfile } from "@/components/SwipeCard";

// Mock verification hook (depends on supabase)
vi.mock("@/hooks/useVerification", () => ({
  useVerificationStatus: () => ({ isVerified: false, loading: false }),
}));

const baseProfile: DiscoverProfile = {
  user_id: "demo-luna",
  display_name: "Luna Sky",
  username: "luna",
  avatar_url: null,
  sun_sign: "Pisces",
  moon_sign: "Cancer",
  rising_sign: "Libra",
  human_design_type: "Generator",
  life_path_number: 7,
  social_energy: 5,
  interests: ["astrology", "yoga"],
  compatibility_tags: ["Deep Thinker"],
  gene_keys_life_purpose: null,
  compatibility_score: 87,
  connection_type: "soulmate",
  compatibility_reason: "Strong elemental harmony",
  shared_aspects: ["Water signs"],
  birth_date: "1995-03-14",
  birth_place: "Los Angeles, CA",
  current_city: "Los Angeles",
  distance_km: 10,
  bio_prompt_1: "My ideal Sunday",
  bio_prompt_1_answer:
    "A long slow morning with coffee, journaling under the sun, then a hike to clear my head before a candlelit dinner with someone curious and kind. I believe in slow, intentional living.",
  relationship_goal: "Long-term",
  about_me: "I'm a curious soul exploring life's mysteries.",
  photo_urls: [],
};

const renderCard = (overrides: Partial<DiscoverProfile> = {}) =>
  render(
    <MemoryRouter>
      <SwipeCard
        profile={{ ...baseProfile, ...overrides }}
        onSwipe={vi.fn()}
        isTop={true}
      />
    </MemoryRouter>
  );

describe("SwipeCard — profile bio & expander smoke tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the bio prompt question and answer by default (no extra tap required)", () => {
    renderCard();
    // Question label visible
    expect(screen.getByText(/My ideal Sunday/i)).toBeInTheDocument();
    // Answer text rendered (clamped, but text is in DOM)
    expect(
      screen.getByText(/A long slow morning with coffee/i)
    ).toBeInTheDocument();
  });

  it("renders 'Tap to read more' affordance when bio answer is long", () => {
    renderCard();
    expect(screen.getByText(/Tap to read more/i)).toBeInTheDocument();
  });

  it("toggles bio expansion when the bio button is clicked", () => {
    renderCard();
    const bioBtn = screen.getByRole("button", { name: /My ideal Sunday/i });
    expect(bioBtn).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(bioBtn);
    expect(bioBtn).toHaveAttribute("aria-expanded", "true");
    expect(within(bioBtn).getByText(/Tap to collapse/i)).toBeInTheDocument();
    fireEvent.click(bioBtn);
    expect(bioBtn).toHaveAttribute("aria-expanded", "false");
  });

  it("does NOT render the bio block when the profile has no bio prompt", () => {
    renderCard({ bio_prompt_1: null, bio_prompt_1_answer: null });
    expect(screen.queryByText(/My ideal Sunday/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Tap to read more/i)).not.toBeInTheDocument();
  });

  it("renders 'More details' expander for secondary content (about_me, shared aspects, reason)", () => {
    renderCard();
    const moreBtn = screen.getByRole("button", { name: /More details/i });
    expect(moreBtn).toHaveAttribute("aria-expanded", "false");
    // Hidden content not in DOM yet
    expect(screen.queryByText(/curious soul exploring/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Strong elemental harmony/i)).not.toBeInTheDocument();

    fireEvent.click(moreBtn);
    expect(moreBtn).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/curious soul exploring/i)).toBeInTheDocument();
    expect(screen.getByText(/Strong elemental harmony/i)).toBeInTheDocument();
  });

  it("hides 'More details' button when there is no secondary content", () => {
    renderCard({
      about_me: null,
      shared_aspects: [],
      compatibility_reason: "",
    });
    expect(
      screen.queryByRole("button", { name: /More details/i })
    ).not.toBeInTheDocument();
    // Bio block should still render independently
    expect(screen.getByText(/My ideal Sunday/i)).toBeInTheDocument();
  });

  it("bio remains visible regardless of 'More details' state (decoupled from expander)", () => {
    renderCard();
    expect(screen.getByText(/My ideal Sunday/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /More details/i }));
    expect(screen.getByText(/My ideal Sunday/i)).toBeInTheDocument();
  });

  it("bio expanded state is independent of 'More details' toggle", () => {
    renderCard();
    const bioBtn = screen.getByRole("button", { name: /My ideal Sunday/i });
    // Expand bio
    fireEvent.click(bioBtn);
    expect(bioBtn).toHaveAttribute("aria-expanded", "true");

    // Toggle More details open then closed — bio should remain expanded
    const moreBtn = screen.getByRole("button", { name: /More details/i });
    fireEvent.click(moreBtn); // open
    fireEvent.click(screen.getByRole("button", { name: /Less details/i })); // close
    expect(bioBtn).toHaveAttribute("aria-expanded", "true");
  });
});