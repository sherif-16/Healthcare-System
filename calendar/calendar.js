const daysTag = document.querySelector(".days"),
    currentDate = document.querySelector(".current-date"),
    prevNextIcon = document.querySelectorAll(".icons span");

// getting new date, current year and month
let date = new Date(),
    currYear = date.getFullYear(),
    currMonth = date.getMonth();

// storing full name of all months in array
const months = ["January", "February", "March", "April", "May", "June", "July",
                "August", "September", "October", "November", "December"];

                const fetchAppointments = async () => {
                    try {
                        const token = localStorage.getItem('token');
                        const response = await fetch('http://localhost:5500/medications', {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            }
                        });
                
                        if (!response.ok) {
                            throw new Error(`Error fetching appointments: ${response.statusText}`);
                        }
                
                        const appointments = await response.json();
                        console.log(appointments);  // Check the structure of the appointments data
                        
                        return appointments;
                    } catch (error) {
                        console.error('Error fetching appointments:', error.message);
                        return [];  // Return an empty array in case of error
                    }
                };
                


// Render appointments on the calendar
const renderAppointments = (appointments) => {
    let liTag = "";

    // Adding logic to display appointments in calendar days
    const appointmentDays = appointments.flatMap(app => app.days); // Collect all appointment days
    
    for (let i = 1; i <= 31; i++) { // Adjust to actual month day limit
        let isToday = i === date.getDate() && currMonth === new Date().getMonth() 
                     && currYear === new Date().getFullYear() ? "active" : "";

        // Check if this day has appointments
        const isAppointmentDay = appointmentDays.includes(getDayName(i));  // Convert number to weekday name
        liTag += `<li class="${isToday} ${isAppointmentDay ? 'has-appointments' : ''}">${i}</li>`;
    }

    daysTag.innerHTML = liTag;
};

const getDayName = (dayIndex) => {
    const date = new Date(currYear, currMonth, dayIndex);
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[date.getDay()];
};

const renderCalendar = async () => {
    let firstDayofMonth = new Date(currYear, currMonth, 1).getDay(),
        lastDateofMonth = new Date(currYear, currMonth + 1, 0).getDate(),
        lastDayofMonth = new Date(currYear, currMonth, lastDateofMonth).getDay(),
        lastDateofLastMonth = new Date(currYear, currMonth, 0).getDate();

    const appointments = await fetchAppointments();  // Fetch appointments

    let liTag = "";
    const daysWithAppointments = {};  // Store appointments by day

    // Mapping days of the week to indices (0: Sunday, 1: Monday, ..., 6: Saturday)
    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    // Organize appointments by day of the month
    appointments.forEach(appointment => {
        if (Array.isArray(appointment.days)) {  // Check if days is an array
            appointment.days.forEach(day => {
                const dayIndex = daysOfWeek.indexOf(day);  // Find index of the day in the week
                if (dayIndex !== -1) {
                    if (!daysWithAppointments[dayIndex]) {
                        daysWithAppointments[dayIndex] = [];
                    }
                    daysWithAppointments[dayIndex].push({
                        name: appointment.name,
                        quantity: appointment.quantity,
                        time: appointment.time,
                    });
                }
            });
        }
    });

    for (let i = firstDayofMonth; i > 0; i--) {
        liTag += `<li class="inactive">${lastDateofLastMonth - i + 1}</li>`;
    }

    for (let i = 1; i <= lastDateofMonth; i++) {
        let isToday = i === date.getDate() && currMonth === new Date().getMonth() && currYear === new Date().getFullYear() ? "active" : "";
        
        // Find which day of the week the current date falls on
        let currentDayIndex = new Date(currYear, currMonth, i).getDay();
        let dayAppointments = daysWithAppointments[currentDayIndex] || [];  // Get appointments for the day, if any

        let appointmentInfo = dayAppointments.map(appointment => {
            return `<div class="appointment-info">
                        <strong>${appointment.name}</strong><br>
                        <span>Quantity: ${appointment.quantity}</span><br>
                        <span>Time: ${appointment.time}</span>
                    </div>`;
        }).join("");  // Combine all appointments for the day

        liTag += `<li class="${isToday}">${i}${appointmentInfo}</li>`;
    }

    for (let i = lastDayofMonth; i < 6; i++) {
        liTag += `<li class="inactive">${i - lastDayofMonth + 1}</li>`;
    }

    currentDate.innerText = `${months[currMonth]} ${currYear}`;
    daysTag.innerHTML = liTag;
};

// Call the function to render the calendar
renderCalendar();



prevNextIcon.forEach(icon => {
    icon.addEventListener("click", () => {
        currMonth = icon.id === "prev" ? currMonth - 1 : currMonth + 1;

        if (currMonth < 0 || currMonth > 11) {
            date = new Date(currYear, currMonth, new Date().getDate());
            currYear = date.getFullYear();
            currMonth = date.getMonth();
        } else {
            date = new Date();
        }
        renderCalendar();
    });
});

function confirmLogout() {
    if (confirm("Are you sure you want to log out?")) {
        window.location.href = "../index.html";
        localStorage.clear();
    }
}
