import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OfficialInfo } from "@/components/official-info";
import { SocietyAvatar } from "@/components/society-avatar";
import type { Society } from "@/lib/types";
import { safeHref } from "@/lib/utils";

const society: Society = {
  id: "chess-society-city-campus", name: "Chess Society (City Campus)", shortName: "Chess Society", category: "Special Interest/Social",
  tagline: "", description: "", icon: "Dices", accent: "emerald", memberCount: 0, tags: [], committee: [], requiresApproval: false, meets: "",
  campus: "City",
  logoUrl: "https://societies.tudublin.ie/admin/uploads/images/organisation/profile/ChessSocLogo_1649697607_th.png",
  joinUrl: "https://mystudentlife.tudublin.ie/account/index.php?organisationID=MzIwNQ==",
  officialUrl: "https://societies.tudublin.ie/societies/chesssocietycitycampus",
  contactEmail: "chess@societies.tudublin.ie",
  links: [
    { kind: "linktree", url: "https://linktr.ee/TUDchess", label: null },
    { kind: "instagram", url: "https://www.instagram.com/tudchess/", label: "@tudchess" },
    { kind: "other", url: "javascript:alert(1)", label: "Sneaky" },
  ],
};

describe("safeHref", () => {
  it("allows web and mail links only", () => {
    expect(safeHref("https://linktr.ee/TUDchess")).toBe("https://linktr.ee/TUDchess");
    expect(safeHref("mailto:chess@societies.tudublin.ie")).toBe("mailto:chess@societies.tudublin.ie");
    expect(safeHref("javascript:alert(1)")).toBeUndefined();
    expect(safeHref("not a url")).toBeUndefined();
    expect(safeHref(undefined)).toBeUndefined();
  });
});

describe("OfficialInfo", () => {
  it("shows the official join link, contact and links, and drops unsafe ones", () => {
    render(<OfficialInfo society={society} />);
    expect(screen.getByRole("link", { name: /join on mystudentlife/i })).toHaveAttribute("href", society.joinUrl);
    expect(screen.getByRole("link", { name: "chess@societies.tudublin.ie" })).toHaveAttribute("href", "mailto:chess@societies.tudublin.ie");
    expect(screen.getByRole("link", { name: "Linktree" })).toHaveAttribute("href", "https://linktr.ee/TUDchess");
    expect(screen.getByRole("link", { name: "@tudchess" })).toBeInTheDocument();
    expect(screen.queryByText("Sneaky")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "From societies.tudublin.ie" })).toHaveAttribute("href", society.officialUrl);
  });

  it("renders nothing for a society created in the app", () => {
    const { container } = render(<OfficialInfo society={{ ...society, joinUrl: undefined, officialUrl: undefined, contactEmail: undefined, links: [] }} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("SocietyAvatar", () => {
  it("uses the official logo and falls back to the icon if it fails to load", () => {
    const { container } = render(<SocietyAvatar society={society} />);
    const img = container.querySelector("img");
    expect(img).toHaveAttribute("src", society.logoUrl);
    fireEvent.error(img!);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("uses the icon when there is no logo", () => {
    const { container } = render(<SocietyAvatar society={{ ...society, logoUrl: undefined }} />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
