import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getDatabase, ref, onValue, set, get, update, remove } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-database.js";

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
const studentsRef = ref(db, "Students/CurrentSchoolYear");
const dropoutsRef = ref(db, "Dropouts");

// Add these variables at the top of students.js
let allStudents = [];
let allDropouts = [];

// Replace the existing loadStudents and loadDropouts functions with these
function initializeDataListeners() {
    // Real-time listener for students
    onValue(studentsRef, (snapshot) => {
        allStudents = [];
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                if (child.key !== "holder") {
                    allStudents.push({ id: child.key, ...child.val() });
                }
            });
        }
        applyFiltersAndRender('student');
    });

    // Real-time listener for dropouts
    onValue(dropoutsRef, (snapshot) => {
        allDropouts = [];
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                if (child.key !== "holder") {
                    allDropouts.push({ id: child.key, ...child.val() });
                }
            });
        }
        applyFiltersAndRender('dropout');
    });
}

function applyFiltersAndRender(tableType) {
    const isStudents = tableType === 'student';
    const currentData = isStudents ? allStudents : allDropouts;
    const config = tableConfig[tableType];

    // Get current filters
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    const gradeFilter = document.getElementById('gradeLevelFilter').value;

    // Filter data
    let filteredData = currentData.filter(item => {
        const gradeMatch = gradeFilter === 'all' || item.Grade === gradeFilter;
        const searchMatch =
            item.Name.toLowerCase().includes(searchTerm) ||
            item.id.toLowerCase().includes(searchTerm) ||
            item.Grade.toLowerCase().includes(searchTerm);

        return gradeMatch && searchMatch;
    });

    // Sort data
    if (config.sortColumn !== null) {
        filteredData.sort((a, b) => {
            const valA = getSortValue(a, config.sortColumn);
            const valB = getSortValue(b, config.sortColumn);
            return (valA > valB ? 1 : -1) * (config.sortOrder === 'asc' ? 1 : -1);
        });
    }

    // Update table config and render
    config.data = filteredData.map(item => ({
        studentId: item.id,
        name: item.Name,
        grade: item.Grade,
        balance: item.remainingBalance || 0,
        rowHtml: generateRowHtml(item, tableType)
    }));

    config.currentPage = 1; // Reset to first page
    renderTable(tableType);
    updateCounts();
}

function generateRowHtml(item, type) {
    const details = {
        studentId: item.id,
        name: item.Name,
        grade: item.Grade,
        remainingBalance: item.remainingBalance,
        type: type
    };
    const encodedDetails = encodeURIComponent(JSON.stringify(details));

    return `
        <td class="clickable-cell" data-student='${encodedDetails}'>${item.Name}</td>
        <td>${item.id}</td>
        <td>${item.Grade}</td>
        <td>₱${parseFloat(item.remainingBalance || 0).toLocaleString()}</td>
        <td class="action" onclick="toggleDropdown(this)">
            <span>⋮</span>
            <div class="dropdown">
                ${type === 'student' ?
            `<a href="#" onclick="handleDrop('${item.id}')">➜ Dropout</a>` :
            `<a href="#" onclick="removeDropout('${item.id}')">🗑 Remove</a>`}
                <a href="#" onclick="RemoveStudent('${item.id}')">➜ Remove</a>
            </div>
        </td>
    `;
}

function updateCounts() {
    document.getElementById('studentCount').textContent = allStudents.length;
    document.getElementById('dropoutCount').textContent = allDropouts.length;
}

// Modify event listeners to use applyFiltersAndRender
document.getElementById('gradeLevelFilter').addEventListener('change', () => {
    const activeTable = document.getElementById('studentsBtn').classList.contains('active') ? 'student' : 'dropout';
    applyFiltersAndRender(activeTable);
});

document.getElementById('searchInput').addEventListener('input', () => {
    const activeTable = document.getElementById('studentsBtn').classList.contains('active') ? 'student' : 'dropout';
    applyFiltersAndRender(activeTable);
});

// Initialize the data listeners when the page loads
document.addEventListener('DOMContentLoaded', () => {
    initializeDataListeners();
    fetchAndDisplaySchoolYear();

    // Auto-filter from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const searchParam = urlParams.get('search');
    if (searchParam) {
        document.getElementById('searchInput').value = searchParam;
        const event = new Event('input', { bubbles: true });
        document.getElementById('searchInput').dispatchEvent(event);
    }
    
    // Clear URL parameters after filtering
    window.history.replaceState({}, document.title, window.location.pathname);
});

document.getElementById("gradeLevelFilter").addEventListener("change", (event) => {
    const selectedGrade = event.target.value;
    const searchTerm = document.getElementById("searchInput").value.toLowerCase().trim();
    const isStudentsActive = document.getElementById("studentsBtn").classList.contains("active");
    if (isStudentsActive) {
        loadStudents(selectedGrade, searchTerm);
    } else {
        loadDropouts(selectedGrade, searchTerm);
    }
});

document.getElementById("studentsBtn").addEventListener("click", () => {
    document.getElementById("studentTableContainer").style.display = "block";
    document.getElementById("dropoutTableContainer").style.display = "none";

    document.getElementById("studentsBtn").classList.add("active");
    document.getElementById("dropoutsBtn").classList.remove("active");

    document.getElementById("studentCount").parentElement.style.display = "block";
    document.getElementById("dropoutCount").parentElement.style.display = "none";

    const selectedGrade = document.getElementById("gradeLevelFilter").value;
    const searchTerm = document.getElementById("searchInput").value.toLowerCase().trim();
    loadStudents(selectedGrade, searchTerm);
});

document.getElementById("dropoutsBtn").addEventListener("click", () => {
    document.getElementById("studentTableContainer").style.display = "none";
    document.getElementById("dropoutTableContainer").style.display = "block";

    document.getElementById("dropoutsBtn").classList.add("active");
    document.getElementById("studentsBtn").classList.remove("active");

    document.getElementById("studentCount").parentElement.style.display = "none";
    document.getElementById("dropoutCount").parentElement.style.display = "block";

    const selectedGrade = document.getElementById("gradeLevelFilter").value;
    const searchTerm = document.getElementById("searchInput").value.toLowerCase().trim();
    loadDropouts(selectedGrade, searchTerm);
});

const tableConfig = {
    student: {
        data: [],
        currentPage: 1,
        pageSize: 10,
        sortColumn: null,
        sortOrder: 'asc',
        currentTable: 'students'
    },
    dropout: {
        data: [],
        currentPage: 1,
        pageSize: 10,
        sortColumn: null,
        sortOrder: 'asc',
        currentTable: 'dropouts'
    }
};

