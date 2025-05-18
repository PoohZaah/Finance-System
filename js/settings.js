import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getDatabase, get, ref, set, push, onValue, remove, update } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-database.js";
import { getAuth, createUserWithEmailAndPassword, reauthenticateWithCredential, updatePassword, EmailAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";

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
const auth = getAuth();

document.addEventListener("DOMContentLoaded", function () {

    document.getElementById("staffTableBody").addEventListener("click", async (event) => {
        if (event.target.classList.contains("change-password-btn")) {
            const staffKey = event.target.dataset.key;
            const currentUser = auth.currentUser;
            const isAdmin = currentUser && currentUser.uid !== staffKey;

            const { value: formValues } = await Swal.fire({
                title: 'Change Password',
                html: `
                    <div class="password-form">
                        ${!isAdmin ? `
                        <div class="input-container">
                            <input type="password" id="currentPassword" 
                                   class="swal2-input mja-input"
                                   placeholder="Current Password" required>
                        </div>` : ''}
                        <div class="input-container">
                            <input type="password" id="newPassword" 
                                   class="swal2-input mja-input"
                                   placeholder="New Password (min 6 characters)" required>
                        </div>
                        <div class="input-container">
                            <input type="password" id="confirmPassword" 
                                   class="swal2-input mja-input"
                                   placeholder="Confirm Password" required>
                        </div>
                    </div>
                `,
                focusConfirm: false,
                showCancelButton: true,
                confirmButtonText: 'Continue',
                confirmButtonColor: '#00bf63',
                cancelButtonColor: '#d33',
                preConfirm: () => {
                    const newPassword = document.getElementById('newPassword').value;
                    const confirmPassword = document.getElementById('confirmPassword').value;
                    const currentPassword = !isAdmin ? document.getElementById('currentPassword').value : null;

                    if (newPassword !== confirmPassword) {
                        Swal.showValidationMessage('Passwords do not match');
                        return false;
                    }
                    if (newPassword.length < 6) {
                        Swal.showValidationMessage('Password must be at least 6 characters');
                        return false;
                    }

                    return { newPassword, currentPassword };
                }   
            });

            if (formValues) {
                // Add confirmation dialog
                Swal.fire({
                    title: 'Confirm Password Change?',
                    text: "You are about to update this account's password",
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#00bf63',
                    cancelButtonColor: '#d33',
                    confirmButtonText: 'Yes, change it!'
                }).then(async (result) => {
                    if (result.isConfirmed) {
                        try {
                            if (isAdmin) {
                                // Admin password update
                                await update(ref(db, `staff/${staffKey}`), {
                                    password: formValues.newPassword
                                });
                            } else {
                                // Self password change
                                const user = auth.currentUser;
                                const credential = EmailAuthProvider.credential(
                                    user.email,
                                    formValues.currentPassword
                                );
                                await reauthenticateWithCredential(user, credential);
                                await updatePassword(user, formValues.newPassword);
                                await update(ref(db, `staff/${staffKey}`), {
                                    password: formValues.newPassword
                                });
                            }

                            Swal.fire({
                                icon: 'success',
                                title: 'Password Updated!',
                                text: 'Password has been changed successfully',
                                confirmButtonColor: '#00bf63'
                            });
                        } catch (error) {
                            Swal.fire({
                                icon: 'error',
                                title: 'Update Failed',
                                text: handlePasswordError(error),
                                confirmButtonColor: '#d33'
                            });
                        }
                    }
                });
            }
        }
    });

    function handlePasswordError(error) {
        const errorMap = {
            'auth/wrong-password': 'Incorrect current password',
            'auth/requires-recent-login': 'Session expired. Please re-login to change password',
            'auth/weak-password': 'Password must be at least 6 characters'
        };
        return errorMap[error.code] || error.message;
    }

    document.getElementById("staffTableBody").addEventListener("click", (event) => {
        if (event.target.classList.contains("view-password-btn")) {
            const password = event.target.dataset.password || 'No password set';

            Swal.fire({
                title: 'Staff Password',
                html: `<strong>Password:</strong> ${password}`,
                icon: 'info',
                confirmButtonText: 'Close',
                customClass: {
                    popup: 'password-popup'
                }
            });
        }
    });

    document.getElementById("header-toggle").addEventListener("click", function () {
        document.getElementById("nav-bar").classList.toggle("active");
    });

    document.getElementById("openPlanModal").addEventListener("click", function () {
        document.getElementById("planModal").style.display = "flex";
    });

    document.getElementById("editTuitionBtn").addEventListener("click", function () {
    });

    document.getElementById("activitiesTableBody").addEventListener("click", function (event) {
        if (event.target.classList.contains("deleteActivity")) {
            const activityKey = event.target.getAttribute("data-key");
            Swal.fire({
                title: "Are you sure?",
                text: "Do you want to delete this activity?",
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#d33",
                cancelButtonColor: "#3085d6",
                confirmButtonText: "Yes, delete it!",
                cancelButtonText: "No"
            }).then((result) => {
                if (result.isConfirmed) {
                    remove(ref(db, "activities/" + activityKey))
                        .then(() => {
                            Swal.fire({
                                icon: "success",
                                title: "Deleted!",
                                text: "Activity removed successfully!",
                                confirmButtonColor: "#3085d6",
                                confirmButtonText: "OK"
                            });
                        })
                        .catch((error) => {
                            Swal.fire({
                                icon: "error",
                                title: "Error!",
                                text: "Error removing activity: " + error.message,
                                confirmButtonColor: "#d33",
                                confirmButtonText: "OK"
                            });
                        });
                }
            });
        }
    });
});

function switchTable(tableName) {
    const tables = ["staffTable", "activitiesTable", "feesTable", "discountsTable"];
    const buttons = ["staffBtn", "activitiesBtn", "feesBtn", "discountsBtn"];

    tables.forEach(table => document.getElementById(table).style.display = "none");
    buttons.forEach(btn => document.getElementById(btn).classList.remove("active"));

    document.getElementById(tableName).style.display = "block";
    document.querySelector(`button[onclick="switchTable('${tableName}')"]`).classList.add("active");
}

document.getElementById("staffBtn").addEventListener("click", () => switchTable("staffTable"));
document.getElementById("activitiesBtn").addEventListener("click", () => switchTable("activitiesTable"));
document.getElementById("feesBtn").addEventListener("click", () => switchTable("feesTable"));
document.getElementById("discountsBtn").addEventListener("click", () => switchTable("discountsTable"));

function addData(path, data) {
    const newDataRef = push(ref(db, path));
    set(newDataRef, data);
}

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("activityModal").querySelector("button").addEventListener("click", submitActivity);
});

