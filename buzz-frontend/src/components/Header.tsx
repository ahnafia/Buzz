import './Header.css'

const Header = () => {
  return (
    <header className="header">
      <div className="header-left">
        <h1 className="logo">Buzz</h1>
      </div>
      <div className="header-center">
        <input 
          type="text" 
          placeholder="Search places, people, or posts..." 
          className="search-bar"
        />
      </div>
      <div className="header-right">
        <button className="profile-btn">Profile</button>
      </div>
    </header>
  )
}

export default Header