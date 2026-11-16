
export type JobValidationData = {
  title: string;
  company_name: string;
  location: string;
  category: string;
  summary: string;
  description: string;
  salary_min: string;
  salary_max: string;
};

export function validateJob(
  form: JobValidationData
): string | null {
  if (
    !form.title.trim() ||
    !form.company_name.trim() ||
    !form.location.trim() ||
    !form.category.trim() ||
    !form.summary.trim() ||
    !form.description.trim()
  ) {
    return "Please fill in all required fields.";
  }

  const minimum = form.salary_min.trim();
  const maximum = form.salary_max.trim();

  if (minimum || maximum) {
    if (!minimum || !maximum) {
      return "Enter both salary minimum and maximum.";
    }

    const min = Number(minimum);
    const max = Number(maximum);

    if (
      !Number.isFinite(min) ||
      !Number.isFinite(max) ||
      min < 0 ||
      max < min
    ) {
      return "Enter a valid salary range.";
    }
  }

  return null;
}
