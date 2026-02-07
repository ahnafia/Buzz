import './LoadingScreen.css'

const LoadingScreen = () => {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="logo-container">
          <h1 className="loading-logo">Buzz</h1>
          <div className="loading-spinner"></div>
        </div>
        <p className="loading-text">Finding your location...</p>
        <div className="loading-progress">
          <div className="progress-bar"></div>
        </div>
      </div>
    </div>
  )
}

export default LoadingScreen