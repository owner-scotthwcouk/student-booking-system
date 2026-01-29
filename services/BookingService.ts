```typescript
class BookingService {
	// ...existing code...
	bookLesson(tutor: Tutor, hours: number) {
		const totalCost = tutor.hourlyRate * hours;
		// ...existing code...
	}
	// ...existing code...
}
```