import './LoadingScreen.css'

const LoadingScreen = () => {
  return (
    <div className="loading-screen">
      <div className="loading-logo-wrap">
        <img src="/IMG_0203.svg" alt="Buzz" className="loading-logo-img" />
        <div className="loading-dots" aria-hidden="true">
          <span className="loading-dot" />
          <span className="loading-dot" />
          <span className="loading-dot" />
        </div>
      </div>
      <div className="loading-content">
        <h1 className="loading-logo">Buzz</h1>
      </div>
    </div>
  )
}

export default LoadingScreen