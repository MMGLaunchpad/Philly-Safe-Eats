import { useState } from 'react'
import { useAppStore } from '../../stores/useAppStore'
import { useRestaurants } from '../../hooks/useRestaurants'
import './AnalyticsWidget.css'

export default function AnalyticsWidget() {
  const { data: restaurants } = useRestaurants()
  const searchTerm = useAppStore((s) => s.searchTerm.toLowerCase())
  const culinaryFilter = useAppStore((s) => s.culinaryFilter)
  const statusFilter = useAppStore((s) => s.statusFilter)
  
  const [isOpen, setIsOpen] = useState(true)

  if (!restaurants) return null

  let visibleCount = 0
  let cleanCount = 0

  restaurants.forEach((data) => {
    let show = true

    if (searchTerm) {
      const name = (data.tradename || data.legalname || '').toLowerCase()
      if (!name.includes(searchTerm)) {
        show = false
      }
    }

    if (culinaryFilter !== 'All Categories') {
      const name = (data.tradename || data.legalname || '').toLowerCase()
      if (!name.includes(culinaryFilter.toLowerCase())) {
        show = false
      }
    }

    if (statusFilter === 'Clean (Green)' && data.open_violation_count !== 0) show = false
    else if (statusFilter === 'Minor Notices (Orange)' && (data.open_violation_count < 1 || data.open_violation_count > 2)) show = false
    else if (statusFilter === 'High Priority (Red)' && data.open_violation_count < 3) show = false

    if (show) {
      visibleCount++
      if (data.open_violation_count === 0) {
        cleanCount++
      }
    }
  })

  const ratio = visibleCount > 0 ? Math.round((cleanCount / visibleCount) * 100) : 0

  return (
    <div className="analytics-widget glass-card">
      <div className="analytics-header">
        <h3 className="analytics-title">📊 Live Stats</h3>
        <button className="analytics-toggle" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? 'Hide' : 'Show'}
        </button>
      </div>
      
      {isOpen && (
        <div className="analytics-content">
          <div className="analytics-stat">
            <span className="analytics-label">Restaurants Shown</span>
            <span className="analytics-value">{visibleCount.toLocaleString()}</span>
          </div>
          <div className="analytics-stat">
            <span className="analytics-label">Passing Health Check</span>
            <span className="analytics-value">{ratio}%</span>
          </div>
        </div>
      )}
    </div>
  )
}
