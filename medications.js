const baseUrl = `http://localhost:5500`;

const medications = [];

document.addEventListener("DOMContentLoaded", async () => {
await fetchMedications();
});

async function fetchMedications() {
try {
    const token = localStorage.getItem('token'); 
    const response = await fetch(`${baseUrl}/medications`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) throw new Error('Failed to fetch medications');
    const fetchedMedications = await response.json();
    fetchedMedications.forEach(medication => {
        medications.push(medication);
    });
    displayMedications();
} catch (error) {
    console.error('Error fetching medications:', error);
}
}

function openMedicationModal() {
document.getElementById("medicationModal").style.display = "block";
}

function closeMedicationModal() {
document.getElementById("medicationModal").style.display = "none";
}

let currentEditingIndex = null;

document.getElementById("medicationForm").onsubmit = async function(event) {
event.preventDefault();

const name = document.getElementById("medicationName").value;
const time = document.getElementById("medicationTime").value;
const quantity = document.getElementById("medicationQuantity").value;
const days = Array.from(document.querySelectorAll("input[name='days']:checked")).map(cb => cb.value);

const medication = { name, time, quantity, days };

if (currentEditingIndex === null) {
    // Save new medication to the database
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${baseUrl}/medications`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(medication),
        });

        if (!response.ok) throw new Error('Failed to save medication');
        medications.push(medication);
    } catch (error) {
        console.error('Error saving medication:', error);
    }
} else {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Authentication token is missing. Please log in again.');
        }

        // Send PUT request to update the medication
        const response = await fetch(`${baseUrl}/medications/edit/${currentEditingIndex}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(medication),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update medication.');
        }

        const updatedMedication = await response.json();

        // Update local medications array
        medications[currentEditingIndex] = updatedMedication;

        console.log('Medication updated successfully:', updatedMedication);
    } catch (error) {
        console.error('Error updating medication:', error.message);
        alert(`Error: ${error.message}`); // Display an error message to the user
    }
}

displayMedications();
closeMedicationModal();
document.getElementById("medicationForm").reset();
currentEditingIndex = null; 
}

function displayMedications() {
const medicationsDisplay = document.getElementById("medicationsDisplay");
medicationsDisplay.innerHTML = "";

medications.forEach((medication, index) => {
    const days = Array.isArray(medication.days) ? medication.days : []; // Ensure days is an array
    const li = document.createElement("li");
    li.innerHTML = `
        <strong>${medication.name}</strong><br>
        Time: ${medication.time}<br>
        Days: ${days.join(", ")}<br>
        Quantity: ${medication.quantity}<br>
        <button onclick="editMedication(${index})">Edit</button>
        <button onclick="removeMedication('${index}')">Remove</button>
    `;
    medicationsDisplay.appendChild(li);
});
}

window.onclick = function(event) {
if (event.target === document.getElementById("medicationModal")) {
    closeMedicationModal();
}
}

function confirmLogout() {
if (confirm("Are you sure you want to log out?")) {
    window.location.href = "index.html"; 
}
}

async function removeMedication(index) {
if (confirm("Are you sure you want to delete this medication?")) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${baseUrl}/medications/remove/${index}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Failed to delete medication');

        medications.splice(index, 1);
        displayMedications();
        
    } catch (error) {
        console.error('Error deleting medication:', error);
    }
}
}

function editMedication(index) {
currentEditingIndex = index;

// Populate the form with the medication's details
const medication = medications[index];
document.getElementById("medicationName").value = medication.name;
document.getElementById("medicationTime").value = medication.time;
document.getElementById("medicationQuantity").value = medication.quantity;

// Check the days checkboxes based on the medication's days
const dayCheckboxes = document.querySelectorAll("input[name='days']");
dayCheckboxes.forEach(checkbox => {
    checkbox.checked = medication.days.includes(checkbox.value);
});

// Open the modal for editing
openMedicationModal();
}