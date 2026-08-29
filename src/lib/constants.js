// Single source of truth for values that were previously copy-pasted
// across many files — see the UX assessment's "3a. Genuine
// duplication risk" section. Nothing here changes behavior; this is
// purely consolidation so a future edit to one of these can't
// silently miss the other seven copies.

export const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

// Used throughout Compare Profiles wherever two people need a
// consistent, distinguishable pair of colors (charts, tables, badges).
export const PERSON_A_COLOR = "#E8639F";
export const PERSON_B_COLOR = "#7FC3E8";
