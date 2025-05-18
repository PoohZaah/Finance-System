import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getDatabase, ref, onValue, set, remove, get } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-database.js";

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
let selectedSchoolYear = "2024-2025"; // Default selection

document.getElementById('analyticsBtn').addEventListener('click', function() {window.open('analytics.html', '_blank');});

function switchTable(tableName) {
    const paidTable = document.getElementById('PaidTable');
    const balanceTable = document.getElementById('BalanceTable');
    const remittancesTable = document.getElementById('RemittancesTable');

    paidTable.style.display = 'none';
    balanceTable.style.display = 'none';
    remittancesTable.style.display = 'none';
    document.querySelectorAll('.sort-btn').forEach(btn => btn.classList.remove('active'));

    const paidStudentsRef = ref(db, `SchoolYear/${selectedSchoolYear}/Paid`);
    const balanceStudentsRef = ref(db, `SchoolYear/${selectedSchoolYear}/Balance`);

    switch (tableName) {
        case 'RemittancesTable':
            document.getElementById('RemittancesTable').style.display = 'block';
            document.getElementById('remittancesBtn').classList.add('active');
            loadRemittancesByMonth();
            break;
        case 'PaidTable':
            paidTable.style.display = 'block';
            document.getElementById('collectionsBtn').classList.add('active');
            loadStudents(ref(db, `SchoolYear/${selectedSchoolYear}/Paid`), "PaidBody", filterTable);
            break;
        case 'BalanceTable':
            balanceTable.style.display = 'block';
            document.getElementById('expensesBtn').classList.add('active');
            loadStudents(ref(db, `SchoolYear/${selectedSchoolYear}/Balance`), "BalanceBody", filterTable);
            break;
    }
}


