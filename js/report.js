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
const studentsRef = ref(db, "Students/CurrentSchoolYear");
const plansRef = ref(db, "plans");

function getLoggedInUserName(callback) {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
        callback("Ma'am");
        return;
    }

    const userRef = ref(db, `staff/${user.uid}`);

    onValue(userRef, (snapshot) => {
        if (snapshot.exists()) {
            const staffData = snapshot.val();
            const pushKey = Object.keys(staffData)[0];
            callback(staffData[pushKey]?.name || "Ma'am");
        } else {
            callback("Ma'am");
        }
    }, (error) => {
        console.error("Error:", error);
        callback("Ma'am");
    });
}

function switchTable(tableId) {
    document.querySelectorAll('[id$="Table"]').forEach(table => {
        table.style.display = 'none';
    });

    document.getElementById(tableId).style.display = 'block';

    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`#${tableId.replace('Table', 'Btn')}`).classList.add('active');

    document.getElementById('collectionsBtn').classList.remove('active');
    document.getElementById('expensesBtn').classList.remove('active');
    document.getElementById('studentsBtn').classList.remove('active');
    document.getElementById('remittancesBtn').classList.remove('active');

    const reportingPeriodDropdown = document.getElementById('reportingPeriodDropdown');
    const reportingPeriodLabel = reportingPeriodDropdown.previousElementSibling;
    const dateFilterContainer = document.querySelector('.date-filter');

    if (tableId === 'studentsTable') {
        reportingPeriodDropdown.classList.add('hidden-filter');
        reportingPeriodLabel.classList.add('hidden-filter');
        dateFilterContainer.classList.add('hidden-filter');
    } else {
        reportingPeriodDropdown.classList.remove('hidden-filter');
        reportingPeriodLabel.classList.remove('hidden-filter');
        dateFilterContainer.classList.remove('hidden-filter');
    }

    const categoryFilterContainer = document.getElementById('categoryFilter');
    const categoryDropdown = document.getElementById('categoryDropdown');
    const reportPeriodDropdown = document.getElementById('reportingPeriodDropdown');
    const expensesTypeFilter = document.getElementById('expensesTypeFilter');
    const exportExcelBtn = document.getElementById('exportExcelBtn');

    if (tableId === 'collectionsTable') {
        collectionsTable.style.display = 'block';
        document.getElementById('collectionsBtn').classList.add('active');
        categoryFilterContainer.style.display = 'block';
        expensesTypeFilter.style.display = 'none';
        categoryDropdown.innerHTML = `
            <option value="all">All</option>
            <option value="tuition">Tuition</option>
            <option value="miscellaneous">Miscellaneous</option>
            <option value="activity">Activities</option>
        `;
        exportExcelBtn.style.display = 'inline-block';
        loadCollections();
    } else if (tableId === 'expensesTable') {
        expensesTable.style.display = 'block';
        document.getElementById('expensesBtn').classList.add('active');
        categoryFilterContainer.style.display = 'none';
        expensesTypeFilter.style.display = 'block';
        categoryDropdown.value = "all";
        exportExcelBtn.style.display = 'inline-block';
        loadExpenses();
    } else if (tableId === 'studentsTable') {
        studentsTable.style.display = 'block';
        document.getElementById('studentsBtn').classList.add('active');
        categoryFilterContainer.style.display = 'block';
        expensesTypeFilter.style.display = 'none';
        categoryDropdown.innerHTML = `
            <option value="all">All</option>
            <option value="pre-elementary">Pre-Elementary</option>
            <option value="elementary">Elementary</option>
            <option value="highschool">High School</option>
            <option value="seniorhigh">Senior High School</option>
        `;
        categoryDropdown.value = "all";
        exportExcelBtn.style.display = 'inline-block';
        loadStudents();
    } else if (tableId === 'remittancesTable') {
        remittancesTable.style.display = 'block';
        document.getElementById('remittancesBtn').classList.add('active');
        categoryFilterContainer.style.display = 'none';
        expensesTypeFilter.style.display = 'none';
        exportExcelBtn.style.display = 'inline-block';
        loadRemittances();
    }

    filterTable();
}

function loadExpenses() {
    const expensesBody = document.getElementById("expensesBody");
    expensesBody.innerHTML = "";

    const remittancesRef = ref(db, "remittances");

    onValue(remittancesRef, (snapshot) => {
        expensesBody.innerHTML = "";

        if (!snapshot.exists()) {
            console.warn("⚠️ No remittances found in Firebase.");
            expensesBody.innerHTML = "<tr><td colspan='4'>No expenses found.</td></tr>";
            updateTableTotals();
            return;
        }

        snapshot.forEach((remittanceSnapshot) => {
            const remittance = remittanceSnapshot.val();
            const date = remittance.date;

            if (remittance.expenses) {
                Object.values(remittance.expenses).forEach((expense) => {
                    if (!expense.amount || !expense.purpose || !expense.type) {
                        console.warn("⚠️ Skipping incomplete expense entry:", expense);
                        return;
                    }

                    let row = document.createElement("tr");
                    row.innerHTML = `
                        <td>${date}</td>
                        <td>${expense.type}</td>
                        <td>${expense.purpose}</td>
                        <td>${expense.amount}</td>
                    `;
                    expensesBody.appendChild(row);
                });
            }
        });

        if (expensesBody.children.length === 0) {
            expensesBody.innerHTML = "<tr><td colspan='4'>No expenses found.</td></tr>";
        }
        updateTableTotals();
    }, (error) => {
        console.error("❌ Error fetching remittances:", error);
    });
}

function loadStudents() {
    const studentsBody = document.getElementById("studentsBody");
    studentsBody.innerHTML = "";

    onValue(plansRef, (plansSnapshot) => {
        if (!plansSnapshot.exists()) {
            console.error("❌ No plans found in Firebase.");
            return;
        }

        const plansData = plansSnapshot.val();

        onValue(studentsRef, (studentsSnapshot) => {
            studentsBody.innerHTML = "";

            if (!studentsSnapshot.exists()) {
                console.warn("⚠️ No students found.");
                studentsBody.innerHTML = "<tr><td colspan='6'>No students found.</td></tr>";
                return;
            }

            studentsSnapshot.forEach((childSnapshot) => {
                const studentId = childSnapshot.key;
                const student = childSnapshot.val();

                if (!student.Name || student.Name.trim() === "") return;

                let grade = student.Grade ? student.Grade : "No Grade";
                let selectedPlanId = student.selectedPlan || "";
                let planName = "No Plan";

                if (selectedPlanId && plansData[selectedPlanId]) {
                    planName = plansData[selectedPlanId].name || "No Plan";
                }

                let selectedDiscounts = student.selectedDiscountText || "None";
                let remainingBalance = student.remainingBalance ? parseFloat(student.remainingBalance).toFixed(2) : "0.00";
                let totalActivityPrice = student.totalActivityPrice ? parseFloat(student.totalActivityPrice).toFixed(2) : "0.00";

                let row = document.createElement("tr");
                row.dataset.studentName = student.Name;
                row.dataset.studentNumber = studentId;
                row.dataset.gradeLevel = grade;
                row.dataset.plan = planName;
                row.dataset.selectedDiscounts = selectedDiscounts;
                row.dataset.remainingBalance = remainingBalance;
                row.dataset.totalActivityPrice = totalActivityPrice;

                row.innerHTML = `
                    <td>${student.Name}</td>
                    <td>${studentId}</td>
                    <td>${grade}</td> 
                    <td>${planName}</td>
                    <td class="action" onclick="toggleDropdown(this); event.stopPropagation()">
            <span>⋮</span>
            <div class="dropdown">
                <a href="#" onclick="event.stopPropagation(); generateStudentInfoPDFFromRow(this)">👁 Student Details</a>
                <a href="#" onclick="event.stopPropagation(); generateStudentPDFFromRow(this)">💰 Financial Report</a>
            </div>
        </td>
                `;

                studentsBody.appendChild(row);
            });

            if (studentsBody.children.length === 0) {
                studentsBody.innerHTML = "<tr><td colspan='6'>No students found.</td></tr>";
            }
        }, (error) => {
            console.error("❌ Error fetching students:", error);
        });

    }, (error) => {
        console.error("❌ Error fetching plans:", error);
    });
}

