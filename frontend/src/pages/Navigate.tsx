import axios from "axios";
import { FormEvent, useState } from "react";
import { navigate as fetchRoute, NavigateResponse, Point } from "../api/client";
import { MapView } from "../components/MapView";

function formatDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}

function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.floor(minutes / 60);
  return `${hours} 小时 ${minutes % 60} 分钟`;
}

export function Navigate() {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [result, setResult] = useState<NavigateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await fetchRoute(origin as Point, destination as Point);
      setResult(data);
    } catch (err) {
      const message = axios.isAxiosError(err) && err.response?.data?.error
        ? err.response.data.error
        : "路线规划失败，请重试";
      setError(message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  function useCurrentLocation() {
    if (!("geolocation" in navigator)) {
      setError("当前浏览器不支持定位功能");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setOrigin(`${latitude}, ${longitude}`);
        setLocating(false);
      },
      () => {
        setError("获取当前位置失败，请手动输入起点");
        setLocating(false);
      },
    );
  }

  return (
    <div className="navigate-page">
      <form onSubmit={handleSubmit} className="navigate-form">
        <label>
          起点
          <div className="input-row">
            <input
              type="text"
              placeholder="例如：天安门广场"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              required
            />
            <button type="button" onClick={useCurrentLocation} disabled={locating}>
              {locating ? "定位中..." : "使用当前位置"}
            </button>
          </div>
        </label>
        <label>
          终点
          <input
            type="text"
            placeholder="例如：故宫博物院"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            required
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? "规划中..." : "开始导航"}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {result && (
        <div className="route-summary">
          <span>距离：{formatDistance(result.route.distanceMeters)}</span>
          <span>预计用时：{formatDuration(result.route.durationSeconds)}</span>
        </div>
      )}

      <MapView result={result} />
    </div>
  );
}
