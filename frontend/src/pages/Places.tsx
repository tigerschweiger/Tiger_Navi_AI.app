import { useState } from "react";
import { Link } from "react-router-dom";
import { PlacesMap } from "../components/PlacesMap";
import { BusinessCategory, BusinessSummary, Bounds, CATEGORY_LABELS, listBusinesses } from "../api/places";

export function Places() {
  const [businesses, setBusinesses] = useState<BusinessSummary[]>([]);
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [category, setCategory] = useState<BusinessCategory | "">("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function refresh(nextBounds: Bounds, nextCategory: BusinessCategory | "", nextQuery: string) {
    try {
      const results = await listBusinesses(nextBounds, {
        category: nextCategory || undefined,
        q: nextQuery || undefined,
      });
      setBusinesses(results);
      setError(null);
    } catch {
      setError("加载商家列表失败，请重试");
    }
  }

  function handleBoundsChange(nextBounds: Bounds) {
    setBounds(nextBounds);
    refresh(nextBounds, category, query);
  }

  function handleFilterSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (bounds) {
      refresh(bounds, category, query);
    }
  }

  return (
    <div className="places-page">
      <form onSubmit={handleFilterSubmit} className="places-toolbar">
        <input
          type="text"
          placeholder="搜索商家名称或简介"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select value={category} onChange={(e) => setCategory(e.target.value as BusinessCategory | "")}>
          <option value="">全部分类</option>
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button type="submit">搜索</button>
        <Link to="/places/new" className="add-business-button">
          + 添加商家
        </Link>
      </form>

      {error && <p className="error">{error}</p>}

      <PlacesMap businesses={businesses} onBoundsChange={handleBoundsChange} />
    </div>
  );
}