// Add these new functions
window.openStudentDetails = function(element) {
    const row = element.closest('tr');
    const studentData = {
        studentName: row.dataset.studentName,
        studentNumber: row.dataset.studentNumber,
        gradeLevel: row.dataset.gradeLevel,
        plan: row.dataset.plan,
        selectedDiscounts: row.dataset.selectedDiscounts,
        remainingBalance: row.dataset.remainingBalance,
        totalActivityPrice: row.dataset.totalActivityPrice
    };
    
    // You'll need to implement this modal display
    console.log("Student Details:", studentData);
};

window.generateStudentPDFFromRow = function(element) {
    const row = element.closest('tr');
    const student = {
        studentName: row.dataset.studentName,
        studentNumber: row.dataset.studentNumber,
        gradeLevel: row.dataset.gradeLevel,
        plan: row.dataset.plan,
        selectedDiscounts: row.dataset.selectedDiscounts,
        remainingBalance: row.dataset.remainingBalance,
        totalActivityPrice: row.dataset.totalActivityPrice,
        paymentHistory: [] // Initialize empty array
    };

    // Call your existing PDF generation function
    generateStudentPDF(student);
};

// Add new handler for the Personal Info PDF
window.generateStudentInfoPDFFromRow = function(element) {
    const row = element.closest('tr');
    const studentNumber = row.dataset.studentNumber;
    
    const studentRef = ref(db, `Students/CurrentSchoolYear/${studentNumber}`);
    onValue(studentRef, (snapshot) => {
        if (snapshot.exists()) {
            const studentData = snapshot.val();
            generateStudentInfoPDF({
                ...studentData,
                studentNumber: studentNumber,
                gradeLevel: row.dataset.gradeLevel
            });
        }
    }, { onlyOnce: true });
};

// Keep the existing toggleDropdown function
window.toggleDropdown = function(element) {
    document.querySelectorAll('.dropdown').forEach(drop => {
        if (drop !== element.querySelector('.dropdown')) {
            drop.style.display = 'none';
        }
    });
    
    const dropdown = element.querySelector('.dropdown');
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
};

function loadCollections() {
    const collectionsBody = document.getElementById("collectionsBody");
    collectionsBody.innerHTML = "";

    const remittancesRef = ref(db, "remittances");

    onValue(remittancesRef, (snapshot) => {
        collectionsBody.innerHTML = "";

        if (!snapshot.exists()) {
            console.warn("⚠️ No remittances found in Firebase.");
            collectionsBody.innerHTML = "<tr><td colspan='7'>No collections found.</td></tr>";
            updateTableTotals();
            return;
        }

        snapshot.forEach((remittanceSnapshot) => {
            const remittance = remittanceSnapshot.val();

            if (remittance.payments) {
                remittance.payments.forEach((payment) => {
                    if (!payment.date || !payment.studentId || !payment.studentName || !payment.amount || !payment.processedBy) {
                        console.warn("⚠️ Skipping incomplete payment entry:", payment);
                        return;
                    }

                    let displayCategory = payment.category;
                    if (payment.category === 'tuition') {
                        if (payment.modeOfPayment === 'Downpayment') {
                            displayCategory = 'Downpayment';
                        } else if (payment.modeOfPayment === 'Monthly Payment') {
                            displayCategory = 'Monthly Payment';
                        }
                    } else if (payment.category === 'miscellaneous') {
                        if (payment.purpose && payment.purpose.toLowerCase().includes('activity')) {
                            displayCategory = 'Activities';
                        } else {
                            displayCategory = 'Other Fees';
                        }
                    }

                    let row = document.createElement("tr");
                    row.innerHTML = `
                        <td>${payment.date}</td>
                        <td>${payment.studentId.toLocaleString()}</td>
                        <td>${payment.studentName}</td>
                        <td>${payment.grade}</td>
                        <td>${displayCategory}</td>
                        <td>${payment.amount}</td>
                        <td>${payment.processedBy}</td>
                    `;

                    collectionsBody.appendChild(row);
                });
            }
        });

        if (collectionsBody.children.length === 0) {
            collectionsBody.innerHTML = "<tr><td colspan='7'>No collections found.</td></tr>";
        }
        updateTableTotals();
    }, (error) => {
        console.error("❌ Error fetching remittances:", error);
    });
}

