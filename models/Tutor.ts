```typescript
class Tutor {
	// ...existing code...
	hourlyRate: number;

	constructor(name: string, hourlyRate: number) {
		// ...existing code...
		this.hourlyRate = hourlyRate;
	}

	setHourlyRate(rate: number) {
		this.hourlyRate = rate;
	}

	async saveHourlyRateToDatabase(userId: string) {
		const { data, error } = await supabase
			.from('user_profiles')
			.update({ hourly_rate: this.hourlyRate })
			.eq('id', userId);
		if (error) console.error('Error saving hourly rate:', error);
		return data;
	}

	async fetchHourlyRateFromDatabase(userId: string) {
		const { data, error } = await supabase
			.from('user_profiles')
			.select('hourly_rate')
			.eq('id', userId)
			.single();
		if (error) console.error('Error fetching hourly rate:', error);
		if (data) this.hourlyRate = data.hourly_rate;
		return data;
	}

	// ...existing code...
}
```