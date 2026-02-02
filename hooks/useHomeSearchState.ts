// hooks/useHomeSearchState.ts
import { useMemo, useState } from "react";

export type HomeSort = "relevance" | "price_asc" | "price_desc";

export function useHomeSearchState() {
  const [query, setQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sort, setSort] = useState<HomeSort>("relevance");

  return useMemo(
    () => ({
      query,
      setQuery,
      selectedCategory,
      setSelectedCategory,
      sort,
      setSort,
    }),
    [query, selectedCategory, sort]
  );
}
