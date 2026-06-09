import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../../hooks/useAuth";
import { createBooking, getBlockedTimeSlots } from "../../lib/bookingAPI";
import { getTutorAvailability } from "../../lib/availabilityAPI";
import { getTutorHourlyRate, getProfile } from "../../lib/profileAPI";
import { supabase } from "../../lib/supabaseClient";
import { useParams } from "react-router-dom";

function BookingForm() {
  const { tutorId } = useParams();
  const { user } = useAuth();

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [availability, setAvailability] = useState([]);
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [availableTimes, setAvailableTimes] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hourlyRate, setHourlyRate] = useState(30.0);
  const [tutorName, setTutorName] = useState("");

  const loadTutorInfo = useCallback(async () => {
    const { data: profile } = await getProfile(tutorId);
    if (profile) setTutorName(profile.full_name);

    const { data: rateData } = await getTutorHourlyRate(tutorId);
    if (rateData?.hourly_rate) setHourlyRate(rateData.hourly_rate);
  }, [tutorId]);

  const loadAvailability = useCallback(async () => {
    const { data, error } = await getTutorAvailability(tutorId);
    if (!error && data) setAvailability(data);
  }, [tutorId]);

  useEffect(() => {
    if (tutorId) {
      loadAvailability();
      loadTutorInfo();
    }
  }, [tutorId, loadAvailability, loadTutorInfo]);

  const selectedDayOfWeek = useMemo(() => {
    if (!selectedDate) return null;
    return new Date(`${selectedDate}T00:00:00`).getDay();
  }, [selectedDate]);

  useEffect(() => {
    if (!selectedDate || !tutorId) return;
    const startDate = new Date(`${selectedDate}T00:00:00`);
    const endDate = new Date(`${selectedDate}T23:59:59`);

    getBlockedTimeSlots(tutorId, startDate.toISOString(), endDate.toISOString())
      .then(({ data }) => setBlockedSlots(data || []))
      .catch(() => setBlockedSlots([]));
  }, [selectedDate, tutorId]);

  useEffect(() => {
    if (!selectedDate || selectedDayOfWeek === null) {
      setAvailableTimes([]);
      return;
    }

    const dayAvailability = availability.filter(
      (slot) => slot.is_available && slot.day_of_week === selectedDayOfWeek,
    );
    if (dayAvailability.length === 0) {
      setAvailableTimes([]);
      return;
    }

    const toMinutes = (time) => {
      const [h, m] = time.split(":").map(Number);
      return h * 60 + m;
    };

    const toTimeString = (minutes) => {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    };

    const blockedRanges = blockedSlots.map((slot) => ({
      start: new Date(slot.start_datetime).getTime(),
      end: new Date(slot.end_datetime).getTime(),
    }));

    const durationMinutes = 60;
    const dayStart = new Date(`${selectedDate}T00:00:00`).getTime();
    const times = [];

    for (const slot of dayAvailability) {
      const startMinutes = toMinutes(slot.start_time);
      const endMinutes = toMinutes(slot.end_time);

      for (
        let t = startMinutes;
        t + durationMinutes <= endMinutes;
        t += durationMinutes
      ) {
        const timeStr = toTimeString(t);
        const slotStart = dayStart + t * 60 * 1000;
        const slotEnd = slotStart + durationMinutes * 60 * 1000;

        const overlapsBlocked = blockedRanges.some(
          (b) => slotStart < b.end && slotEnd > b.start,
        );
        if (!overlapsBlocked) times.push(timeStr);
      }
    }
    setAvailableTimes(times);
  }, [availability, blockedSlots, selectedDate, selectedDayOfWeek]);

  const handlePay = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: booking, error: bookingError } = await createBooking({
        studentId: user.id,
        tutorId: tutorId,
        lessonDate: selectedDate,
        lessonTime: selectedTime,
        duration: 60,
      });

      if (bookingError) throw new Error("Failed to create booking");

      const { data, error: paymentError } = await supabase.functions.invoke(
        "stripe-init",
        {
          body: {
            amount: hourlyRate,
            bookingId: booking.id,
            studentId: user.id,
            email: user.email,
          },
        },
      );

      if (paymentError) {
        throw new Error(paymentError.message || "Failed to initialize Stripe checkout");
      }

      if (!data?.checkout_url) {
        throw new Error("Failed to initialize Stripe checkout");
      }

      window.location.href = data.checkout_url;
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="booking-form-container">
      <h2>Book a Lesson with {tutorName}</h2>
      <p className="tutor-rate">
        Hourly Rate: £{Number(hourlyRate).toFixed(2)}
      </p>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handlePay} className="booking-form">
        <div className="form-group">
          <label htmlFor="date">Select Date:</label>
          <input
            type="date"
            id="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            required
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label htmlFor="time">Select Time:</label>
          <select
            id="time"
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
            required
            disabled={!selectedDate || availableTimes.length === 0}
            className="form-input"
          >
            <option value="">Choose a time...</option>
            {availableTimes.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={loading || !selectedTime}
          className="btn-primary"
        >
        {loading ? "Redirecting..." : "Continue to Stripe checkout"}
        </button>
      </form>

      <style jsx>{`
        .booking-form-container {
          max-width: 600px;
          margin: 0 auto;
          padding: 2rem;
        }
        .booking-form {
          background: #1a1a1a;
          border: 2px solid #3a3a3a;
          border-radius: 12px;
          padding: 2rem;
        }
        .form-group {
          margin-bottom: 1.5rem;
        }
        .form-group label {
          display: block;
          color: #ffffff;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }
        .form-input {
          width: 100%;
          padding: 0.75rem;
          border: 2px solid #3a3a3a;
          border-radius: 6px;
          background-color: #1a1a1a;
          color: #ffffff;
        }
        .btn-primary {
          width: 100%;
          padding: 1rem;
          background-color: #7c3aed;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        }
        .error {
          background-color: #7f1d1d;
          color: #fecaca;
          padding: 1rem;
          border-radius: 6px;
          margin-bottom: 1.5rem;
        }
      `}</style>
    </div>
  );
}

export default BookingForm;