async function loadStudents(selectedGrade = "all", searchTerm = '') {
    const studentCountElement = document.getElementById("studentCount");
    const currentSY = document.getElementById('schoolyear').textContent;
    const studentsRef = ref(db, "Students/CurrentSchoolYear");

    get(studentsRef).then((snapshot) => {
        tableConfig.student.data = [];
        let studentCount = 0;

        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const studentId = childSnapshot.key;
                const student = childSnapshot.val();
                if (studentId === "holder") return;

                let gradeLvl = student.Grade ? String(student.Grade).trim() : "None";
                // Apply grade filter
                if (selectedGrade !== "all" && gradeLvl !== selectedGrade) return;

                // Apply search filter
                const searchLower = searchTerm.toLowerCase();
                const nameMatch = student.Name?.toLowerCase().includes(searchLower) || false;
                const idMatch = studentId.toLowerCase().includes(searchLower);
                const gradeMatch = gradeLvl.toLowerCase().includes(searchLower);
                if (searchTerm && !nameMatch && !idMatch && !gradeMatch) return;

                studentCount++;

                const studentDetails = {
                    studentId: studentId,
                    name: student.Name,
                    grade: student.Grade,
                    balance: parseFloat(student.remainingBalance) || 0,
                    rowHtml: generateStudentRowHtml(student, studentId)
                };

                tableConfig.student.data.push(studentDetails);
            });

            studentCountElement.textContent = studentCount;
            tableConfig.student.currentPage = 1; // Reset to first page
            renderTable('student');
        }
    });
}

window.handleDrop = async function (studentId) {
    const studentRef = ref(db, `Students/CurrentSchoolYear/${studentId}`);

    try {
        const snapshot = await get(studentRef);
        if (!snapshot.exists()) {
            Swal.fire("Error", "Student not found.", "error");
            return;
        }

        const studentData = snapshot.val();

        Swal.fire({
            title: 'Are you sure?',
            html: `You are about to move <strong>${studentData.Name}</strong> to Dropouts.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes',
            cancelButtonText: 'No',
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            focusCancel: true
        }).then(async (result) => {
            if (result.isConfirmed) {
                // Prompt for months attended
                const { value: months } = await Swal.fire({
                    title: 'Months Attended',
                    input: 'number',
                    inputLabel: 'How many months did the student attend?',
                    inputAttributes: {
                        min: 0,
                        max: 10,
                        step: 1
                    },
                    showCancelButton: true,
                    confirmButtonText: 'Save',
                    inputValidator: (value) => {
                        if (!value || isNaN(value)) return 'Please enter a valid number'
                        if (value < 0) return 'Cannot be negative'
                        if (value > 10) return 'Maximum 10 months'
                    }
                });

                if (months === null || months === undefined) return;

                const monthsNumber = parseInt(months, 10);
                
                // Get the student's selected plan
                const planRef = ref(db, `plans/${studentData.selectedPlan}`);
                const planSnapshot = await get(planRef);
                
                if (!planSnapshot.exists()) {
                    Swal.fire("Error", "Payment plan not found.", "error");
                    return;
                }

                const planData = planSnapshot.val();
                const monthlyPayment = Number(planData.monthlyPayment) || 0;
                const paidMonthly = Number(studentData.paidMonthlyAmount) || 0;

                // Calculate remaining balance correctly
                const initialBalance = monthsNumber * monthlyPayment;
                const remainingBalance = Math.max(initialBalance - paidMonthly, 0);

                // Create dropout data with proper balance calculation
                const dropoutData = {
                    ...studentData,
                    MonthsAttended: monthsNumber,
                    remainingBalance: remainingBalance,
                    paidMonthlyAmount: paidMonthly, // Carry over existing payments
                    status: 'dropout',
                    dropoutDate: new Date().toISOString()
                };

                // Update database
                await Promise.all([
                    set(ref(db, `Dropouts/${studentId}`), dropoutData),
                    remove(studentRef)
                ]);

                Swal.fire("Student Dropped", 
                    `${studentData.Name} moved to Dropouts with balance ₱${remainingBalance.toFixed(2)}`, 
                    "success"
                );
                loadStudents();
            }
        });
    } catch (error) {
        console.error("Error dropping student:", error);
        Swal.fire("Error", "Failed to drop student. Please try again.", "error");
    }
};

window.RemoveStudent = async function (studentId) {
    const studentRef = ref(db, `Students/CurrentSchoolYear/${studentId}`);

    try {
        const snapshot = await get(studentRef);
        if (!snapshot.exists()) {
            Swal.fire("Error", "Student not found.", "error");
            return;
        }

        const studentData = snapshot.val();
        const balance = parseFloat(studentData.remainingBalance) || 0;

        if (balance > 0) {
            const result = await Swal.fire({
                title: 'Cannot Remove Student',
                html: `The <strong>${studentData.Name}</strong> cannot be removed because they have an outstanding balance of <strong>₱${balance.toLocaleString()}</strong>.`,
                icon: 'error',
                showConfirmButton: true,
                confirmButtonText: 'OK',
                allowOutsideClick: false
            });
            return;
        }

        const confirmation = await Swal.fire({
            title: 'Confirm Student Removal',
            html: `You are about to remove <strong>${studentData.Name}</strong> from the system.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes',
            cancelButtonText: 'No',
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            allowOutsideClick: false
        });

        if (confirmation.isConfirmed) {
            await remove(studentRef);
            Swal.fire(
                'Deleted!',
                `${studentData.Name} has been permanently removed.`,
                'success'
            );
            loadStudents(); // Refresh the student list
        }

    } catch (error) {
        console.error("Error removing student:", error);
        Swal.fire("Error", "Failed to remove student. Please try again.", "error");
    }
};


function generateStudentRowHtml(student, studentId) {
    const remainingBalance = student.remainingBalance || "0";
    const studentDetails = {
        studentId: studentId,
        name: student.Name,
        grade: ["Nursery", "Kinder 1", "Kinder 2"].includes(student.Grade) ? "Pre-Elem" : student.Grade,
        remainingBalance: student.remainingBalance || "No balance",
        selectedPlan: student.selectedPlan,
        paidMonthlyAmount: student.paidMonthlyAmount || 0,
        selectedDiscount: student.selectedDiscountText || "No discount applied",
        type: 'student'
    };
    const encodedDetails = encodeURIComponent(JSON.stringify(studentDetails));

    return `
        <td class="clickable-cell" data-student='${encodedDetails}'>${student.Name || "None"}</td>
        <td>${studentId}</td>
        <td>${student.Grade}</td>
        <td>₱${parseFloat(remainingBalance).toLocaleString()}</td>
        <td class="action" onclick="toggleDropdown(this)">
            <span>⋮</span>
            <div class="dropdown">
                <a href="#" onclick="handleDrop('${studentId}')">➜ Dropout</a>
                <a href="#" onclick="RemoveStudent('${studentId}')">➜ Remove</a>
                
            </div>
        </td>
    `;
}

