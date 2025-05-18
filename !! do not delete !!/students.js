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
const studentsRef = ref(db, "Students");
const dropoutsRef = ref(db, "Dropouts");
const AlumniRef = ref(db, "Alumni");
// const repeatersRef = ref(db, "Repeaters");

document.getElementById("gradeLevelFilter").addEventListener("change", (event) => {
    const selectedGrade = event.target.value;
    loadStudents(selectedGrade);
    loadDropouts(selectedGrade);
    // loadRepeaters(selectedGrade);
});

document.getElementById("studentsBtn").addEventListener("click", () => {
    document.getElementById("studentTableContainer").style.display = "block";
    document.getElementById("dropoutTableContainer").style.display = "none";
    document.getElementById("repeaterTableContainer").style.display = "none";

    document.getElementById("studentsBtn").classList.add("active");
    document.getElementById("dropoutsBtn").classList.remove("active");
    // document.getElementById("repeatersBtn").classList.remove("active");

    document.getElementById("studentCount").parentElement.style.display = "block";
    document.getElementById("dropoutCount").parentElement.style.display = "none";
    document.getElementById("repeaterCount").parentElement.style.display = "none";

    loadStudents();
});

document.getElementById("dropoutsBtn").addEventListener("click", () => {
    document.getElementById("studentTableContainer").style.display = "none";
    document.getElementById("dropoutTableContainer").style.display = "block";
    document.getElementById("repeaterTableContainer").style.display = "none";

    document.getElementById("dropoutsBtn").classList.add("active");
    document.getElementById("studentsBtn").classList.remove("active");
    // document.getElementById("repeatersBtn").classList.remove("active");

    document.getElementById("studentCount").parentElement.style.display = "none";
    document.getElementById("dropoutCount").parentElement.style.display = "block";
    //document.getElementById("repeaterCount").parentElement.style.display = "none";

    loadDropouts();
});

// document.getElementById("repeatersBtn").addEventListener("click", () => {
//     document.getElementById("studentTableContainer").style.display = "none";
//     document.getElementById("dropoutTableContainer").style.display = "none";
//     document.getElementById("repeaterTableContainer").style.display = "block";

//     document.getElementById("repeatersBtn").classList.add("active");
//     document.getElementById("dropoutsBtn").classList.remove("active");
//     document.getElementById("studentsBtn").classList.remove("active");

//     document.getElementById("studentCount").parentElement.style.display = "none";
//     document.getElementById("dropoutCount").parentElement.style.display = "none";
//     document.getElementById("repeaterCount").parentElement.style.display = "block";

//     loadRepeaters();
// });

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
    },
    // repeater: {
    //     data: [],
    //     currentPage: 1,
    //     pageSize: 10,
    //     sortColumn: null,
    //     sortOrder: 'asc',
    //     currentTable: 'repeaters'
    // }
};

async function loadStudents() {
    const selectedGrade = document.getElementById("gradeLevelFilter").value;
    const studentCountElement = document.getElementById("studentCount");

    get(studentsRef).then((snapshot) => {
        tableConfig.student.data = [];
        let studentCount = 0;

        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const studentId = childSnapshot.key;
                const student = childSnapshot.val();
                if (studentId === "holder") return;

                let gradeLvl = student.Grade ? String(student.Grade).trim() : "None";
                if (selectedGrade !== "all" && gradeLvl !== selectedGrade) return;

                studentCount++;

                const studentDetails = {
                    studentId: studentId,
                    name: student.Name,
                    grade: ["Nursery", "Kinder 1", "Kinder 2"].includes(student.Grade) ? "Pre-Elem" : student.Grade,
                    balance: parseFloat(student.remainingBalance) || 0,
                    rowHtml: generateStudentRowHtml(student, studentId)
                };

                tableConfig.student.data.push(studentDetails);
            });

            studentCountElement.textContent = studentCount;
            renderTable('student');
        }
    });
}