function submitActivity() {
    const name = document.getElementById("activityName").value.trim();
    const amount = parseFloat(document.getElementById("Amount").value.trim());

    // Fixed: Use ACTIVITY checkboxes instead of FEE checkboxes
    const selectedGrades = {
        all: document.getElementById('activityAll').checked,
        // Remove 'notRequired' line
        preElem: document.getElementById('activityPreElem').checked,
        elem: document.getElementById('activityElem').checked,
        jh: document.getElementById('activityJH').checked,
        sh: document.getElementById('activitySH').checked
    };

    if (!name || isNaN(amount) || amount < 0) {
        alert("Please enter a valid activity name and amount.");
        return;
    }

    Swal.fire({
        title: "Are you sure?",
        text: `Do you want to add the activity "${name}" with an amount of ₱${amount}?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Yes, add activity!"
    }).then((result) => {
        if (result.isConfirmed) {
            const activitiesRef = push(ref(db, "activities"));
            set(activitiesRef, {
                name,
                amount,
                grades: selectedGrades  // Use the correct variable
            }).then(() => {
                Swal.fire("Success!", "Activity added successfully!", "success");
                closeModal("activityModal");
                document.getElementById("activityName").value = "";
                document.getElementById("Amount").value = "";
            }).catch(error => {
                Swal.fire("Error!", "Error adding activity: " + error.message, "error");
            });
        }
    });
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = "none";
}

function fetchData(path, tableBodyId, renderRow) {
    const tableBody = document.getElementById(tableBodyId);
    onValue(ref(db, path), (snapshot) => {
        tableBody.innerHTML = "";
        snapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            const row = document.createElement("tr");

            row.innerHTML = renderRow(childSnapshot.key, data);
            tableBody.appendChild(row);
        });
    });
}

function checkUserPosition() {
    const position = sessionStorage.getItem("position");
    if (position === "Staff") {
        const actionButtons = [
            "openPlanModal", "editTuitionBtn",
            "openStaffModal"
        ];

        actionButtons.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.classList.add("staff-hidden");
        });

        const actionButtonSelectors = [
            ".editPlan", ".deletePlan",
            ".deleteStaff"
        ];

        actionButtonSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(btn => {
                btn.classList.add("staff-hidden");
            });
        });

        const staffBtn = document.getElementById("staffBtn");
        const staffTable = document.getElementById("staffTable");

        if (staffBtn) staffBtn.classList.add("staff-hidden");
        if (staffTable) staffTable.classList.add("staff-hidden");

        switchTable("activitiesTable");
    }
}

document.getElementById("openStaffModal").addEventListener("click", () => openModal("staffModal"));
document.getElementById("staffModal").querySelector("button").addEventListener("click", () => {
    const name = document.getElementById("staffName").value.trim();
    const email = document.getElementById("staffEmail").value.trim();
    const password = document.getElementById("staffPassword").value;
    const position = document.getElementById("staffPosition").value;

    if (!name || !email || !password || !position) {
        Swal.fire({
            icon: "warning",
            title: "Missing Fields",
            text: "Please fill all fields.",
            confirmButtonColor: "#f39c12",
            confirmButtonText: "OK"
        });
        return;
    }

    if (!validateEmail(email)) {
        Swal.fire({
            icon: "warning",
            title: "Invalid Email",
            text: "Please enter a valid email address.",
            confirmButtonColor: "#f39c12",
            confirmButtonText: "OK"
        });
        return;
    }

    if (password.length < 6) {
        Swal.fire({
            icon: "warning",
            title: "Weak Password",
            text: "Password must be at least 6 characters.",
            confirmButtonColor: "#f39c12",
            confirmButtonText: "OK"
        });
        return;
    }

    Swal.fire({
        title: "Are you sure?",
        text: `Do you want to add the staff "${name}" to the system?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Yes, add staff!"
    }).then((result) => {
        if (result.isConfirmed) {
            createUserWithEmailAndPassword(auth, email, password)
                .then((userCredential) => {
                    // Add to RTDB using Auth UID as key
                    set(ref(db, `staff/${userCredential.user.uid}`), {
                        name: name,
                        email: email,
                        position: position,
                        password: password // Only if you need to display it
                    });
                })
                .then(() => {
                    Swal.fire({
                        icon: "success",
                        title: "Success!",
                        text: "Staff account created successfully!",
                        confirmButtonColor: "#3085d6",
                        confirmButtonText: "OK"
                    }).then(() => {
                        closeModal("staffModal");
                        // Clear form fields
                        document.getElementById("staffName").value = "";
                        document.getElementById("staffEmail").value = "";
                        document.getElementById("staffPassword").value = "";
                        document.getElementById("staffPosition").value = "Staff";
                    });
                }).catch((error) => {
                    Swal.fire({
                        icon: "error",
                        title: "Error!",
                        text: error.message,
                        confirmButtonColor: "#d33",
                        confirmButtonText: "OK"
                    });
                });
        }
    });
});