function renderTable(tableType) {
    const config = tableConfig[tableType];
    const tbody = document.getElementById(`${tableType}TableBody`);
    const pageInfo = document.querySelector(`#${tableType}Table + .table-controls .page-info`);
    const prevButton = document.querySelector(`#${tableType}Table + .table-controls .prev-page`);
    const nextButton = document.querySelector(`#${tableType}Table + .table-controls .next-page`);

    if (config.sortColumn !== null) {
        config.data.sort((a, b) => {
            const valA = getSortValue(a, config.sortColumn);
            const valB = getSortValue(b, config.sortColumn);
            return (valA > valB ? 1 : -1) * (config.sortOrder === 'asc' ? 1 : -1);
        });
    }

    const start = (config.currentPage - 1) * config.pageSize;
    const end = config.pageSize === Infinity ? config.data.length : start + config.pageSize;
    const pageData = config.data.slice(start, end);

    tbody.innerHTML = pageData.map(student => `
        <tr data-id="${student.studentId}">${student.rowHtml}</tr>
    `).join('');

    if (pageData.length === 0) {
        let message;
        switch (tableType) {
            case 'student':
                message = 'students';
                break;
            case 'dropout':
                message = 'dropouts';
                break;
            default:
                message = 'data';
        }
        tbody.innerHTML = `<tr><td colspan="5" class="no-data">No ${message} found.</td></tr>`;
    }

    const totalPages = config.pageSize === Infinity ? 1 : Math.ceil(config.data.length / config.pageSize);
    pageInfo.textContent = `Page ${config.currentPage} of ${totalPages}`;
    prevButton.disabled = config.currentPage === 1;
    nextButton.disabled = config.currentPage === totalPages;

    tbody.querySelectorAll('.clickable-cell').forEach(cell => {
        cell.addEventListener('click', function () {
            window.location.href = `payments.html?data=${this.dataset.student}`;
        });
    });
}

const gradeOrder = ['Nursery', 'Kinder 1', 'Kinder 2', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

function getSortValue(student, columnIndex) {
    switch (columnIndex) {
        case 0: return student.name.toLowerCase();
        case 1: return student.studentId;
        case 2:
            const gradeIndex = gradeOrder.indexOf(student.grade);
            return gradeIndex !== -1 ? gradeIndex : Infinity; // Handle unknown grades last
        case 3: return student.balance;
        default: return '';
    }
}

document.querySelectorAll('th.sortable').forEach(header => {
    header.addEventListener('click', function () {
        const tableType = this.closest('table').id.replace('Table', '');
        const config = tableConfig[tableType];
        const columnIndex = Array.from(this.parentElement.children).indexOf(this);

        if (config.sortColumn === columnIndex) {
            config.sortOrder = config.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            config.sortColumn = columnIndex;
            config.sortOrder = 'asc';
        }

        document.querySelectorAll(`#${tableType}Table th`).forEach(th => th.classList.remove('asc', 'desc'));
        this.classList.add(config.sortOrder);
        renderTable(tableType);
    });
});

document.querySelectorAll('.page-size').forEach(select => {
    select.addEventListener('change', function () {
        const tableType = this.closest('.table-controls').previousElementSibling.id.replace('Table', '');
        const config = tableConfig[tableType];
        config.pageSize = this.value === 'all' ? Infinity : parseInt(this.value);
        config.currentPage = 1;
        renderTable(tableType);
    });
});

document.querySelectorAll('.prev-page').forEach(button => {
    button.addEventListener('click', function () {
        const tableType = this.closest('.table-controls').previousElementSibling.id.replace('Table', '');
        const config = tableConfig[tableType];
        if (config.currentPage > 1) {
            config.currentPage--;
            renderTable(tableType);
        }
    });
});

document.querySelectorAll('.next-page').forEach(button => {
    button.addEventListener('click', function () {
        const tableType = this.closest('.table-controls').previousElementSibling.id.replace('Table', '');
        const config = tableConfig[tableType];
        const totalPages = Math.ceil(config.data.length / config.pageSize);
        if (config.currentPage < totalPages) {
            config.currentPage++;
            renderTable(tableType);
        }
    });
});

window.onclick = function (event) {
    const modal = document.getElementById("studentDetailsModal");
    if (event.target === modal) {
        modal.style.display = "none";
    }
};

async function loadDropouts(selectedGrade = "all", searchTerm = '') {
    const dropoutCountElement = document.getElementById("dropoutCount");

    get(dropoutsRef).then((snapshot) => {
        tableConfig.dropout.data = [];
        let studentCount = 0;

        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const dropoutId = childSnapshot.key;
                const dropout = childSnapshot.val();
                if (dropoutId === "holder") return;

                let gradeLvl = dropout.Grade ? String(dropout.Grade).trim() : "None";
                // Apply grade filter
                if (selectedGrade !== "all" && gradeLvl !== selectedGrade) return;

                // Apply search filter
                const searchLower = searchTerm.toLowerCase();
                const nameMatch = dropout.Name?.toLowerCase().includes(searchLower) || false;
                const idMatch = dropoutId.toLowerCase().includes(searchLower);
                const gradeMatch = gradeLvl.toLowerCase().includes(searchLower);
                if (searchTerm && !nameMatch && !idMatch && !gradeMatch) return;

                studentCount++;

                const dropoutDetails = {
                    studentId: dropoutId,
                    name: dropout.Name,
                    grade: ["Nursery", "Kinder 1", "Kinder 2"].includes(dropout.Grade) ? "Pre-Elem" : dropout.Grade,
                    balance: parseFloat(dropout.remainingBalance) || 0,
                    rowHtml: generateDropoutRowHtml(dropout, dropoutId)
                };

                tableConfig.dropout.data.push(dropoutDetails);
            });

            dropoutCountElement.textContent = studentCount;
            tableConfig.dropout.currentPage = 1; // Reset to first page
            renderTable('dropout');
        }
    });
}

