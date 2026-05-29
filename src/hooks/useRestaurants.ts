// ==============================================================
// src/hooks/useRestaurants.ts — Carto SQL Data Fetching Hook
// ==============================================================
//
// WHAT THIS FILE DOES:
// This custom React hook fetches ALL restaurant data from the
// City of Philadelphia's public Carto SQL API in a single query.
//
// THE DATA PIPELINE:
//   1. We construct a SQL query that JOINs two city datasets:
//      - business_licenses: all active food/restaurant businesses
//      - li_violations: all open L&I code/sanitation violations
//   2. The query groups by address and COUNTs the open violations
//      for each restaurant, giving us the safety "score."
//   3. We encode the query as a URL parameter and fetch from Carto.
//   4. React Query caches the result for 5 minutes (staleTime)
//      so we don't hit the server again unless the cache expires.
//
// WHY ONE BIG QUERY INSTEAD OF PER-RESTAURANT?
// The Carto API lets us run full PostgreSQL queries on the server.
// By doing the JOIN and COUNT server-side, we get ALL the data we
// need in a SINGLE HTTP request. This is far more efficient than
// making hundreds of individual requests per restaurant.
//
// WHY REACT QUERY (TANSTACK QUERY)?
// React Query gives us:
//   - Automatic caching (don't re-fetch if data is fresh)
//   - Loading states (isLoading) for showing spinners
//   - Error states (isError) for showing error messages
//   - Retry logic (automatic retries on network failures)
//   - Deduplication (if 3 components call this hook, only 1 fetch)
//
// USAGE IN COMPONENTS:
//   const { data, isLoading, isError } = useRestaurants()
//   // data = RestaurantRow[] (the array of restaurants)
//   // isLoading = true while the fetch is in progress
//   // isError = true if the fetch failed after all retries
// ==============================================================

import { useQuery } from '@tanstack/react-query'
import type { RestaurantRow } from '../stores/useAppStore'

// ==============================================================
// The SQL Query
// ==============================================================
// This PostgreSQL query runs on the city's Carto server.
// It performs a LEFT JOIN between two tables:
//
//   business_licenses (aliased as "l"):
//     Contains every business license in Philadelphia.
//     We filter to only Active licenses of type Food or Restaurant.
//
//   li_violations (aliased as "v"):
//     Contains all Licenses & Inspections violations in the city.
//     We only count violations with status = 'Open' (unresolved).
//
// LEFT JOIN means: even if a restaurant has ZERO violations, it
// still appears in the results (with open_violation_count = 0).
// An INNER JOIN would exclude clean restaurants — we want those!
//
// The JOIN condition matches on UPPER(address) to handle case
// differences between the two datasets (e.g., "123 South St"
// vs "123 SOUTH ST").
//
// GROUP BY collapses multiple violation rows into a single
// restaurant row with a COUNT of how many violations matched.

const SQL_QUERY = `
SELECT
  l.cartodb_id,
  l.business_name AS tradename,
  l.legalname,
  l.address,
  ST_Y(l.the_geom) AS lat,
  ST_X(l.the_geom) AS lng,
  COUNT(v.objectid) AS open_violation_count
FROM business_licenses l
LEFT JOIN li_violations v
  ON UPPER(l.address) = UPPER(v.address)
  AND v.casestatus = 'OPEN'
WHERE l.licensestatus = 'Active'
  AND (l.licensetype LIKE '%Food%' OR l.licensetype LIKE '%Restaurant%')
  AND l.the_geom IS NOT NULL
GROUP BY l.cartodb_id, l.business_name, l.legalname, l.address, l.the_geom
`.trim() // .trim() removes the leading/trailing newlines

// ==============================================================
// The Fetch Function
// ==============================================================
// This is the actual function that makes the HTTP request.
// React Query calls this function when the cache is empty or stale.
//
// We use a POST request to the Carto API because the SQL query
// is very large, and encoding it in a GET URL parameter often
// exceeds URL length limits, causing a 400 Bad Request error.

async function fetchRestaurants(): Promise<RestaurantRow[]> {
  const url = `https://phl.carto.com/api/v2/sql`

  console.log('[useRestaurants] 🔄 Fetching restaurant data from Carto API...')

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ q: SQL_QUERY }),
  })

  // Check if the HTTP response indicates an error (status 4xx or 5xx)
  if (!response.ok) {
    throw new Error(
      `[useRestaurants] Carto API returned HTTP ${response.status}: ${response.statusText}`
    )
  }

  // Parse the JSON response body
  // The Carto API wraps the results in a { rows: [...], total_rows: N } structure
  const json = await response.json()

  console.log(
    `[useRestaurants] ✅ Loaded ${json.rows?.length ?? 0} restaurants from Carto`
  )

  // Return just the rows array — that's all our components need
  // Each row is a RestaurantRow: { cartodb_id, tradename, legalname, address, lat, lng, open_violation_count }
  return json.rows as RestaurantRow[]
}

// ==============================================================
// The Custom Hook
// ==============================================================
// This wraps the fetch function in React Query's `useQuery` hook.
// Components call `useRestaurants()` and get back the loading
// state, error state, and the cached data.

export function useRestaurants() {
  return useQuery({
    // queryKey is a unique identifier for this cached data.
    // React Query uses it to:
    //   - Look up cached results (avoid duplicate fetches)
    //   - Invalidate and refetch when needed
    // Since we only have one query, a simple string array works.
    queryKey: ['restaurants'],

    // queryFn is the function that actually fetches the data.
    // React Query calls this when the cache is empty or stale.
    queryFn: fetchRestaurants,

    // staleTime: how long (in ms) cached data is considered "fresh."
    // During this window, calling useRestaurants() again returns
    // the cached data INSTANTLY without making a new network request.
    //
    // 5 minutes (300,000 ms) is specified by the spec to "limit
    // unnecessary server hits during user navigation transitions."
    // Restaurant violation data doesn't change every second, so
    // a 5-minute cache is perfectly reasonable.
    staleTime: 5 * 60 * 1000, // 5 minutes in milliseconds
  })
}
