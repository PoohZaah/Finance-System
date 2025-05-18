import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js';
import { getDatabase, ref, get } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-database.js';

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

async function fetchTotalStudents() {
  const studentsRef = ref(db, 'Students/CurrentSchoolYear');
  try {
    const snapshot = await get(studentsRef);
    return snapshot.exists() ? Object.keys(snapshot.val()).filter(key => key !== "holder").length : 0;
  } catch (error) {
    console.error("Error fetching students:", error);
    return 0;
  }
}

document.addEventListener('DOMContentLoaded', async function () {
  try {
    const totalStudents = await fetchTotalStudents();
    document.getElementById('total-students').textContent = totalStudents;
  } catch (error) {
    document.getElementById('total-students').textContent = 'Error';
  }
});

async function fetchTotalRemittances() {
  const remittancesRef = ref(db, 'remittances');
  try {
    const snapshot = await get(remittancesRef);
    let totals = { totalPayments: 0, totalExpenses: 0, netRemittance: 0 };

    if (snapshot.exists()) {
      Object.values(snapshot.val()).forEach(remittance => {
        const payments = remittance.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
        const expenses = remittance.expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
        
        totals.totalPayments += payments;
        totals.totalExpenses += expenses;
        totals.netRemittance += payments - expenses;
      });
    }
    return totals;
  } catch (error) {
    console.error("Error fetching remittance data:", error);
    return totals;
  }
}

async function fetchRemittanceChartData() {
  const remittancesRef = ref(db, 'remittances');
  try {
    const snapshot = await get(remittancesRef);
    if (!snapshot.exists()) return { weeklyData: [], monthlyData: [], yearlyData: {} };

    const remittances = snapshot.val();
    let weeklyData = new Array(5).fill(0);
    let monthlyData = new Array(12).fill(0);
    let yearlyData = {};

    Object.values(remittances).forEach(remittance => {
      if (!remittance.date) return;
      
      const date = new Date(remittance.date);
      const year = date.getFullYear();
      const month = date.getMonth();
      const week = Math.floor((date.getDate() - 1) / 7);

      const payments = remittance.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const expenses = remittance.expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
      const netAmount = payments - expenses;

      // Update yearly data
      yearlyData[year] = (yearlyData[year] || 0) + netAmount;
      
      // Update monthly data
      monthlyData[month] += netAmount;
      
      // Update weekly data
      if (week < 5) weeklyData[week] += netAmount;
    });

    return { weeklyData, monthlyData, yearlyData };
  } catch (error) {
    console.error("Error fetching chart data:", error);
    return { weeklyData: [], monthlyData: [], yearlyData: {} };
  }
}

async function initializeCharts(remittanceData, chartData) {
  const ctxRemittance = document.getElementById('remittanceChart').getContext('2d');
  const gradient = ctxRemittance.createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0.33, '#fbe763');
  gradient.addColorStop(0.76, '#fea128');
  gradient.addColorStop(1, '#ff8705');

  // Generate dynamic week labels based on actual data
  const weekCount = chartData.weeklyData.filter(v => v !== 0).length || 1;
  const weekLabels = Array.from({length: 5}, (_, i) => `Week ${i + 1}`);

  const remittanceChart = new Chart(ctxRemittance, {
    type: 'bar',
    data: {
      labels: weekLabels,
      datasets: [{
        label: "Net Remittance (₱)",
        data: chartData.weeklyData,
        backgroundColor: gradient,
        borderColor: '#fea128',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true, title: { display: true, text: 'Amount (₱)' } },
        x: { title: { display: true, text: 'Time Period' } }
      }
    }
  });

  // Fees doughnut chart
  const ctxFees = document.getElementById('feesDoughnutChart').getContext('2d');
  new Chart(ctxFees, {
    type: 'doughnut',
    data: {
      labels: ["Total Collections", "Total Expenses"],
      datasets: [{
        label: "Financial Overview",
        data: [remittanceData.totalPayments, remittanceData.totalExpenses],
        backgroundColor: ['#7A4F4F', '#ddc1bd'],
        borderWidth: 1
      }]
    },
    options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
  });

  // Time filter handler
  document.getElementById("timeFilter").addEventListener("change", function() {
    let labels, newData;
    switch(this.value) {
      case 'week':
        labels = weekLabels;
        newData = chartData.weeklyData;
        break;
      case 'month':
        labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        newData = chartData.monthlyData;
        break;
      case 'year':
        labels = Object.keys(chartData.yearlyData);
        newData = Object.values(chartData.yearlyData);
        break;
    }

    remittanceChart.data.labels = labels;
    remittanceChart.data.datasets[0].data = newData;
    remittanceChart.update();
  });
}

// Main initialization
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const [students, remittanceData, chartData] = await Promise.all([
      fetchTotalStudents(),
      fetchTotalRemittances(),
      fetchRemittanceChartData()
    ]);

    // Update DOM elements
    document.getElementById('total-students').textContent = students;
    document.querySelector(".solid-purple h2").textContent = `₱${remittanceData.netRemittance.toLocaleString()}`;
    document.querySelector(".solid-red h2").textContent = `₱${remittanceData.totalPayments.toLocaleString()}`;
    document.querySelector(".solid-green h2").textContent = `₱${remittanceData.totalExpenses.toLocaleString()}`;

    // Initialize charts
    await initializeCharts(remittanceData, chartData);
    
    // Load school year
    const currentSYRef = ref(db, 'CurrentSY');
    const snapshot = await get(currentSYRef);
    if (snapshot.exists()) {
      const { startSY, endSY } = snapshot.val();
      document.getElementById('schoolyear').textContent = `${startSY}-${endSY}`;
    }
    
  } catch (error) {
    console.error("Initialization error:", error);
    document.querySelectorAll('.overview-card h2').forEach(el => el.textContent = 'Error');
  }
});