function loadRemittancesByMonth() {
    const tbody = document.getElementById('RemittancesBody');
    tbody.innerHTML = "<tr><td colspan='4'>Loading...</td></tr>";

    const remittancesRef = ref(db, `SchoolYear/${selectedSchoolYear}/remittances`);
    onValue(remittancesRef, async (snapshot) => {
        let grandTotalCollections = 0;
        let grandTotalExpenses = 0;
        tbody.innerHTML = '';

        if (!snapshot.exists()) {
            tbody.innerHTML = "<tr><td colspan='4'>No remittances found.</td></tr>";
            return;
        }

        const remittances = snapshot.val();
        const months = {};

        // Helper function to parse different date formats
        const parseDate = (dateString) => {
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) { // YYYY-MM-DD format
                const [year, month, day] = dateString.split('-').map(Number);
                return new Date(year, month - 1, day);
            } else { // MM-DD-YYYY or MM/DD/YYYY
                const [month, day, year] = dateString.split(/[-/]/).map(Number);
                return new Date(year, month - 1, day);
            }
        };

        // Format date to MM/DD/YYYY
        const formatDate = (date) => {
            return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`;
        };

        // Process each remittance
        Object.values(remittances).forEach(remittance => {
            // Process payments
            remittance.payments?.forEach(payment => {
                const paymentDate = parseDate(payment.date);
                const monthName = paymentDate.toLocaleString('default', { month: 'long' });
                const dateKey = formatDate(paymentDate);

                if (!months[monthName]) {
                    months[monthName] = {
                        dailyData: {},
                        totalCollections: 0,
                        totalExpenses: 0
                    };
                }

                if (!months[monthName].dailyData[dateKey]) {
                    months[monthName].dailyData[dateKey] = {
                        date: dateKey, // Store formatted date
                        collections: 0,
                        expenses: 0
                    };
                }

                months[monthName].dailyData[dateKey].collections += payment.amount;
                months[monthName].totalCollections += payment.amount;
            });

            // Process expenses
            remittance.expenses?.forEach(expense => {
                const rawDate = expense.date || remittance.date; // Use expense date or remittance date
                const expenseDate = parseDate(rawDate);
                const monthName = expenseDate.toLocaleString('default', { month: 'long' });
                const dateKey = formatDate(expenseDate);

                if (!months[monthName]) {
                    months[monthName] = {
                        dailyData: {},
                        totalCollections: 0,
                        totalExpenses: 0
                    };
                }

                if (!months[monthName].dailyData[dateKey]) {
                    months[monthName].dailyData[dateKey] = {
                        date: dateKey,
                        collections: 0,
                        expenses: 0
                    };
                }

                months[monthName].dailyData[dateKey].expenses += expense.amount;
                months[monthName].totalExpenses += expense.amount;
            });
        });

        // Sort months chronologically and populate table
        Object.entries(months)
            .sort((a, b) => {
                const [monthA, monthB] = [a[0], b[0]];
                return new Date(`2024-${monthA}-01`) - new Date(`2024-${monthB}-01`);
            })
            .forEach(([month, data]) => {
                const row = document.createElement('tr');
                row.className = 'clickable-month';
                row.innerHTML = `
                    <td>${month}</td>
                    <td>${data.totalCollections.toFixed(2)}</td>
                    <td>${data.totalExpenses.toFixed(2)}</td>
                    <td>${(data.totalCollections - data.totalExpenses).toFixed(2)}</td>
                `;
                row.dataset.monthData = JSON.stringify({
                    month,
                    dailyData: data.dailyData,
                    totalCollections: data.totalCollections,
                    totalExpenses: data.totalExpenses
                });
                tbody.appendChild(row);
            });

        // Calculate grand totals for the total row
        grandTotalCollections = Object.values(months).reduce((sum, m) => sum + m.totalCollections, 0);
        grandTotalExpenses = Object.values(months).reduce((sum, m) => sum + m.totalExpenses, 0);

        // Add the total row to the table
        const totalRow = document.createElement('tr');
        totalRow.className = 'total-row';
        totalRow.style.fontWeight = 'bold';
        totalRow.style.backgroundColor = '#f5f5f5';
        totalRow.innerHTML = `
            <td>Total</td>
            <td>${grandTotalCollections.toFixed(2)}</td>
            <td>${grandTotalExpenses.toFixed(2)}</td>
            <td>${(grandTotalCollections - grandTotalExpenses).toFixed(2)}</td>
        `;
        tbody.appendChild(totalRow);

        // Attach click handlers for monthly rows
        document.querySelectorAll('.clickable-month').forEach(row => {
            row.addEventListener('click', () => {
                const monthData = JSON.parse(row.dataset.monthData);
                generateDailyRemittancesPDF(monthData);
            });
        });
    });
}

function generateDailyRemittancesPDF(monthData) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("p", "mm", "a4");
    const db = getDatabase();

    const img = new Image();
    img.src = "/images/mja-logo.png";

    img.onload = function () {
        // Header design
        doc.addImage(img, "PNG", 40, 13, 23, 23);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text("School Financial Report", 80, 20);
        
        // School year
        const syRef = ref(db, 'CurrentSY');
        onValue(syRef, (snapshot) => {
            if (snapshot.exists()) {
                const { startSY, endSY } = snapshot.val();
                doc.setFontSize(10);
                doc.text(`School Year: ${startSY}-${endSY}`, 90, 34);
            }
        }, { onlyOnce: true });

        // Report title and date
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text(`Daily Remittances Report - ${monthData.month}`, 80, 30);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 90, 38);

        // Prepare table data
        const dailyEntries = Object.entries(monthData.dailyData)
            .sort((a, b) => new Date(a[0]) - new Date(b[0]))
            .map(([date, values]) => [
                date.replace(/-/g, '/'),
                values.collections.toFixed(2),
                values.expenses.toFixed(2),
                (values.collections - values.expenses).toFixed(2)
            ]);

        // Add totals row
        dailyEntries.push([
            { content: 'Total', styles: { fontStyle: 'bold' } },
            { content: monthData.totalCollections.toFixed(2), styles: { fontStyle: 'bold' } },
            { content: monthData.totalExpenses.toFixed(2), styles: { fontStyle: 'bold' } },
            { content: (monthData.totalCollections - monthData.totalExpenses).toFixed(2), styles: { fontStyle: 'bold' } }
        ]);

        // Create table
        doc.autoTable({
            startY: 45,
            head: [['Date', 'Collections', 'Expenses', 'Net Remittances']],
            body: dailyEntries,
            theme: "grid",
            styles: {
                fontSize: 10,
                cellPadding: 4,
                valign: "middle",
                halign: "center",
            },
            headStyles: {
                fillColor: [91, 102, 120],
                textColor: 255,
                fontStyle: "bold",
            },
            bodyStyles: {
                fillColor: [255, 255, 255],
                textColor: 0,
            },
            columnStyles: { 0: { cellWidth: 30 } }
        });

        // Add totals box
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setDrawColor(0);
        doc.rect(14, finalY, 180, 30);
        doc.setFont("helvetica", "bold");
        doc.text(`Total Collections: ${monthData.totalCollections.toFixed(2)}`, 17, finalY + 8);
        doc.text(`Total Expenses: ${monthData.totalExpenses.toFixed(2)}`, 17, finalY + 16);
        doc.text(`Net Remittance: ${(monthData.totalCollections - monthData.totalExpenses).toFixed(2)}`, 17, finalY + 24);

        // Generate PDF
        const pdfBlob = doc.output("blob");
        window.open(URL.createObjectURL(pdfBlob));
    };
}

document.addEventListener("DOMContentLoaded", () => {
    const schoolYearRef = ref(db, "SchoolYear");
    onValue(schoolYearRef, (snapshot) => {
        if (!snapshot.exists()) return;
        schoolYearDropdown.innerHTML = "";
        snapshot.forEach((childSnapshot) => {
            const year = childSnapshot.key;
            const option = document.createElement("option");
            option.value = year;
            option.textContent = year;
            if (year === selectedSchoolYear) option.selected = true;
            schoolYearDropdown.appendChild(option);
        });

        selectedSchoolYear = schoolYearDropdown.value;
        switchTable("PaidTable");
    });
});

schoolYearDropdown.addEventListener("change", () => {
    selectedSchoolYear = schoolYearDropdown.value;
    switchTable(document.querySelector('.reportTable:not([style*="display: none"])')?.id || "PaidTable");
});

function loadStudents(dbRef, tableBodyId, callback) {
    const tbody = document.getElementById(tableBodyId);
    if (!tbody) {
        console.error(`Table body ${tableBodyId} not found`);
        return;
    }

    tbody.innerHTML = "";
    onValue(dbRef, (snapshot) => {
        if (!snapshot.exists()) {
            tbody.innerHTML = `<tr><td colspan="4">No students found</td></tr>`;
            return;
        }

        snapshot.forEach((childSnapshot) => {
            if (childSnapshot.key === "holder") return;
            const student = childSnapshot.val();

            if (tableBodyId === "BalanceBody" && student.remainingBalance === 0) {
                const studentId = childSnapshot.key;
                const studentRef = ref(db, `SchoolYear/${selectedSchoolYear}/Balance/${studentId}`);
                const paidRef = ref(db, `SchoolYear/${selectedSchoolYear}/Paid/${studentId}`);

                set(paidRef, student)
                    .then(() => remove(studentRef))
                    .catch(error => console.error("Error moving student:", error));
                return;
            }

            const remainingBalance = student.OldBalance ? `₱${student.OldBalance}` : "Fully Paid";
            const grade = student.Grade || "N/A";
            const isPaidTable = tableBodyId === 'PaidBody';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="${isPaidTable ? 'clickable-cell' : 'student-name'}">${student.Name || "N/A"}</td>
                <td>${childSnapshot.key || "N/A"}</td>
                <td>${grade}</td>
                <td>${remainingBalance || "N/A"}</td>
            `;

            if (isPaidTable) {
                row.querySelector('.clickable-cell').addEventListener('click', async () => {
                    const studentId = childSnapshot.key;
                    // Use the selected school year from the dropdown
                    await generateArchivePDF(studentId, selectedSchoolYear);
                });
            }

            tbody.appendChild(row);
        });

        if (tableBodyId === 'BalanceBody') {
            makeStudentNamesClickable();
        }
        filterTable();
        if (callback) callback();
    }, (error) => {
        console.error("Error loading students:", error);
        tbody.innerHTML = `<tr><td colspan="4">Error loading data</td></tr>`;
    });
}

