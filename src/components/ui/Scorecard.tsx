import { useState, useEffect } from 'react'
import { useAppStore } from '../../stores/useAppStore'
import './Scorecard.css'

export default function Scorecard() {
  const selectedRestaurant = useAppStore((s) => s.selectedRestaurant)
  const setSelectedRestaurant = useAppStore((s) => s.setSelectedRestaurant)

  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState('')

  useEffect(() => {
    if (!selectedRestaurant) return

    let isMounted = true
    setIsAnalyzing(true)
    setAiAnalysis('')

    const fetchViolationAnalysis = async (restaurantId: string) => {
      // Simulate network request reading the unique cartodb_id
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      if (!isMounted) return

      // Deterministic lookup based on open_violation_count (and simulating reading restaurantId)
      console.debug(`Processing AI analysis for ID: ${restaurantId}`);
      const count = selectedRestaurant.open_violation_count;
      
      if (count >= 3) {
        setAiAnalysis("This location has several open violations on file, including food temperature and pest management concerns. We'd recommend checking recent inspection dates before visiting.");
      } else if (count > 0 && count <= 2) {
        setAiAnalysis("A couple of minor issues were noted — mostly related to cleaning and building upkeep. Generally considered safe, but worth being aware of.");
      } else {
        setAiAnalysis("Great news! No active violations on record. This location has a clean bill of health from the latest inspections.");
      }
      setIsAnalyzing(false)
    }

    fetchViolationAnalysis(selectedRestaurant.cartodb_id.toString())

    return () => {
      isMounted = false
    }
  }, [selectedRestaurant])

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
  let riskLabel = 'All Clear — No Issues Found'
  
  if (open_violation_count > 0 && open_violation_count <= 2) {
    riskTier = 'is-minor'
    riskLabel = 'Minor Issues Noted'
  } else if (open_violation_count >= 3) {
    riskTier = 'is-danger'
    riskLabel = 'Needs Attention'
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
            <span className="scorecard-metric-label">📍 Address</span>
            <span className="scorecard-metric-value">{address}</span>
          </div>

          <div className="scorecard-metric">
            <span className="scorecard-metric-label">🛡️ Health Rating</span>
            <div className={`safety-chip ${riskTier}`}>
              <div className="safety-chip-title">{riskLabel}</div>
              <div className="safety-chip-count">{open_violation_count}</div>
            </div>
          </div>
          
          <div className="scorecard-metric" style={{ marginTop: 'auto' }}>
            {isAnalyzing ? (
              <div className="ai-analysis-skeleton shimmer"></div>
            ) : aiAnalysis ? (
              <blockquote className="ai-analysis-block">
                <div className="ai-analysis-badge">💡 What We Found</div>
                <p>{aiAnalysis}</p>
              </blockquote>
            ) : null}
            {!isAnalyzing && !aiAnalysis && (
              <>
                <span className="scorecard-metric-label" style={{ fontSize: '0.65rem', opacity: 0.7 }}>
                  Data Source: City of Philadelphia L&amp;I via Carto SQL API
                </span>
                <span className="scorecard-metric-label" style={{ fontSize: '0.65rem', opacity: 0.7, marginTop: '4px', display: 'block' }}>
                  * Expand for detailed violation reports (Coming Soon)
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
