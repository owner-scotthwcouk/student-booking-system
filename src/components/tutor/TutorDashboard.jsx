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
  User,
  FileText
} from 'lucide-react'

// Sub-components
import POSSystem from './POSSystem'
import AvailabilityManager from './AvailabilityManager'
import LessonEditor from './LessonEditor'
import BookingManagement from './BookingManagement'
import HomeworkReview from './HomeworkReview'
import TutorPayments from './Payments'
import Students from './Students'
import SettingsPage from './Settings'
import TutorProfile from './Profile'
import './TutorDashboard.css'
import BrandLogo from '../shared/BrandLogo'
import StudentDashboard from '../student/StudentDashboard'

export default function TutorDashboard() {
  const { user, profile, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('bookings')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [previewStudentId, setPreviewStudentId] = useState(null)
  const [previewStudentProfile, setPreviewStudentProfile] = useState(null)
  const [isPreviewMode, setIsPreviewMode] = useState(false)

  const menuItems = [
    { id: 'bookings', label: 'Bookings', icon: CalendarDays },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'lessons', label: 'Lessons', icon: BookOpen },
    { id: 'availability', label: 'Availability', icon: Clock },
    { id: 'homework', label: 'Homework Submissions', icon: FileText },
    { id: 'pos', label: 'POS System', icon: Calculator },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  const handleSignOut = async () => {
    await signOut()
  }

  const handlePreviewStudent = (student) => {
    setPreviewStudentId(student.id)
    setPreviewStudentProfile(student)
    setIsPreviewMode(true)
  }

  const exitPreviewMode = () => {
    setPreviewStudentId(null)
    setPreviewStudentProfile(null)
    setIsPreviewMode(false)
  }

  if (isPreviewMode) {
    return (
      <div className="student-preview-wrapper">
        <div className="preview-banner">
          <div>
            <strong>Student preview mode</strong>
            <p>Viewing the portal as {previewStudentProfile?.full_name || 'a student'}.</p>
          </div>
          <button className="btn-secondary" onClick={exitPreviewMode}>
            Exit Student Preview
          </button>
        </div>
        <StudentDashboard 
          previewStudentId={previewStudentId}
          previewStudentProfile={previewStudentProfile}
          previewMode={true}
        />
      </div>
    )
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
          <div className="logo-placeholder">
            <BrandLogo size={36} wordmarkSize={18} />
          </div>
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
          <section className="page-section glass-card">
            {activeTab === 'bookings' && <BookingManagement tutorId={user?.id} />}
            {activeTab === 'students' && <Students onPreviewStudent={handlePreviewStudent} />}
            {activeTab === 'lessons' && <LessonEditor tutorId={user?.id} />}
            {activeTab === 'availability' && <AvailabilityManager tutorId={user?.id} />}
            {activeTab === 'homework' && <HomeworkReview tutorId={user?.id} />}
            {activeTab === 'pos' && <POSSystem tutorId={user?.id} />}
            {activeTab === 'payments' && <TutorPayments tutorId={user?.id} />}
            {activeTab === 'profile' && <TutorProfile />}
            {activeTab === 'settings' && <SettingsPage />}
          </section>
        </div>
      </main>
    </div>
  )
}
