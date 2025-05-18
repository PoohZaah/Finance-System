import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getDatabase, ref, onValue, get } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyCzmy4HDBlnveHLg1wMBk4ZYCoLd-Y1C4E",
    authDomain: "mary-josette-finance.firebaseapp.com",
    databaseURL: "https://mary-josette-finance-default-rtdb.firebaseio.com",
    projectId: "mary-josette-finance",
    storageBucket: "mary-josette-finance.appspot.com",
    messagingSenderId: "161649825972",
    appId: "1:161649825972:web:9c45b2ef7ce85a571cdfe1"
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const schoolYearDropdown = document.getElementById('schoolYearSelect');
let selectedSchoolYear = "2024-2025";

// Simplified table management
function showAlumniTable() {
    const alumniTable = document.getElementById('AlumniTable');
    alumniTable.style.display = 'block';
    document.getElementById('graduatesBtn').classList.add('active');
    loadAlumni();
}

const alumniTable = document.getElementById('AlumniTable');
const dropoutsTable = document.getElementById('DropoutsTable');

function showGraduatesTable() {
    alumniTable.style.display = 'block';
    dropoutsTable.style.display = 'none';
    document.getElementById('graduatesBtn').classList.add('active');
    document.getElementById('dropoutsBtn').classList.remove('active');
    loadAlumni();
}

function showDropoutsTable() {
    alumniTable.style.display = 'none';
    dropoutsTable.style.display = 'block';
    document.getElementById('dropoutsBtn').classList.add('active');
    document.getElementById('graduatesBtn').classList.remove('active');
    loadDropouts();
}

function loadAlumni() {
    const tbody = document.getElementById('AlumniBody');
    tbody.innerHTML = "<tr><td colspan='3'>Loading graduates...</td></tr>";

    const graduatesRef = ref(db, `Alumni/${selectedSchoolYear}`);
    onValue(graduatesRef, (snapshot) => {
        tbody.innerHTML = "";

        if (!snapshot.exists()) {
            tbody.innerHTML = `<tr><td colspan="3">No graduates found for ${selectedSchoolYear}</td></tr>`;
            return;
        }

        snapshot.forEach(childSnapshot => {
            const studentId = childSnapshot.key;
            const alumniData = childSnapshot.val();

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${studentId}</td>
                <td>${alumniData.Name || "N/A"}</td>
                <td>${alumniData.Grade || "N/A"}</td> 
            `;
            tbody.appendChild(row);
        });

        filterTable();
    }, (error) => {
        console.error("Error loading alumni:", error);
        tbody.innerHTML = `<tr><td colspan="3">Error loading graduates</td></tr>`;
    });
}

function loadDropouts() {
    const tbody = document.getElementById('DropoutsBody');
    tbody.innerHTML = "<tr><td colspan='3'>Loading dropouts...</td></tr>";

    const dropoutsRef = ref(db, `SchoolYear/${selectedSchoolYear}/Dropouts`);
    onValue(dropoutsRef, (snapshot) => {
        tbody.innerHTML = "";
        if (!snapshot.exists()) {
            tbody.innerHTML = `<tr><td colspan="3">No graduates found for ${selectedSchoolYear}</td></tr>`;
            return;
        }

        snapshot.forEach(childSnapshot => {
            const studentId = childSnapshot.key;
            const DropoutData = childSnapshot.val();
            if (studentId === "holder") return;


            const row = document.createElement('tr');
            row.innerHTML = `
            <td>${studentId}</td>
            <td>${DropoutData.Name || "N/A"}</td>
            <td>${DropoutData.Grade || "N/A"}</td>
        `;
            tbody.appendChild(row);
        });

        filterTable();
    }, (error) => {
        console.error("Error loading alumni:", error);
        tbody.innerHTML = `<tr><td colspan="3">Error loading graduates</td></tr>`;
    });
}

function filterTable() {
    const searchText = document.getElementById('searchInput').value.toLowerCase();
    const activeTable = document.querySelector('.reportTable[style*="display: block"]');
    if (!activeTable) return;

    const tbody = activeTable.querySelector('tbody');
    tbody.querySelectorAll("tr").forEach(row => {
        const rowText = row.textContent.toLowerCase();
        row.style.display = rowText.includes(searchText) ? "" : "none";
    });
}
// Export functions
function downloadPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const alumniTable = document.getElementById('AlumniTable');
    const tbody = alumniTable.querySelector('tbody');
    const activeTable = document.querySelector('.reportTable[style*="display: block"]');

    doc.setFontSize(14);
    doc.text("Graduate Students Report", 10, 15);

    const headers = [...alumniTable.querySelectorAll("thead tr th")].map(th => th.innerText);
    const rows = [...tbody.querySelectorAll("tr")].map(row =>
        [...row.querySelectorAll("td")].map(td => td.innerText)
    );

    doc.autoTable({
        head: [headers],
        body: rows,
        startY: 20,
        theme: 'grid',
        styles: { fontSize: 10 },
        headStyles: { fillColor: [91, 102, 120] }
    });

    const pdfBlob = doc.output('blob');
    window.open(URL.createObjectURL(pdfBlob));
}

function exportToExcel() {
    const alumniTable = document.getElementById("AlumniTable");
    const clonedTable = alumniTable.cloneNode(true);
    const ws = XLSX.utils.table_to_sheet(clonedTable);
    const wb = XLSX.utils.book_new();
    const activeTable = document.querySelector('.reportTable[style*="display: block"]');
    XLSX.utils.book_append_sheet(wb, ws, "Graduates");
    XLSX.writeFile(wb, `Graduates_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// Initialization
// Update the DOMContentLoaded listener in archive.js
document.addEventListener("DOMContentLoaded", () => {
    const alumniYearsRef = ref(db, "Alumni");
    
    onValue(alumniYearsRef, (snapshot) => {
        schoolYearDropdown.innerHTML = "";
        
        if (snapshot.exists()) {
            const years = [];
            snapshot.forEach(childSnapshot => {
                years.push(childSnapshot.key);
            });
            
            // Modified sort order - oldest first
            years.sort((a, b) => a.localeCompare(b));
            
            years.forEach(year => {
                const option = document.createElement("option");
                option.value = year;
                option.textContent = year;
                schoolYearDropdown.appendChild(option);
            });

            // Set selection to first item (oldest year)
            selectedSchoolYear = years[0] || "2024-2025";
            schoolYearDropdown.value = selectedSchoolYear;
        } else {
            schoolYearDropdown.innerHTML = '<option value="">No alumni records found</option>';
        }

        showGraduatesTable();
    });

    // Event listeners
    document.getElementById('graduatesBtn').addEventListener('click', showGraduatesTable);
    document.getElementById('dropoutsBtn').addEventListener('click', showDropoutsTable);
    document.getElementById('searchInput').addEventListener('input', filterTable);
    document.getElementById('printReportBtn').addEventListener('click', downloadPDF);
    document.getElementById('exportExcelBtn').addEventListener('click', exportToExcel);
});

// Update the school year change handler
schoolYearDropdown.addEventListener('change', () => {
    selectedSchoolYear = schoolYearDropdown.value;
    if (document.getElementById('graduatesBtn').classList.contains('active')) {
        loadAlumni();
    } else {
        loadDropouts();
    }
});