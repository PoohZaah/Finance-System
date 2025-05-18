import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyCzmy4HDBlnveHLg1wMBk4ZYCoLd-Y1C4E",
    authDomain: "mary-josette-finance.firebaseapp.com",
    databaseURL: "https://mary-josette-finance-default-rtdb.firebaseio.com",
    projectId: "mary-josette-finance",
    storageBucket: "mary-josette-finance.firebasestorage.app",
    messagingSenderId: "161649825972",
    appId: "1:161649825972:web:9c45b2ef7ce85a571cdfe1"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

async function fetchDataAndCreateChart() {
    const schoolYearsRef = ref(db, 'SchoolYear');
    const snapshot = await get(schoolYearsRef);
    const schoolYearsData = snapshot.val();

    const schoolYears = [];
    const expensesData = [];
    const remittancesData = [];

    for (const [year, data] of Object.entries(schoolYearsData || {})) {
        let totalExpenses = 0;
        let totalRemittances = 0;

        // Process expenses
        if (data.remittances) {
            Object.values(data.remittances).forEach(remittance => {
                totalExpenses += remittance.expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
            });
        }

        // Process payments
        if (data.Paid) {
            Object.values(data.Paid).forEach(student => {
                totalRemittances += Object.values(student.paymentHistory || {}).reduce((sum, p) => sum + (p.amount || 0), 0);
            });
        }

        schoolYears.push(year);
        expensesData.push(totalExpenses);
        remittancesData.push(totalRemittances);
    }

    new Chart(document.getElementById('chart1'), {
        type: 'bar',
        data: {
            labels: schoolYears,
            datasets: [
                {
                    label: 'Total Expenses',
                    data: expensesData,
                    backgroundColor: 'rgba(255, 99, 132, 0.8)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Total Remittances',
                    data: remittancesData,
                    backgroundColor: 'rgba(54, 162, 235, 0.8)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Financial Overview by School Year',
                    font: { size: 16 }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'School Year', font: { weight: 'bold' } },
                    ticks: {
                        autoSkip: false,
                        maxRotation: 45,
                        minRotation: 45
                    }
                },
                y: {
                    title: { display: true, text: 'Amount (PHP)', font: { weight: 'bold' } },
                    beginAtZero: true,
                    ticks: { callback: value => `₱${value.toLocaleString()}` }
                }
            }
        }
    });
}

async function createStudentCountChart() {
    const dbRef = ref(db);
    const snapshot = await get(dbRef);
    const data = snapshot.val();

    // Get school years
    const currentSY = data.CurrentSY ? `${data.CurrentSY.startSY}-${data.CurrentSY.endSY}` : '';
    const historicalYears = data.SchoolYear ? Object.keys(data.SchoolYear) : [];
    const currentStudents = data.Students?.CurrentSchoolYear 
        ? Object.values(data.Students.CurrentSchoolYear).filter(s => s.SchoolYear === currentSY).length 
        : 0;

    // Prepare data
    const allYears = [...historicalYears, currentSY].filter(Boolean).sort((a, b) => 
        parseInt(a.split('-')[0]) - parseInt(b.split('-')[0]));
    
    const studentCounts = allYears.map(year => year === currentSY 
        ? currentStudents 
        : Object.keys(data.SchoolYear[year]?.Paid || {}).length);

    new Chart(document.getElementById('chart2'), {
        type: 'bar',
        data: {
            labels: allYears,
            datasets: [{
                label: 'Total Students',
                data: studentCounts,
                backgroundColor: 'rgba(75, 192, 192, 0.8)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Student Enrollment by School Year',
                    font: { size: 16 }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'School Year', font: { weight: 'bold' } },
                    ticks: {
                        autoSkip: false,
                        maxRotation: 45,
                        minRotation: 45
                    }
                },
                y: {
                    title: { display: true, text: 'Number of Students', font: { weight: 'bold' } },
                    beginAtZero: true,
                    ticks: { precision: 0, stepSize: 1 }
                }
            }
        }
    });
}

// Initialize charts
window.addEventListener('DOMContentLoaded', () => {
    fetchDataAndCreateChart();
    createStudentCountChart();
});