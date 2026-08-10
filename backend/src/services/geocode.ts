import { HttpError } from "../middleware/errorHandler";

const NOMINATIM_BASE_URL = process.env.NOMINATIM_BASE_URL as string;
const MIN_REQUEST_INTERVAL_MS = 1100; // Nominatim public usage policy: max ~1 req/sec

export interface Coordinates {
  lat: number;
  lon: number;
  displayName: string;
}

// Serializes calls to the shared public Nominatim server so this process
// never exceeds its rate limit, regardless of how many users hit /navigate
// concurrently. Fine for a handful of users; revisit when self-hosting.
let queue: Promise<unknown> = Promise.resolve();

function throttled<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const result = await fn();
    await new Promise((resolve) => setTimeout(resolve, MIN_REQUEST_INTERVAL_MS));
    return result;
  });
  queue = run.catch(() => undefined);
  return run;
}

export async function geocode(address: string): Promise<Coordinates> {
  return throttled(async () => {
    const url = new URL("/search", NOMINATIM_BASE_URL);
    url.searchParams.set("q", address);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");

    const response = await fetch(url, {
      headers: {
        // Required by Nominatim's usage policy — identifies the app to the operator.
        "User-Agent": "navi-app/1.0 (contact: set NOMINATIM_CONTACT env if needed)",
      },
    });

    if (!response.ok) {
      throw new HttpError(502, "Geocoding service is unavailable right now");
    }

    const results = (await response.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
    }>;

    if (results.length === 0) {
      throw new HttpError(422, `Could not find a location matching "${address}"`);
    }

    const [best] = results;
    return { lat: parseFloat(best.lat), lon: parseFloat(best.lon), displayName: best.display_name };
  });
}