function fetchStaffData() {
    const staffTableBody = document.getElementById("staffTableBody");
    const isStaff = sessionStorage.getItem("position") === "Staff";

    if (isStaff) return;

    onValue(ref(db, "staff"), (snapshot) => {
        staffTableBody.innerHTML = "";

        if (!snapshot.exists()) {
            staffTableBody.innerHTML = '<tr><td colspan="4">No staff accounts found</td></tr>';
            return;
        }

        snapshot.forEach((childSnapshot) => {
            const staff = childSnapshot.val();
            const key = childSnapshot.key;

            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${staff.name || 'N/A'}</td>
                <td>${staff.position || 'N/A'}</td>
                <td>${staff.email || 'N/A'}</td>
                <td>
                    <button class="view-password-btn" data-password="${staff.password || ''}">
                        View Password
                    </button>
                    <button class="change-password-btn" data-key="${key}" data-uid="${key}">
            Change Password
        </button>
                    <button class="deleteStaff" data-key="${key}">
                        Remove Account
                    </button>
                </td>
            `;
            staffTableBody.appendChild(row);
        });
    });
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

fetchStaffData();

document.getElementById("staffTableBody").addEventListener("click", async (event) => {
    if (event.target.classList.contains("deleteStaff")) {
        const staffKey = event.target.getAttribute("data-key");
        const staffName = event.target.closest("tr").querySelector("td:first-child").textContent;

        Swal.fire({
            title: "Are you sure?",
            text: `Do you want to permanently remove "${staffName}" from the system?`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "Yes, delete it!",
            cancelButtonText: "Cancel"
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await remove(ref(db, "staff/" + staffKey));
                    Swal.fire("Deleted!", "Staff account removed successfully.", "success");
                } catch (error) {
                    Swal.fire("Error!", error.message, "error");
                }
            }
        });
    }
});

document.getElementById("openAdditionalFeeModal").addEventListener("click", () => openModal("additionalFeeModal"));

document.getElementById("additionalFeeModal").querySelector("button").addEventListener("click", () => {
    const name = document.getElementById("feeName").value.trim();
    const amount = parseFloat(document.getElementById("feeAmount").value);

    // Get checkbox values
    const feeGrades = {
        all: document.getElementById('feeAll')?.checked || false,
        notRequired: document.getElementById('feeNotRequired')?.checked || false,
        preElem: document.getElementById('feePreElem')?.checked || false,
        elem: document.getElementById('feeElem')?.checked || false,
        jh: document.getElementById('feeJH')?.checked || false,
        sh: document.getElementById('feeSH')?.checked || false
    };

    if (name && !isNaN(amount) && amount > 0) {
        Swal.fire({
            title: "Are you sure?",
            text: `Do you want to add the additional fee "${name}" with an amount of ₱${amount}?`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Yes, add fee!"
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const feesRef = push(ref(db, 'fees'));
                    const newFeeKey = feesRef.key;
                    await set(feesRef, { name, amount, grades: feeGrades });

                    // Changed from isRequired to feeGrades.all
                    if (feeGrades.all) {
                        await updateAllStudentsWithNewFee(newFeeKey, name, amount);
                    }

                    Swal.fire({
                        icon: "success",
                        title: "Success!",
                        text: feeGrades.all // Changed here
                            ? "Additional fee added to all students!"
                            : "Fee created (not assigned to students)",
                        confirmButtonColor: "#3085d6",
                        confirmButtonText: "OK"
                    });
                    closeModal("additionalFeeModal");
                } catch (error) {
                    Swal.fire({
                        icon: "error",
                        title: "Error!",
                        text: "Failed to add fee: " + error.message,
                        confirmButtonColor: "#d33",
                        confirmButtonText: "OK"
                    });
                }
            }
        });
    } else {
        Swal.fire({
            icon: "warning",
            title: "Invalid Input",
            text: "Please provide a valid name and amount.",
            confirmButtonColor: "#f39c12",
            confirmButtonText: "OK"
        });
    }
});

async function updateAllStudentsWithNewFee(feeKey, feeName, feeAmount) {
    const studentsSnapshot = await get(ref(db, 'Students'));
    if (!studentsSnapshot.exists()) return;

    const updates = {};
    studentsSnapshot.forEach((studentSnapshot) => {
        const studentId = studentSnapshot.key;
        const studentData = studentSnapshot.val();

        const selectedFees = Array.isArray(studentData.selectedFees) ? [...studentData.selectedFees] : [];
        if (!selectedFees.includes(feeKey)) {
            selectedFees.push(feeKey);
            updates[`Students/${studentId}/selectedFees`] = selectedFees;
        }

        const feeBalances = { ...(studentData.feeBalances || {}) };
        if (!feeBalances[feeKey]) {
            feeBalances[feeKey] = {
                name: feeName,
                amount: feeAmount,
                remaining: feeAmount
            };
            updates[`Students/${studentId}/feeBalances`] = feeBalances;
        }

        const total = Object.values(feeBalances).reduce((sum, fee) => sum + fee.remaining, 0);
        updates[`Students/${studentId}/totalFeesPrice`] = total;
    });

    await update(ref(db), updates);
}


document.getElementById("openActivityModal").addEventListener("click", () => openModal("activityModal"));


fetchData("activities", "activitiesTableBody", (key, activity) => {
    return `
    <td>${activity.name}</td>
    <td>₱${activity.amount.toLocaleString()}</td>
    <td>
        <button class="editActivity" 
            data-key="${key}" 
            data-name="${activity.name}" 
            data-amount="${activity.amount}"
            data-grades='${JSON.stringify(activity.grades || {}).replace(/'/g, "\\'")}'>
            ✎ Edit
        </button>
        <button class="deleteActivity" 
            data-key="${key}">
            Remove
        </button>
    </td>
    `;
});

document.getElementById("activitiesTableBody").addEventListener("click", (event) => {
    if (event.target.classList.contains("editActivity")) {
        const activityKey = event.target.getAttribute("data-key");
        const activityName = event.target.getAttribute("data-name");
        const activityAmount = event.target.getAttribute("data-amount");
        const activityGrades = JSON.parse(event.target.getAttribute("data-grades") || '{}');

        editActivity(activityKey, activityName, activityAmount, activityGrades);
    }
});

document.getElementById("activitiesTableBody").addEventListener("click", (event) => {
    if (event.target.classList.contains("editActivity")) {
        const activityKey = event.target.getAttribute("data-key");
        const activityName = event.target.getAttribute("data-name");
        const activityAmount = event.target.getAttribute("data-amount");
        const activityGrades = event.target.getAttribute("data-grades"); // Add this

        editActivity(activityKey, activityName, activityAmount, activityGrades);
    }
});

async function updateActivity(activityKey, { newName, newAmount, grades }) {
    const activityRef = ref(db, "activities/" + activityKey);

    try {
        // Get current activity data
        const activitySnapshot = await get(activityRef);
        const oldActivity = activitySnapshot.val();
        const oldAmount = oldActivity.amount || 0;
        const amountDifference = newAmount - oldAmount;

        // Update activity details
        await update(activityRef, {
            name: newName,
            amount: newAmount,
            grades: grades
        });

        // Update student records
        const studentsSnapshot = await get(ref(db, 'Students'));
        if (!studentsSnapshot.exists()) return;

        const updates = {};
        const gradeMap = createGradeMap();

        studentsSnapshot.forEach((studentSnapshot) => {
            const studentKey = studentSnapshot.key;
            const studentData = studentSnapshot.val();
            const studentGrade = studentData.Grade;

            // Check if student should be updated based on activity grades
            if (!shouldUpdateStudent(studentGrade, grades, gradeMap)) return;

            const activitiesBalances = { ...(studentData.activitiesBalances || {}) };

            if (activitiesBalances[activityKey]) {
                const originalPaid = oldAmount - activitiesBalances[activityKey].remaining;
                const newRemaining = Math.max(newAmount - originalPaid, 0);
                const overpayment = Math.max(originalPaid - newAmount, 0);

                activitiesBalances[activityKey] = {
                    name: newName,
                    amount: newAmount,
                    remaining: newRemaining
                };

                if (overpayment > 0) {
                    updates[`Students/${studentKey}/activityOverpayments/${activityKey}`] = {
                        oldAmount: oldAmount,
                        newAmount: newAmount,
                        overpayment: overpayment,
                        date: new Date().toISOString()
                    };
                }

                const totalActivityPrice = Object.values(activitiesBalances)
                    .reduce((sum, activity) => sum + activity.remaining, 0);

                updates[`Students/${studentKey}/activitiesBalances`] = activitiesBalances;
                updates[`Students/${studentKey}/totalActivityPrice`] = totalActivityPrice;
            }
        });

        await update(ref(db), updates);
        Swal.fire("Success!", "Activity updated across applicable student records!", "success");
    } catch (error) {
        Swal.fire("Error!", "Error updating activity: " + error.message, "error");
    }
}

function editActivity(activityKey, currentName, currentAmount, currentGrades) {
    const grades = typeof currentGrades === 'string' ?
        JSON.parse(currentGrades) :
        currentGrades || {};

    Swal.fire({
        title: "Edit Activity",
        html: `
            <div style="text-align: left;">
                <div style="margin-bottom: 15px;">
                    <label for="edit-activity-name" style="display: block; font-weight: 500;">Activity Name:</label>
                    <input id="edit-activity-name" 
                           class="swal2-input" 
                           value="${currentName}"
                           style="width: 75%; padding: 8px;"
                           placeholder="Enter Activity Name">
                </div>

                <div style="margin-bottom: 15px;">
                    <label for="edit-activity-amount" style="display: block; font-weight: 500;">Amount:</label>
                    <div style="position: relative;">
                        <span style="position: absolute; left: 8px; top: 50%; transform: translateY(-50%); color: #666;">₱</span>
                        <input id="edit-activity-amount" 
                               class="swal2-input" 
                               type="number" 
                               value="${currentAmount}"
                               style="width: 75%; padding: 8px 8px 8px 25px;">
                    </div>
                </div>

                <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">
                    <div class="checkbox-group vertical" style="display: flex; flex-direction: column; gap: 8px;">
                        <div><input type="checkbox" id="edit-activity-all"> <label>All Grade Levels</label></div>
                        <div><input type="checkbox" id="edit-activity-preElem"> <label>Pre-Elementary</label></div>
                        <div><input type="checkbox" id="edit-activity-elem"> <label>Elementary</label></div>
                        <div><input type="checkbox" id="edit-activity-jh"> <label>Junior High School</label></div>
                        <div><input type="checkbox" id="edit-activity-sh"> <label>Senior High School</label></div>
                    </div>
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: "Save",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        focusConfirm: false,
        didOpen: () => {
            document.getElementById('edit-activity-all').checked = grades.all || false;
            document.getElementById('edit-activity-preElem').checked = grades.preElem || false;
            document.getElementById('edit-activity-elem').checked = grades.elem || false;
            document.getElementById('edit-activity-jh').checked = grades.jh || false;
            document.getElementById('edit-activity-sh').checked = grades.sh || false;

            setupCheckboxGroup('edit-activity-all', [
                'edit-activity-preElem',
                'edit-activity-elem',
                'edit-activity-jh',
                'edit-activity-sh'
            ]);
        },
        preConfirm: () => {
            const newName = document.getElementById('edit-activity-name').value.trim();
            const newAmount = parseFloat(document.getElementById('edit-activity-amount').value);

            if (!newName || isNaN(newAmount) || newAmount < 0) {
                Swal.showValidationMessage("Please enter valid activity name and amount.");
                return false;
            }

            return {
                newName,
                newAmount,
                grades: {
                    all: document.getElementById('edit-activity-all').checked,
                    preElem: document.getElementById('edit-activity-preElem').checked,
                    elem: document.getElementById('edit-activity-elem').checked,
                    jh: document.getElementById('edit-activity-jh').checked,
                    sh: document.getElementById('edit-activity-sh').checked
                }
            };
        }
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({
                title: "Are you sure?",
                text: `Do you want to save changes to the activity "${currentName}"?`,
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#3085d6",
                cancelButtonColor: "#d33",
                confirmButtonText: "Yes, save changes!"
            }).then((confirmResult) => {
                if (confirmResult.isConfirmed) {
                    updateActivity(activityKey, result.value);
                }
            });
        }
    });
}


