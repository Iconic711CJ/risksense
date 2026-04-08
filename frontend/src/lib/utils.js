import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const API_URL = "http://localhost:8000";

export function getRiskColor(rating) {
  const map = {
    Low: { text: "#4ade80", bg: "rgba(74,222,128,0.1)", border: "rgba(74,222,128,0.25)" },
    Tolerable: { text: "#facc15", bg: "rgba(250,204,21,0.1)", border: "rgba(250,204,21,0.25)" },
    High: { text: "#fb923c", bg: "rgba(251,146,60,0.1)", border: "rgba(251,146,60,0.25)" },
    Critical: { text: "#f87171", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.25)" },
  };
  return map[rating] || map["Low"];
}

export function getRiskClass(rating) {
  const map = {
    Low: "risk-low",
    Tolerable: "risk-tolerable",
    High: "risk-high",
    Critical: "risk-critical",
  };
  return map[rating] || "risk-low";
}

export function scoreToRating(score) {
  if (score <= 4) return "Low";
  if (score <= 9) return "Tolerable";
  if (score <= 16) return "High";
  return "Critical";
}

export const RATING_COLORS = {
  Low: "#10b981",      // Emerald 500
  Tolerable: "#f59e0b", // Amber 500
  High: "#f97316",      // Orange 500
  Critical: "#ef4444",   // Red 500
};

export const CHART_COLORS = [
  "#064E3B", "#F97316", "#10b981", "#fbbf24", "#3b82f6",
  "#6366f1", "#ec4899", "#8b5cf6", "#14b8a6", "#ef4444",
];

export const LIKELIHOOD_LABELS = { 1: "Rare", 2: "Unlikely", 3: "Moderate", 4: "Likely", 5: "Common" };
export const IMPACT_LABELS = { 1: "Insignificant", 2: "Minor", 3: "Moderate", 4: "Major", 5: "Critical" };

export function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
