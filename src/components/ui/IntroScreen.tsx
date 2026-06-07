import { useAppStore } from '../../stores/useAppStore'
import './IntroScreen.css'
import { playInterfaceClick } from '../../utils/audio'

export default function IntroScreen() {
  const hasOnboarded = useAppStore((s) => s.hasOnboarded)
  const setHasOnboarded = useAppStore((s) => s.setHasOnboarded)

  const handleStartExploring = () => {
    playInterfaceClick();
    setHasOnboarded(true);
  };

  if (hasOnboarded) return null

  return (
    <div className="intro-screen">
      <div className="intro-content">
        <div className="intro-badge">🍽️ Welcome to</div>
        <h1 className="intro-title">Philly Safe Eats</h1>
        <h2 className="intro-subtitle">
          See which restaurants are safe — at a glance.
        </h2>

        <ul className="intro-list">
          <li>
            <span className="intro-step-icon">🗺️</span>
            <div>
              <strong>Explore the map</strong> — Browse 8,000+ restaurants across Philadelphia in a live 3D view.
            </div>
          </li>
          <li>
            <span className="intro-step-icon">🎯</span>
            <div>
              <strong>Filter by what matters</strong> — Search by name, cuisine type, or safety rating.
            </div>
          </li>
          <li>
            <span className="intro-step-icon">📋</span>
            <div>
              <strong>Tap any dot for details</strong> — See health inspection results and violation history instantly.
            </div>
          </li>
        </ul>

        <button 
          className="intro-button" 
          onClick={handleStartExploring}
        >
          Start Exploring →
        </button>

        <p className="intro-footnote">
          Data sourced from the City of Philadelphia's public health inspection records.
        </p>
      </div>
    </div>
  )
}
