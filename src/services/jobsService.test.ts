
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getActiveJobs } from "./jobsService";

// Mock the Supabase database operations
const { mockFrom, mockSelect, mockEq, mockOr, mockOrder } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockSelect: vi.fn(),
  mockEq: vi.fn(),
  mockOr: vi.fn(),
  mockOrder: vi.fn(),
}));

vi.mock("../lib/supabase", () => ({
  supabase: {
    from: mockFrom,
  },
}));

describe("getActiveJobs", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mockFrom.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ or: mockOr });
    mockOr.mockReturnValue({ order: mockOrder });
  });

  it("returns active jobs successfully", async () => {
    const jobs = [
      { id: 1, title: "Software Developer" },
      { id: 2, title: "Data Analyst" },
    ];

    mockOrder.mockResolvedValue({
      data: jobs,
      error: null,
    });

    const result = await getActiveJobs();

    expect(result).toEqual(jobs);
    expect(mockFrom).toHaveBeenCalledWith("jobs");
    expect(mockSelect).toHaveBeenCalledWith("*");
    expect(mockEq).toHaveBeenCalledWith("is_active", true);

    expect(mockOr).toHaveBeenCalledWith(
      expect.stringMatching(
        /^application_deadline\.is\.null,application_deadline\.gte\.\d{4}-\d{2}-\d{2}$/
      )
    );

    expect(mockOrder).toHaveBeenCalledWith("posted_at", {
      ascending: false,
    });
  });

  it("returns an empty array when no jobs are found", async () => {
    mockOrder.mockResolvedValue({
      data: null,
      error: null,
    });

    const result = await getActiveJobs();

    expect(result).toEqual([]);
  });

  it("throws an error when fetching jobs fails", async () => {
    mockOrder.mockResolvedValue({
      data: null,
      error: { message: "Database unavailable" },
    });

    await expect(getActiveJobs()).rejects.toThrow(
      "Failed to fetch jobs: Database unavailable"
    );
  });
});