window.handleDrop = async function (studentId) {
    const studentRef = ref(db, `Students/${studentId}`);

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
            focusCancel: true
        }).then(async (result) => {
            if (result.isConfirmed) {
                await set(ref(db, `Dropouts/${studentId}`), studentData);

                await remove(studentRef);

                Swal.fire("Student Dropped", `${studentData.Name} has been moved to Dropouts.`, "success");
                loadStudents();
            }
        });

    } catch (error) {
        console.error("Error dropping student:", error);
        Swal.fire("Error", "Failed to drop student. Please try again.", "error");
    }
};

window.RemoveStudent = async function (studentId) {
    const studentRef = ref(db, `Students/${studentId}`);

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
            title: 'Confirm Permanent Removal',
            html: `You are about to permanently remove <strong>${studentData.Name}</strong>(<strong>${studentId}</strong>) from the system.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, Delete',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
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
        <td>${student.Grade || "None"}</td>
        <td>₱${parseFloat(remainingBalance).toLocaleString()}</td>
        <td class="action" onclick="toggleDropdown(this)">
            <span>⋮</span>
            <div class="dropdown">
                <a href="#" onclick="openStudentDetailsModal('${encodedDetails}')">👁 View Details</a>
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
            // case 'repeater':
            //     message = 'repeaters';
            //     break;
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

function getSortValue(student, columnIndex) {
    switch (columnIndex) {
        case 0: return student.name.toLowerCase();
        case 1: return student.studentId;
        case 2: return student.grade;
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

window.openStudentDetailsModal = async function (encodedDetails) {
    const details = JSON.parse(decodeURIComponent(encodedDetails));
    const modal = document.getElementById("studentDetailsModal");
    const detailsDiv = document.getElementById("studentDetails");

    const plansRef = ref(db, `plans/${details.selectedPlan}`);
    const planSnapshot = await get(plansRef);
    const planName = planSnapshot.exists() ? planSnapshot.val().name : "No plans applied";

    detailsDiv.innerHTML = `
        <p><strong>Name:</strong> ${details.name}</p>
        <p><strong>Grade:</strong> ${details.grade}</p>
        <p><strong>Remaining Balance:</strong> ${details.remainingBalance === "No balance"
            ? "No balance"
            : `₱${parseFloat(details.remainingBalance).toLocaleString()}`}</p>
        <p><strong>Paid Monthly Amount:</strong> ₱${parseFloat(details.paidMonthlyAmount).toLocaleString()}</p>
        <p><strong>Selected Plan:</strong> ${planName}</p>
        <p><strong>Selected Discount:</strong> ${details.selectedDiscount}</p>
    `;

    modal.style.display = "block";
};

document.querySelector(".close").addEventListener("click", function () {
    document.getElementById("studentDetailsModal").style.display = "none";
});

window.onclick = function (event) {
    const modal = document.getElementById("studentDetailsModal");
    if (event.target === modal) {
        modal.style.display = "none";
    }
};

// window.handleRepeater = async function (studentId) {
//     const studentRef = ref(db, `Students/${studentId}`);

//     try {
//         const snapshot = await get(studentRef);
//         if (!snapshot.exists()) {
//             Swal.fire("Error", "Student not found.", "error");
//             return;
//         }

//         const studentData = snapshot.val();

//         Swal.fire({
//             title: 'Are you sure?',
//             html: `You are about to move <strong>${studentData.Name}</strong> to Repeaters.`,
//             icon: 'warning',
//             showCancelButton: true,
//             confirmButtonText: 'Yes',
//             cancelButtonText: 'No',
//         }).then(async (result) => {
//             if (result.isConfirmed) {
//                 const repeaterRef = ref(db, `Repeaters/${studentId}`);
//                 await set(repeaterRef, studentData);
//                 await remove(studentRef);

//                 Swal.fire(
//                     'Moved!',
//                     `${studentData.Name} has been moved to Repeaters.`,
//                     'success'
//                 );
//                 loadStudents();
//                 loadRepeaters();
//             }
//         });

//     } catch (error) {
//         console.error("Error moving student to repeaters:", error);
//         Swal.fire("Error", "Failed to move student. Please try again.", "error");
//     }
// };

async function loadDropouts() {
    const selectedGrade = document.getElementById("gradeLevelFilter").value;
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
                if (selectedGrade !== "all" && gradeLvl !== selectedGrade) return;

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
            showDenyButton: true,
            confirmButtonText: 'Yes',
            denyButtonText: 'No',
            allowOutsideClick: false,
            customClass: {
                denyButton: 'swal-deny-button'
            }
        });
        return;
    }

    const result = await Swal.fire({
        title: 'Confirm Permanent Removal',
        html: `You are about to permanently remove <strong>${studentData.Name}</strong> from the system.`,
        icon: 'warning',
        showDenyButton: true,
        confirmButtonText: 'Yes',
        denyButtonText: 'No',
        confirmButtonColor: '#d33',
        denyButtonColor: '#3085d6',
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

// async function loadRepeaters() {
//     const selectedGrade = document.getElementById("gradeLevelFilter").value;
//     const repeaterCountElement = document.getElementById("repeaterCount");

//     get(repeatersRef).then((snapshot) => {
//         tableConfig.repeater.data = [];
//         let studentCount = 0;

//         if (snapshot.exists()) {
//             snapshot.forEach((childSnapshot) => {
//                 const repeaterId = childSnapshot.key;
//                 const repeater = childSnapshot.val();
//                 if (repeaterId === "holder") return;

//                 let gradeLvl = repeater.Grade ? String(repeater.Grade).trim() : "None";
//                 if (selectedGrade !== "all" && gradeLvl !== selectedGrade) return;

//                 studentCount++;

//                 const repeaterDetails = {
//                     studentId: repeaterId,
//                     name: repeater.Name,
//                     grade: ["Nursery", "Kinder 1", "Kinder 2"].includes(repeater.Grade) ? "Pre-Elem" : repeater.Grade,
//                     balance: parseFloat(repeater.remainingBalance) || 0,
//                     rowHtml: generateRepeaterRowHtml(repeater, repeaterId)
//                 };
//                 tableConfig.repeater.data.push(repeaterDetails);
//             });

//             repeaterCountElement.textContent = studentCount;
//             renderTable('repeater');
//         }
//     });
// }

/*window.handleMoveToDropouts = async function (studentId) {
    const repeaterRef = ref(db, `Repeaters/${studentId}`);
    const studentData = await get(repeaterRef).then(snapshot => snapshot.val());

    Swal.fire({
        title: 'Confirm Move',
        text: `Move ${studentData.Name} to dropouts?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes'
    }).then(async (result) => {
        if (result.isConfirmed) {
            const dropoutsRef = ref(db, `Dropouts/${studentId}`);
            await set(dropoutsRef, studentData);
            await remove(repeaterRef);
            Swal.fire('Moved!', `${studentData.Name} has been moved to Dropouts.`, 'success');
            loadRepeaters();
        }
    });
};*/

