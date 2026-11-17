
import { describe, expect, it } from "vitest";
import { validateJob } from "../src/pages/recruiter/jobValidation";

const validJob = {
  title: "Software Developer",
  company_name: "Tech Company",
  location: "Montreal",
  category: "Technology",
  summary: "Software development position",
  description: "Develop and maintain applications",
  salary_min: "50000",
  salary_max: "80000",
};

describe("Recruiter Job Validation", () => {
  it("accepts a valid job posting", () => {
    expect(validateJob(validJob)).toBeNull();
  });

  it("rejects missing required fields", () => {
    expect(
      validateJob({ ...validJob, title: "" })
    ).toBe("Please fill in all required fields.");
  });

  it("rejects whitespace-only required fields", () => {
    expect(
      validateJob({ ...validJob, company_name: "   " })
    ).toBe("Please fill in all required fields.");
  });

  it("rejects an incomplete salary range", () => {
    expect(
      validateJob({ ...validJob, salary_max: "" })
    ).toBe("Enter both salary minimum and maximum.");
  });

  it("rejects a negative salary", () => {
    expect(
      validateJob({ ...validJob, salary_min: "-100" })
    ).toBe("Enter a valid salary range.");
  });

  it("rejects a maximum salary below minimum", () => {
    expect(
      validateJob({ ...validJob, salary_max: "30000" })
    ).toBe("Enter a valid salary range.");
  });

  it("allows a job posting without salary information", () => {
    expect(
      validateJob({
        ...validJob,
        salary_min: "",
        salary_max: "",
      })
    ).toBeNull();
  });

  it("rejects nonnumeric salary values", () => {
    expect(
      validateJob({ ...validJob, salary_min: "abc" })
    ).toBe("Enter a valid salary range.");
  });
});
