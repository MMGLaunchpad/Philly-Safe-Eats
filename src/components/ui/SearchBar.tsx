// ==============================================================
// src/components/ui/SearchBar.tsx — Restaurant Search Input
// ==============================================================
//
// WHAT THIS FILE DOES:
// Renders a text input that lets users search for restaurants
// by trade name (e.g., "Pizza", "Sushi", "Cheesesteak").
//
// HOW SEARCH WORKS:
// Unlike the old project which called an external API (AIS) for
// search, this app does EVERYTHING client-side:
//   1. On app boot, useRestaurants() fetches ALL restaurants.
//   2. The user types a search term in this input.
//   3. setSearchTerm() updates the Zustand store.
//   4. RestaurantLayer reads searchTerm and filters entities
//      by matching tradename.includes(searchTerm).
//   5. Non-matching entities get entity.show = false (hidden).
//
// This is instant because there's no network request —
// just a string comparison against already-loaded data.
//
// COMPONENT STRUCTURE:
//   SearchBar (glass-card container)
//   ├── 🔍 icon
//   ├── <input> text field
//   └── ✕ clear button (shown when input has text)
// ==============================================================

import { useAppStore } from '../../stores/useAppStore'
import './SearchBar.css'

export default function SearchBar() {
  // Read the current search term and the setter from Zustand.
  // When setSearchTerm is called, only components that subscribe
  // to searchTerm will re-render (not the whole app).
  const searchTerm = useAppStore((s) => s.searchTerm)
  const setSearchTerm = useAppStore((s) => s.setSearchTerm)

  return (
    <div className="search-bar glass-card" id="search-bar">
      {/* Search icon — provides a visual hint that this is a search field */}
      <span className="search-bar-icon" aria-hidden="true">🔍</span>

      {/* The text input where the user types their search query */}
      <input
        id="search-input"
        className="search-bar-input"
        type="text"
        // The placeholder text shown when the input is empty
        placeholder='Search by name or cuisine…'
        // Controlled input: React manages the value, not the DOM.
        // This means the input always displays what's in the store.
        value={searchTerm}
        // On every keystroke, update the Zustand store with the
        // new text. RestaurantLayer will immediately filter entities.
        onChange={(e) => setSearchTerm(e.target.value)}
        // Accessibility: describes what this input does for screen readers
        aria-label="Search restaurants by name or cuisine type"
        // Don't let the browser auto-suggest previous entries
        autoComplete="off"
      />

      {/* Clear button — only shown when there's text to clear.
          Clicking it resets the search term to "", which makes
          all entities visible again. */}
      {searchTerm && (
        <button
          className="search-bar-clear"
          onClick={() => setSearchTerm('')}
          aria-label="Clear search"
          title="Clear search"
        >
          ✕
        </button>
      )}
    </div>
  )
}