window.handleReenrollDropout = async function (studentId) {
    const dropoutRef = ref(db, `Dropouts/${studentId}`);
    const studentData = await get(dropoutRef).then(snapshot => snapshot.val());

    if (parseFloat(studentData.remainingBalance) > 0) {
        Swal.fire('Cannot Re-enroll', `${studentData.Name} has an outstanding balance and cannot be re-enrolled.`, 'error');
        return;
    }

    const result = await Swal.fire({
        title: 'Confirm Re-enrollment',
        text: `Re-enroll ${studentData.Name} with zero balance?`,
        icon: 'question',
        showDenyButton: true,
        showCancelButton: false, // Disable default cancel button
        confirmButtonText: 'Yes',
        denyButtonText: 'No',
        confirmButtonColor: '#3085d6',
        denyButtonColor: '#d33',
    });

    if (result.isConfirmed) {
        const studentsRef = ref(db, `Students/${studentId}`);
        await set(studentsRef, studentData);
        await remove(dropoutRef);
        Swal.fire('Re-enrolled!', `${studentData.Name} has been re-enrolled.`, 'success');
        loadDropouts();
        loadStudents();
    }
};

// window.handleReenroll = async function (studentId) {
//     const repeaterRef = ref(db, `Repeaters/${studentId}`);
//     const studentData = await get(repeaterRef).then(snapshot => snapshot.val());

//     if (parseFloat(studentData.remainingBalance) > 0) {
//         Swal.fire('Cannot Re-enroll', `${studentData.Name} has an outstanding balance and cannot be re-enrolled.`, 'error');
//         return;
//     }

