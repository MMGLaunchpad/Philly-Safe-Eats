import { useAppStore } from '../../stores/useAppStore'
import './PanicSwitch.css'

export default function PanicSwitch() {
  const hideHighRisk = useAppStore((s) => s.hideHighRisk)
  const toggleHideHighRisk = useAppStore((s) => s.toggleHideHighRisk)

  return (
    <button 
      className={`panic-switch glass-card ${hideHighRisk ? 'is-active' : ''}`}
      onClick={toggleHideHighRisk}
      aria-pressed={hideHighRisk}
      title="Toggle to hide restaurants with open violations"
    >
      <span className="panic-switch-label">
        <span aria-hidden="true">{hideHighRisk ? '🛡️' : '⚠️'}</span>
        Hide High Risk
      </span>
      <div className="panic-switch-track" aria-hidden="true">
        <div className="panic-switch-thumb" />
      </div>
    </button>
  )
}
