// ==============================================================
// src/stores/useAppStore.ts — Global Application State (Zustand)
// ==============================================================
//
// WHAT IS ZUSTAND?
// Zustand (German for "state") is a lightweight state management
// library. "State" is data that multiple components need to share.
//
// For example, when the user types "pizza" in the search bar, the
// SearchBar component needs to update the search term, AND the
// RestaurantLayer component needs to read it to filter which pins
// are visible on the globe. Without a shared store, we'd have to
// pass this data through many layers of component props ("prop
// drilling"), which gets messy fast.
//
// Zustand gives us a SINGLE central store that ANY component can
// read from (subscribe) or write to (dispatch), keeping the data
// flow simple and predictable.
//
// HOW IT WORKS:
//   1. `create()` defines the store's shape (what data it holds)
//      and its actions (functions that update the data).
//   2. Each action calls `set()`, which merges new values into
//      the current state and notifies all subscribers.
//   3. Components "subscribe" with `useAppStore(state => state.xxx)`.
//      They ONLY re-render when their specific slice changes —
//      NOT when unrelated state changes. This is efficient.
//
// OUR THREE STATE SLICES:
//   - searchTerm: what the user typed in the search box
//   - hideHighRisk: whether the "Panic Switch" is toggled on
//   - selectedRestaurant: which restaurant pin was clicked
// ==============================================================

import { create } from 'zustand'

// ==============================================================
// Type Definitions
// ==============================================================
// TypeScript interfaces describe the "shape" of our data objects.
// This prevents us from accidentally accessing properties that
// don't exist (e.g., `restaurant.name` when it's actually
// `restaurant.tradename`). TypeScript catches these at compile
// time, before the code ever runs.

/**
 * A single restaurant row from the Philadelphia Carto SQL API.
 *
 * The field names match the columns in the SQL query:
 *   SELECT l.cartodb_id, l.tradename, l.legalname, l.address,
 *          l.lat, l.lng, COUNT(v.violationid) AS open_violation_count
 *   FROM business_licenses l LEFT JOIN li_violations v ...
 *
 * Some restaurants have a tradename (like "Joe's Pizza") and a
 * legalname (like "JOE SMITH ENTERPRISES LLC"). Either or both
 * could be null in the city's database, so we mark them optional.
 */
export interface RestaurantRow {
  /** Unique ID from the city's CartoDB database */
  cartodb_id: number

  /** The public-facing business name (e.g., "Joe's Pizza").
   *  May be null if the city database doesn't have one. */
  tradename: string | null

  /** The registered legal entity name (e.g., "JOE SMITH LLC").
   *  May be null if the city database doesn't have one. */
  legalname: string | null

  /** The street address of the establishment */
  address: string

  /** WGS-84 latitude (north-south position, e.g., 39.9425) */
  lat: number

  /** WGS-84 longitude (east-west position, e.g., -75.1612) */
  lng: number

  /** How many OPEN (unresolved) L&I violations are at this address.
   *  0 = clean (green), 1–2 = minor risk (orange), 3+ = high risk (red) */
  open_violation_count: number
}

// ==============================================================
// Store Interface — describes ALL state and actions
// ==============================================================

interface AppState {
  // ---- State Slices ----

  /**
   * The text currently typed in the search box.
   * RestaurantLayer reads this to filter which entity pins are
   * visible. An empty string "" means "show everything."
   */
  searchTerm: string

  /**
   * Filter by culinary style (e.g., "Pizza", "Bakery")
   */
  culinaryFilter: string

  /**
   * Filter by status tier (e.g., "All Locations", "Clean (Green)", etc.)
   */
  statusFilter: string

  /**
   * Whether the user has completed the intro screen
   */
  hasOnboarded: boolean

  /**
   * The restaurant the user clicked on the globe. When non-null,
   * the Scorecard side panel opens to show its details.
   * When null, the Scorecard is closed.
   */
  selectedRestaurant: RestaurantRow | null

  // ---- Actions (functions that update state) ----

  /** Called by SearchBar every time the user types a character */
  setSearchTerm: (term: string) => void

  /** Set the culinary style filter */
  setCulinaryFilter: (filter: string) => void

  /** Set the status tier filter */
  setStatusFilter: (filter: string) => void

  /** Set whether the user has onboarded */
  setHasOnboarded: (onboarded: boolean) => void

  /** Called when user clicks a restaurant pin (or closes the Scorecard) */
  setSelectedRestaurant: (restaurant: RestaurantRow | null) => void
}

// ==============================================================
// Store Creation
// ==============================================================
// `create<AppState>()` returns a React hook (useAppStore) that
// components use to access and subscribe to state.
//
// Usage in components:
//   const searchTerm = useAppStore(state => state.searchTerm)
//   const setSearchTerm = useAppStore(state => state.setSearchTerm)
//
// The selector function (state => state.xxx) is KEY — it tells
// Zustand to only re-render this component when that specific
// slice of state changes, not on every state update.

export const useAppStore = create<AppState>((set) => ({
  // ---- Initial State ----
  // These are the values when the app first loads:
  searchTerm: '',            // No search filter — show all restaurants
  culinaryFilter: 'All Categories',
  statusFilter: 'All Locations',
  hasOnboarded: false,
  selectedRestaurant: null,  // No restaurant selected — Scorecard is closed

  // ---- Action Implementations ----

  /**
   * Replaces the search term with a new value.
   * SearchBar calls this on every keystroke. RestaurantLayer
   * subscribes to it and filters Cesium entities by matching
   * the tradename against this string (case-insensitive).
   */
  setSearchTerm: (term) => set({ searchTerm: term }),

  setCulinaryFilter: (filter) => set({ culinaryFilter: filter }),
  setStatusFilter: (filter) => set({ statusFilter: filter }),
  setHasOnboarded: (onboarded) => set({ hasOnboarded: onboarded }),

  /**
   * Sets the selected restaurant (or null to deselect).
   * When set to a RestaurantRow, the Scorecard panel opens.
   * When set to null, the Scorecard closes.
   * CameraController also watches this to fly the camera
   * to the selected restaurant's coordinates.
   */
  setSelectedRestaurant: (restaurant) =>
    set({ selectedRestaurant: restaurant }),
}))