window.removeDropout = async function (studentId) {
    const dropoutRef = ref(db, `Dropouts/${studentId}`);
    const studentData = await get(dropoutRef).then(snapshot => snapshot.val());
    const balance = parseFloat(studentData.remainingBalance) || 0;

    if (balance > 0) {
        const result = await Swal.fire({
            title: 'Cannot Remove Student',
            html: `The <strong>${studentData.Name}</strong> cannot be removed because they have an outstanding balance of <strong>₱${balance.toLocaleString()}</strong>.`,
            icon: 'error',
            showCancelButton: true, // Replaced deny with cancel
            confirmButtonText: 'Yes',
            cancelButtonText: 'No',
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            allowOutsideClick: false
        });
        return;
    }

    const result = await Swal.fire({
        title: 'Confirm Dropout Removal',
        html: `You are about to remove <strong>${studentData.Name}</strong> from the system.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes',
        cancelButtonText: 'No',
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        allowOutsideClick: false
    });

    if (result.isConfirmed) {
        await remove(dropoutRef);
        Swal.fire(
            'Successfully Removed',
            `${studentData.Name} has been permanently deleted from the system.`,
            'success'
        );
        loadDropouts();
    }
};

document.querySelectorAll('.moveToDropoutsBtn').forEach(button => {
    button.addEventListener('click', function () {
        const studentId = this.getAttribute('data-student-id');
        handleMoveToDropouts(studentId);
    });
});

function generateDropoutRowHtml(dropout, dropoutId) {
    const remainingBalance = dropout.remainingBalance || "0";
    const dropoutDetails = {
        studentId: dropoutId,
        name: dropout.Name,
        grade: ["Nursery", "Kinder 1", "Kinder 2"].includes(dropout.Grade) ? "Pre-Elem" : dropout.Grade,
        remainingBalance: dropout.remainingBalance || "No balance",
        selectedPlan: dropout.selectedPlan,
        paidMonthlyAmount: dropout.paidMonthlyAmount || 0,
        selectedDiscount: dropout.selectedDiscountText || "No discount applied",
        type: 'dropout'
    };
    const encodedDetails = encodeURIComponent(JSON.stringify(dropoutDetails));

    return `
        <td class="clickable-cell" data-student='${encodedDetails}'>${dropout.Name || "None"}</td>
        <td>${dropoutId}</td>
        <td>${dropout.Grade || "None"}</td>
        <td>₱${parseFloat(remainingBalance).toLocaleString()}</td>
        <td class="action" onclick="toggleDropdown(this)">
            <span>⋮</span>
            <div class="dropdown">
                <a href="#" onclick="removeDropout('${dropoutId}')">🗑 Remove</a>
            </div>
        </td>
    `;
}

window.openUploadModal = function () {
    Swal.close(); // Close enrollment form
    Swal.fire({
        title: 'Bulk Student Upload',
        html: `
            <div class="upload-guide">
                <h4>Excel File Requirements:</h4>
                <ul>
                    <li>File formats: .xlsx or .xls</li>
                    <li>Max file size: 5MB</li>
                    <li>Required columns: SURNAME, FIRST NAME, GRADE LEVEL, SEX</li>
                    <li>Optional columns: MIDDLE NAME, LRN NUMBER, ADDRESS, BIRTHDAY, RELIGION</li>
                </ul>
            </div>
            
            <div class="upload-section">
            <div class="form-group">
            <label>School Year: *</label>
            <select id="uploadSchoolYear" class="swal2-select" required>
                <!-- Options populated dynamically -->
            </select>
        </div>
                <div class="upload-box">
                    <label class="upload-label">
                        <input type="file" id="excelUploadModal" accept=".xlsx,.xls" hidden>
                        <div class="upload-content">
                            <i class="fas fa-file-excel upload-icon"></i>
                            <div class="upload-text">
                                <div>Click to upload Excel file</div>
                                <div class="file-requirements">
                                    Supported formats: .xlsx, .xls<br>
                                    Max file size: 5MB
                                </div>
                            </div>
                        </div>
                    </label>
                    <div class="file-name-display"></div>
                </div>
                <div class="upload-progress" style="margin-top: 20px; display: none;">
                    <div class="progress-text" style="margin-bottom: 5px;"></div>
                    <div class="progress-bar-container" style="height: 10px; background: #eee; border-radius: 5px;">
                        <div class="progress-bar" style="height: 100%; width: 0%; background: #00bf63; border-radius: 5px; transition: width 0.3s ease;"></div>
                    </div>
                </div>
            </div>
        `,
        width: 800,
        showConfirmButton: false,
        showCancelButton: true,
        cancelButtonText: 'Close',
        cancelButtonColor: '#d33',
        didOpen: () => {
            const currentSY = document.getElementById('schoolyear').textContent;
            const [start, end] = currentSY.split('-').map(Number);
            const nextSY = `${start + 1}-${end + 1}`;
            const uploadSYSelect = document.getElementById('uploadSchoolYear');
            uploadSYSelect.innerHTML = `
                <option value="${currentSY}">Current School Year (${currentSY})</option>
                <option value="${nextSY}">Next School Year (${nextSY})</option>
            `;

            document.getElementById('excelUploadModal').addEventListener('change', function (e) {
                const file = e.target.files[0];
                const fileNameDisplay = document.querySelector('.file-name-display');
                const progressContainer = document.querySelector('.upload-progress');
                const progressBar = document.querySelector('.progress-bar');
                const progressText = document.querySelector('.progress-text');

                if (file) {
                    fileNameDisplay.innerHTML = `
                        <div class="file-info">
                            <i class="fas fa-file-excel"></i>
                            <span>${file.name}</span>
                            <button onclick="clearFileInput('excelUploadModal')" class="clear-file-btn">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    `;

                    progressContainer.style.display = 'block';
                    processExcelWithProgress(file, progressBar, progressText);
                }
            });
        }
    });
};

async function processExcelWithProgress(file) {
    const selectedSY = document.getElementById('uploadSchoolYear').value;
    const reader = new FileReader();

    reader.onload = async function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const db = getDatabase();

        try {
            const currentSYRef = ref(db, 'CurrentSY');
            const currentSYData = await get(currentSYRef);
            const { startSY, endSY } = currentSYData.val();
            const currentSY = `${startSY}-${endSY}`;
            const nextSY = `${startSY + 1}-${endSY + 1}`;

            const uploadSummary = {
                currentSYCount: 0,
                nextSYCount: 0,
                skippedRows: [],
                strands: new Set(),
                grades: new Set()
            };

            let totalStudents = 0;
            for (const sheetName of workbook.SheetNames) {
                const sheet = workbook.Sheets[sheetName];
                const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
                totalStudents += Math.max(0, rows.length - 1);
            }

            const updates = {};
            let currentCount = 0;

            for (const sheetName of workbook.SheetNames) {
                const sheet = workbook.Sheets[sheetName];
                const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

                if (rows.length < 2) continue;

                const headers = rows[0].map(h => h.trim().toUpperCase());

                const isCurrentSY = selectedSY === currentSY;
                const [startYear] = selectedSY.split('-').map(Number);
                const pathSegment = isCurrentSY ? 'CurrentSchoolYear' : 'NextSchoolYear';

                const studentsRef = ref(db, `Students/${pathSegment}`);
                const snapshot = await get(studentsRef);
                let highestNumber = 0;

                if (snapshot.exists()) {
                    snapshot.forEach(child => {
                        const id = child.key;
                        if (id.startsWith(startYear.toString())) {
                            const sequentialPart = id.slice(startYear.toString().length);
                            const num = parseInt(sequentialPart) || 0;
                            if (num > highestNumber) highestNumber = num;
                        }
                    });
                }

                let nextNumber = highestNumber + 1;

                for (let i = 1; i < rows.length; i++) {
                    currentCount++;
                    const row = rows[i];
                    const rowData = {};

                    headers.forEach((header, index) => {
                        rowData[header] = row[index] || '';
                    });

                    const requiredFields = ['SURNAME', 'FIRST NAME', 'GRADE LEVEL', 'SEX'];
                    const missingFields = requiredFields.filter(f => !rowData[f]);
                    if (missingFields.length > 0) {
                        uploadSummary.skippedRows.push(`Row ${i + 1}: Missing ${missingFields.join(', ')}`);
                        continue;
                    }

                    let gradeLevel = (rowData['GRADE LEVEL'] || '').toString().trim().toUpperCase();
                    // Universal grade mapping regardless of sheet name
                    gradeLevel = gradeLevel.replace('PREPARATORY', 'Kinder 2')
                        .replace('KINDER', 'Kinder 1');

                    const fullName = `${rowData['SURNAME']}, ${rowData['FIRST NAME']}${rowData['MIDDLE NAME'] ? ' ' + rowData['MIDDLE NAME'] : ''}`.trim();

                    let schoolYear = selectedSY;

                    const student = {
                        LRN: rowData['LRN NUMBER'] || '',
                        Name: fullName,
                        Grade: gradeLevel,
                        Sex: rowData['SEX'][0].toUpperCase(),
                        Address: rowData['ADDRESS'] || '',
                        Birthdate: formatBirthdate(rowData['BIRTHDAY']),
                        Religion: rowData['RELIGION'] || '',
                        Father: {
                            Name: rowData["FATHER'S NAME"] || '',
                            Contact: rowData["CONTACT NO. 1"] || ''
                        },
                        Mother: {
                            Name: rowData["MOTHER'S NAME"] || '',
                            Contact: rowData["CONTACT NO. 2"] || ''
                        },
                        Status: rowData['STATUS'] || 'NEW STUDENT',
                        Discount: rowData['DISCOUNT'] || '',
                        SchoolYear: selectedSY,
                        remainingBalance: 0,
                        paymentHistory: {},
                        feeBalances: {},
                        selectedFees: [],
                        selectedPlan: ""
                    };

                    if (sheetName.includes('SHS') && rowData['STRAND']) {
                        student.Strand = rowData['STRAND'];
                        uploadSummary.strands.add(rowData['STRAND']);
                    }

                    uploadSummary.grades.add(student.Grade);

                    const isCurrentSY = student.SchoolYear === currentSY;
                    const [startYear] = student.SchoolYear.split('-').map(Number);
                    const pathSegment = isCurrentSY ? 'CurrentSchoolYear' : 'NextSchoolYear';

                    const studentID = `${startYear}${String(nextNumber).padStart(4, '0')}`;
                    nextNumber++;

                    if (!['Nursery', 'Kinder 1', 'Kinder 2'].includes(gradeLevel) &&
                        !/^\d+$/.test(gradeLevel)) {
                        uploadSummary.skippedRows.push(`Row ${i + 1}: Invalid grade level "${gradeLevel}"`);
                        continue;
                    }

                    // Add duplicate ID check
                    if (updates[`Students/${pathSegment}/${studentID}`]) {
                        uploadSummary.skippedRows.push(`Row ${i + 1}: Duplicate ID generated`);
                        continue;
                    }

                    const path = `Students/${pathSegment}/${studentID}`;
                    updates[path] = student;

                    if (isCurrentSY) {
                        uploadSummary.currentSYCount++;
                    } else {
                        uploadSummary.nextSYCount++;
                    }
                }
            }

            const confirmation = await Swal.fire({
                title: 'Confirm Upload',
                html: `
                    <div class="upload-confirm">
                        <p>Total students to upload: ${currentCount}</p>
                        <div class="summary-grid">
                            <div>
                                <h4>School Year Distribution</h4>
                                <p>▶ Current SY (${currentSY}): ${uploadSummary.currentSYCount}</p>
                                <p>▶ Next SY (${nextSY}): ${uploadSummary.nextSYCount}</p>
                            </div>
                            ${uploadSummary.strands.size > 0 ? `
                            <div>
                                <h4>Strands Found</h4>
                                <p>${Array.from(uploadSummary.strands).join(', ')}</p>
                            </div>` : ''}
                            <div>
                                <h4>Grade Levels</h4>
                                <p>${Array.from(uploadSummary.grades).join(', ')}</p>
                            </div>
                        </div>
                        ${uploadSummary.skippedRows.length > 0 ? `
                        <div class="skipped-rows">
                            <h4>Skipped Rows (${uploadSummary.skippedRows.length})</h4>
                            <div class="skipped-list">
                                ${uploadSummary.skippedRows.slice(0, 5).map(r => `<p>${r}</p>`).join('')}
                                ${uploadSummary.skippedRows.length > 5 ?
                            `<p>...and ${uploadSummary.skippedRows.length - 5} more</p>` : ''}
                            </div>
                        </div>` : ''}
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: 'Confirm Upload',
                cancelButtonText: 'Cancel',
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                width: 800,
                focusConfirm: false,
                allowOutsideClick: false
            });

            if (!confirmation.isConfirmed) return;

            await update(ref(db), updates);

            Swal.fire({
                title: 'Upload Complete!',
                html: `
                    <div class="upload-success">
                        <p>Successfully processed ${currentCount} students</p>
                        <div class="success-details">
                            <p>▶ Current SY (${currentSY}): ${uploadSummary.currentSYCount}</p>
                            <p>▶ Next SY (${nextSY}): ${uploadSummary.nextSYCount}</p>
                            ${uploadSummary.skippedRows.length > 0 ?
                        `<p>▶ Skipped rows: ${uploadSummary.skippedRows.length}</p>` : ''}
                        </div>
                    </div>
                `,
                icon: 'success',
                confirmButtonColor: '#774848'
            });

            if (currentCount > 0) loadStudents();

        } catch (error) {
            Swal.fire({
                title: 'Upload Failed',
                html: `Error processing file: ${error.message}`,
                icon: 'error',
                confirmButtonColor: '#774848'
            });
            console.error('Upload error:', error);
        }
    };

    reader.readAsArrayBuffer(file);
}

