import SearchBar from './SearchBar'
import { useAppStore } from '../../stores/useAppStore'
import './SearchOverlay.css'

export default function SearchOverlay() {
  const culinaryFilter = useAppStore((s) => s.culinaryFilter)
  const setCulinaryFilter = useAppStore((s) => s.setCulinaryFilter)
  
  const statusFilter = useAppStore((s) => s.statusFilter)
  const setStatusFilter = useAppStore((s) => s.setStatusFilter)

  return (
    <div className="search-overlay glass-card">
      <SearchBar />
      
      <div className="search-filters">
        <select 
          className="culinary-filter"
          value={culinaryFilter}
          onChange={(e) => setCulinaryFilter(e.target.value)}
        >
          <option value="All Categories">All Types</option>
          <option value="Pizza">🍕 Pizza</option>
          <option value="Bakery">🥐 Bakery</option>
          <option value="Cafe">☕ Cafe</option>
          <option value="Restaurant">🍽️ Restaurant</option>
        </select>

        <div className="status-tier-filter">
          {['All Locations', 'Clean (Green)', 'Minor Notices (Orange)', 'High Priority (Red)'].map((tier) => {
            const friendlyLabels: Record<string, string> = {
              'All Locations': 'All',
              'Clean (Green)': '✅ Safe',
              'Minor Notices (Orange)': '⚠️ Minor',
              'High Priority (Red)': '🔴 Risk',
            };
            return (
              <button
                key={tier}
                className={`status-btn ${statusFilter === tier ? 'active' : ''}`}
                onClick={() => setStatusFilter(tier)}
              >
                {friendlyLabels[tier] || tier}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  )
}
