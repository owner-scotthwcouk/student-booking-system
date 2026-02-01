import { useState } from 'react'
import { useAuth } from '../../contexts/auth'
import { 
  CalendarDays, 
  Users, 
  BookOpen, 
  Clock, 
  Calculator, 
  CreditCard, 
  Settings,
  LogOut,
  Menu,
  X,
  User // [NEW] Added User icon
} from 'lucide-react'

// Sub-components
import POSSystem from './POSSystem'
import AvailabilityManager from './AvailabilityManager'
import LessonEditor from './LessonEditor'
import BookingManagement from './BookingManagement'
import TutorPayments from './Payments'
import Students from './Students'
import SettingsPage from './Settings'
import TutorProfile from './Profile' // [NEW] Imported Profile
import './TutorDashboard.css'

export default function TutorDashboard() {
  const { user, profile, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('bookings')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const menuItems = [
    { id: 'bookings', label: 'Bookings', icon: CalendarDays },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'lessons', label: 'Lessons', icon: BookOpen },
    { id: 'availability', label: 'Availability', icon: Clock },
    { id: 'pos', label: 'POS System', icon: Calculator },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'profile', label: 'My Profile', icon: User }, // [NEW] Added Profile Item
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div className="dashboard-layout">
      {/* Mobile Menu Button */}
      <button 
        className="mobile-menu-toggle"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? <X /> : <Menu />}
      </button>

      {/* Sidebar Navigation */}
      <aside className={`dashboard-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-placeholder">TutorAdmin</div>
          <div className="user-profile-summary">
            <div className="avatar-circle">
              {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'T'}
            </div>
            <div className="user-info">
              <p className="user-name">{profile?.full_name || 'Tutor'}</p>
              <p className="user-role">Professional Tutor</p>
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
          <p className="current-date">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </header>

        <div className="content-body">
          {activeTab === 'bookings' && <BookingManagement tutorId={user?.id} />}
          {activeTab === 'students' && <Students />}
          {activeTab === 'lessons' && <LessonEditor tutorId={user?.id} />}
          {activeTab === 'availability' && <AvailabilityManager tutorId={user?.id} />}
          {activeTab === 'pos' && <POSSystem tutorId={user?.id} />}
          {activeTab === 'payments' && <TutorPayments tutorId={user?.id} />}
          {activeTab === 'profile' && <TutorProfile />} 
          {activeTab === 'settings' && <SettingsPage />}
        </div>
      </main>
    </div>
  )
}