//     Swal.fire({
//         title: 'Confirm Re-enrollment',
//         text: `Re-enroll ${studentData.Name} with zero balance?`,
//         icon: 'question',
//         showCancelButton: true,
//         confirmButtonColor: '#3085d6',
//         cancelButtonColor: '#d33',
//         confirmButtonText: 'Yes, re-enroll!'
//     }).then(async (result) => {
//         if (result.isConfirmed) {
//             const studentsRef = ref(db, `Students/${studentId}`);
//             await set(studentsRef, studentData);
//             await remove(repeaterRef);
//             Swal.fire('Re-enrolled!', `${studentData.Name} has been re-enrolled.`, 'success');
//             loadRepeaters();
//         }
//     });
// };

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
                <a href="#" onclick="openStudentDetailsModal('${encodedDetails}')">👁 View Details</a>
                <a href="#" onclick="removeDropout('${dropoutId}')">🗑 Remove</a>
            </div>
        </td>
    `;
}

// function generateRepeaterRowHtml(repeater, repeaterId) {
//     const remainingBalance = repeater.remainingBalance || "0";
//     const repeaterDetails = {
//         studentId: repeaterId,
//         name: repeater.Name,
//         grade: ["Nursery", "Kinder 1", "Kinder 2"].includes(repeater.Grade) ? "Pre-Elem" : repeater.Grade,
//         remainingBalance: repeater.remainingBalance || "No balance",
//         selectedPlan: repeater.selectedPlan,
//         paidMonthlyAmount: repeater.paidMonthlyAmount || 0,
//         selectedDiscount: repeater.selectedDiscountText || "No discount applied",
//         type:'repeater'
//     };
//     const encodedDetails = encodeURIComponent(JSON.stringify(repeaterDetails));

//     return `
//         <td class="clickable-cell" data-student='${encodedDetails}'>${repeater.Name || "None"}</td>
//         <td>${repeaterId}</td>
//         <td>${repeater.Grade || "None"}</td>
//         <td>₱${parseFloat(remainingBalance).toLocaleString()}</td>
//         <td class="action" onclick="toggleDropdown(this)">
//             <span>⋮</span>
//             <div class="dropdown">
//                 <a href="#" onclick="openStudentDetailsModal('${encodedDetails}')">👁 View Details</a>
//                 <a href="#" onclick="handleMoveToDropouts('${repeaterId}')">➜ Move to Dropouts</a>
//                 <a href="#" onclick="handleReenroll('${repeaterId}')">Ⓡ Re-enroll</a>
//             </div>
//         </td>
//     `;
// }

