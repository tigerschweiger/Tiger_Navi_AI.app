import axios from "axios";
import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Stars } from "../components/Stars";
import {
  BusinessDetail as BusinessDetailType,
  CATEGORY_LABELS,
  deleteBusiness,
  deleteReview,
  getBusiness,
  getBusinessSummary,
  upsertReview,
} from "../api/places";

export function BusinessDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [business, setBusiness] = useState<BusinessDetailType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  async function load() {
    if (!id) return;
    try {
      const data = await getBusiness(id);
      setBusiness(data);
      const own = data.reviews.find((r) => r.user.id === user?.id);
      if (own) {
        setRating(own.rating);
        setComment(own.comment);
      }
      setError(null);
    } catch {
      setError("加载商家详情失败");
    }
  }

  useEffect(() => {
    setSummary(null);
    setSummaryError(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSummarize() {
    if (!id) return;
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const result = await getBusinessSummary(id);
      setSummary(result);
    } catch {
      setSummaryError("生成总结失败，请重试");
    } finally {
      setSummaryLoading(false);
    }
  }

  async function handleReviewSubmit(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSubmitting(true);
    try {
      await upsertReview(id, { rating, comment });
      await load();
    } catch (err) {
      const message = axios.isAxiosError(err) && err.response?.data?.error
        ? err.response.data.error
        : "提交评论失败";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteReview(reviewId: string) {
    if (!id) return;
    await deleteReview(id, reviewId);
    await load();
  }

  async function handleDeleteBusiness() {
    if (!id || !business) return;
    if (!window.confirm(`确定要删除「${business.name}」吗？`)) return;
    await deleteBusiness(id);
    navigate("/places");
  }

  if (error && !business) {
    return <p className="error">{error}</p>;
  }

  if (!business) {
    return <p>加载中...</p>;
  }

  const isOwner = user?.id === business.owner.id;
  const myReview = business.reviews.find((r) => r.user.id === user?.id);

  return (
    <div className="business-detail">
      <div className="business-header">
        <div>
          <h2>{business.name}</h2>
          <p className="business-meta">
            {CATEGORY_LABELS[business.category]} · {business.address}
          </p>
          <p className="business-rating">
            <Stars value={Math.round(business.averageRating ?? 0)} />
            {business.averageRating !== null
              ? `${business.averageRating.toFixed(1)} 分（${business.reviewCount} 条评论）`
              : "暂无评分"}
          </p>
        </div>
        {isOwner && (
          <div className="business-owner-actions">
            <Link to={`/places/${business.id}/edit`}>编辑</Link>
            <button onClick={handleDeleteBusiness}>删除商家</button>
          </div>
        )}
      </div>

      <p className="business-description">{business.description}</p>

      <section className="reviews-section">
        <h3>评论</h3>

        {business.reviewCount > 0 && (
          <div className="ai-summary">
            {summary !== null ? (
              <p>{summary}</p>
            ) : (
              <button onClick={handleSummarize} disabled={summaryLoading}>
                {summaryLoading ? "AI 总结中..." : "AI 总结点评"}
              </button>
            )}
            {summaryError && <p className="error">{summaryError}</p>}
          </div>
        )}

        <form onSubmit={handleReviewSubmit} className="review-form">
          <Stars value={rating} onChange={setRating} />
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="写下你的评价"
            required
          />
          <button type="submit" disabled={submitting}>
            {myReview ? "更新我的评论" : "提交评论"}
          </button>
        </form>

        {error && <p className="error">{error}</p>}

        <ul className="review-list">
          {business.reviews.map((review) => (
            <li key={review.id}>
              <div className="review-item-header">
                <span className="review-author">{review.user.name}</span>
                <Stars value={review.rating} />
                <span className="review-date">{new Date(review.createdAt).toLocaleDateString()}</span>
              </div>
              <p>{review.comment}</p>
              {review.user.id === user?.id && (
                <button onClick={() => handleDeleteReview(review.id)}>删除我的评论</button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
