# Student Booking System - Complete Implementation Guide

## Project Overview
**Live URL:** https://edu.scott-hw.online  
**GitHub:** https://github.com/owner-scotthwcouk/student-booking-system  
**Created:** January 17, 2026

## ✅ Infrastructure Already Configured

- ✓ GitHub repository created  
- ✓ Vercel deployment configured  
- ✓ Custom domain (edu.scott-hw.online) set up  
- ✓ Cloudflare DNS configured  
- ✓ Database schema designed (see database-schema.sql)

---

## 📋 Quick Start Guide

### 1. Clone and Initialize

```bash
# Clone the repository
git clone https://github.com/owner-scotthwcouk/student-booking-system.git
cd student-booking-system

# Initialize Vite + React project
npm create vite@latest . -- --template react
npm install

# Install dependencies
npm install @supabase/supabase-js react-router-dom
npm install @paypal/react-paypal-js date-fns
npm install react-hook-form zod @hookform/resolvers
```

### 2. Set Up Supabase

1. Go to https://supabase.com
2. Create new project: "student-booking-system"
3. Copy Project URL and API Key
4. In Supabase Dashboard:
   - Go to SQL Editor
   - Copy contents of `docs/database-schema.sql`
   - Run the SQL to create all tables
   - Create Storage buckets:
     - profile-pictures (public)
     - homework-submissions (private)
     - lesson-activities (private)

### 3. Environment Variables

Create `.env` file:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_PAYPAL_CLIENT_ID=your_paypal_client_id
```

---

## 🏗️ Project Structure

```
student-booking-system/
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   ├── student/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Bookings.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── Lessons.jsx
│   │   │   └── HomeworkSubmission.jsx
│   │   ├── tutor/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── BookingManagement.jsx
│   │   │   ├── LessonEditor.jsx
│   │   │   ├── HomeworkReview.jsx
│   │   │   ├── POSSystem.jsx
│   │   │   └── AvailabilityManager.jsx
│   │   └── shared/
│   │       ├── Navbar.jsx
│   │       └── FileUpload.jsx
│   ├── lib/
│   │   ├── supabaseClient.js
│   │   └── api.js
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useBookings.js
│   │   └── useLessons.js
│   ├── utils/
│   │   └── helpers.js
│   ├── App.jsx
│   └── main.jsx
├── docs/
│   ├── database-schema.sql
│   └── IMPLEMENTATION_GUIDE.md (this file)
├── .env
├── .gitignore
├── package.json
├── vite.config.js
└── README.md
```

---

## 🔑 Key Features Implementation

### Authentication (Supabase Auth)

```javascript
// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

```javascript
// src/hooks/useAuth.js
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      }
    })
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      }
    })
    
    return () => subscription.unsubscribe()
  }, [])
  
  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data)
  }
  
  return { user, profile, isStudent: profile?.role === 'student', isTutor: profile?.role === 'tutor' }
}
```

### Booking System

```javascript
// Student creates booking
async function createBooking(studentId, tutorId, lessonDate, lessonTime) {
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      student_id: studentId,
      tutor_id: tutorId,
      lesson_date: lessonDate,
      lesson_time: lessonTime,
      status: 'pending',
      payment_status: 'unpaid'
    })
    .select()
  
  if (error) throw error
  return data
}
```

### PayPal Integration

```javascript
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js"

function PaymentComponent({ amount, bookingId, onSuccess }) {
  return (
    <PayPalScriptProvider options={{ "client-id": import.meta.env.VITE_PAYPAL_CLIENT_ID }}>
      <PayPalButtons
        createOrder={(data, actions) => {
          return actions.order.create({
            purchase_units: [{
              amount: { value: amount }
            }]
          })
        }}
        onApprove={async (data, actions) => {
          const details = await actions.order.capture()
          
          // Update payment record
          await supabase
            .from('payments')
            .insert({
              booking_id: bookingId,
              amount: amount,
              paypal_transaction_id: details.id,
              status: 'completed'
            })
          
          onSuccess(details)
        }}
      />
    </PayPalScriptProvider>
  )
}
```