async function processExcel(file) {
    const reader = new FileReader();

    reader.onload = async function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (rows.length < 2) {
            Swal.fire("Error", "Excel file is empty or missing data.", "error");
            return;
        }

        let studentData = [];
        for (let i = 1; i < rows.length; i++) {
            let [Name, Grade] = rows[i];
            if (Name && Grade) {
                Grade = String(Grade).trim();
                studentData.push({ Name, Grade });
            }
        }

        Swal.fire({
            title: 'Uploading⏳',
            html: 'Processing Excel file. This may take a moment.<br><small>Please keep this window open.</small>',
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Yes, add students!"
        }).then(async (result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    title: 'Uploading Students',
                    html: 'Processing Excel file and updating records...',
                    allowOutsideClick: false,
                    showConfirmButton: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                try {
                    const studentsSnapshot = await get(studentsRef);
                    const dropoutsSnapshot = await get(dropoutsRef);

                    let existingStudents = {};

                    function processSnapshot(snapshot, category) {
                        if (snapshot.exists()) {
                            snapshot.forEach(childSnapshot => {
                                const studentID = childSnapshot.key;
                                const student = childSnapshot.val();
                                let studentKey = `${student.Name}-${student.Grade}`;
                                existingStudents[studentKey] = { studentID, category };
                            });
                        }
                    }

                    processSnapshot(studentsSnapshot, "Students");
                    processSnapshot(dropoutsSnapshot, "Dropouts");

                    for (let student of studentData) {
                        let { Name, Grade } = student;
                        let studentKey = `${Name}-${Grade}`;

                        if (existingStudents.hasOwnProperty(studentKey)) {
                            let { studentID, category } = existingStudents[studentKey];
                            const studentRef = ref(db, `${category}/${studentID}`);

                            /*if (category !== "Repeaters") {
                                await update(studentRef, {
                                    Name,
                                    Grade,
                                    Discount: ""
                                });
                            }*/
                        } else {
                            const feesSnapshot = await get(ref(db, 'fees'));
                            const feesData = feesSnapshot.val() || {};
                            const allFeeIds = [];
                            if (feesSnapshot.exists()) {
                                Object.keys(feesSnapshot.val()).forEach(key => allFeeIds.push(key));
                            }

                            const feeBalances = {};
                            allFeeIds.forEach(feeId => {
                                if (feesData[feeId]) {
                                    feeBalances[feeId] = {
                                        name: feesData[feeId].name,
                                        amount: feesData[feeId].amount,
                                        remaining: feesData[feeId].amount
                                    };
                                }
                            });

                            let studentID = await generateStudentID();
                            const studentRef = ref(db, `Students/${studentID}`);

                            await set(studentRef, {
                                Name,
                                Grade,
                                Discount: "",
                                selectedFees: allFeeIds,
                                OldBalance: 0, // Add this
                                remainingBalance: 0,
                                paidMonthlyAmount: 0,
                                feeBalances,
                                totalFeesPrice: calculateTotalFees(feesData, allFeeIds)

                            });
                        }
                    }

                    Swal.close();
                    Swal.fire("Success", "Students updated successfully!", "success");
                    loadStudents();
                } catch (error) {
                    Swal.close();
                    console.error("Error processing Excel file:", error);
                    Swal.fire("Error", "Failed to process Excel file. Please try again.", "error");
                }
            }
        });
    };

    reader.readAsArrayBuffer(file);
}

function calculateTotalFees(feesData, feeIds) {
    return feeIds.reduce((total, feeId) => {
        return total + (parseFloat(feesData[feeId]?.amount) || 0);
    }, 0);
}

async function generateStudentID() {
    // Fetch CurrentSY to get startSY
    const currentSYRef = ref(db, 'CurrentSY');
    const currentSYSnapshot = await get(currentSYRef);
    if (!currentSYSnapshot.exists()) {
        throw new Error('Current school year not found.');
    }
    const { startSY } = currentSYSnapshot.val();
    const year = startSY.toString(); // Ensure year is a string

    let highestNumber = 1000;  // Starting point for student IDs

    const studentsSnapshot = await get(studentsRef);
    const dropoutsSnapshot = await get(dropoutsRef);
    const alumniSnapshot = await get(AlumniRef);
    // const repeatersSnapshot = await get(repeatersRef);

    function processSnapshot(snapshot) {
        if (snapshot.exists()) {
            snapshot.forEach(childSnapshot => {
                const studentID = childSnapshot.key;
                // Check if the studentID starts with the current startSY
                if (studentID.startsWith(year)) {
                    const idNum = parseInt(studentID.slice(year.length), 10); // Dynamic slicing
                    if (idNum > highestNumber) {
                        highestNumber = idNum;
                    }
                }
            });
        }
    }

    processSnapshot(studentsSnapshot);
    processSnapshot(dropoutsSnapshot);
    processSnapshot(alumniSnapshot);
    // processSnapshot(repeatersSnapshot);

    highestNumber++;  // Increment to ensure uniqueness
    return `${year}${highestNumber}`;  // Construct new unique student ID
}

document.getElementById("addStudentBtn").addEventListener("click", addStudent);

