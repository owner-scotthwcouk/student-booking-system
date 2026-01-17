# Complete Code Files with File Paths

## Student Booking System - All Implementation Files

This document contains ALL the complete code files for the booking system, PayPal integration, and file upload functionality with their exact file paths.

---

## 1. CORE CONFIGURATION FILES

### File: `src/lib/supabaseClient.js`

```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

---

## 2. AUTHENTICATION HOOK

### File: `src/hooks/useAuth.js`

```javascript
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })
    
    return () => subscription.unsubscribe()
  }, [])
  
  async function fetchProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) throw error
      setProfile(data)
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const signOut = async () => {
    await supabase.auth.signOut()
  }
  
  return {
    user,
    profile,
    loading,
    signOut,
    isStudent: profile?.role === 'student',
    isTutor: profile?.role === 'tutor'
  }
}
```

---

## 3. BOOKING SYSTEM - API Functions

### File: `src/lib/bookingAPI.js`

```javascript
import { supabase } from './supabaseClient'

// Create a new booking
export async function createBooking(bookingData) {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .insert({
        student_id: bookingData.studentId,
        tutor_id: bookingData.tutorId,
        lesson_date: bookingData.lessonDate,
        lesson_time: bookingData.lessonTime,
        duration_minutes: bookingData.duration || 60,
        status: 'pending',
        payment_status: 'unpaid'
      })
      .select()
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error creating booking:', error)
    return { data: null, error }
  }
}

// Get bookings for a student
export async function getStudentBookings(studentId) {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        tutor:tutor_id(
          full_name,
          email
        )
      `)
      .eq('student_id', studentId)
      .order('lesson_date', { ascending: false })
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching bookings:', error)
    return { data: null, error }
  }
}

// Get bookings for a tutor
export async function getTutorBookings(tutorId) {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        student:student_id(
          full_name,
          email
        )
      `)
      .eq('tutor_id', tutorId)
      .order('lesson_date', { ascending: false })
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching bookings:', error)
    return { data: null, error }
  }
}

// Update booking status
export async function updateBookingStatus(bookingId, status) {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', bookingId)
      .select()
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error updating booking:', error)
    return { data: null, error }
  }
}

// Get tutor availability
export async function getTutorAvailability(tutorId) {
  try {
    const { data, error } = await supabase
      .from('tutor_availability')
      .select('*')
      .eq('tutor_id', tutorId)
      .eq('is_available', true)
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching availability:', error)
    return { data: null, error }
  }
}

// Get blocked time slots
export async function getBlockedTimeSlots(tutorId, startDate, endDate) {
  try {
    const { data, error } = await supabase
      .from('blocked_time_slots')
      .select('*')
      .eq('tutor_id', tutorId)
      .gte('start_datetime', startDate)
      .lte('end_datetime', endDate)
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching blocked slots:', error)
    return { data: null, error }
  }
}
```

---

## 4. BOOKING COMPONENT - Student Booking

### File: `src/components/student/BookingForm.jsx`

```javascript
import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { createBooking, getTutorAvailability } from '../../lib/bookingAPI'
import { useNavigate } from 'react-router-dom'

function BookingForm({ tutorId }) {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [availability, setAvailability] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (tutorId) {
      loadAvailability()
    }
  }, [tutorId])

  async function loadAvailability() {
    const { data, error } = await getTutorAvailability(tutorId)
    if (!error && data) {
      setAvailability(data)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await createBooking({
        studentId: user.id,
        tutorId: tutorId,
        lessonDate: selectedDate,
        lessonTime: selectedTime,
        duration: 60
      })

      if (error) throw error

      // Redirect to payment page
      navigate(`/payment/${data.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="booking-form">
      <h2>Book a Lesson</h2>
      
      {error && <div className="error">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="date">Select Date:</label>
          <input
            type="date"
            id="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="time">Select Time:</label>
          <select
            id="time"
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
            required
          >
            <option value="">Choose a time...</option>
            <option value="09:00">9:00 AM</option>
            <option value="10:00">10:00 AM</option>
            <option value="11:00">11:00 AM</option>
            <option value="13:00">1:00 PM</option>
            <option value="14:00">2:00 PM</option>
            <option value="15:00">3:00 PM</option>
            <option value="16:00">4:00 PM</option>
          </select>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Booking...' : 'Book and Pay'}
        </button>
      </form>
    </div>
  )
}

export default BookingForm
```

---

## 5. PAYPAL INTEGRATION

### File: `src/components/payment/PayPalPayment.jsx`

```javascript
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js"
import { supabase } from '../../lib/supabaseClient'
import { useNavigate, useParams } from 'react-router-dom'
import { useState, useEffect } from 'react'

function PayPalPayment() {
  const { bookingId } = useParams()
  const navigate = useNavigate()
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const LESSON_PRICE = 50 // £50 per hour

  useEffect(() => {
    fetchBooking()
  }, [bookingId])

  async function fetchBooking() {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single()
      
      if (error) throw error
      setBooking(data)
    } catch (error) {
      console.error('Error fetching booking:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentSuccess = async (details) => {
    try {
      // Update booking payment status
      await supabase
        .from('bookings')
        .update({
          payment_status: 'paid',
          status: 'confirmed'
        })
        .eq('id', bookingId)

      // Create payment record
      await supabase
        .from('payments')
        .insert({
          booking_id: bookingId,
          student_id: booking.student_id,
          amount: LESSON_PRICE,
          currency: 'GBP',
          payment_method: 'paypal',
          paypal_transaction_id: details.id,
          paypal_order_id: details.purchase_units[0].payments.captures[0].id,
          status: 'completed',
          payment_date: new Date().toISOString()
        })

      // Navigate to success page
      navigate('/booking-success')
    } catch (error) {
      console.error('Error processing payment:', error)
    }
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className="payment-container">
      <h2>Complete Your Payment</h2>
      <div className="booking-summary">
        <p>Lesson Date: {booking?.lesson_date}</p>
        <p>Time: {booking?.lesson_time}</p>
        <p>Duration: 1 hour</p>
        <p className="price">Total: £{LESSON_PRICE}</p>
      </div>

      <PayPalScriptProvider 
        options={{ 
          "client-id": import.meta.env.VITE_PAYPAL_CLIENT_ID,
          currency: "GBP"
        }}
      >
        <PayPalButtons
          createOrder={(data, actions) => {
            return actions.order.create({
              purchase_units: [{
                amount: {
                  value: LESSON_PRICE.toString(),
                  currency_code: "GBP"
                },
                description: `Tutoring Lesson - ${booking.lesson_date}"`}]