function formatBirthdate(dateString) {
    if (!dateString) return '';

    if (typeof dateString === 'number') {
        const excelEpoch = new Date(1899, 11, 30);
        return new Date(excelEpoch.setDate(excelEpoch.getDate() + dateString))
            .toISOString().split('T')[0];
    }

    const formats = [
        'YYYY-MM-DD',
        'MM/DD/YYYY',
        'DD/MM/YYYY',
        'YYYY-MM-DD HH:mm:ss'
    ];

    for (const format of formats) {
        const date = new Date(dateString);
        if (!isNaN(date)) {
            return date.toISOString().split('T')[0];
        }
    }

    return ''; // Return empty if can't parse
}

window.clearFileInput = () => {
    const input = document.getElementById('excelUpload');
    input.value = '';
    document.querySelector('.file-name-display').innerHTML = '';
};

async function generateStudentID(startYear, pathSegment) {
    const studentsRef = ref(db, `Students/${pathSegment}`);
    const snapshot = await get(studentsRef);

    let highestNumber = 0;

    if (snapshot.exists()) {
        snapshot.forEach(child => {
            const id = child.key;
            if (id.startsWith(startYear.toString())) {
                const sequentialPart = id.slice(startYear.toString().length);
                const num = parseInt(sequentialPart) || 0;
                if (num > highestNumber) {
                    highestNumber = num;
                }
            }
        });
    }

    const nextNumber = highestNumber + 1;
    const paddedNumber = String(nextNumber).padStart(4, '0');
    return `${startYear}${paddedNumber}`;
}