async function addStudent() {
    Swal.fire({
        title: '<h2 style="font-family: Arial, sans-serif; font-weight: bold;">Add Student</h2>',
        html: `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; flex-wrap: wrap; text-align: left; width: 100%;">
                    
                    <!-- Left Side: Manual Student Entry -->
                    <div style="flex: 1; min-width: 320px; max-width: 400px; padding-right: 20px;">
                        <h3 style="font-size: 18px; font-weight: bold; margin-bottom: 10px; text-align: center;">Single Student Registration</h3>
                        
                        <label for="studentName" style="font-weight: bold;">Student Name:</label>
                        <input type="text" id="studentName" class="swal2-input" placeholder="Enter student name">

                        <label for="grade" style="font-weight: bold;">Grade:</label>
                        <select id="grade" class="swal2-select">
                            <option value="">Select Grade</option>
                            <option value="Nursery">Nursery</option>
                            <option value="Kinder 1">Kinder 1</option>
                            <option value="Kinder 2">Kinder 2</option>
                            <option value="1">Grade 1</option>
                            <option value="2">Grade 2</option>
                            <option value="3">Grade 3</option>
                            <option value="4">Grade 4</option>
                            <option value="5">Grade 5</option>
                            <option value="6">Grade 6</option>
                            <option value="7">Grade 7</option>
                            <option value="8">Grade 8</option>
                            <option value="9">Grade 9</option>
                            <option value="10">Grade 10</option>
                            <option value="11">Grade 11</option>
                            <option value="12">Grade 12</option>
                        </select>
                    </div>

                    <!-- Vertical Line Divider -->
                    <div style="width: 2px; background-color: #ccc; height: auto; align-self: stretch;"></div>

                    <!-- Right Side: File Upload -->
    <div style="flex: 1; min-width: 320px; max-width: 400px; padding-left: 20px;">
        <h3 style="font-size: 20px; font-weight: bold; margin-bottom: 10px; text-align: center;">Upload Student List</h3>
        
        <div style="font-size: 14px; margin-bottom: 10px; background: #f8f9fa; padding: 10px; border-radius: 5px;">
            <strong>Quick Guide:</strong>
            <div style="margin-top: 5px;">
                🢂 Column A: Full Name <br>
                🢂 Column B: Grade Level <br>
            </div>
        </div>

        <label for="fileInput" style="font-weight: bold;">Choose File:</label>
        <input type="file" id="fileInput" accept=".xls,.xlsx" class="swal2-file" style="display: block; margin-top: 5px; width: 100%;">
        <div class="file-name" style="margin-top: 10px; font-size: 14px; color: #555; text-align: center;">No file selected</div>
    </div>
            `,
        showCancelButton: true,
        confirmButtonText: 'Submit',
        cancelButtonText: 'Cancel',
        width: '900px',
        customClass: {
            popup: 'custom-swal-popup'
        },
        didOpen: () => {
            document.getElementById("fileInput").addEventListener("change", function () {
                let fileName = this.files.length ? this.files[0].name : 'No file selected';
                document.querySelector('.file-name').innerText = fileName;
            });
        },
        preConfirm: async () => {
            let studentName = document.getElementById("studentName").value.trim();
            let grade = document.getElementById("grade").value.trim();
            let fileInput = document.getElementById("fileInput");

            if (fileInput.files.length > 0) {
                return processExcel(fileInput.files[0]);
            }

            if (!studentName || !grade) {
                Swal.showValidationMessage('Please fill in all fields or upload an Excel file.');
                return false;
            }

            return saveStudent(studentName, grade);
        }
    });
}

async function saveStudent(name, grade) {
    try {
        let studentID = await generateStudentID();

        Swal.fire({
            title: "Are you sure?",
            text: `Do you want to add student ${name} with ID: ${studentID}?`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Yes, add student!"
        }).then(async (result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    title: 'Adding Student',
                    text: 'Please wait...',
                    allowOutsideClick: false,
                    showConfirmButton: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                try {
                    const feesSnapshot = await get(ref(db, 'fees'));
                    const feesData = feesSnapshot.val() || {};
                    const allFeeIds = [];
                    if (feesSnapshot.exists()) {
                        Object.keys(feesSnapshot.val()).forEach(key => allFeeIds.push(key));
                    }

                    const feeBalances = {};
                    allFeeIds.forEach(feeId => {
                        if (feesData[feeId]) {
                            feeBalances[feeId] = {
                                name: feesData[feeId].name,
                                amount: feesData[feeId].amount,
                                remaining: feesData[feeId].amount
                            };
                        }
                    });

                    const studentRef = ref(db, `Students/${studentID}`);
                    await set(studentRef, {
                        Name: name,
                        Grade: grade,
                        Discount: "",
                        selectedFees: allFeeIds, // Initialize with all fees
                        OldBalance: 0, // Add this
                        remainingBalance: 0,
                        paidMonthlyAmount: 0,
                        feeBalances, // Add this line
                        totalFeesPrice: calculateTotalFees(feesData, allFeeIds)
                    });

                    Swal.close();
                    Swal.fire("Success", `Student ${studentID} added!`, "success");
                    loadStudents();
                } catch (error) {
                    Swal.close();
                    Swal.fire("Error", "Failed to add student. Try again.", "error");
                    console.error(error);
                }
            }
        });
    } catch (error) {
        Swal.fire("Error", "Failed to add student. Try again.", "error");
        console.error(error);
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

    get(studentsRef).then((snapshot) => {
        if (snapshot.exists()) {
            let studentCount = 0;

            snapshot.forEach((childSnapshot) => {
                if (childSnapshot.key !== "holder") {
                    studentCount++; // Count only valid student records
                }
            });

            studentCountElement.textContent = studentCount;
        } else {
            studentCountElement.textContent = "0"; // If no students exist
        }
    }).catch((error) => {
        console.error("Error fetching student count:", error);
        studentCountElement.textContent = "Error"; // Display error if retrieval fails
    });
}