async function getStudentNames(studentIds) {
    const studentDetails = [];
    for (const id of studentIds) {
        const snapshot = await get(ref(db, `Students/${id}`));
        if (snapshot.exists()) {
            const studentData = snapshot.val();
            studentDetails.push({
                id: id,
                name: studentData.Name || 'N/A',
                grade: studentData.Grade || 'N/A'
            });
        }
    }
    return studentDetails;
}

fetchData("fees", "additionalFeesTableBody", (key, fee) => {
    return `
        <td>${fee.name}</td>
        <td>₱${fee.amount.toLocaleString()}</td>
        <td>
            <button class="editFee" 
                data-key="${key}" 
                data-name="${fee.name}" 
                data-amount="${fee.amount}"
                data-grades='${JSON.stringify(fee.grades || {})}'>
                ✎ Edit
            </button>
            <button class="deleteFee" 
                data-key="${key}">
                Remove
            </button>
        </td>
    `;
});


document.getElementById("additionalFeesTableBody").addEventListener("click", (event) => {
    if (event.target.classList.contains("editFee")) {
        const feeKey = event.target.getAttribute("data-key");
        const feeName = event.target.getAttribute("data-name");
        const feeAmount = event.target.getAttribute("data-amount");
        const feeGrades = JSON.parse(event.target.getAttribute("data-grades"));

        openEditFeeModal(feeKey, feeName, feeAmount, feeGrades);
    }

    // New delete fee handler
    if (event.target.classList.contains("deleteFee")) {
        const feeKey = event.target.getAttribute("data-key");

        Swal.fire({
            title: "Are you sure?",
            text: "Do you want to delete this fee?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "Yes, delete it!"
        }).then((result) => {
            if (result.isConfirmed) {
                removeFee(feeKey);
            }
        });
    }
});

// Update the edit modal handler to pass old values
// Update the edit modal handler
function openEditFeeModal(feeKey, currentName, currentAmount, currentGrades) {
    Swal.fire({
        title: "Edit Miscellaneous",
        html: `
            <div style="text-align: left;">
                <div style="margin-bottom: 15px;">
                    <label for="edit-fee-name" style="display: block; font-weight: 500;">Miscellaneous:</label>
                    <input id="edit-fee-name" 
                           class="swal2-input" 
                           value="${currentName}" 
                           style="width: 75%; padding: 8px;"
                           placeholder="Enter Miscellaneous">
                </div>

                <div style="margin-bottom: 15px;">
                    <label for="edit-fee-amount" style="display: block; font-weight: 500;">Amount:</label>
                    <div style="position: relative;">
                        <span style="position: absolute; left: 8px; top: 50%; transform: translateY(-50%); color: #666;">₱</span>
                        <input id="edit-fee-amount" 
                               class="swal2-input" 
                               type="number" 
                               value="${currentAmount}"
                               style="width: 75%; padding: 8px 8px 8px 25px;">
                    </div>
                </div>

                <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">
                    <div class="checkbox-group vertical" style="display: flex; flex-direction: column; gap: 8px;">
                        <div><input type="checkbox" id="edit-fee-all"> <label>All Grade Levels</label></div>
                        <div><input type="checkbox" id="edit-fee-preElem"> <label>Pre-Elementary</label></div>
                        <div><input type="checkbox" id="edit-fee-elem"> <label>Elementary</label></div>
                        <div><input type="checkbox" id="edit-fee-jh"> <label>Junior High School</label></div>
                        <div><input type="checkbox" id="edit-fee-sh"> <label>Senior High School</label></div>
                    </div>
                </div>
            </div>
        `,
        didOpen: () => {
            // Set initial states
            if (currentGrades) {
                document.getElementById('edit-fee-all').checked = currentGrades.all || false;
                document.getElementById('edit-fee-preElem').checked = currentGrades.preElem || false;
                document.getElementById('edit-fee-elem').checked = currentGrades.elem || false;
                document.getElementById('edit-fee-jh').checked = currentGrades.jh || false;
                document.getElementById('edit-fee-sh').checked = currentGrades.sh || false;
            }

            // Setup checkbox group for edit modal
            setupCheckboxGroup('edit-fee-all', [
                'edit-fee-preElem',
                'edit-fee-elem',
                'edit-fee-jh',
                'edit-fee-sh'
            ]);
        },
        showCancelButton: true,
        confirmButtonText: "Save",
        preConfirm: () => {
            const newName = document.getElementById("edit-fee-name").value.trim();
            const newAmount = parseFloat(document.getElementById("edit-fee-amount").value);

            if (!newName || isNaN(newAmount) || newAmount < 0) {
                Swal.showValidationMessage("Please enter valid fee name and amount.");
                return false;
            }

            return {
                newName,
                newAmount,
                grades: {
                    all: document.getElementById('edit-fee-all').checked,
                    preElem: document.getElementById('edit-fee-preElem').checked,
                    elem: document.getElementById('edit-fee-elem').checked,
                    jh: document.getElementById('edit-fee-jh').checked,
                    sh: document.getElementById('edit-fee-sh').checked
                }
            };
        }
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({
                title: "Are you sure?",
                text: `Do you want to save changes to the fee "${currentName}"?`,
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#3085d6",
                cancelButtonColor: "#d33",
                confirmButtonText: "Yes, save changes!"
            }).then((confirmResult) => {
                if (confirmResult.isConfirmed) {
                    updateFee(feeKey, result.value);
                }
            });
        }
    });
}

