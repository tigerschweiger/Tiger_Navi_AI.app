import axios from "axios";
import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BusinessCategory, CATEGORY_LABELS, createBusiness, getBusiness, updateBusiness } from "../api/places";

interface BusinessFormProps {
  mode: "create" | "edit";
}

export function BusinessForm({ mode }: BusinessFormProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [category, setCategory] = useState<BusinessCategory>("RESTAURANT");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(mode === "edit");

  useEffect(() => {
    if (mode === "edit" && id) {
      getBusiness(id)
        .then((business) => {
          setName(business.name);
          setCategory(business.category);
          setDescription(business.description);
          setAddress(business.address);
        })
        .catch(() => setError("加载商家信息失败"))
        .finally(() => setLoading(false));
    }
  }, [mode, id]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const input = { name, category, description, address };
      const business = mode === "create" ? await createBusiness(input) : await updateBusiness(id!, input);
      navigate(`/places/${business.id}`);
    } catch (err) {
      const message = axios.isAxiosError(err) && err.response?.data?.error
        ? err.response.data.error
        : "保存失败，请重试";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p>加载中...</p>;
  }

  return (
    <div className="business-form-page">
      <form onSubmit={handleSubmit} className="business-form">
        <h2>{mode === "create" ? "添加商家" : "编辑商家"}</h2>
        {error && <p className="error">{error}</p>}
        <label>
          名称
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          分类
          <select value={category} onChange={(e) => setCategory(e.target.value as BusinessCategory)}>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          简介
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} required />
        </label>
        <label>
          地址
          <input
            type="text"
            placeholder="例如：北京市东城区天安门广场"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? "保存中..." : "保存"}
        </button>
      </form>
    </div>
  );
}
