import './Sidebar.css'

const Sidebar = () => {
  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <h3>Feed</h3>
        <ul className="sidebar-menu">
          <li>Nearby Posts</li>
          <li>Following</li>
          <li>Trending</li>
        </ul>
      </div>
      
      <div className="sidebar-section">
        <h3>Discover</h3>
        <ul className="sidebar-menu">
          <li>Popular Places</li>
          <li>Events</li>
          <li>Communities</li>
        </ul>
      </div>
      
      <div className="sidebar-section">
        <h3>Your Activity</h3>
        <ul className="sidebar-menu">
          <li>Your Posts</li>
          <li>Check-ins</li>
          <li>Saved Places</li>
        </ul>
      </div>
    </aside>
  )
}

export default Sidebar