// Updated fee update function
async function updateFee(feeKey, { newName, newAmount, grades }) {
    const feeRef = ref(db, "fees/" + feeKey);

    try {
        // Get current fee data to calculate amount difference
        const feeSnapshot = await get(feeRef);
        const oldFee = feeSnapshot.val();
        const oldAmount = oldFee.amount || 0;
        const amountDifference = newAmount - oldAmount;

        // Update fee details including grades
        await update(feeRef, {
            name: newName,
            amount: newAmount,
            grades: grades
        });

        const studentsSnapshot = await get(ref(db, 'Students'));
        if (!studentsSnapshot.exists()) return;

        const updates = {};
        const gradeMap = createGradeMap();

        studentsSnapshot.forEach((studentSnapshot) => {
            const studentKey = studentSnapshot.key;
            const studentData = studentSnapshot.val();
            const studentGrade = studentData.Grade;

            // Check if student should be updated based on fee grades
            if (!shouldUpdateStudent(studentGrade, grades, gradeMap)) {
                return;
            }

            const feeBalances = { ...(studentData.feeBalances || {}) };

            if (feeBalances[feeKey]) {
                const originalRemaining = feeBalances[feeKey].remaining;
                const newRemaining = Math.max(originalRemaining + amountDifference, 0);
                const becameZero = originalRemaining > 0 && newRemaining === 0;

                // Update fee details
                feeBalances[feeKey] = {
                    name: newName,
                    amount: newAmount,
                    remaining: newRemaining,
                    paid: feeBalances[feeKey].paid || (newAmount - newRemaining)
                };

                // Handle overpayments
                if (becameZero) {
                    updates[`Students/${studentKey}/overpayments/${feeKey}`] = {
                        oldAmount: oldAmount,
                        newAmount: newAmount,
                        overpayment: Math.abs(amountDifference),
                        date: new Date().toISOString()
                    };
                }

                // Update totals
                const totalFeesPrice = Object.values(feeBalances)
                    .reduce((sum, fee) => sum + fee.remaining, 0);

                updates[`Students/${studentKey}/feeBalances`] = feeBalances;
                updates[`Students/${studentKey}/totalFeesPrice`] = totalFeesPrice;
            }
        });

        await update(ref(db), updates);
        Swal.fire("Success!", "Fee updated across applicable student records!", "success");
    } catch (error) {
        Swal.fire("Error!", "Error updating fee: " + error.message, "error");
    }
}

// Helper functions
function createGradeMap() {
    return {
        'Pre-Elem': 'preElem',
        '1': 'elem', '2': 'elem', '3': 'elem', '4': 'elem', '5': 'elem', '6': 'elem',
        '7': 'jh', '8': 'jh', '9': 'jh', '10': 'jh',
        '11': 'sh', '12': 'sh'
    };
}

function shouldUpdateStudent(studentGrade, feeGrades, gradeMap) {
    if (feeGrades.all) return true;
    if (feeGrades.notRequired) return false;

    const gradeCategory = gradeMap[studentGrade] || 'other';
    return feeGrades[gradeCategory];
}

// Enhanced remove fee function
async function removeFee(feeKey) {
    try {
        // First get fee details for cleanup
        const feeSnapshot = await get(ref(db, `fees/${feeKey}`));
        if (!feeSnapshot.exists()) return;

        // Remove from fees node
        await remove(ref(db, `fees/${feeKey}`));

        // Remove from all students' feeBalances
        const studentsSnapshot = await get(ref(db, 'Students'));
        if (!studentsSnapshot.exists()) return;

        const updates = {};

        studentsSnapshot.forEach((studentSnapshot) => {
            const studentKey = studentSnapshot.key;
            const studentData = studentSnapshot.val();
            const feeBalances = { ...(studentData.feeBalances || {}) };

            if (feeBalances[feeKey]) {
                delete feeBalances[feeKey];

                // Calculate new total
                const totalFeesPrice = Object.values(feeBalances)
                    .reduce((sum, fee) => sum + fee.remaining, 0);

                updates[`Students/${studentKey}/feeBalances`] = feeBalances;
                updates[`Students/${studentKey}/totalFeesPrice`] = totalFeesPrice;
            }
        });

        // Apply all updates
        await update(ref(db), updates);

        Swal.fire({
            icon: "success",
            title: "Deleted!",
            text: "Fee removed from all student records",
            confirmButtonColor: "#3085d6",
            confirmButtonText: "OK"
        });
    } catch (error) {
        Swal.fire({
            icon: "error",
            title: "Error!",
            text: "Error removing fee: " + error.message,
            confirmButtonColor: "#d33",
            confirmButtonText: "OK"
        });
    }
}

switchTable("staffTable");

fetchData("discounts", "discountTableBody", (key, discount) => {
    return `
        <td>${discount.discountName}</td>
        <td>₱${discount.discountAmount.toLocaleString()}</td>
        <td>
            <button class="editDiscount" 
                data-key="${key}" 
                data-name="${discount.discountName}" 
                data-amount="${discount.discountAmount}">
                ✎ Edit
            </button>
            <button class="deleteDiscount" 
                data-key="${key}">
                Remove
            </button>
        </td>
    `;
});

document.getElementById("discountTableBody").addEventListener("click", (event) => {
    if (event.target.classList.contains("editDiscount")) {
        const discountKey = event.target.getAttribute("data-key");
        const discountName = event.target.getAttribute("data-name");
        const discountAmount = event.target.getAttribute("data-amount");

        openEditModal("Edit Discount", discountKey, discountName, discountAmount, "discounts");
    }
});