function makeStudentNamesClickable() {
    const tbody = document.getElementById('BalanceBody');

    onValue(ref(db, `SchoolYear/${selectedSchoolYear}/Balance`), (snapshot) => {
        tbody.innerHTML = "";

        if (!snapshot.exists()) {
            tbody.innerHTML = `<tr><td colspan="4">No students found</td></tr>`;
            return;
        }

        snapshot.forEach((childSnapshot) => {
            if (childSnapshot.key === "holder") return;

            const student = childSnapshot.val();
            const originalGrade = student.Grade || "N/A";

            const encodedGrade = ["Nursery", "Kinder 1", "Kinder 2"].includes(originalGrade)
                ? "Pre-Elem"
                : originalGrade;

            const studentDetails = {
                studentId: childSnapshot.key,
                name: student.Name || "N/A",
                grade: encodedGrade,
                remainingBalance: student.remainingBalance || "No balance",
                selectedPlan: student.selectedPlan,
                paidMonthlyAmount: student.paidMonthlyAmount || 0,
                selectedDiscount: student.selectedDiscountText || "No discount applied",
                source: 'archive', // Indicate the student is from the archive
                schoolYear: selectedSchoolYear // Add selected school year
            };

            const encodedDetails = encodeURIComponent(JSON.stringify(studentDetails));


            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="clickable-cell" data-student='${encodedDetails}'>${student.Name || "N/A"}</td>
                <td>${childSnapshot.key}</td>
                <td>${originalGrade}</td> <!-- Display original grade -->
                <td>${student.remainingBalance ? `₱${student.remainingBalance}` : "Fully Paid"}</td>
            `;

            tbody.appendChild(row);
        });

        document.querySelectorAll('.clickable-cell').forEach(cell => {
            cell.addEventListener('click', function () {
                window.location.href = `payments.html?data=${this.dataset.student}`;
            });
        });
    }, (error) => {
        console.error("Error loading students:", error);
        tbody.innerHTML = `<tr><td colspan="4">Error loading data</td></tr>`;
    });
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('collectionsBtn').addEventListener('click', () => switchTable('PaidTable'));
    document.getElementById('expensesBtn').addEventListener('click', () => switchTable('BalanceTable'));
    document.getElementById('remittancesBtn').addEventListener('click', () => switchTable('RemittancesTable'));
    document.getElementById('searchInput').addEventListener('input', filterTable);
    document.getElementById('printReportBtn').addEventListener('click', downloadPDF);
    document.getElementById('exportExcelBtn').addEventListener('click', exportToExcel);

    switchTable('PaidTable');
});

function filterTable() {
    const searchText = document.getElementById('searchInput').value.toLowerCase();
    const activeTable = document.querySelector('.reportTable:not([style*="display: none"]) tbody');

    if (!activeTable) return;

    activeTable.querySelectorAll("tr").forEach(row => {
        const rowText = row.textContent.toLowerCase();
        row.style.display = rowText.includes(searchText) ? "" : "none";
    });
}


function downloadPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("p", "mm", "a4");
    const db = getDatabase();

    const today = new Date();
    const formattedDate = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}-${today.getFullYear()}`;

    let activeTable, reportType, headers, rows, isRemittance = false;
    const paidTable = document.getElementById('PaidTable');
    const balanceTable = document.getElementById('BalanceTable');
    const remittancesTable = document.getElementById('RemittancesTable');

    // Determine active table
    if (paidTable.style.display !== 'none') {
        activeTable = paidTable;
        reportType = "Fully Paid Students Report";
        headers = ["#", "Student Name", "Student Number", "Grade Level", "Plan"];
    } else if (balanceTable.style.display !== 'none') {
        activeTable = balanceTable;
        reportType = "Students with Balances Report";
        headers = ["#", "Student Name", "Student Number", "Grade Level", "Remaining Balance"];
    } else if (remittancesTable.style.display !== 'none') {
        activeTable = remittancesTable;
        reportType = "Monthly Remittances Report";
        headers = ["Month", "Total Collections", "Total Expenses", "Net Remittance"];
        isRemittance = true;
    } else {
        alert("No table is currently visible.");
        return;
    }

    const img = new Image();
    img.src = "/images/mja-logo.png";

    img.onload = function () {
        // Header Section
        doc.addImage(img, "PNG", 40, 13, 23, 23);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text("School Financial Report", 80, 20);

        // School Year
        const syRef = ref(db, 'CurrentSY');
        onValue(syRef, (snapshot) => {
            if (snapshot.exists()) {
                const { startSY, endSY } = snapshot.val();
                doc.setFontSize(10);
                doc.text(`School Year: ${startSY}-${endSY}`, 90, 34);
            }
        }, { onlyOnce: true });

        // Report Details
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text(reportType, 80, 30);
        doc.text(`Date: ${formattedDate}`, 90, 38);

        // Process table data
        let rows = [];
        let grandTotalCollections = 0;
        let grandTotalExpenses = 0;
        let grandTotalNet = 0;

        activeTable.querySelectorAll("tbody tr").forEach((row, index) => {
            if (row.classList.contains('total-row')) {
                if (isRemittance) {
                    const cells = row.querySelectorAll('td');
                    grandTotalCollections = parseFloat(cells[1].textContent);
                    grandTotalExpenses = parseFloat(cells[2].textContent);
                    grandTotalNet = parseFloat(cells[3].textContent);
                }
                return;
            }

            const cells = row.querySelectorAll('td');
            const rowData = isRemittance 
                ? [
                    cells[0].textContent,
                    cells[1].textContent,
                    cells[2].textContent,
                    cells[3].textContent
                  ]
                : [
                    index + 1,
                    cells[0].textContent,
                    cells[1].textContent,
                    cells[2].textContent,
                    cells[3]?.textContent || "N/A"
                  ];
            
            rows.push(rowData);
        });

        // Generate PDF Table
        doc.autoTable({
            startY: 45,
            head: [headers],
            body: rows,
            theme: "grid",
            styles: {
                fontSize: 10,
                cellPadding: 4,
                valign: "middle",
                halign: "center",
            },
            headStyles: {
                fillColor: [91, 102, 120], // #5b6678
                textColor: 255,
                fontStyle: "bold",
            },
            bodyStyles: {
                fillColor: [255, 255, 255],
                textColor: 0,
            },
            columnStyles: isRemittance ? {
                0: { cellWidth: 50 },
                1: { cellWidth: 40 },
                2: { cellWidth: 40 },
                3: { cellWidth: 40 }
            } : {
                0: { cellWidth: 8 },
                1: { cellWidth: 50 },
                2: { cellWidth: 30 },
                3: { cellWidth: 20 },
                4: { cellWidth: 30 }
            }
        });

        // Add totals box for remittances
        if (isRemittance) {
            const finalY = doc.lastAutoTable.finalY + 10;
            const boxHeight = 28;
            
            // Draw box
            doc.setDrawColor(0);
            doc.rect(14, finalY, 180, boxHeight);
            
            // Add totals text
            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.text(`Total Collections: ${grandTotalCollections.toFixed(2)}`, 17, finalY + 8);
            doc.text(`Total Expenses: ${grandTotalExpenses.toFixed(2)}`, 17, finalY + 16);
            doc.text(`Net Remittance: ${grandTotalNet.toFixed(2)}`, 17, finalY + 24);
        }

        // Finalize PDF
        const fileName = `MJA_${reportType.replace(/ /g, '_')}_${formattedDate}.pdf`;
        const pdfBlob = doc.output("blob");
        const blobURL = URL.createObjectURL(pdfBlob);
        window.open(blobURL, "_blank");
    };
}



function exportToExcel() {
    const paidTable = document.getElementById("PaidTable");
    const balanceTable = document.getElementById("BalanceTable");
    const remittanceTable = document.getElementById("RemittancesTable");

    let activeTable;
    let tableTitle;

    if (paidTable.style.display !== "none") {
        activeTable = paidTable;
        tableTitle = "Fully Paid Students";
    } else if (balanceTable.style.display !== "none") {
        activeTable = balanceTable;
        tableTitle = "Students with Balances";
    } else if (remittanceTable.style.display !== "none") {
        activeTable = remittanceTable;
        tableTitle = "Remittances";
    } else {
        alert("No active table found.");
        return;
    }

    const clonedTable = activeTable.cloneNode(true);

    const modal = document.createElement("div");
    modal.classList.add("modal");
    modal.style.position = "fixed";
    modal.style.top = "0";
    modal.style.left = "0";
    modal.style.width = "100%";
    modal.style.height = "100%";
    modal.style.background = "rgba(0, 0, 0, 0.5)";
    modal.style.display = "flex";
    modal.style.justifyContent = "center";
    modal.style.alignItems = "center";
    modal.style.zIndex = "1000";

    modal.innerHTML = `
        <div class="modal-content" style="background: white; padding: 20px; width: 60%; border-radius: 10px; text-align: center;">
            <span class="close-btn" style="cursor: pointer; font-size: 20px; float: right;">&times;</span>
            <h3>Preview ${tableTitle} Table</h3>
            <div id="excelPreviewTableContainer" style="max-height: 400px; overflow: auto; border: 1px solid #ccc;">
            </div>
            <br>
            <button id="confirmDownloadBtn" style="padding: 10px 20px; background: #007bff; color: white; border: none; cursor: pointer;">Download Excel</button>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById("excelPreviewTableContainer").appendChild(clonedTable);

    modal.querySelector(".close-btn").addEventListener("click", function () {
        modal.remove();
    });

    document.getElementById("confirmDownloadBtn").addEventListener("click", function () {
        downloadExcel(activeTable);
        modal.remove();
    });
}

function downloadExcel(tableElement) {
    const sheetName = tableElement.id === "PaidTable" ? "Paid_Students" : "Balance_Students";
    const ws = XLSX.utils.table_to_sheet(tableElement);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const today = new Date();
    const formattedDate = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}-${today.getFullYear()}`;

    XLSX.writeFile(wb, `${sheetName}_Report_${formattedDate}.xlsx`);
}

function getLoggedInUserName(callback) {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return callback("Ma'am");

    onValue(ref(db, `staff/${user.uid}`), (snapshot) => {
        const staffData = snapshot.val();
        const pushKey = Object.keys(staffData)[0];
        callback(staffData[pushKey]?.name || "Ma'am");
    }, (error) => {
        console.error("Error:", error);
        callback("Ma'am");
    });
}

async function generateArchivePDF(studentId, selectedSchoolYear) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("p", "mm", "a4");
    const pageHeight = doc.internal.pageSize.height;

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    try {
        // Get current school year to calculate previous
        const syRef = ref(db, 'CurrentSY');
        const sySnapshot = await get(syRef);
        const currentSY = sySnapshot.exists() ? sySnapshot.val() : { startSY: 2024, endSY: 2025 };
        const previousSchoolYear = `${currentSY.startSY - 1}-${currentSY.endSY - 1}`;

        // Path to previous year's paid student data
        const studentRoot = `SchoolYear/${selectedSchoolYear}/Paid`;
        const studentRef = ref(db, `${studentRoot}/${studentId}`);
        const paymentHistoryRef = ref(db, `${studentRoot}/${studentId}/paymentHistory`);

        const [
            studentSnapshot,
            paymentSnapshot,
            activitiesSnapshot,
            feesSnapshot,
            plansSnapshot,
            tuitionFeesSnapshot,
            discountsSnapshot
        ] = await Promise.all([
            get(studentRef),
            get(paymentHistoryRef),
            get(ref(db, "activities")),
            get(ref(db, "fees")),
            get(ref(db, "plans")),
            get(ref(db, "tuitionFees")),
            get(ref(db, "discounts"))
        ]);


        const studentData = studentSnapshot.exists() ? studentSnapshot.val() : {};
        const paymentHistory = paymentSnapshot.exists() ? Object.values(paymentSnapshot.val()) : [];
        const activitiesData = activitiesSnapshot.exists() ? activitiesSnapshot.val() : {};
        const feesData = feesSnapshot.exists() ? feesSnapshot.val() : {};
        const plansData = plansSnapshot.exists() ? plansSnapshot.val() : {};
        const tuitionFeesData = tuitionFeesSnapshot.exists() ? tuitionFeesSnapshot.val() : {};
        const discountsData = discountsSnapshot.exists() ? discountsSnapshot.val() : {};

        const [startYear, endYear] = previousSchoolYear.split('-'); // Was using schoolYear
        const syData = { startSY: startYear, endSY: endYear };

        const totalPaid = paymentHistory.reduce((acc, payment) => acc + payment.amount, 0);

        const selectedActivityIds = studentData.selectedActivity
            ? (Array.isArray(studentData.selectedActivity)
                ? studentData.selectedActivity
                : Object.values(studentData.selectedActivity))
            : [];

        const activitiesDetails = [];
        let totalActivities = 0;
        for (const activityId of selectedActivityIds) {
            if (activitiesData[activityId]) {
                const activity = activitiesData[activityId];
                activitiesDetails.push({
                    name: activity.name,
                    amount: activity.amount || 0
                });
                totalActivities += parseFloat(activity.amount) || 0;
            }
        }

        const selectedFees = studentData.selectedFees || [];
        const feesDetails = [];
        let totalFees = 0;
        for (const feeId of selectedFees) {
            if (feesData[feeId]) {
                const fee = feesData[feeId];
                feesDetails.push({
                    name: fee.name,
                    amount: fee.amount || 0
                });
                totalFees += parseFloat(fee.amount) || 0;
            }
        }

        const selectedPlanKey = studentData.selectedPlan || "";
        const planDetails = plansData[selectedPlanKey] || {
            name: "No Plan Selected",
            downPayment: 0,
            monthlyPayment: 0,
            description: ""
        };

        const gradeLevel = studentData.Grade || "";
        let tuitionFeeKey;
        if (["Nursery", "Kinder 1", "Kinder 2"].includes(gradeLevel)) {
            tuitionFeeKey = "Pre-Elem";
        } else {
            tuitionFeeKey = `grade${gradeLevel}`;
        }
        const tuitionFee = tuitionFeesData[tuitionFeeKey] || 0;

        const selectedDiscountKey = studentData.selectedDiscount || "";
        const discountDetails = discountsData[selectedDiscountKey] || {
            discountName: "None",
            discountAmount: 0
        };

        const today = new Date();
        const formattedDate = `${monthNames[today.getMonth()]} ${String(today.getDate()).padStart(2, '0')}, ${today.getFullYear()}`;

        const img = new Image();
        img.src = "/images/mja-logo.png";
        await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
        });

        doc.addImage(img, "PNG", 85, 10, 30, 30);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(15);
        doc.text("Student Financial Report", 70, 50);
        doc.setFontSize(10);
        doc.text(`School Year: ${selectedSchoolYear}`, 81, 55);
        doc.text(`Date: ${formattedDate}`, 84, 60);

        doc.setFontSize(14);
        doc.setFont("helvetica", "normal");
        doc.text("Student Information --------------------------------------------------------------------------------------", 15, 80);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`Student Name: ${studentData.Name || "None"}`, 15, 92);
        doc.text(`Student Number: ${studentId || "None"}`, 15, 100);
        doc.text(`Grade Level: ${gradeLevel || "None"}`, 15, 108);
        doc.text(`Plan: ${planDetails.name}`, 15, 116);

        let currentY = 130;
        doc.setFontSize(14);
        doc.setFont("helvetica", "normal");
        doc.text("Statement of Account ---------------------------------------------------------------------------------", 15, currentY);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        currentY += 12;
        const TotalTuition = planDetails.downPayment + (planDetails.monthlyPayment * 10);

        const totalPayment = TotalTuition + totalFees + totalActivities;
        doc.text(`Tuition: ${TotalTuition.toFixed(2)}`, 15, currentY);
        currentY += 8;
        doc.text(`Downpayment: ${planDetails.downPayment.toFixed(2)}`, 15, currentY);
        currentY += 8;
        doc.text(`Monthly Payment: ${planDetails.monthlyPayment.toFixed(2)}`, 15, currentY);
        currentY += 8;
        doc.text(`Total Months: 10 months`, 15, currentY);
        currentY += 8;

        let yOffset = 142;
        doc.text(`Miscellaneous:`, 110, yOffset);
        yOffset += 8;
        feesDetails.forEach(fee => {
            doc.text(`${fee.name}: ${fee.amount.toFixed(2)}`, 120, yOffset);
            yOffset += 8;
        });

        doc.text(`Additional Activities:`, 110, yOffset);
        yOffset += 8;

        activitiesDetails.forEach(activity => {
            doc.text(`${activity.name}: ${activity.amount.toFixed(2)}`, 120, yOffset);
            yOffset += 8;
        });

        let balanceYPosition = Math.max(currentY, yOffset) + 15;
        doc.setFontSize(14);
        doc.setFont("helvetica", "normal");
        doc.text("Balance Summary ---------------------------------------------------------------------------------------", 15, balanceYPosition);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        balanceYPosition += 12;

        const feeBalances = studentData.feeBalances || {};
        const activitiesBalances = studentData.activitiesBalances || {}; // Corrected variable name

        const feeBalDetails = Object.values(feeBalances);
        const activityBalDetails = Object.values(activitiesBalances);

        const totalFeesBalance = feeBalDetails.reduce((sum, fee) => sum + (fee.remaining || 0), 0);
        const totalActivityBalance = activityBalDetails.reduce((sum, activity) => sum + (activity.remaining || 0), 0);


        doc.text(`Remaining Balance: ${studentData.remainingBalance?.toFixed(2) || "0.00"}`, 15, balanceYPosition);
        balanceYPosition += 8;
        doc.text(`Additional Fees Balance: ${totalFeesBalance.toFixed(2)}`, 15, balanceYPosition);
        balanceYPosition += 8;

        if (feeBalDetails.length > 0) {

            feeBalDetails.forEach(fee => {
                doc.text(`${fee.name}: ${fee.remaining?.toFixed(2) || "0.00"}`, 25, balanceYPosition);
                balanceYPosition += 8;
            });
        }

        doc.text(`Activities Balance: ${totalActivityBalance.toFixed(2)}`, 15, balanceYPosition);
        balanceYPosition += 8;

        if (activityBalDetails.length > 0) {

            activityBalDetails.forEach(activity => {
                doc.text(`${activity.name}: ${activity.remaining?.toFixed(2) || "0.00"}`, 25, balanceYPosition);
                balanceYPosition += 8;
            });
        }

        let discountY = balanceYPosition - 16;
        doc.text(`Discount: ${discountDetails.discountName}`, 110, discountY);
        doc.text(`Amount: ${discountDetails.discountAmount.toFixed(2)}`, 110, discountY + 8);

        let NcurrentY = Math.max(currentY, discountY) + 55;
        if (NcurrentY + 50 > pageHeight) {
            doc.addPage();
            NcurrentY = 10;
        }
        doc.setFontSize(14);
        doc.setFont("helvetica", "normal");
        doc.text("Payment History -----------------------------------------------------------------------------------------", 15, NcurrentY + 15);

        const headers = [['Date', 'Category', 'Mode', 'Processed By', 'Amount']];
        const data = paymentHistory.map(payment => {
            const date = new Date(payment.date);
            return [
                payment.date,
                payment.category,
                payment.modeOfPayment,
                payment.processedBy,
                `${payment.amount.toFixed(2)}`
            ];
        });

        data.push([
            { content: "Total Payment:", colSpan: 4, styles: { halign: "left", fontStyle: "bold" } },
            { content: `${totalPaid.toFixed(2)}`, styles: { halign: "center", fontStyle: "bold" } },
            "" // Empty cell for Transaction ID
        ]);

        doc.autoTable({
            startY: NcurrentY + 25,
            head: headers,
            body: data,
            theme: "grid",
            styles: { fontSize: 10, cellPadding: 4, valign: "middle", halign: "center" },
            headStyles: { fillColor: [91, 102, 120], textColor: 255, fontStyle: "bold" }
        });

        const pdfBlob = doc.output("blob");
        window.open(URL.createObjectURL(pdfBlob));

    } catch (error) {
        console.error("Error generating PDF:", error);
        Swal.fire("Error", "Failed to generate PDF report", "error");
    }
}