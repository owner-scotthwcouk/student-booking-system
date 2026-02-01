import { useState } from 'react'
import { useAuth } from '../../contexts/auth'
import { 
  User, 
  CalendarPlus, 
  BookOpen, 
  CreditCard, 
  Upload, 
  LogOut,
  Menu,
  X,
  Home
} from 'lucide-react'

// Import Sub-components
import StudentProfile from './Profile'
import StudentPayments from './Payments'
import StudentLessons from './Lessons'
import HomeworkSubmission from './HomeworkSubmission'
import TutorSelection from './TutorSelection' // Assuming this is your "Book a Lesson" flow

import './StudentDashboard.css'

export default function StudentDashboard() {
  const { user, profile, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('lessons') // Default to 'lessons' or 'home'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const menuItems = [
    { id: 'lessons', label: 'My Lessons', icon: BookOpen },
    { id: 'book', label: 'Book a Lesson', icon: CalendarPlus },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'homework', label: 'Homework', icon: Upload },
    { id: 'profile', label: 'My Profile', icon: User },
  ]

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div className="dashboard-layout">
      {/* Mobile Menu Toggle */}
      <button 
        className="mobile-menu-toggle"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? <X /> : <Menu />}
      </button>

      {/* Sidebar Navigation */}
      <aside className={`dashboard-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-placeholder">TutorHub</div>
          <div className="user-profile-summary">
            <div className="avatar-circle">
              {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'S'}
            </div>
            <div className="user-info">
              <p className="user-name">{profile?.full_name || 'Student'}</p>
              <p className="user-role">Student Account</p>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab(item.id)
                  setMobileMenuOpen(false)
                }}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleSignOut} className="nav-item logout">
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="dashboard-main">
        <header className="content-header">
          <h1>{menuItems.find(i => i.id === activeTab)?.label}</h1>
          <p className="current-date">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </header>

        <div className="content-body">
          {activeTab === 'profile' && <StudentProfile />}
          {activeTab === 'book' && <TutorSelection studentId={user?.id} />}
          {activeTab === 'lessons' && <StudentLessons studentId={user?.id} />}
          {activeTab === 'payments' && <StudentPayments studentId={user?.id} />}
          {activeTab === 'homework' && <HomeworkSubmission studentId={user?.id} />}
        </div>
      </main>
    </div>
  )
}