document.getElementById("addStudentBtn").addEventListener("click", addStudent);

async function addStudent() {
    const currentSY = document.getElementById('schoolyear').textContent;
    const [currentStart, currentEnd] = currentSY.split('-').map(Number);
    const nextSY = `${currentStart + 1}-${currentEnd + 1}`;

    const { value: formValues } = await Swal.fire({
        title: '<h2 class="enrollment-title">STUDENT ENROLLMENT FORM</h2>',
        html: `
            <div class="enrollment-container">
                <div class="enrollment-header">
                <div class="school-year-input">
                    <label>School Year: *</label>
<select id="schoolYear" class="swal2-select" required>
        <option value="${currentSY}">Current School Year (${currentSY})</option>
        <option value="${nextSY}">Next School Year (${nextSY})</option>
    </select>
                </div>
            </div>

                <div class="form-section">
                    <h3>STUDENT INFORMATION</h3>
                    <div class="form-grid">
                        <div class="form-group">
                            <label>LRN Number:</label>
                            <input type="text" id="lrn" class="swal2-input">
                        </div>
                        
                        <div class="form-group">
                            <label>Grade Level: *</label>
                            <select id="gradeLevel" class="swal2-select" required>
                                <option value="">Select Grade</option>
                                <option value="Nursery">Nursery</option>
                                <option value="Kinder 1">Kinder 1</option>
                                <option value="Kinder 2">Kinder 2</option>
                                ${Array.from({ length: 12 }, (_, i) =>
            `<option value="${i + 1}">Grade ${i + 1}</option>`).join('')}
                            </select>
                        </div>

                        <div class="form-group">
                            <label>Surname: *</label>
                            <input type="text" id="surname" class="swal2-input" required>
                        </div>

                        <div class="form-group">
                            <label>First Name: *</label>
                            <input type="text" id="firstName" class="swal2-input" required>
                        </div>

                        <div class="form-group">
                            <label>Middle Name:</label>
                            <input type="text" id="middleName" class="swal2-input">
                        </div>

                        <div class="form-group">
                            <label>Sex: *</label>
                            <select id="sex" class="swal2-select" required>
                                <option value="">Select</option>
                                <option value="M">Male</option>
                                <option value="F">Female</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label>Date of Birth:</label>
                            <input type="date" id="birthdate" class="swal2-input">
                        </div>

                        <div class="form-group">
    <label>Status: *</label>
    <div class="radio-group">
        <label>
            <input type="radio" name="status" value="NEW STUDENT" checked> 
            New Student
        </label>
        <label>
            <input type="radio" name="status" value="OLD STUDENT">
            Old Student
        </label>
    </div>
</div>

                        <div class="form-group full-width">
                            <label>Address:</label>
                            <textarea id="address" class="swal2-textarea" rows="2"></textarea>
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h3>PARENT/GUARDIAN INFORMATION</h3>
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Father's Name:</label>
                            <input type="text" id="fatherName" class="swal2-input">
                        </div>
                        
                        <div class="form-group">
                            <label>Mother's Name:</label>
                            <input type="text" id="motherName" class="swal2-input">
                        </div>

                        <div class="form-group">
                            <label>Father's Contact:</label>
                            <input type="tel" id="fatherContact" class="swal2-input">
                        </div>

                        <div class="form-group">
                            <label>Mother's Contact:</label>
                            <input type="tel" id="motherContact" class="swal2-input">
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h3>OTHER INFORMATION</h3>
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Religion:</label>
                            <input type="text" id="religion" class="swal2-input">
                        </div>
                        
                        <div class="form-group">
                            <label>Last School Attended:</label>
                            <input type="text" id="lastSchool" class="swal2-input">
                        </div>
                    </div>
                </div>
            </div>

            <!-- Separator with text -->
                <div class="section-divider">
    <span class="divider-text">OR</span>
</div>

<button type="button" 
        class="bulk-upload-btn"
        onclick="openUploadModal()">
    <i class="fas fa-file-excel"></i> Bulk Upload via Excel
</button>
            </div>
        `,
        width: 900,
        focusConfirm: false,
        confirmButtonText: 'Submit Enrollment',
        confirmButtonColor: '#00bf63',
        showCancelButton: true,
        cancelButtonColor: '#d33',
        cancelButtonText: 'Cancel',
        allowOutsideClick: false,
        preConfirm: () => {
            const requiredFields = {
                gradeLevel: 'Grade Level',
                surname: 'Surname',
                firstName: 'First Name',
                sex: 'Sex',
                schoolYear: 'School Year',
                status: 'Status'
            };

            const status = document.querySelector('input[name="status"]:checked')?.value || '';

            const missing = Object.entries(requiredFields)
                .filter(([field]) => {
                    if (field === 'status') return !status;
                    const el = document.getElementById(field);
                    return !el.value.trim();
                })
                .map(([, name]) => name);

            const syInput = document.getElementById('schoolYear');
            if (!/^\d{4}-\d{4}$/.test(syInput.value)) {
                missing.push('Invalid School Year format (Use YYYY-YYYY)');
            }

            if (missing.length > 0) {
                Swal.showValidationMessage(`Missing/Invalid fields:<br>• ${missing.join('<br>• ')}`);
                return false; // Block form submission
            }

            return {
                schoolYear: document.getElementById('schoolYear').value,
                grade: document.getElementById('gradeLevel').value,
                surname: document.getElementById('surname').value,
                firstName: document.getElementById('firstName').value,
                middleName: document.getElementById('middleName').value,
                sex: document.getElementById('sex').value,
                birthdate: document.getElementById('birthdate').value,
                status: status || 'NEW STUDENT',
                address: document.getElementById('address').value,
                lrn: document.getElementById('lrn').value,
                religion: document.getElementById('religion').value,
                lastSchool: document.getElementById('lastSchool').value,
                fatherName: document.getElementById('fatherName').value,
                motherName: document.getElementById('motherName').value,
                fatherContact: document.getElementById('fatherContact').value,
                motherContact: document.getElementById('motherContact').value
            };
        }
    });

    if (!formValues) return;

    const confirmation = await Swal.fire({
        title: 'Confirm Enrollment',
        html: `Enroll student with these details?<br><br>
      <strong>Name:</strong> ${formValues?.surname || ''}, ${formValues?.firstName || ''} ${formValues?.middleName || ''}<br>
      <strong>Grade:</strong> ${formValues?.grade || ''}<br>
      <strong>Status:</strong> ${formValues?.status || 'NEW STUDENT'}<br>
      <strong>School Year:</strong> ${formValues?.schoolYear || ''}`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes',
        cancelButtonText: 'No',
        confirmButtonColor: '#3085d6', // Blue
        cancelButtonColor: '#d33',      // Red
        reverseButtons: false           // Ensures "Yes" is on the right
    });

    if (!confirmation.isConfirmed) return;

    try {
        const sy = formValues.schoolYear;
        const isCurrent = sy === currentSY;
        const [startYear] = sy.split('-').map(Number);
        const fullName = `${formValues.surname}, ${formValues.firstName}${formValues.middleName ? ' ' + formValues.middleName : ''}`.trim();
        const pathSegment = isCurrent ? 'CurrentSchoolYear' : 'NextSchoolYear';
        const studentID = await generateStudentID(startYear, pathSegment); // Pass pathSegment here

        const studentData = {
            Name: fullName,
            LRN: formValues.lrn || '',
            Grade: formValues.grade,
            Sex: formValues.sex,
            Birthdate: formValues.birthdate || '',
            Status: formValues.status || 'NEW STUDENT',
            Address: formValues.address || '',
            Religion: formValues.religion || '',
            LastSchoolAttended: formValues.lastSchool || '',
            Father: {
                Name: formValues.fatherName || '',
                Contact: formValues.fatherContact || ''
            },
            Mother: {
                Name: formValues.motherName || '',
                Contact: formValues.motherContact || ''
            },
            remainingBalance: 0,
            paymentHistory: {},
            feeBalances: {},
            selectedFees: [],
            selectedPlan: "",
            SchoolYear: sy
        };

        await set(ref(db, `Students/${pathSegment}/${studentID}`), studentData);

        Swal.fire({
            title: 'Enrolled!',
            html: `<div class="enrollment-success">
                     <p>${fullName}</p>
                     <p>ID: ${studentID}</p>
                     <p>Grade: ${formValues.grade}</p>
                     <p>School Year: ${sy}</p>
                     <p>${isCurrent ? 'Current' : 'Next'} School Year</p>
                   </div>`,
            icon: 'success',
            confirmButtonColor: '#774848'
        });

        if (isCurrent) {
            loadStudents();
        }

    } catch (error) {
        Swal.fire({
            title: 'Error!',
            html: `Enrollment failed: ${error.message}`,
            icon: 'error',
            confirmButtonColor: '#774848'
        });
        console.error('Enrollment error:', error);
    }
}

