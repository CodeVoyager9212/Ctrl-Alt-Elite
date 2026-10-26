export type JobFilters = {
  keyword: string;
  location: string;
  category: string;
  workMode: string;
  employmentType: string;
  sortBy: string;
};

export const defaultJobFilters: JobFilters = {
  keyword: "",
  location: "",
  category: "",
  workMode: "",
  employmentType: "",
  sortBy: "newest",
};