### File Upload (Homework Submissions)

```javascript
async function uploadHomework(file, lessonId, studentId) {
  const fileExt = file.name.split('.').pop()
  const fileName = `${studentId}/${lessonId}/${Date.now()}.${fileExt}`
  
  const { error: uploadError } = await supabase.storage
    .from('homework-submissions')
    .upload(fileName, file)
  
  if (uploadError) throw uploadError
  
  const { data: { publicUrl } } = supabase.storage
    .from('homework-submissions')
    .getPublicUrl(fileName)
  
  // Create submission record
  const { data, error } = await supabase
    .from('homework_submissions')
    .insert({
      lesson_id: lessonId,
      student_id: studentId,
      submission_file_url: publicUrl,
      submission_file_name: file.name,
      submission_file_size: file.size,
      submitted_at: new Date().toISOString(),
      status: 'submitted'
    })
  
  return data
}
```

---

## 🚀 Deployment

### Automatic Deployment
Vercel is already connected to your GitHub repository. Every push to `main` branch will automatically deploy to https://edu.scott-hw.online

### Manual Deploy
```bash
git add .
git commit -m "Initial implementation"
git push origin main
```

Vercel will automatically:
1. Detect the Vite project
2. Build with `npm run build`
3. Deploy to production
4. Update edu.scott-hw.online

---

## 📱 Feature Checklist

### Student Features
- [ ] User registration and login
- [ ] View/edit profile (except Name/DOB)
- [ ] Book 1-hour lessons
- [ ] PayPal payment integration
- [ ] View lesson history (read-only)
- [ ] Download lesson activities
- [ ] Submit homework (ZIP file)
- [ ] View tutor feedback
- [ ] View payment history

### Tutor Features
- [ ] User registration and login  
- [ ] View/edit profile
- [ ] Book lessons on behalf of students
- [ ] Create/edit/archive/delete lessons
- [ ] Set availability schedule
- [ ] Block unavailable time slots
- [ ] Upload lesson activities
- [ ] Assign homework to lessons
- [ ] Review submitted homework
- [ ] Provide feedback on submissions
- [ ] Mark homework with date/time
- [ ] Process payments via PayPal POS
- [ ] Update student Name/DOB

---

## 🔒 Security Considerations

1. **Row Level Security (RLS)**: Already configured in database-schema.sql
2. **Authentication**: Supabase Auth handles secure authentication
3. **File Access**: Storage buckets use policies to restrict access
4. **Environment Variables**: Never commit `.env` to repository
5. **PayPal**: Use sandbox mode for testing

---

## 🧪 Testing

### Test Users
Create test users in Supabase:
```sql
-- Student test account
INSERT INTO profiles (id, role, email, full_name, date_of_birth)
VALUES ('uuid-here', 'student', 'student@test.com', 'Test Student', '2000-01-01');

-- Tutor test account  
INSERT INTO profiles (id, role, email, full_name, date_of_birth)
VALUES ('uuid-here', 'tutor', 'tutor@test.com', 'Test Tutor', '1990-01-01');
```

---

## 📞 Support

- **Database Issues**: Check Supabase logs at https://supabase.com
- **Deployment Issues**: Check Vercel logs at https://vercel.com
- **DNS Issues**: Check Cloudflare dashboard

---

## 🎯 Next Steps

1. Run the database schema in Supabase
2. Set up environment variables
3. Initialize the React project
4. Create the authentication components
5. Build student and tutor dashboards
6. Integrate PayPal
7. Implement file upload functionality
8. Test all features
9. Deploy to production

---

**Created by:** Scott Harvey-Whittle  
**Date:** January 17, 2026  
**Repository:** https://github.com/owner-scotthwcouk/student-booking-system