window.toggleDropdown = function (element) {
    document.querySelectorAll(".dropdown").forEach(drop => {
        if (drop !== element.querySelector(".dropdown")) {
            drop.style.display = "none";
        }
    });

    let dropdown = element.querySelector(".dropdown");

    dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
};

function updateStudentCount() {
    const studentCountElement = document.getElementById("studentCount");
    // Change studentsRef to CurrentSchoolYear
    get(ref(db, "Students/CurrentSchoolYear")).then((snapshot) => {
        if (snapshot.exists()) {
            let studentCount = 0;
            snapshot.forEach((childSnapshot) => {
                if (childSnapshot.key !== "holder") studentCount++;
            });
            studentCountElement.textContent = studentCount;
        } else {
            studentCountElement.textContent = "0";
        }
    }).catch((error) => {
        console.error("Error fetching student count:", error);
        studentCountElement.textContent = "Error";
    });
}

const initialGrade = document.getElementById("gradeLevelFilter").value;
loadStudents(initialGrade, '');

setTimeout(updateStudentCount, 1000);

let searchTimeout;

document.getElementById("searchInput").addEventListener("input", (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        const input = e.target.value.toLowerCase().trim();
        const selectedGrade = document.getElementById("gradeLevelFilter").value;
        const isStudentsActive = document.getElementById("studentsBtn").classList.contains("active");
        if (isStudentsActive) {
            loadStudents(selectedGrade, input);
        } else {
            loadDropouts(selectedGrade, input);
        }
    }, 300);
});

function searchTable(tableId, tbodyId, input) {
    let rows = document.querySelectorAll(`#${tableId} tbody tr`);
    let tableBody = document.getElementById(tbodyId);
    let found = false;

    rows.forEach(row => {
        let name = row.cells[0]?.innerText.toLowerCase() || "";
        let studentNumber = row.cells[1]?.innerText.toLowerCase() || "";
        let yearLevel = row.cells[2]?.innerText.toLowerCase() || "";

        if (input === "" || name.includes(input) || studentNumber.includes(input) || yearLevel.includes(input)) {
            row.style.display = "";
            found = true;
        } else {
            row.style.display = "none";
        }
    });

    let noDataRow = tableBody.querySelector(".no-data");
    if (noDataRow) noDataRow.remove();

    if (!found) {
        let noDataRow = document.createElement("tr");
        noDataRow.innerHTML = `<td colspan="5" class="no-data">${tableId === "studentTable" ? "No students" :
            tableId === "dropoutTable" ? "No dropouts" : "No repeaters"
            } found.</td>`;
        tableBody.appendChild(noDataRow);
    }
}