function loadRemittances() {
    const remittancesBody = document.getElementById("remittancesBody");
    const remittancesRef = ref(db, "remittances");

    onValue(remittancesRef, (snapshot) => {
        remittancesBody.innerHTML = "";

        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const data = childSnapshot.val();
                let totalCollections = 0;
                if (data.payments && data.payments.length > 0) {
                    totalCollections = data.payments.reduce((sum, payment) => sum + payment.amount, 0);
                }

                let totalExpenses = 0;
                if (data.expenses && data.expenses.length > 0) {
                    totalExpenses = data.expenses.reduce((sum, expense) => sum + expense.amount, 0);
                }

                const totalRemittances = totalCollections - totalExpenses;

                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${data.date}</td>
                    <td>${totalCollections.toLocaleString()}</td>
                    <td>${totalExpenses.toLocaleString()}</td>
                    <td>${totalRemittances.toLocaleString()}</td>
                `;

                row.addEventListener("click", () => {
                    generateAndDisplayRemittancePDF(data);
                });

                remittancesBody.appendChild(row);
            });
        } else {
            remittancesBody.innerHTML = "<tr><td colspan='5'>No remittances found</td></tr>";
        }
        updateTableTotals();
    }, (error) => {
        console.error("Error fetching remittances:", error);
    });
}

function generateAndDisplayRemittancePDF(remittance) {
    if (!window.jspdf) {
        console.error("jsPDF library is not loaded.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("p", "mm", "a4");
    const db = getDatabase(); // Add this line
    const syRef = ref(db, 'CurrentSY'); // Add this line
    const img = new Image();
    img.src = "/images/mja-logo.png";

    img.onload = async function () {
        doc.addImage(img, "PNG", 40, 13, 23, 23);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        onValue(syRef, (snapshot) => {
            if (snapshot.exists()) {
                const { startSY, endSY } = snapshot.val();
                doc.text(`School Year: ${startSY}-${endSY}`, 84, 30);
            }
        }, { onlyOnce: true });
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text("Remittance Details", 80, 20);
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text(`Date: ${remittance.date}`, 88, 38);
        doc.text(`Processed By: ${remittance.name}`, 88, 45);

        let startY = 55;
        let totalCollections = 0;
        let totalExpenses = 0;

        if (remittance.payments && remittance.payments.length > 0) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(14);
            doc.text("Collections", 14, startY);
            startY += 8;

            totalCollections = remittance.payments.reduce((sum, payment) => sum + payment.amount, 0);

            const collectionsHeaders = ["#", "Student ID", "Student Name", "Grade", "Category", "Amount"];
            const collectionsRows = remittance.payments.map((payment, index) => [
                index + 1,
                payment.studentId.toLocaleString(),
                payment.studentName,
                payment.grade,
                payment.category,
                payment.amount.toFixed(2)
            ]);

            collectionsRows.push([
                { content: "Total:", colSpan: 5, styles: { halign: 'right', fontStyle: 'bold' } },
                { content: totalCollections.toFixed(2), styles: { fontStyle: 'bold' } }
            ]);

            doc.autoTable({
                startY: startY,
                head: [collectionsHeaders],
                body: collectionsRows,
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
                columnStyles: { 0: { cellWidth: 10 } }
            });

            startY = doc.lastAutoTable.finalY + 12;
        }

        if (remittance.expenses && remittance.expenses.length > 0) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(14);
            doc.text("Expenses", 14, startY);
            startY += 8;

            totalExpenses = remittance.expenses.reduce((sum, expense) => sum + expense.amount, 0);

            const expensesHeaders = ["#", "Type", "Purpose", "Amount"];
            const expensesRows = remittance.expenses.map((expense, index) => [
                index + 1,
                expense.type,
                expense.purpose,
                expense.amount.toFixed(2)
            ]);

            expensesRows.push([
                { content: "Total:", colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
                { content: totalExpenses.toFixed(2), styles: { fontStyle: 'bold' } }
            ]);

            doc.autoTable({
                startY: startY,
                head: [expensesHeaders],
                body: expensesRows,
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
                columnStyles: { 0: { cellWidth: 10 } }
            });

            startY = doc.lastAutoTable.finalY + 10;
        }
        startY = doc.lastAutoTable.finalY + 10;

        // Add box around totals
        const boxX = 14;
        const boxY = startY;
        const boxWidth = 180;
        const boxHeight = 28; // Height to cover 3 lines
    
        // Draw the box
        doc.setDrawColor(0); // Black border
        doc.rect(boxX, boxY, boxWidth, boxHeight);
    
        // Add totals inside the box
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(`Total Collections: ${totalCollections.toFixed(2)}`, 17, boxY + 8);
        doc.text(`Total Expenses: ${totalExpenses.toFixed(2)}`, 17, boxY + 16);
        doc.text(`Net Remittance: ${(totalCollections - totalExpenses).toFixed(2)}`, 17, boxY + 24);

        const pdfBlob = doc.output("blob");
        const blobURL = URL.createObjectURL(pdfBlob);
        const newWindow = window.open(blobURL, "_blank");
        if (!newWindow) {
            alert("Pop-up blocked! Please allow pop-ups for this site.");
        }
    };
}

function filterTable() {
    const selectedCategory = categoryDropdown.value.toLowerCase().trim();
    const selectedPeriod = reportPeriodDropdown.value.toLowerCase().trim();
    const selectedExpensesType = document.getElementById('expensesTypeDropdown')?.value.toLowerCase().trim() || 'all';
    const searchText = searchInput.value.toLowerCase().trim();
    const selectedDate = document.getElementById('dateFilter')?.value || '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isCollections = collectionsTable.style.display !== 'none';
    const isStudents = studentsTable.style.display !== 'none';
    const isExpenses = expensesTable.style.display !== 'none';
    const isRemittances = remittancesTable.style.display !== 'none';

    let tbody;
    if (isCollections) {
        tbody = document.getElementById("collectionsBody");
    } else if (isStudents) {
        tbody = document.getElementById("studentsBody");
    } else if (isExpenses) {
        tbody = document.getElementById("expensesBody");
    } else if (isRemittances) {
        tbody = document.getElementById("remittancesBody");
    }

    if (!tbody) {
        console.error("No table body found for filtering");
        return;
    }

    document.querySelectorAll(".total-row").forEach(row => row.remove());

    tbody.querySelectorAll("tr").forEach(row => {
        let showRow = true;
        const rowText = row.textContent.toLowerCase();

        if (selectedPeriod !== "all" && (isCollections || isExpenses || isRemittances)) {
            let rowDate;
            try {
                const dateCell = isRemittances ? row.cells[0].textContent.trim() : row.cells[0].textContent.trim();

                if (isRemittances && row.classList.contains('total-row')) {
                    showRow = true;
                    return;
                }

                let parsedDate;
                const slashFormat = dateCell.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
                if (slashFormat) {
                    parsedDate = new Date(
                        parseInt(slashFormat[3]),
                        parseInt(slashFormat[1]) - 1,
                        parseInt(slashFormat[2])
                    );
                }
                else {
                    const dashFormat = dateCell.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
                    if (dashFormat) {
                        parsedDate = new Date(
                            parseInt(dashFormat[3]),
                            parseInt(dashFormat[1]) - 1,
                            parseInt(dashFormat[2])
                        );
                    }
                    else {
                        parsedDate = new Date(dateCell);
                        if (isNaN(parsedDate.getTime())) {
                            throw new Error("Invalid date format");
                        }
                    }
                }

                rowDate = parsedDate;
                rowDate.setHours(0, 0, 0, 0);

                switch (selectedPeriod) {
                    case "today":
                        showRow = rowDate.getTime() === today.getTime();
                        break;
                    case "week":
                        const startOfWeek = new Date(today);
                        startOfWeek.setDate(today.getDate() - (today.getDay() || 7) + 1);
                        const endOfWeek = new Date(startOfWeek);
                        endOfWeek.setDate(startOfWeek.getDate() + 6);
                        showRow = rowDate >= startOfWeek && rowDate <= endOfWeek;
                        break;
                    case "month":
                        showRow = rowDate.getMonth() === today.getMonth() &&
                            rowDate.getFullYear() === today.getFullYear();
                        break;
                }
            } catch (e) {
                console.warn("Date parsing error:", e.message, "in row:", dateCell);
                showRow = false;
            }
        }

        if (selectedDate) {
            try {
                const dateCell = isRemittances ? row.cells[0].textContent.trim() : row.cells[0].textContent.trim();

                if (isRemittances && row.classList.contains('total-row')) {
                    showRow = true;
                } else {
                    let parsedDate;
                    const slashFormat = dateCell.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
                    if (slashFormat) {
                        parsedDate = new Date(
                            parseInt(slashFormat[3]),
                            parseInt(slashFormat[1]) - 1,
                            parseInt(slashFormat[2])
                        );
                    }
                    else {
                        const dashFormat = dateCell.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
                        if (dashFormat) {
                            parsedDate = new Date(
                                parseInt(dashFormat[3]),
                                parseInt(dashFormat[1]) - 1,
                                parseInt(dashFormat[2])
                            );
                        }
                        else {
                            parsedDate = new Date(dateCell);
                        }
                    }

                    if (isNaN(parsedDate.getTime())) {
                        throw new Error("Invalid date format");
                    }

                    const formattedRowDate = parsedDate.toISOString().split('T')[0];
                    showRow = formattedRowDate === selectedDate;
                }
            } catch (e) {
                console.warn("Date parsing error:", e.message);
                showRow = false;
            }
        }

        if (isCollections && showRow) {
            const categoryCell = row.cells[4]?.textContent.trim().toLowerCase();
            if (selectedCategory !== "all" && categoryCell) {
                if (selectedCategory === "tuition") {
                    showRow = categoryCell === "tuition" ||
                        categoryCell === "downpayment" ||
                        categoryCell === "monthly payment";
                } else if (selectedCategory === "miscellaneous") {
                    showRow = categoryCell === "additional fees";
                } else if (selectedCategory === "activity") {
                    showRow = categoryCell === "activities";
                } else {
                    showRow = categoryCell === selectedCategory;
                }
            }
        }

        if (isStudents && showRow) {
            const gradeCell = row.cells[2]?.textContent.trim();
            if (selectedCategory !== "all" && gradeCell) {
                if (selectedCategory === "pre-elementary" &&
                    !["Nursery", "Kinder 1", "Kinder 2"].includes(gradeCell)) {
                    showRow = false;
                }
                if (selectedCategory === "elementary" && !["1", "2", "3", "4", "5", "6"].includes(gradeCell)) {
                    showRow = false;
                }
                if (selectedCategory === "highschool" && !["7", "8", "9", "10"].includes(gradeCell)) {
                    showRow = false;
                }
                if (selectedCategory === "seniorhigh" && !["11", "12"].includes(gradeCell)) {
                    showRow = false;
                }
            }
        }

        if (isExpenses && showRow) {
            const typeCell = row.cells[2]?.textContent.trim().toLowerCase();
            if (selectedExpensesType !== "all" && typeCell && typeCell !== selectedExpensesType) {
                showRow = false;
            }
        }

        if (showRow && searchText && !rowText.includes(searchText)) {
            showRow = false;
        }

        row.style.display = showRow ? "" : "none";
    });

    updateFilterIndicators()
    updateTableTotals();
}

function parseDate(dateStr) {
    const parts = dateStr.split("-");
    return new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
}

function isSameWeek(date1, date2) {
    const startOfWeek = new Date(date2);
    startOfWeek.setDate(date2.getDate() - date2.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    return date1 >= startOfWeek && date1 <= endOfWeek;
}

function isSameMonth(date1, date2) {
    return date1.getMonth() === date2.getMonth() && date1.getFullYear() === date2.getFullYear();
}

function isSameYear(date1, date2) {
    return date1.getFullYear() === date2.getFullYear();
}

function exportToExcel(sheetName, tableElement) {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.table_to_sheet(tableElement);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const today = new Date();
    const formattedDate = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}-${today.getFullYear()}`;

    XLSX.writeFile(wb, `${sheetName}_Report_${formattedDate}.xlsx`);
}

function calculateVisibleTotals() {
    const isCollections = document.getElementById("collectionsTable").style.display !== 'none';
    const isExpenses = document.getElementById("expensesTable").style.display !== 'none';
    const isRemittances = document.getElementById("remittancesTable").style.display !== 'none';

    let totalAmount = 0;
    let tableBody = null;
    let amountColumnIndex = -1;

    if (isCollections) {
        tableBody = document.getElementById("collectionsBody");
        amountColumnIndex = 5;
    } else if (isExpenses) {
        tableBody = document.getElementById("expensesBody");
        amountColumnIndex = 1;
    } else if (isRemittances) {
        tableBody = document.getElementById("remittancesBody");
    }

    if (tableBody && amountColumnIndex >= 0) {
        const visibleRows = tableBody.querySelectorAll("tr:not([style*='display: none'])");

        visibleRows.forEach(row => {
            const amountCell = row.cells[amountColumnIndex];
            if (amountCell) {
                const amountText = amountCell.textContent.trim();
                const amount = parseFloat(amountText.replace(/,/g, '')) || 0;
                totalAmount += amount;
            }
        });
    } else if (isRemittances) {
        const visibleRows = tableBody.querySelectorAll("tr:not([style*='display: none'])");
        const totals = {
            expenses: 0,
            collections: 0,
            remittances: 0
        };

        visibleRows.forEach(row => {
            const expensesCell = row.cells[2];
            const collectionsCell = row.cells[3];
            const remittancesCell = row.cells[4];

            if (expensesCell) {
                const amount = parseFloat(expensesCell.textContent.replace(/,/g, '')) || 0;
                totals.expenses += amount;
            }
            if (collectionsCell) {
                const amount = parseFloat(collectionsCell.textContent.replace(/,/g, '')) || 0;
                totals.collections += amount;
            }
            if (remittancesCell) {
                const amount = parseFloat(remittancesCell.textContent.replace(/,/g, '')) || 0;
                totals.remittances += amount;
            }
        });

        return totals;
    }

    return totalAmount;
}

function downloadPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("p", "mm", "a4");
    const db = getDatabase();

    const today = new Date();
    const formattedDate = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}-${today.getFullYear()}`;

    let selectedTable = "";
    let tableElement = null;
    let calculateTotals = false;

    if (document.getElementById('collectionsTable').style.display !== 'none') {
        selectedTable = "Collections";
        tableElement = document.querySelector("#collectionsTable");
        calculateTotals = true;
    } else if (document.getElementById('expensesTable').style.display !== 'none') {
        selectedTable = "Expenses";
        tableElement = document.querySelector("#expensesTable");
        calculateTotals = true;
    } else if (document.getElementById('studentsTable').style.display !== 'none') {
        selectedTable = "Students";
        tableElement = document.querySelector("#studentsTable");
    } else if (document.getElementById("remittancesTable").style.display !== 'none') {
        selectedTable = "Remittances";
        tableElement = document.querySelector("#remittancesTable");
        calculateTotals = true;
    }

    if (!tableElement) {
        alert("No table data available to print.");
        return;
    }

    const img = new Image();
    img.src = "/images/mja-logo.png";

    img.onload = function () {
        doc.addImage(img, "PNG", 40, 13, 23, 23);
        const syRef = ref(db, 'CurrentSY');
        onValue(syRef, (snapshot) => {
            if (snapshot.exists()) {
                const { startSY, endSY } = snapshot.val();
                doc.setFontSize(10);
                doc.text(`School Year: ${startSY}-${endSY}`, 90, 34);
            }
        }, { onlyOnce: true });
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text("School Financial Report", 80, 20);
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text(`${selectedTable} Report`, 94, 30);
        doc.text(`Date: ${formattedDate}`, 94, 38);

        const tableRows = [];
        const tableHeaders = [];
        const rows = tableElement.querySelectorAll("tbody tr");

        // Collect headers, excluding the last column for Students table
        const thElements = tableElement.querySelectorAll("thead tr th");
        if (selectedTable === "Students") {
            for (let i = 0; i < thElements.length - 1; i++) {
                const th = thElements[i];
                if (i === 0) tableHeaders.push("#");
                tableHeaders.push(th.textContent.trim());
            }
        } else {
            thElements.forEach((th, index) => {
                if (index === 0) tableHeaders.push("#");
                tableHeaders.push(th.textContent.trim());
            });
        }

        let rowNumber = 1;
        let totals = { collections: 0, expenses: 0, remittances: 0 };

        rows.forEach((row) => {
            if (row.style.display !== "none" && !row.classList.contains('total-row')) {
                const rowData = [];
                const cells = row.querySelectorAll("td");
                rowData.push(rowNumber++);

                cells.forEach((td, index) => {
                    // Skip the last cell for Students table
                    if (selectedTable === "Students" && index === cells.length - 1) return;

                    const text = td.textContent.trim();
                    rowData.push(text);

                    if (calculateTotals) {
                        if (selectedTable === "Collections" && index === 5) {
                            totals.collections += parseFloat(text.replace(/,/g, '')) || 0;
                        } else if (selectedTable === "Expenses" && index === 3) {
                            totals.expenses += parseFloat(text.replace(/,/g, '')) || 0;
                        } else if (selectedTable === "Remittances") {
                            if (index === 1) totals.expenses += parseFloat(text.replace(/,/g, '')) || 0;
                            if (index === 2) totals.collections += parseFloat(text.replace(/,/g, '')) || 0;
                            if (index === 3) totals.remittances += parseFloat(text.replace(/,/g, '')) || 0;
                        }
                    }
                });

                tableRows.push(rowData);
            }
        });

        if (tableRows.length === 0) {
            alert("No valid data available to print.");
            return;
        }

        if (calculateTotals) {
            if (selectedTable === "Collections") {
                tableRows.push([
                    { content: "Total:", colSpan: 6, styles: { halign: 'right', fontStyle: 'bold' } },
                    { content: totals.collections.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { fontStyle: 'bold' } },
                    { content: "", styles: { fontStyle: 'bold' } }
                ]);
            } else if (selectedTable === "Expenses") {
                tableRows.push([
                    { content: "Total:", colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } },
                    { content: totals.expenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { fontStyle: 'bold' } },
                    { content: "", colSpan: 2, styles: { fontStyle: 'bold' } }
                ]);
            } else if (selectedTable === "Remittances") {
                tableRows.push([
                    { content: "Totals:", colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } },
                    { content: totals.expenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { fontStyle: 'bold' } },
                    { content: totals.collections.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { fontStyle: 'bold' } },
                    { content: totals.remittances.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { fontStyle: 'bold' } }
                ]);
            }
        }

        doc.autoTable({
            startY: 45,
            head: [tableHeaders],
            body: tableRows,
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
            columnStyles: { 0: { cellWidth: 10 } }
        });

        const pageHeight = doc.internal.pageSize.height;

        getLoggedInUserName((userName) => {
            doc.setFontSize(10);

            const fileName = `MJA_${selectedTable}_Report_${formattedDate}.pdf`;
            const pdfBlob = doc.output("blob");
            const blobURL = URL.createObjectURL(pdfBlob);

            const newWindow = window.open(blobURL, "_blank");
            if (!newWindow) {
                alert("Pop-up blocked! Please allow pop-ups for this site.");
            }
        });
    };
}

function updateTableTotals() {
    const isCollections = document.getElementById("collectionsTable").style.display !== 'none';
    const isExpenses = document.getElementById("expensesTable").style.display !== 'none';
    const isRemittances = document.getElementById("remittancesTable").style.display !== 'none';

    document.querySelectorAll(".total-row").forEach(row => row.remove());

    if (isCollections) {
        const tableBody = document.getElementById("collectionsBody");
        const visibleRows = tableBody.querySelectorAll("tr:not([style*='display: none']):not(.total-row)");
        let totalAmount = 0;

        visibleRows.forEach(row => {
            const amountCell = row.cells[5];
            if (amountCell) {
                const amountText = amountCell.textContent.trim();
                const amount = parseFloat(amountText.replace(/,/g, '')) || 0;
                totalAmount += amount;
            }
        });

        const totalRow = document.createElement("tr");
        totalRow.className = "total-row";
        totalRow.style.fontWeight = "bold";
        totalRow.style.backgroundColor = "#f5f5f5";
        totalRow.innerHTML = `
            <td colspan="5" style="text-align: right;">Total:</td>
            <td>${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td></td>
        `;
        tableBody.appendChild(totalRow);
    }
    else if (isExpenses) {
        const tableBody = document.getElementById("expensesBody");
        const visibleRows = tableBody.querySelectorAll("tr:not([style*='display: none']):not(.total-row)");
        let totalAmount = 0;

        visibleRows.forEach(row => {
            const amountCell = row.cells[3];
            if (amountCell) {
                const amountText = amountCell.textContent.trim();
                const amount = parseFloat(amountText.replace(/,/g, '')) || 0;
                totalAmount += amount;
            }
        });

        const totalRow = document.createElement("tr");
        totalRow.className = "total-row";
        totalRow.style.fontWeight = "bold";
        totalRow.style.backgroundColor = "#f5f5f5";
        totalRow.innerHTML = `
            <td colspan="3" style="text-align: right;">Totals:</td>
            <td>${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        `;
        tableBody.appendChild(totalRow);
    }
    else if (isRemittances) {
        const tableBody = document.getElementById("remittancesBody");
        const visibleRows = tableBody.querySelectorAll("tr:not([style*='display: none']):not(.total-row)");
        let totalExpenses = 0;
        let totalCollections = 0;
        let totalRemittances = 0;

        visibleRows.forEach(row => {
            if (row.classList.contains('total-row')) return;

            const collectionsCell = row.cells[2];
            const expensesCell = row.cells[1];
            const remittancesCell = row.cells[3];

            if (expensesCell) {
                const amount = parseFloat(expensesCell.textContent.replace(/,/g, '')) || 0;
                totalExpenses += amount;
            }
            if (collectionsCell) {
                const amount = parseFloat(collectionsCell.textContent.replace(/,/g, '')) || 0;
                totalCollections += amount;
            }
            if (remittancesCell) {
                const amount = parseFloat(remittancesCell.textContent.replace(/,/g, '')) || 0;
                totalRemittances += amount;
            }
        });

        const totalRow = document.createElement("tr");
        totalRow.className = "total-row";
        totalRow.style.fontWeight = "bold";
        totalRow.style.backgroundColor = "#f5f5f5";
        totalRow.innerHTML = `
            <td colspan="1" style="text-align: right;">Totals:</td>
            <td>${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td>${totalCollections.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td>${totalRemittances.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        `;
        tableBody.appendChild(totalRow);
    }
}

function fetchStudentPayments(studentNumber) {
    return new Promise((resolve, reject) => {
        const db = getDatabase();
        const paymentHistoryRef = ref(db, `Students/CurrentSchoolYear/${studentNumber}/paymentHistory`);

        onValue(paymentHistoryRef, (snapshot) => {
            if (snapshot.exists()) {
                const rawData = snapshot.val();
                const paymentHistory = Object.values(rawData).map(payment => ({
                    date: new Date(payment.date).toLocaleDateString(),
                    category: payment.category,
                    mode: payment.modeOfPayment,
                    amount: `${payment.amount.toLocaleString()}`,
                    processed: payment.processedBy,
                    transactID: payment.transactionID
                }));
                resolve(paymentHistory);
            } else {
                resolve([]);
            }
        }, { onlyOnce: true });
    });
}

function generateStudentPDF(student) {
    const tuitionFeesRef = ref(db, 'tuitionFees');
    const feesRef = ref(db, 'fees');
    const plansRef = ref(db, 'plans');
    const activitiesRef = ref(db, 'activities');

    onValue(tuitionFeesRef, (snapshot) => {
        if (snapshot.exists()) {
            const tuitionFees = snapshot.val();

            onValue(feesRef, (feesSnapshot) => {
                if (feesSnapshot.exists()) {
                    const fees = feesSnapshot.val();

                    onValue(plansRef, (plansSnapshot) => {
                        if (plansSnapshot.exists()) {
                            const plans = plansSnapshot.val();

                            onValue(activitiesRef, (activitiesSnapshot) => {
                                if (activitiesSnapshot.exists()) {
                                    const activities = activitiesSnapshot.val();

                                    if (!student.selectedFees || !student.selectedActivities) {
                                        const studentRef = ref(db, `Students/CurrentSchoolYear/${student.studentNumber}`);
                                        onValue(studentRef, (studentSnapshot) => {
                                            if (studentSnapshot.exists()) {
                                                const studentData = studentSnapshot.val();
                                                student.selectedFees = studentData.selectedFees || [];
                                                student.selectedPlan = studentData.selectedPlan || "defaultPlan";
                                                student.selectedActivities = studentData.selectedActivity || [];
                                                console.log("Fetched selectedActivities from Firebase:", student.selectedActivities);

                                                fetchStudentPayments(student.studentNumber)
                                                    .then(paymentHistory => {
                                                        student.paymentHistory = paymentHistory;
                                                        student.remainingBalance = student.remainingBalance || "0";
                                                        student.totalActivityPrice = student.totalActivityPrice || "0";
                                                        // Add these lines to fetch balances
                                                        student.feeBalances = studentData.feeBalances || {};
                                                        student.activitiesBalances = studentData.activitiesBalances || {};
                                                        console.log("Fetched balances from Firebase:", student.feeBalances, student.activitiesBalances);
                                                        createPDF(student, tuitionFees, fees, plans, activities);
                                                    })
                                                    .catch(error => {
                                                        console.error("Error fetching payment history:", error);
                                                    });
                                            } else {
                                                console.error("Student data not found in Firebase.");
                                            }
                                        }, { onlyOnce: true });
                                    } else {
                                        fetchStudentPayments(student.studentNumber)
                                            .then(paymentHistory => {
                                                student.paymentHistory = paymentHistory;
                                                student.remainingBalance = student.remainingBalance || "0";
                                                student.totalActivityPrice = student.totalActivityPrice || "0";
                                                createPDF(student, tuitionFees, fees, plans, activities);
                                            })
                                            .catch(error => {
                                                console.error("Error fetching payment history:", error);
                                            });
                                    }
                                } else {
                                    console.error("Activities data not found in Firebase.");
                                }
                            }, { onlyOnce: true });
                        } else {
                            console.error("Plans data not found in Firebase.");
                        }
                    }, { onlyOnce: true });
                } else {
                    console.error("Fees data not found in Firebase.");
                }
            }, { onlyOnce: true });
        } else {
            console.error("Tuition fees data not found in Firebase.");
        }
    }, { onlyOnce: true });
}

// New PDF generation function
function generateStudentInfoPDF(student) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("p", "mm", "a4");
    const img = new Image();
    img.src = "/images/mja-logo.png";

    img.onload = function() {
        // Header Section
        doc.addImage(img, "PNG", 85, 10, 30, 30);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(15);
        doc.text("STUDENT INFORMATION SUMMARY", 62, 50);
        
        // School Year
        const syRef = ref(db, 'CurrentSY');
        onValue(syRef, (snapshot) => {
            if (snapshot.exists()) {
                const { startSY, endSY } = snapshot.val();
                doc.setFontSize(10);
                doc.text(`School Year: ${startSY}-${endSY}`, 80, 60);
            }
        }, { onlyOnce: true });

        let currentY = 70;

        // Horizontal line separator
        doc.line(15, 65, 195, 65);

        // Student Basic Info
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Student Information", 15, currentY);
        currentY += 8;
        doc.setFont("helvetica", "normal");
        
        doc.text(`Name: ${student.Name || 'N/A'}`, 15, currentY);
        doc.text(`Student Number: ${student.studentNumber || 'N/A'}`, 120, currentY);
        currentY += 8;
        
        doc.text(`Grade: ${student.Grade || 'N/A'}`, 15, currentY);
        doc.text(`Status: ${student.Status || 'N/A'}`, 120, currentY);
        currentY += 8;
        
        doc.text(`LRN: ${student.LRN || 'N/A'}`, 15, currentY);
        currentY += 15;

        // Personal Details Section
        doc.setFont("helvetica", "bold");
        doc.text("Personal Details", 15, currentY);
        currentY += 8;
        doc.setFont("helvetica", "normal");
        
        doc.text(`Address: ${student.Address || 'N/A'}`, 15, currentY);
        currentY += 8;
        doc.text(`Birthdate: ${student.Birthdate || 'N/A'}`, 15, currentY);
        currentY += 8;
        doc.text(`Religion: ${student.Religion || 'N/A'}`, 15, currentY);
        currentY += 15;

        // Parent Information
        doc.setFont("helvetica", "bold");
        doc.text("Parent /Guardian Information", 15, currentY);
        currentY += 8;
        doc.setFont("helvetica", "normal");
        
        // Father Details (case-sensitive keys)
        doc.text(`Father: ${student.Father.name || 'N/A'}`, 15, currentY);
        doc.text(`Contact: ${student.Father.contact || 'N/A'}`, 120, currentY);
        currentY += 8;
        
        // Mother Details
        doc.text(`Mother: ${student.Mother.name || 'N/A'}`, 15, currentY);
        doc.text(`Contact: ${student.Mother.contact || 'N/A'}`, 120, currentY);
        currentY += 15;

        // Plan Information
        const plansRef = ref(db, 'plans');
        onValue(plansRef, (snapshot) => {
            const plans = snapshot.val() || {};
            const plan = plans[student.selectedPlan] || {};
            
            doc.setFont("helvetica", "bold");
            doc.text("Enrollment Plan", 15, currentY);
            currentY += 8;
            doc.setFont("helvetica", "normal");
            
            doc.text(`Plan Name: ${plan.name || 'N/A'}`, 15, currentY);
            currentY += 8;
            doc.text(`Description: ${plan.description || 'No description'}`, 15, currentY);

            // Finalize PDF
            const pdfBlob = doc.output("blob");
            const blobURL = URL.createObjectURL(pdfBlob);
            window.open(blobURL, "_blank");
        }, { onlyOnce: true });
    };
}

function getTuitionFeeKey(gradeLevel) {
    if (gradeLevel === "Pre-Elem") {
        return "Pre-Elem";
    }
    return `grade${gradeLevel}`;
}

function createPDF(student, tuitionFees, fees, plans, activities) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("p", "mm", "a4");
    const pageHeight = doc.internal.pageSize.height;

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    let totalPaidBalance = Array.isArray(student.paymentHistory)
        ? student.paymentHistory.reduce((sum, payment) => sum + (parseFloat(payment.amount.replace(/,/g, '')) || 0), 0)
        : 0;

    const today = new Date();
    const formattedDate = `${monthNames[today.getMonth()]} ${String(today.getDate()).padStart(2, '0')}, ${today.getFullYear()}`;

    const img = new Image();
    img.src = "/images/mja-logo.png";

    img.onload = function () {
        doc.addImage(img, "PNG", 85, 10, 30, 30);

        const syRef = ref(db, 'CurrentSY');
        onValue(syRef, (snapshot) => {
            if (snapshot.exists()) {
                const { startSY, endSY } = snapshot.val();
                doc.setFontSize(10);
                doc.text(`School Year: ${startSY}-${endSY}`, 80, 55);
            }
        }, { onlyOnce: true });

        doc.setFont("helvetica", "bold");
        doc.setFontSize(15);
        doc.text("Student Financial Report", 70, 50);
        doc.setFontSize(10);
        doc.text(`Date: ${formattedDate}`, 82, 60);

        doc.setFontSize(14);
        doc.setFont("helvetica", "normal");
        doc.text(`Student Information --------------------------------------------------------------------------------------`, 15, 80);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`Student Name: ${student.studentName}`, 15, 92);
        doc.text(`Student Number: ${student.studentNumber}`, 15, 100);
        doc.text(`Grade Level: ${student.gradeLevel}`, 15, 108);
        doc.text(`Plan: ${student.plan}`, 15, 116);

        const tuitionFeeKey = getTuitionFeeKey(student.gradeLevel);
        const tuitionFee = tuitionFees[tuitionFeeKey] || 0;

        const selectedFees = student.selectedFees || [];
        const feesDetails = selectedFees.map(feeId => {
            const fee = fees[feeId];
            if (!fee) return null;
            return {
                name: fee.name,
                amount: fee.amount
            };
        }).filter(fee => fee !== null);

        const totalFees = feesDetails.reduce((sum, fee) => sum + fee.amount, 0);

        const selectedPlan = student.selectedPlan || "defaultPlan";
        const planDetails = plans[selectedPlan] || {
            downPayment: 0,
            monthlyPayment: 0,
            name: "No Plan Selected"
        };

        const downPayment = planDetails.downPayment;
        const monthlyPayment = planDetails.monthlyPayment;

        const selectedActivities = student.selectedActivities || [];
        const activitiesDetails = selectedActivities.map(activityId => {
            const activity = activities[activityId];
            if (!activity) return null;
            return {
                name: activity.name,
                amount: activity.amount
            };
        }).filter(activity => activity !== null);

        const totalActivities = activitiesDetails.reduce((sum, activity) => sum + activity.amount, 0);

        const totalPayment = tuitionFee + downPayment + (monthlyPayment * 10) + totalFees + totalActivities;

        let currentY = 130;
        doc.setFontSize(14);
        doc.setFont("helvetica", "normal");
        doc.text(`Statement of Account --------------------------------------------------------------------------------------`, 15, currentY);

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        currentY += 12;
        doc.text(`Tuition: ${tuitionFee.toFixed(2)}`, 25, currentY);
        currentY += 8;
        if (planDetails.name === 'A') {
            // For Plan A: Show Amount and skip Monthly Payment & Total Months
            doc.text(`Amount: ${planDetails.downPayment.toFixed(2)}`, 15, currentY);
            currentY += 8;
        } else {
            // For other plans: Show all details
            doc.text(`Downpayment: ${planDetails.downPayment.toFixed(2)}`, 15, currentY);
            currentY += 8;
            doc.text(`Monthly Payment: ${planDetails.monthlyPayment.toFixed(2)}`, 15, currentY);
            currentY += 8;
            doc.text(`Total Months: 10 months`, 15, currentY);
            currentY += 8;
        }

        let rightColumnY = 130 + 12;
        doc.text(`Miscellaneous:`, 110, rightColumnY);
        rightColumnY += 8;
        feesDetails.forEach(fee => {
            doc.text(`${fee.name}: ${fee.amount.toFixed(2)}`, 120, rightColumnY);
            rightColumnY += 8;
        });

        rightColumnY += 8
        if (activitiesDetails.length > 0) {
            doc.text(`Activities:`, 110, rightColumnY);
            rightColumnY += 8;
            activitiesDetails.forEach(activity => {
                doc.text(`${activity.name}: ${activity.amount.toFixed(2)}`, 120, rightColumnY);
                rightColumnY += 8;
            });
        }

        // Retrieve fee and activity balances
        const feeBalances = student.feeBalances || {};
        const activitiesBalances = student.activitiesBalances || {};

        const feeBalDetails = Object.values(feeBalances);
        const activityBalDetails = Object.values(activitiesBalances);

        const totalFeesBalance = feeBalDetails.reduce((sum, fee) => sum + (parseFloat(fee.remaining) || 0), 0);
        const totalActivityBalance = activityBalDetails.reduce((sum, activity) => sum + (parseFloat(activity.remaining) || 0), 0);

        currentY = Math.max(currentY, rightColumnY) + 15;
        doc.setFontSize(14);
        doc.setFont("helvetica", "normal");
        doc.text(`Balance Summary ---------------------------------------------------------------------------------------`, 15, currentY);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        currentY += 12;

        doc.text(`Remaining Balance: ${parseFloat(student.remainingBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 15, currentY);
        currentY += 8;
        doc.text(`Additional Fees Balance: ${totalFeesBalance.toFixed(2)}`, 15, currentY);
        currentY += 8;

        // List fee balances
        if (feeBalDetails.length > 0) {
            feeBalDetails.forEach(fee => {
                doc.text(`${fee.name}: ${fee.remaining?.toFixed(2) || "0.00"}`, 25, currentY);
                currentY += 8;
            });
        }

        doc.text(`Activities Balance: ${totalActivityBalance.toFixed(2)}`, 15, currentY);
        currentY += 8;

        // List activity balances
        if (activityBalDetails.length > 0) {
            activityBalDetails.forEach(activity => {
                doc.text(`${activity.name}: ${activity.remaining?.toFixed(2) || "0.00"}`, 25, currentY);
                currentY += 8;
            });
        }

        let discountY = currentY - 16;
        doc.text(`Discount: ${student.selectedDiscounts}`, 110, discountY);

        const discountText = student.selectedDiscounts || "";
        const checkMark = "YES";
        const crossMark = "None";

        discountY += 8;
        doc.text(`Loyalty: ${discountText.includes("Loyalty") ? checkMark : crossMark}`, 110, discountY);
        discountY += 8;
        doc.text(`Family Member: ${discountText.includes("Family") ? checkMark : crossMark}`, 110, discountY);
        discountY += 8;
        doc.text(`3rd Child: ${discountText.includes("3rd Child") ? checkMark : crossMark}`, 110, discountY);
        discountY += 8;
        doc.text(`Honor: ${discountText.includes("Honor") ? checkMark : crossMark}`, 110, discountY);

        currentY = Math.max(currentY, discountY) + 35;
        if (currentY + 50 > pageHeight) {
            doc.addPage();
            currentY = 10;
        }

        doc.setFontSize(14);
        doc.setFont("helvetica", "normal");
        doc.text("Payment History -----------------------------------------------------------------------------------------", 15, currentY + 15);
        doc.setFont("helvetica", "bold");

        doc.autoTable({
            startY: currentY + 25,
            head: [["Date", "Category", "Mode", "Processed By", "Amount"]],
            body: student.paymentHistory.length > 0
                ? [
                    ...student.paymentHistory.map(payment => [
                        payment.date,
                        payment.category,
                        payment.mode,
                        payment.processed,
                        payment.amount
                    ]),
                    [{ content: "Total Paid:", colSpan: 4, styles: { halign: "right", fontStyle: "bold" } },
                    { content: parseFloat(totalPaidBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { fontStyle: "bold" } }]
                ]
                : [["No Payment History Available", "", "", "", ""]],
            theme: "grid",
            styles: { fontSize: 10, cellPadding: 4, valign: "middle", halign: "center" },
            headStyles: { fillColor: [91, 102, 120], textColor: 255, fontStyle: "bold" },
        });

        doc.setFontSize(10);
        getLoggedInUserName((userName) => {

            const pdfBlob = doc.output("blob");
            const blobURL = URL.createObjectURL(pdfBlob);
            const newWindow = window.open(blobURL, "_blank");
        });
    };
}

function makeStudentNamesClickable() {
    const studentsBody = document.getElementById("studentsBody");

    studentsBody.addEventListener("click", function (event) {
        const row = event.target.closest("tr");
        if (!row) return;

        const student = {
            studentName: row.dataset.studentName || "N/A",
            studentNumber: row.dataset.studentNumber || "N/A",
            gradeLevel: row.dataset.gradeLevel || "N/A",
            plan: row.dataset.plan || "No Plan",
            selectedDiscounts: row.dataset.selectedDiscounts || "None",
            remainingBalance: row.dataset.remainingBalance || "0",
            totalActivityPrice: row.dataset.totalActivityPrice || "0",
            paymentHistory: []
        };

        console.log("📌 Generating PDF for:", student);
        generateStudentPDF(student);
    });
}

function fetchAndDisplaySchoolYear() {
    const db = getDatabase();
    const currentSYRef = ref(db, 'CurrentSY');

    onValue(currentSYRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const schoolYear = `${data.startSY}-${data.endSY}`;
            document.getElementById('schoolyear').textContent = `${schoolYear}`;
        } else {
            console.log("No school year data available");
        }
    }, (error) => {
        console.error("Error fetching school year:", error);
    });
}

function setTodaysDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    document.getElementById('dateFilter').value = `${year}-${month}-${day}`;
}

function fetchPaymentsByDate(date) {
    const loggedInUser = sessionStorage.getItem("name");
    const studentsRef = ref(db, 'Students');

    get(studentsRef).then((snapshot) => {
        let totalPayments = 0;
        let dailyTransactions = [];

        if (snapshot.exists()) {
            Object.values(snapshot.val()).forEach(student => {
                if (student.paymentHistory) {
                    Object.entries(student.paymentHistory).forEach(([key, payment]) => {
                        const paymentDate = payment.date.split('T')[0];
                        if (payment.processedBy === loggedInUser &&
                            paymentDate === date &&
                            !payment.submitted) {
                            totalPayments += payment.amount;
                            dailyTransactions.push({
                                transactionId: payment.transactionID,
                                amount: payment.amount
                            });
                        }
                    });
                }
            });
        }

        updateDailyTransactions(dailyTransactions, totalPayments, date);
    }).catch(console.error);
}

function updateFilterIndicators() {
    const dateFilter = document.getElementById('dateFilter');
    const dateFilterContainer = dateFilter.closest('.date-filter');

    if (dateFilter.value) {
        dateFilterContainer.classList.add('active-filter');
    } else {
        dateFilterContainer.classList.remove('active-filter');
    }
}

let categoryDropdown, reportPeriodDropdown, searchInput, collectionsTable, expensesTable, studentsTable;

document.addEventListener("DOMContentLoaded", function () {
    collectionsTable = document.getElementById('collectionsTable');
    expensesTable = document.getElementById('expensesTable');
    studentsTable = document.getElementById('studentsTable');
    categoryDropdown = document.getElementById('categoryDropdown');
    reportPeriodDropdown = document.getElementById('reportingPeriodDropdown');
    searchInput = document.getElementById('searchInput');

    const urlParams = new URLSearchParams(window.location.search);
    const targetTab = urlParams.get('tab');

    if (targetTab) {
        const tableMap = {
            'remittances': 'remittancesTable',
            'collections': 'collectionsTable',
            'expenses': 'expensesTable',
            'students': 'studentsTable'
        };

        if (tableMap[targetTab]) {
            switchTable(tableMap[targetTab]);
            document.querySelectorAll('.sort-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.id === `${targetTab}Btn`) {
                    btn.classList.add('active');
                }
            });
        }
    } else {
        switchTable('studentsTable');
        document.getElementById('studentsBtn').classList.add('active');
    }

    document.getElementById('studentsBtn').addEventListener('click', () => switchTable('studentsTable'));
    document.getElementById('collectionsBtn').addEventListener('click', () => switchTable('collectionsTable'));
    document.getElementById('expensesBtn').addEventListener('click', () => switchTable('expensesTable'));
    document.getElementById('remittancesBtn').addEventListener('click', () => switchTable('remittancesTable'));

    document.getElementById("expensesBtn").addEventListener("click", function () {
        switchTable("expensesTable");
    });

    document.getElementById('dateFilter').addEventListener('change', function () {
        filterTable();
    });

    document.getElementById('clearDateFilter').addEventListener('click', function () {
        document.getElementById('dateFilter').value = '';
        filterTable();
    });

    fetchAndDisplaySchoolYear();

    document.getElementById("remittancesBtn").addEventListener("click", function () {
        switchTable("remittancesTable");
    });

    document.getElementById("collectionsBtn").addEventListener("click", function () {
        switchTable("collectionsTable");
    });

    document.getElementById("expensesBtn").addEventListener("click", function () {
        switchTable("expensesTable");
    });

    document.getElementById("studentsBtn").addEventListener("click", function () {
        switchTable("studentsTable");
    });

    categoryDropdown.addEventListener("change", filterTable);
    reportPeriodDropdown.addEventListener("change", filterTable);
    searchInput.addEventListener("keyup", filterTable);
    document.getElementById("expensesTypeDropdown")?.addEventListener("change", filterTable);

    document.getElementById("exportExcelBtn").addEventListener("click", function () {
        let selectedTable = "";
        let tableElement = null;

        if (document.getElementById("collectionsTable").style.display !== "none") {
            selectedTable = "Collections";
            tableElement = document.querySelector("#collectionsTable table");
        } else if (document.getElementById("expensesTable").style.display !== "none") {
            selectedTable = "Expenses";
            tableElement = document.querySelector("#expensesTable table");
        } else if (document.getElementById("studentsTable").style.display !== "none") {
            selectedTable = "Students";
            tableElement = document.querySelector("#studentsTable table");
        } else if (document.getElementById('remittancesTable').style.display !== 'none') {
            selectedTable = "Remittances";
            tableElement = document.querySelector("#remittancesTable table");
        }

        if (!tableElement) {
            alert("No table data available to export.");
            return;
        }

        const modal = document.createElement("div");
        modal.classList.add("modal");
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close-btn">&times;</span>
                <h3>Preview ${selectedTable} Table</h3>
                <div class="table-container">${tableElement.outerHTML}</div>
                <button id="confirmDownload">Download Excel</button>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = "block";

        modal.querySelector(".close-btn").addEventListener("click", function () {
            modal.remove();
        });

        modal.querySelector("#confirmDownload").addEventListener("click", function () {
            exportToExcel(selectedTable, tableElement);
            modal.remove();
        });
    });

    document.getElementById("printReportBtn").addEventListener("click", function () {
        updateTableTotals();
        downloadPDF();
    });

    makeStudentNamesClickable();
});