window.submitDiscount = function () {
    const discountName = document.getElementById("discountName").value;
    const discountAmount = parseFloat(document.getElementById("discountAmount").value);

    if (discountName && !isNaN(discountAmount) && discountAmount > 0) {

        Swal.fire({
            title: "Are you sure?",
            text: `Do you want to add the discount "${discountName}" with an amount of ₱${discountAmount.toLocaleString()}?`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Yes, add discount!"
        }).then((result) => {
            if (result.isConfirmed) {
                const discountData = { discountName, discountAmount };

                const newDiscountRef = push(ref(db, "discounts"));
                set(newDiscountRef, discountData)
                    .then(() => {
                        Swal.fire({
                            icon: "success",
                            title: "Success!",
                            text: "Discount added successfully!",
                            confirmButtonColor: "#3085d6",
                            confirmButtonText: "OK"
                        }).then(() => {
                            closeModal("discountModal");
                            document.getElementById("discountName").value = "";
                            document.getElementById("discountAmount").value = "";
                        });
                    })
                    .catch(error => {
                        Swal.fire({
                            icon: "error",
                            title: "Error!",
                            text: "Error adding discount: " + error.message,
                            confirmButtonColor: "#d33",
                            confirmButtonText: "OK"
                        });
                    });
            }
        });

    } else {
        Swal.fire({
            icon: "warning",
            title: "Invalid Input",
            text: "Please enter a valid discount name and amount.",
            confirmButtonColor: "#f39c12",
            confirmButtonText: "OK"
        });
    }
};

