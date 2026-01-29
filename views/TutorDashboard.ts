```typescript
class TutorDashboard {
	// ...existing code...

	render() {
		// ...existing code...
		this.initializeAvailabilitySection();
		// ...existing code...
	}

	initializeAvailabilitySection() {
		let availabilitySection = document.getElementById('availability-section');
		if (!availabilitySection) {
			// Fallback: create the section if it doesn't exist
			availabilitySection = document.createElement('div');
			availabilitySection.id = 'availability-section';
			document.body.appendChild(availabilitySection);
		}
		this.addHourlyRateField(availabilitySection);
	}

	addHourlyRateField(section: HTMLElement) {
		// Clear existing hourly rate field to avoid duplicates
		const existing = document.getElementById('hourly-rate-field');
		if (existing) {
			existing.remove();
		}

		const fieldContainer = document.createElement('div');
		fieldContainer.id = 'hourly-rate-field';
		fieldContainer.style.padding = '10px';
		fieldContainer.style.border = '2px solid #007bff';
		fieldContainer.style.marginTop = '10px';
		fieldContainer.style.backgroundColor = '#f0f0f0';

		const label = document.createElement('label');
		label.innerText = 'Hourly Rate: ';
		label.style.fontWeight = 'bold';

		const input = document.createElement('input');
		input.type = 'number';
		input.id = 'hourly-rate-input';
		input.placeholder = 'Enter rate';
		input.style.marginLeft = '5px';

		const button = document.createElement('button');
		button.innerText = 'Save';
		button.style.marginLeft = '5px';
		button.onclick = () => this.saveHourlyRate(input.value);

		fieldContainer.appendChild(label);
		fieldContainer.appendChild(input);
		fieldContainer.appendChild(button);
		section.appendChild(fieldContainer);
	}

	saveHourlyRate(value: string) {
		const rate = parseFloat(value);
		if (isNaN(rate) || rate < 0) {
			alert('Please enter a valid hourly rate');
			return;
		}
		const tutor = getCurrentTutor();
		tutor.setHourlyRate(rate);
		alert('Hourly rate updated successfully');
	}

	// ...existing code...
}
```