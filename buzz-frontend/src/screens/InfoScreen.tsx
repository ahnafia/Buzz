import { useState } from 'react'
import './InfoScreen.css'

export default function InfoScreen() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [birthday, setBirthday] = useState('')
  const [gender, setGender] = useState('')
  const [collegeStudent, setCollegeStudent] = useState(false)

  return (
    <div className="info-screen">
      <img
        src="/IMG_0203.svg"
        alt="Buzz"
        className="info-logo"
      />
      <div className="info-content">
        <h1 className="info-title">Welcome to Buzz</h1>
        <form
          className="info-form"
          onSubmit={(e) => e.preventDefault()}
        >
          <label className="info-label">
            First Name
            <input
              type="text"
              className="info-input"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
            />
          </label>
          <label className="info-label">
            Last Name
            <input
              type="text"
              className="info-input"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
            />
          </label>
          <label className="info-label">
            Birthday
            <input
              type="date"
              className="info-input"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
            />
          </label>
          <label className="info-label">
            Gender
            <select
              className="info-select"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="rather-not-say">Rather not say</option>
            </select>
          </label>
          <label className="info-checkbox-label">
            <input
              type="checkbox"
              className="info-checkbox"
              checked={collegeStudent}
              onChange={(e) => setCollegeStudent(e.target.checked)}
            />
            <span className="info-checkbox-text">College Student</span>
          </label>
        </form>
        <button type="button" className="info-join-btn">
          Join Buzz
        </button>
      </div>
    </div>
  )
}