function fetchDiscounts() {
    const discountTableBody = document.getElementById("discountTableBody");
    const isStaff = sessionStorage.getItem("position") === "Staff";

    onValue(ref(db, "discounts"), (snapshot) => {
        discountTableBody.innerHTML = "";

        snapshot.forEach((childSnapshot) => {
            const discount = childSnapshot.val();
            const key = childSnapshot.key;

            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${discount.discountName}</td>
                <td>₱${discount.discountAmount.toLocaleString()}</td>
                <td>
                    <button class="editDiscount" 
                        data-key="${key}" 
                        data-name="${discount.discountName}" 
                        data-amount="${discount.discountAmount}">
                        ✎ Edit
                    </button>
                    <button class="deleteDiscount" 
                        data-key="${key}">
                        Remove
                    </button>
                </td>
            `;
            discountTableBody.appendChild(row);
        });
    });
}

document.getElementById("discountTableBody").addEventListener("click", (event) => {
    if (event.target.classList.contains("deleteDiscount")) {
        const discountKey = event.target.getAttribute("data-key");

        Swal.fire({
            title: "Are you sure?",
            text: "This discount will be permanently removed!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "Yes, delete it!"
        }).then((result) => {
            if (result.isConfirmed) {
                remove(ref(db, "discounts/" + discountKey))
                    .then(() => {
                        Swal.fire({
                            icon: "success",
                            title: "Deleted!",
                            text: "Discount removed successfully!",
                            confirmButtonColor: "#3085d6",
                            confirmButtonText: "OK"
                        });
                    })
                    .catch((error) => {
                        Swal.fire({
                            icon: "error",
                            title: "Error!",
                            text: "Error removing discount: " + error.message,
                            confirmButtonColor: "#d33",
                            confirmButtonText: "OK"
                        });
                    });
            }
        });
    }
});

fetchDiscounts();

// Open Discount Modal
document.getElementById("openDiscountModal").addEventListener("click", function () {
    openModal("discountModal");
});

function fetchTuitionFee(grade) {
    let gradeKey = grade === "Pre-Elem" ? "Pre-Elem" : `grade${grade}`;
    const tuitionFeeRef = ref(db, `tuitionFees/${gradeKey}`);

    onValue(tuitionFeeRef, (snapshot) => {
        const tuitionAmount = snapshot.exists() ? snapshot.val() : 0;
        document.getElementById("tuition-amount").value = tuitionAmount;
    });
}

document.getElementById("grade-select").addEventListener("change", function () {
    let grade = this.value;
    fetchTuitionFee(grade);
    // Do NOT show the Edit button here. It should only show when the user clicks "Edit".
});

document.addEventListener("DOMContentLoaded", function () {

    // Add these two lines inside DOMContentLoaded
    setupCheckboxGroup('activityAll', ['activityPreElem', 'activityElem', 'activityJH', 'activitySH']);
    setupCheckboxGroup('feeAll', ['feePreElem', 'feeElem', 'feeJH', 'feeSH']);

    const editBtn = document.getElementById("editTuitionBtn");
    const saveBtn = document.getElementById("saveTuitionBtn");
    const cancelBtn = document.getElementById("cancelTuitionBtn");
    const tuitionInput = document.getElementById("tuition-amount");

    checkUserPosition();

    let originalTuitionFee = 0; // Store the original tuition fee value

    // Edit Button Click
    editBtn.addEventListener("click", function () {
        // Enable the input field
        tuitionInput.disabled = false;
        tuitionInput.focus();

        // Store the original tuition fee value
        originalTuitionFee = parseFloat(tuitionInput.value);

        // Show Save and Cancel buttons, hide Edit button
        editBtn.classList.add("hidden");
        saveBtn.classList.remove("hidden");
        cancelBtn.classList.remove("hidden");
    });

    // Save Button Click
    saveBtn.addEventListener("click", function () {
        const grade = document.getElementById("grade-select").value;
        const newFee = parseFloat(tuitionInput.value);

        if (isNaN(newFee)) {
            Swal.fire("Invalid Input", "Please enter a valid tuition fee.", "warning");
            return;
        }

        Swal.fire({
            title: "Are you sure?",
            text: `Update tuition fee to ₱${newFee.toLocaleString()}?`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Yes, save changes!"
        }).then((result) => {
            if (result.isConfirmed) {
                let gradeKey = grade === "Pre-Elem" ? "Pre-Elem" : `grade${grade}`;
                set(ref(db, `tuitionFees/${gradeKey}`), newFee)
                    .then(() => {
                        Swal.fire("Success!", "Tuition fee updated successfully!", "success");
                        resetTuitionUI();
                    })
                    .catch((error) => {
                        Swal.fire("Error!", "Failed to update: " + error.message, "error");
                    });
            }
        });
    });

    // Cancel Button Click
    cancelBtn.addEventListener("click", function () {
        // Revert the tuition fee to the original value
        tuitionInput.value = originalTuitionFee;

        // Reset the UI
        resetTuitionUI();
    });

    // Function to reset the UI
    function resetTuitionUI() {
        tuitionInput.disabled = true;
        editBtn.classList.remove("hidden");
        saveBtn.classList.add("hidden");
        cancelBtn.classList.add("hidden");

    }
});

function setupCheckboxGroup(masterId, childIds) {
    const master = document.getElementById(masterId);
    const children = childIds.map(id => document.getElementById(id));

    if (!master || children.some(child => !child)) return;

    // Clear existing event listeners to prevent duplicates
    master.replaceWith(master.cloneNode(true));
    children.forEach(child => child.replaceWith(child.cloneNode(true)));

    const newMaster = document.getElementById(masterId);
    const newChildren = childIds.map(id => document.getElementById(id));

    newMaster.addEventListener('change', function () {
        newChildren.forEach(child => {
            child.checked = this.checked;
        });
    });

    newChildren.forEach(child => {
        child.addEventListener('change', function () {
            newMaster.checked = newChildren.every(c => c.checked);
        });
    });
}

function openModal(modalId) { document.getElementById(modalId).style.display = "flex"; }
window.closeModal = function (modalId) {
    document.getElementById(modalId).style.display = "none";
};

// Expense Management
document.getElementById('addExpenseBtn').addEventListener('click', addExpense);

function addExpense() {
    const name = document.getElementById('expenseName').value.trim();

    if (!name) {
        Swal.fire('Invalid Input', 'Please enter an expense name', 'warning');
        return;
    }

    Swal.fire({
        title: 'Confirm Expense',
        text: `Add "${name}"?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Add',
        cancelButtonText: 'Cancel'
    }).then((result) => {
        if (result.isConfirmed) {
            const newExpense = {
                name: name  // Only store the name
            };

            push(ref(db, 'expenses'), newExpense)
                .then(() => {
                    Swal.fire('Success!', 'Expense added successfully', 'success');
                    document.getElementById('expenseName').value = '';
                })
                .catch(error => {
                    Swal.fire('Error!', error.message, 'error');
                });
        }
    });
}

// Fetch and display expenses
fetchData('expenses', 'expensesTableBody', (key, expense) => {
    const isStaff = sessionStorage.getItem("position") === "Staff";
    return `
        <td>${expense.name}</td>
        <td>
            <button class="edit-expense ${isStaff ? 'staff-hidden' : ''}" 
                data-key="${key}">
                 Edit
            </button>
            <button class="delete-expense ${isStaff ? 'staff-hidden' : ''}" 
                data-key="${key}">
                 Delete
            </button>
        </td>
    `;
});

// Handle expense actions
document.getElementById('expensesTableBody').addEventListener('click', (event) => {
    const key = event.target.dataset.key;

    if (event.target.classList.contains('delete-expense')) {
        Swal.fire({
            title: 'Delete Expense?',
            text: "This action cannot be undone!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
        }).then((result) => {
            if (result.isConfirmed) {
                remove(ref(db, `expenses/${key}`))
                    .then(() => {
                        Swal.fire(
                            'Deleted!',
                            'Expense has been removed.',
                            'success'
                        );
                    })
                    .catch((error) => {
                        Swal.fire(
                            'Error!',
                            `Failed to delete expense: ${error.message}`,
                            'error'
                        );
                    });
            }
        });
    }

    if (event.target.classList.contains('edit-expense')) {
        const expenseRef = ref(db, `expenses/${key}`);
        get(expenseRef).then((snapshot) => {
            const expense = snapshot.val();
            Swal.fire({
                title: 'Edit Expense',
                html: `
                    <input id="edit-expense-name" class="swal2-input" value="${expense.name}">
                `,
                showCancelButton: true,
                preConfirm: () => {
                    return {
                        name: document.getElementById('edit-expense-name').value
                    };
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    update(expenseRef, result.value)
                        .then(() => Swal.fire('Updated!', 'Expense updated', 'success'));
                }
            });
        });
    }
});

document.getElementById("openPlanModal").addEventListener("click", () => openModal("planModal"));
document.getElementById("planModal").querySelector("button").addEventListener("click", () => {
    const name = document.getElementById("planName").value.trim();
    const downPayment = parseFloat(document.getElementById("downPayment").value);
    const description = document.getElementById("planDescription").value;
    const monthlyPayment = parseFloat(document.getElementById("monthlyPayment").value);
    const gradeLevel = document.getElementById("gradeLevel").value; // Directly get the selected value

    if (!name || !gradeLevel || isNaN(downPayment) || !description || isNaN(monthlyPayment)) {
        Swal.fire({
            icon: "warning",
            title: "Invalid Input",
            text: "Please fill all fields correctly.",
            confirmButtonColor: "#f39c12",
            confirmButtonText: "OK"
        });
        return; // Stop execution if inputs are invalid
    }

    // Add to Firebase (only once)
    addData("plans", { name, Grade: gradeLevel, downPayment, description, monthlyPayment });

    Swal.fire({
        icon: "success",
        title: "Success!",
        text: "Payment plan added successfully!",
        confirmButtonColor: "#3085d6",
        confirmButtonText: "OK"
    }).then(() => {
        closeModal("planModal");
        document.getElementById("planName").value = "";
        document.getElementById("gradeLevel").value = "";
        document.getElementById("downPayment").value = "";
        document.getElementById("planDescription").value = "";
        document.getElementById("monthlyPayment").value = "";
    });
});

function fetchFilteredPlans(selectedGrade) {
    const tableBody = document.getElementById("planTableBody");
    const isStaff = sessionStorage.getItem("position") === "Staff";

    onValue(ref(db, "plans"), (snapshot) => {
        tableBody.innerHTML = "";

        let plansArray = [];

        snapshot.forEach((childSnapshot) => {
            const plan = childSnapshot.val();
            const key = childSnapshot.key;
            plansArray.push({ key, ...plan });
        });

        plansArray.sort((a, b) => a.name.localeCompare(b.name));

        plansArray.forEach((plan) => {
            const planGrade = plan.Grade;
            let displayGrade = planGrade === "Pre-Elem" ? "Pre-Elem" : `Grade ${planGrade}`;

            if (selectedGrade === "all" || planGrade == selectedGrade || displayGrade === selectedGrade) {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${plan.name}</td>
                    <td>${displayGrade}</td>
                    <td>₱${plan.downPayment.toLocaleString()}</td>
                    <td>₱${plan.monthlyPayment.toLocaleString()}</td>
                    <td>
                        <button class="editPlan ${isStaff ? 'staff-hidden' : ''}" 
                            data-key="${plan.key}" 
                            data-name="${plan.name}" 
                            data-downpayment="${plan.downPayment}" 
                            data-monthlypayment="${plan.monthlyPayment}">
                            ✎ Edit
                        </button>
                        <button class="deletePlan ${isStaff ? 'staff-hidden' : ''}" 
                            data-key="${plan.key}">
                            Remove
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
            }
        });
    });
}

document.getElementById("filterGrade").addEventListener("change", function () {
    const selectedGrade = this.value;
    fetchFilteredPlans(selectedGrade);
});

fetchFilteredPlans("all");

document.getElementById("planTableBody").addEventListener("click", (event) => {
    if (event.target.classList.contains("editPlan")) {
        const key = event.target.getAttribute("data-key");
        const name = event.target.getAttribute("data-name");
        const downPayment = event.target.getAttribute("data-downpayment");
        const monthlyPayment = event.target.getAttribute("data-monthlypayment");

        Swal.fire({
            title: "Edit Plan",
            html: `
                <label for="edit-name" style="display:block; text-align:left;">Plan Name:</label>
                <input id="edit-name" class="swal2-input" type="text" value="${name}" placeholder="Enter plan name">
                
                <label for="edit-downpayment" style="display:block; text-align:left;">Down Payment (₱):</label>
                <input id="edit-downpayment" class="swal2-input" type="number" value="${downPayment}" placeholder="Enter down payment">
                
                <label for="edit-monthlypayment" style="display:block; text-align:left;">Monthly Payment (₱):</label>
                <input id="edit-monthlypayment" class="swal2-input" type="number" value="${monthlyPayment}" placeholder="Enter monthly payment">
            `,
            showCancelButton: true,
            confirmButtonText: "Save",
            preConfirm: () => {
                const newName = document.getElementById("edit-name").value.trim();
                const newDownPayment = parseFloat(document.getElementById("edit-downpayment").value.trim());
                const newMonthlyPayment = parseFloat(document.getElementById("edit-monthlypayment").value.trim());

                if (!newName || isNaN(newDownPayment) || isNaN(newMonthlyPayment)) {
                    Swal.showValidationMessage("Please enter valid data.");
                    return false;
                }

                return { newName, newDownPayment, newMonthlyPayment };
            }
        }).then((result) => {
            if (result.isConfirmed) {
                const { newName, newDownPayment, newMonthlyPayment } = result.value;

                Swal.fire({
                    title: "Are you sure?",
                    text: `Do you want to update the plan "${name}"?`,
                    icon: "warning",
                    showCancelButton: true,
                    confirmButtonColor: "#3085d6",
                    cancelButtonColor: "#d33",
                    confirmButtonText: "Yes, save changes!"
                }).then((confirmResult) => {
                    if (confirmResult.isConfirmed) {
                        update(ref(db, "plans/" + key), {
                            name: newName,
                            downPayment: newDownPayment,
                            monthlyPayment: newMonthlyPayment
                        })
                            .then(() => {
                                Swal.fire("Success!", "Plan updated successfully!", "success");
                                fetchFilteredPlans(document.getElementById("filterGrade").value); // Refresh the table
                            })
                            .catch((error) => {
                                Swal.fire("Error!", "Failed to update plan: " + error.message, "error");
                            });
                    }
                });
            }
        });
    }
    if (event.target.classList.contains("deletePlan")) {
        const planKey = event.target.getAttribute("data-key");

        Swal.fire({
            title: "Are you sure?",
            text: "This plan will be permanently removed!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "Yes, delete it!"
        }).then((result) => {
            if (result.isConfirmed) {
                remove(ref(db, "plans/" + planKey))
                    .then(() => {
                        Swal.fire({
                            icon: "success",
                            title: "Deleted!",
                            text: "Plan removed successfully!",
                            confirmButtonColor: "#3085d6",
                            confirmButtonText: "OK"
                        });
                        fetchFilteredPlans(document.getElementById("filterGrade").value); // Refresh the table
                    })
                    .catch((error) => {
                        Swal.fire({
                            icon: "error",
                            title: "Error!",
                            text: "Error removing plan: " + error.message,
                            confirmButtonColor: "#d33",
                            confirmButtonText: "OK"
                        });
                    });
            }
        });
    }
});

function openEditModal(title, key, currentName, currentAmount, path) {
    Swal.fire({
        title: title,
        html: `
            <label for="edit-name" style="display:block; text-align:left;">Name:</label>
            <input id="edit-name" class="swal2-input" type="text" value="${currentName}" placeholder="Enter name">
            
            <label for="edit-amount" style="display:block; text-align:left;">Amount (₱):</label>
            <input id="edit-amount" class="swal2-input" type="number" value="${currentAmount}" placeholder="Enter amount">
        `,
        showCancelButton: true,
        confirmButtonText: "Save",
        preConfirm: () => {
            const newName = document.getElementById("edit-name").value.trim();
            const newAmount = parseFloat(document.getElementById("edit-amount").value.trim());

            if (!newName || isNaN(newAmount) || newAmount < 0) {
                Swal.showValidationMessage("Please enter valid name and amount.");
                return false;
            }

            return { newName, newAmount };
        }
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({
                title: "Are you sure?",
                text: `Do you want to save changes to the discount "${currentName}"?`,
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#3085d6",
                cancelButtonColor: "#d33",
                confirmButtonText: "Yes, save changes!"
            }).then((confirmResult) => {
                if (confirmResult.isConfirmed) {
                    updateData(path, key, result.value.newName, result.value.newAmount);
                }
            });
        }
    });
}

function updateData(path, key, newName, newAmount) {
    const updates = {};
    updates[`${path}/${key}/discountName`] = newName;
    updates[`${path}/${key}/discountAmount`] = newAmount;

    update(ref(db), updates)
        .then(() => {
            Swal.fire("Success!", "Discount Updated successfully!", "success");
        })
        .catch((error) => {
            Swal.fire("Error!", "Failed to update: " + error.message, "error");
        });
}

function fetchAndDisplaySchoolYear() {
    const db = getDatabase();
    const currentSYRef = ref(db, 'CurrentSY');

    onValue(currentSYRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const schoolYear = `${data.startSY}-${data.endSY}`;
            document.getElementById('schoolyear').textContent = schoolYear;
        } else {
            document.getElementById('schoolyear').textContent = "Not set";
        }
    }, (error) => {
        console.error("Error fetching school year:", error);
    });
}

