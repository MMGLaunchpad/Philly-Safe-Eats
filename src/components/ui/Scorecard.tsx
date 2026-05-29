import { useAppStore } from '../../stores/useAppStore'
import './Scorecard.css'

export default function Scorecard() {
  const selectedRestaurant = useAppStore((s) => s.selectedRestaurant)
  const setSelectedRestaurant = useAppStore((s) => s.setSelectedRestaurant)

  // If no restaurant is selected, don't render the panel at all
  if (!selectedRestaurant) return null

  const {
    tradename,
    legalname,
    address,
    open_violation_count,
  } = selectedRestaurant

  // Determine the styling tier for the safety chip
  let riskTier = 'is-clean'
  let riskLabel = 'Clean (0 Violations)'
  
  if (open_violation_count > 0 && open_violation_count <= 2) {
    riskTier = 'is-minor'
    riskLabel = 'Minor Risk'
  } else if (open_violation_count >= 3) {
    riskTier = 'is-danger'
    riskLabel = 'High Risk'
  }

  // Use tradename if available, otherwise fallback to legalname, otherwise 'Unknown Name'
  const displayName = tradename || legalname || 'Unknown Name'
  const secondaryName = tradename && legalname && tradename !== legalname ? legalname : null

  return (
    <div className="scorecard-container">
      <div className="scorecard glass-card">
        
        {/* Header */}
        <header className="scorecard-header">
          <div>
            <h2>{displayName}</h2>
            {secondaryName && <div className="scorecard-legalname">{secondaryName}</div>}
          </div>
          <button 
            className="scorecard-close" 
            onClick={() => setSelectedRestaurant(null)}
            aria-label="Close scorecard"
          >
            ✕
          </button>
        </header>

        {/* Body */}
        <div className="scorecard-body">
          <div className="scorecard-metric">
            <span className="scorecard-metric-label">Address</span>
            <span className="scorecard-metric-value">{address}</span>
          </div>

          <div className="scorecard-metric">
            <span className="scorecard-metric-label">Safety Scorecard</span>
            <div className={`safety-chip ${riskTier}`}>
              <div className="safety-chip-title">{riskLabel}</div>
              <div className="safety-chip-count">{open_violation_count}</div>
            </div>
          </div>
          
          <div className="scorecard-metric" style={{ marginTop: 'auto' }}>
             <span className="scorecard-metric-label" style={{ fontSize: '0.65rem', opacity: 0.7 }}>
               Data Source: City of Philadelphia L&amp;I via Carto SQL API
             </span>
          </div>
        </div>
      </div>
    </div>
  )
}