loadStudents();  // Load the students

setTimeout(updateStudentCount, 1000);

function searchStudents() {
    let input = document.getElementById("searchInput").value.toLowerCase().trim();

    searchTable("studentTable", "studentTableBody", input);
    searchTable("dropoutTable", "dropoutTableBody", input);
    searchTable("repeaterTable", "repeaterTableBody", input);
}

let searchTimeout;

document.getElementById("searchInput").addEventListener("input", (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        const input = e.target.value.toLowerCase().trim();
        if (input === "") {
            renderTable('student');
            renderTable('dropout');
            //renderTable('repeater');
        } else {
            searchStudents();
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
        cancelButtonText: 'No'
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
        const newStart = prevStart + 1;
        const newEnd = prevEnd + 1;
        const prevSYKey = `${prevStart}-${prevEnd}`;

        const studentsSnapshot = await get(ref(db, "Students"));
        if (!studentsSnapshot.exists()) {
            Swal.fire('Error', 'No students found.', 'error');
            return;
        }

        const updates = {};

        studentsSnapshot.forEach((studentSnap) => {
            const studentId = studentSnap.key;
            if (studentId === "holder") return;

            const studentData = studentSnap.val();
            const currentGrade = studentData.Grade.trim();
            const balance = parseFloat(studentData.remainingBalance || 0);

            const paymentHistory = studentData.paymentHistory || {};
            const { paymentHistory: _, OldBalances, BalanceinSY, ...studentDataWithoutHistory } = studentData;

            const archivePath = `SchoolYear/${prevSYKey}/${balance === 0 ? "Paid" : "Balance"}/${studentId}`;
            updates[archivePath] = {
                ...studentDataWithoutHistory,
                OldBalance: balance,
                paymentHistory // Include payment history in archive
            };

            if (currentGrade === "12") {
                updates[`Alumni/${studentId}`] = studentData;
                updates[`Students/${studentId}`] = null;
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

                updates[`Students/${studentId}/Grade`] = newGrade;
                updates[`Students/${studentId}/OldBalance`] = balance;
                updates[`Students/${studentId}/remainingBalance`] = 0;
                updates[`Students/${studentId}/selectedPlan`] = "";
                updates[`Students/${studentId}/selectedFees`] = [];
                updates[`Students/${studentId}/feeBalances`] = {};
                updates[`Students/${studentId}/paymentHistory`] = null;
                updates[`Students/${studentId}/selectedActivities`] = [];
                updates[`Students/${studentId}/activitiesBalances`] = {};
                updates[`Students/${studentId}/selectedDiscount`] = "";
                updates[`Students/${studentId}/paidMonthlyAmount`] = 0;
                updates[`Students/${studentId}/totalFeesPrice`] = 0;
                updates[`Students/${studentId}/totalActivityPrice`] = 0;
            }
        });

        updates["CurrentSY/startSY"] = newStart;
        updates["CurrentSY/endSY"] = newEnd;
        updates[`SchoolYear/${prevSYKey}/holder`] = "";

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