// Edit School Year functionality
document.addEventListener("DOMContentLoaded", () => {
    fetchAndDisplaySchoolYear();

    document.getElementById('editSchoolYearBtn').addEventListener('click', () => {
        const currentSY = document.getElementById('schoolyear').textContent;
        let [currentStart = '', currentEnd = ''] = currentSY.split('-');

        Swal.fire({
            title: 'Set School Year',
            html: `
                <div class="input-group">
                    <label for="startYear">Start of School Year:</label>
                    <input type="number" id="startYear" class="swal2-input" 
                           placeholder="Enter start year" value="${currentStart}">
                </div>
                <div class="input-group">
                    <label for="endYear">End of School Year:</label>
                    <input type="number" id="endYear" class="swal2-input" 
                           placeholder="Enter end year" value="${currentEnd}">
                </div>
            `,
            focusConfirm: false,
            preConfirm: () => {
                const start = document.getElementById('startYear').value;
                const end = document.getElementById('endYear').value;

                if (!start || !end) {
                    Swal.showValidationMessage('Both fields are required');
                    return false;
                }
                if (parseInt(end) <= parseInt(start)) {
                    Swal.showValidationMessage('End year must be after start year');
                    return false;
                }
                return { start, end };
            },
            showCancelButton: true,
            confirmButtonText: 'Next',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                // Show confirmation dialog
                Swal.fire({
                    title: 'Confirm School Year',
                    html: `Are you sure you want to set school year to:<br>
                          <strong>${result.value.start}-${result.value.end}</strong>?`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#3085d6',
                    cancelButtonColor: '#d33',
                    confirmButtonText: 'Yes, save it!',
                    cancelButtonText: 'No, cancel'
                }).then((confirmation) => {
                    if (confirmation.isConfirmed) {
                        const db = getDatabase();
                        const currentSYRef = ref(db, 'CurrentSY');

                        set(currentSYRef, {
                            startSY: result.value.start,
                            endSY: result.value.end
                        }).then(() => {
                            Swal.fire(
                                'Saved!',
                                'School year updated successfully.',
                                'success'
                            );
                        }).catch((error) => {
                            Swal.fire(
                                'Error!',
                                'Failed to save school year',
                                'error'
                            );
                            console.error('Error saving school year:', error);
                        });
                    }
                });
            }
        });
    });
});

document.addEventListener("DOMContentLoaded", () => {
    fetchAndDisplaySchoolYear();
});