document.getElementById("endSY").addEventListener("click", handleEndSchoolYear);

async function handleEndSchoolYear() {
    const db = getDatabase();

    const result = await Swal.fire({
        title: 'Archive Current School Year?',
        text: 'This will archive students, promote grades, and reset financial data. Continue?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes',
        cancelButtonText: 'No',
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
    });

    if (!result.isConfirmed) return;

    try {

        const currentSYRef = ref(db, "CurrentSY");
        const currentSYSnapshot = await get(currentSYRef);
        if (!currentSYSnapshot.exists()) {
            Swal.fire('Error', 'Current school year not found.', 'error');
            return;
        }

        const { startSY: prevStart, endSY: prevEnd } = currentSYSnapshot.val();
        // Convert to numbers explicitly
        const prevStartNum = parseInt(prevStart);
        const prevEndNum = parseInt(prevEnd);
        // Maintain the 1-year difference between start and end
        const newStart = prevEndNum;
        const newEnd = prevEndNum + 1;
        const prevSYKey = `${prevStart}-${prevEnd}`;

        const remittancesSnapshot = await get(ref(db, 'remittances'));

        const updates = {};

        updates[`SchoolYear/${prevSYKey}/remittances`] = remittancesSnapshot.exists() ? remittancesSnapshot.val() : {};
        updates['remittances'] = {};


        const studentsSnapshot = await get(ref(db, "Students/CurrentSchoolYear"));
        if (!studentsSnapshot.exists()) {
            Swal.fire('Error', 'No students found.', 'error');
            return;
        }

        studentsSnapshot.forEach((studentSnap) => {
            const studentId = studentSnap.key;
            if (studentId === "holder") return;

            const studentData = studentSnap.val();
            const currentGrade = studentData.Grade.trim();
            const balance = parseFloat(studentData.remainingBalance || 0);

            const { paymentHistory, ...studentDataWithoutHistory } = studentData;

            // Archive to SchoolYear node with both fields
            const archivePath = `SchoolYear/${prevSYKey}/${balance === 0 ? "Paid" : "Balance"}/${studentId}`;
            updates[archivePath] = {
                ...studentDataWithoutHistory,
                OldBalance: balance,
                remainingBalance: balance, // Original balance preserved
                paymentHistory: paymentHistory || {}
            };

            if (currentGrade === "12") {
                // Handle graduating students - keep original balance
                updates[`Alumni/${prevSYKey}/${studentId}`] = {
                    ...studentDataWithoutHistory,
                    OldBalance: balance,
                    remainingBalance: 0, // Now carries original balance
                    isAlumni: true
                };
                updates[`Students/CurrentSchoolYear/${studentId}`] = null;
            } else {
                let newGrade;
                switch (currentGrade) {
                    case "Nursery": newGrade = "Kinder 1"; break;
                    case "Kinder 1": newGrade = "Kinder 2"; break;
                    case "Kinder 2": newGrade = "1"; break;
                    default:
                        newGrade = /^\d+$/.test(currentGrade)
                            ? (parseInt(currentGrade) < 12 ? `${parseInt(currentGrade) + 1}` : currentGrade)
                            : currentGrade;
                }

                updates[`Students/CurrentSchoolYear/${studentId}/Grade`] = newGrade;
                // Promote non-graduating students
                updates[`Students/CurrentSchoolYear/${studentId}/OldBalance`] = balance;
                updates[`Students/CurrentSchoolYear/${studentId}/remainingBalance`] = 0;
                updates[`Students/CurrentSchoolYear/${studentId}/selectedPlan`] = "";
                updates[`Students/CurrentSchoolYear/${studentId}/selectedFees`] = [];
                updates[`Students/CurrentSchoolYear/${studentId}/feeBalances`] = {};
                updates[`Students/CurrentSchoolYear/${studentId}/paymentHistory`] = null;
                updates[`Students/CurrentSchoolYear/${studentId}/selectedActivities`] = [];
                updates[`Students/CurrentSchoolYear/${studentId}/activitiesBalances`] = {};
                updates[`Students/CurrentSchoolYear/${studentId}/selectedDiscount`] = "";
                updates[`Students/CurrentSchoolYear/${studentId}/paidMonthlyAmount`] = 0;
                updates[`Students/CurrentSchoolYear/${studentId}/totalFeesPrice`] = 0;
                updates[`Students/CurrentSchoolYear/${studentId}/totalActivityPrice`] = 0;

                updates[`Students/CurrentSchoolYear/${studentId}/Status`] = "OLD STUDENT";
            }
        });

        const dropoutsSnapshot = await get(ref(db, 'Dropouts'));
        if (dropoutsSnapshot.exists()) {
            dropoutsSnapshot.forEach((dropoutSnap) => {
                const dropoutId = dropoutSnap.key;
                updates[`SchoolYear/${prevSYKey}/Dropouts/${dropoutId}`] = dropoutSnap.val();
            });
            updates['Dropouts'] = {}; // Clear root Dropouts
        }

        updates["CurrentSY/startSY"] = newStart;
        updates["CurrentSY/endSY"] = newEnd;
        updates[`SchoolYear/${prevSYKey}/holder`] = "";

        // Process NextSchoolYear students
        const nextSchoolYearRef = ref(db, 'Students/NextSchoolYear');
        const nextSchoolYearSnapshot = await get(nextSchoolYearRef);
        if (nextSchoolYearSnapshot.exists()) {
            nextSchoolYearSnapshot.forEach((studentSnap) => {
                const studentId = studentSnap.key;
                if (studentId === 'holder') return;

                const studentData = studentSnap.val();
                const status = (studentData.Status || '').toUpperCase().trim();

                if (status === 'NEW STUDENT') {
                    // Move to CurrentSchoolYear
                    updates[`Students/CurrentSchoolYear/${studentId}`] = studentData;
                    // Remove from NextSchoolYear
                    updates[`Students/NextSchoolYear/${studentId}`] = null;
                } else if (status === 'OLD STUDENT') {
                    // Remove from NextSchoolYear
                    updates[`Students/NextSchoolYear/${studentId}`] = null;
                }
            });
        }

        await update(ref(db), updates);

        loadStudents();
        Swal.fire(
            'Success!',
            `School Year ${prevSYKey} archived. All student records reset for SY ${newStart}-${newEnd}.`,
            'success'
        );

    } catch (error) {
        console.error("Error:", error);
        Swal.fire('Error', 'Operation failed. Check console.', 'error');
    }
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

document.addEventListener("DOMContentLoaded", () => {
    fetchAndDisplaySchoolYear();
});