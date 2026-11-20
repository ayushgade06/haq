import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  addWorkingDays,
  addYears,
  diffDays,
  fmtDate,
  inr,
  isIsoDate,
  isWorkingDay,
  workingDaysBetween,
} from "@/lib/rules/dates";

describe("dates", () => {
  it("adds days across month, year and leap-day boundaries", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2028-02-29", 1)).toBe("2028-03-01");
    expect(addDays("2027-02-28", 1)).toBe("2027-03-01");
  });

  it("diffs days, negative when earlier", () => {
    expect(diffDays("2026-11-03", "2026-11-20")).toBe(17);
    expect(diffDays("2026-11-20", "2026-11-03")).toBe(-17);
    expect(diffDays("2028-02-01", "2028-03-01")).toBe(29);
  });

  it("adds months, clamping to the month's last day", () => {
    expect(addMonths("2026-09-01", 1)).toBe("2026-10-01");
    expect(addMonths("2027-01-31", 1)).toBe("2027-02-28");
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
    expect(addMonths("2026-12-15", 1)).toBe("2027-01-15");
  });

  it("adds years; 29 Feb rolls back to 28 Feb", () => {
    expect(addYears("2026-10-01", 2)).toBe("2028-10-01");
    expect(addYears("2028-02-29", 1)).toBe("2029-02-28");
  });

  it("knows Sundays and 2nd/4th Saturdays are not working days", () => {
    expect(isWorkingDay("2026-11-15")).toBe(false); // Sunday
    expect(isWorkingDay("2026-11-14")).toBe(false); // 2nd Saturday
    expect(isWorkingDay("2026-11-28")).toBe(false); // 4th Saturday
    expect(isWorkingDay("2026-11-07")).toBe(true); // 1st Saturday
    expect(isWorkingDay("2026-11-21")).toBe(true); // 3rd Saturday
    expect(isWorkingDay("2026-08-29")).toBe(true); // 5th Saturday
    expect(isWorkingDay("2026-11-13")).toBe(true); // Friday
  });

  it("counts working days from the day after, skipping a 2nd Saturday and Sunday", () => {
    expect(workingDaysBetween("2026-11-13", "2026-11-13")).toBe(0);
    expect(workingDaysBetween("2026-11-13", "2026-11-18")).toBe(3);
    expect(workingDaysBetween("2026-11-13", "2026-11-19")).toBe(4);
    expect(addWorkingDays("2026-11-13", 3)).toBe("2026-11-18");
    expect(addWorkingDays("2026-11-19", 10)).toBe("2026-12-02");
  });

  it("validates real ISO dates only", () => {
    expect(isIsoDate("2026-11-20")).toBe(true);
    expect(isIsoDate("2028-02-29")).toBe(true);
    expect(isIsoDate("2027-02-29")).toBe(false);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-13-01")).toBe(false);
    expect(isIsoDate("20-11-2026")).toBe(false);
  });

  it("formats dates and rupees for rule text", () => {
    expect(fmtDate("2026-11-03")).toBe("3 Nov 2026");
    expect(inr(500_000)).toBe("₹5,00,000");
    expect(inr(1_700)).toBe("₹1,700");
  });
});
