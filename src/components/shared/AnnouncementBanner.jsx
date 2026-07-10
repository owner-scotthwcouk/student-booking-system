import { useEffect, useState } from 'react'
import { Megaphone } from 'lucide-react'
import { getSystemSetting } from '../../lib/settingsAPI'
import { supabase } from '../../lib/supabaseClient'
import './AnnouncementBanner.css'

export default function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    let mounted = true

    const loadAnnouncement = async () => {
      const { data, error } = await getSystemSetting('announcement_banner')
      if (!error && mounted) setAnnouncement(data?.value?.trim() || '')
    }

    loadAnnouncement()

    const handleLocalUpdate = (event) => setAnnouncement(event.detail || '')
    window.addEventListener('announcement-banner-updated', handleLocalUpdate)

    const channel = supabase
      .channel('announcement-banner')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_settings', filter: 'key=eq.announcement_banner' },
        (payload) => setAnnouncement(payload.new?.value?.trim() || '')
      )
      .subscribe()

    return () => {
      mounted = false
      window.removeEventListener('announcement-banner-updated', handleLocalUpdate)
      supabase.removeChannel(channel)
    }
  }, [])

  if (!announcement) return null

  return (
    <section className="announcement-banner" aria-label="Tutor announcement">
      <Megaphone className="announcement-banner-icon" size={20} aria-hidden="true" />
      <div className="announcement-banner-viewport">
        <p className="announcement-banner-message">{announcement}</p>
      </div>
    </section>
  )
}
