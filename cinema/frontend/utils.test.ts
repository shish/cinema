import { describe, it, expect } from "vitest";
import { minititle } from "./utils";

describe("minititle", () => {
  it("returns title unchanged when folder is empty", () => {
    expect(minititle("", "My Series - S01E01 - Pilot.mkv")).toBe(
      "My Series - S01E01 - Pilot.mkv"
    );
  });

  it("removes folder prefix and leading separators", () => {
    expect(
      minititle("My Series", "My Series - S01E01 - Pilot.mkv")
    ).toBe("S01E01 - Pilot.mkv");
  });

  it("is case-insensitive when matching folder", () => {
    expect(
      minititle("my series", "My Series - S01E01 - Pilot.mkv")
    ).toBe("S01E01 - Pilot.mkv");
  });

  it("removes leading separators even when folder does not match", () => {
    expect(minititle("Series", " - S01E01 - Pilot.mkv")).toBe(
      "S01E01 - Pilot.mkv"
    );
  });

  it("does not change title without prefix or leading separators", () => {
    expect(minititle("Series", "Pilot.mkv")).toBe("Pilot.mkv");
  });

  it("removes leading underscores after slicing", () => {
    expect(minititle("Show", "Show___Episode.mkv")).toBe("Episode.mkv");
  });

  it("returns empty string when title equals folder", () => {
    expect(minititle("My Series", "My Series")).toBe("");
  });

  it("handles multiple leading hyphens", () => {
    expect(minititle("A", "A---Episode")).toBe("Episode");
  });
});
