import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/auth'
import { getTutorHourlyRate, updateTutorHourlyRate } from '../../lib/profileAPI'
import { getSystemSetting, updateSystemSetting } from '../../lib/settingsAPI'
import { Save, AlertTriangle, Power } from 'lucide-react'

export default function Settings() {
  const { user } = useAuth()
  
  // States
  const [rate, setRate] = useState(30.00)
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  
  // UI States
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    // Load Rate
    const { data: rateData } = await getTutorHourlyRate(user.id)
    if (rateData?.hourly_rate) setRate(rateData.hourly_rate)

    // Load Maintenance Mode
    try {
      const { data: settingData } = await getSystemSetting('maintenance_mode')
      if (settingData) setMaintenanceMode(settingData.value === 'true')
    } catch (err) {
      console.error("Could not load maintenance setting:", err)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMsg({ type: '', text: '' })

    try {
      // 1. Update Hourly Rate
      const { error: rateError } = await updateTutorHourlyRate(user.id, parseFloat(rate))
      if (rateError) throw rateError

      // 2. Update Maintenance Mode
      const { error: settingError } = await updateSystemSetting('maintenance_mode', maintenanceMode)
      if (settingError) throw settingError

      setMsg({ type: 'success', text: 'All settings updated successfully!' })
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '600px', padding: '2rem', backgroundColor: '#1a1a1a', borderRadius: '12px', border: '2px solid #3a3a3a' }}>
      <h2 style={{ color: '#ffffff', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Save size={24} color="#7c3aed" /> System Settings
      </h2>
      
      {msg.text && (
        <div style={{ 
          backgroundColor: msg.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
          color: msg.type === 'success' ? '#6ee7b7' : '#fca5a5', 
          padding: '1rem', 
          borderRadius: '6px', 
          marginBottom: '1.5rem', 
          border: `1px solid ${msg.type === 'success' ? '#10b981' : '#ef4444'}` 
        }}>
          {msg.text}
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* --- SECTION 1: Hourly Rate --- */}
        <div style={{ paddingBottom: '1.5rem', borderBottom: '1px solid #333' }}>
          <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '1rem' }}>Pricing</h3>
          <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '0.5rem', fontWeight: '500' }}>
            Hourly Rate (£)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            required
            style={{ width: '100%', padding: '0.75rem', fontSize: '1.1rem', backgroundColor: '#000000', color: '#ffffff', border: '1px solid #3a3a3a', borderRadius: '6px' }}
          />
        </div>

        {/* --- SECTION 2: Maintenance Mode --- */}
        <div style={{ paddingBottom: '1.5rem', borderBottom: '1px solid #333' }}>
          <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Power size={18} color={maintenanceMode ? '#ef4444' : '#10b981'} /> 
            Maintenance Controls
          </h3>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            backgroundColor: maintenanceMode ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.05)', 
            padding: '1rem', 
            borderRadius: '8px',
            border: `1px solid ${maintenanceMode ? '#7f1d1d' : '#3a3a3a'}`
          }}>
            <div>
              <strong style={{ color: '#fff', display: 'block', marginBottom: '4px' }}>Maintenance Mode</strong>
              <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                {maintenanceMode 
                  ? "Active: Students CANNOT log in." 
                  : "Inactive: Students can log in normally."}
              </span>
            </div>
            
            <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '60px', height: '34px' }}>
              <input 
                type="checkbox" 
                checked={maintenanceMode}
                onChange={(e) => setMaintenanceMode(e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{ 
                position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, 
                backgroundColor: maintenanceMode ? '#ef4444' : '#3a3a3a', 
                borderRadius: '34px', transition: '.4s' 
              }}></span>
              <span style={{ 
                position: 'absolute', content: '""', height: '26px', width: '26px', left: '4px', bottom: '4px', 
                backgroundColor: 'white', borderRadius: '50%', transition: '.4s',
                transform: maintenanceMode ? 'translateX(26px)' : 'translateX(0)'
              }}></span>
            </label>
          </div>
          
          {maintenanceMode && (
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', color: '#fca5a5', fontSize: '0.9rem' }}>
              <AlertTriangle size={16} />
              <span>Warning: Existing students may be disconnected upon page refresh.</span>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: '1rem', fontSize: '1rem', fontWeight: '600', color: '#ffffff', backgroundColor: '#7c3aed', border: 'none', borderRadius: '8px', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Saving Changes...' : 'Save All Settings'}
        </button>
      </form>
    </div>
  )
}
