import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { getDatabase, ref, get, set, update, onValue, push } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-database.js";

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
const auth = getAuth(app);
const db = getDatabase(app);
const urlParams = new URLSearchParams(window.location.search);
const studentData = urlParams.get("data");

let student = null;

function enableDropdowns() {
    document.querySelectorAll("select").forEach(dropdown => {
        dropdown.disabled = false;
    });
}

function getStudentRoot() {
    if (student.type === 'dropout') return 'Dropouts';

    if (student.source === 'archive') {
        return `SchoolYear/${student.schoolYear}/Balance`;
    }
    switch (student.type) {
        case 'dropout': return 'Dropouts';
        case 'repeater': return 'Repeaters';
        default: return 'Students/CurrentSchoolYear'; // Updated path
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

    // Set date picker to today's date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('historyDateFilter').value = today;

});

//////////////////////////////////////////////////-----Show Student details-----/////////////////////////////////////////////////////////////////////////// 
const modal = document.getElementById("student-details-modal");
const btn = document.getElementById("view-student-details-btn");
const span = document.getElementById("close-modal-btn");
const saveBtn = document.getElementById("save-changes-btn");
const cancelBtn = document.getElementById("cancel-edit-btn");

let originalStudentData = null;
let currentStudentRef = null;

function updateModalContent(studentDetails) {
    // Store original data and reference
    originalStudentData = JSON.parse(JSON.stringify(studentDetails));
    currentStudentRef = ref(db, getStudentPath(
        student.type,
        student.studentId,
        student.schoolYear
    ));

    // Set input values with proper fallbacks
    document.getElementById("modal-student-name").value = studentDetails.Name || "";
    document.getElementById("modal-grade-level").value = studentDetails.Grade || "";
    document.getElementById("modal-lrn").value = studentDetails.LRN || "";
    document.getElementById("modal-last-school").value = studentDetails.LastSchoolAttended || "";
    document.getElementById("modal-religion").value = studentDetails.Religion || "";
    document.getElementById("modal-school-year").value = studentDetails.SchoolYear || "";
    document.getElementById("modal-sex").value = studentDetails.Sex || "M";
    document.getElementById("modal-address").value = studentDetails.Address || "";

    // Format birthdate for date input
    const birthdate = studentDetails.Birthdate ?
        new Date(studentDetails.Birthdate).toISOString().split('T')[0] : "";
    document.getElementById("modal-birthdate").value = birthdate;

    // Handle nested parent data
    const father = studentDetails.Father || {};
    const mother = studentDetails.Mother || {};
    document.getElementById("modal-father-name").value = father.Name || "";
    document.getElementById("modal-father-contact").value = father.Contact || "";
    document.getElementById("modal-mother-name").value = mother.Name || "";
    document.getElementById("modal-mother-contact").value = mother.Contact || "";
}


function getStudentPath(studentType, studentId, schoolYear) {
    switch (studentType) {
        case 'dropout':
            return `Dropouts/${studentId}`;
        case 'repeater':
            return `Repeaters/${studentId}`;
        case 'archive':
            return `SchoolYear/${schoolYear}/Balance/${studentId}`; // Fixed parameter name
        default:
            return `Students/CurrentSchoolYear/${studentId}`;
    }
}

// Modified fetchStudentDetails function
async function fetchStudentDetails(student) {
    try {
        if (!student?.studentId || !student?.type) {
            throw new Error("Invalid student data structure");
        }

        // Get path using student's schoolYear
        const path = getStudentPath(
            student.type,
            student.studentId,
            student.schoolYear // Now properly passed
        );

        const studentRef = ref(db, path);
        const snapshot = await get(studentRef);

        if (!snapshot.exists()) {
            throw new Error("Student record not found");
        }

        const studentDetails = snapshot.val();
        console.log("Raw DB Data:", studentDetails);

        // Ensure consistent data structure
        const formattedData = {
            ...studentDetails,
            Father: studentDetails.Father || {},
            Mother: studentDetails.Mother || {},
            Birthdate: studentDetails.Birthdate || ""
        };

        updateModalContent(formattedData);
        modal.style.display = "block";

    } catch (error) {
        console.error("Fetch Error:", error);
        modal.style.display = "none";
        alert(`Error loading student data: ${error.message}`);
    }
}

async function saveChanges() {
    // Confirm with SweetAlert
    const { isConfirmed } = await Swal.fire({
        title: 'Confirm Changes',
        text: 'Are you sure you want to save these changes?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, save changes!'
    });

    if (!isConfirmed) return;

    try {
        const updatedData = {
            Name: document.getElementById("modal-student-name").value.trim(),
            Grade: document.getElementById("modal-grade-level").value.trim(),
            LRN: document.getElementById("modal-lrn").value.trim(),
            LastSchoolAttended: document.getElementById("modal-last-school").value.trim(),
            Religion: document.getElementById("modal-religion").value.trim(),
            SchoolYear: document.getElementById("modal-school-year").value.trim(),
            Sex: document.getElementById("modal-sex").value,
            Address: document.getElementById("modal-address").value.trim(),
            Birthdate: document.getElementById("modal-birthdate").value,
            Father: {
                name: document.getElementById("modal-father-name").value.trim(),
                contact: document.getElementById("modal-father-contact").value.trim()
            },
            Mother: {
                name: document.getElementById("modal-mother-name").value.trim(),
                contact: document.getElementById("modal-mother-contact").value.trim()
            }
        };

        await update(currentStudentRef, updatedData);

        await Swal.fire({
            title: 'Success!',
            text: 'Changes saved successfully!',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
        });

        modal.style.display = "none";
        fetchStudentDetails(student);
    } catch (error) {
        console.error("Save Error:", error);
        await Swal.fire({
            title: 'Save Failed!',
            html: `Error saving changes:<br><em>${error.message}</em>`,
            icon: 'error',
            confirmButtonText: 'OK'
        });
    }
}

function cancelEdit() {
    if (originalStudentData) {
        updateModalContent(originalStudentData);
    }
    modal.style.display = "none";
}

// Event Listeners
saveBtn.addEventListener("click", saveChanges);
cancelBtn.addEventListener("click", cancelEdit);
span.onclick = cancelEdit;
window.onclick = (event) => event.target === modal && cancelEdit();

// Existing button handler
btn.onclick = () => {
    if (student?.studentId) {
        fetchStudentDetails(student);
    } else {
        alert("Student information is not available. Please reload the page.");
    }
};

span.onclick = () => modal.style.display = "none";
window.onclick = (event) => { if (event.target === modal) modal.style.display = "none"; };


//////////////////////////////////////////////////-----Get User Details-----/////////////////////////////////////////////////////////////////////////// 

async function getUserName(uid) {
    const staffRef = ref(db, `staff/${uid}`);
    const snapshot = await get(staffRef);

    if (snapshot.exists()) {
        const staffData = snapshot.val();
        console.log('Staff data:', staffData);
        return staffData.name || "Unnamed Staff";
    }

    console.log("No matching staff found for UID:", uid);
    return "Unknown Staff";
}

async function getProcessedBy() {
    const user = auth.currentUser;
    if (!user) {
        console.error("No user logged in");
        return "Unknown User";
    }
    return await getUserName(user.uid); // Use your existing function
}

//////////////////////////////////////////////////-----PLANS-----/////////////////////////////////////////////////////////////////////////// 

async function loadPlansForStudent(grade, selectedPlanKey) {
    const studentRoot = getStudentRoot();
    const studentRef = ref(db, `${studentRoot}/${student.studentId}`);
    const planDropdown = document.getElementById("plan");
    const changePlanLabel = document.querySelector('label[for="plan"]');

    if (!planDropdown || !changePlanLabel) return;

    try {
        const snapshot = await get(ref(db, "plans"));

        if (snapshot.exists()) {
            const plansData = snapshot.val();
            planDropdown.innerHTML = "<option value=''>Select a Plan</option>";

            const gradeString = String(grade);
            let foundPlan = false;
            for (const planKey in plansData) {
                const plan = plansData[planKey];
                if (String(plan.Grade) === gradeString) {
                    const option = document.createElement("option");
                    option.value = planKey;
                    // Display "Customize" for plan named "C"
                    option.textContent = plan.name === 'C' ? 'Customize' : `${plan.name} - ${plan.downPayment}`;
                    planDropdown.appendChild(option);

                    if (selectedPlanKey && planKey === selectedPlanKey) {
                        foundPlan = true;
                    }
                }
            }

            if (selectedPlanKey) {
                if (foundPlan) {
                    planDropdown.value = selectedPlanKey;
                    changePlanLabel.textContent = "Selected Plan (Cannot be changed):";
                } else {
                    console.warn("Saved plan not found in available options.");
                    planDropdown.disabled = false;
                }
            }

        }
    } catch (error) {
        console.error("Error fetching plans:", error);
    }
}

function saveSelectedPlan(studentId, planKey) {
    if (!studentId) {
        console.error("No student selected.");
        return;
    }

    const studentRoot = getStudentRoot();
    const date = new Date();
    const padZero = (num) => String(num).padStart(2, '0');
    const formattedDate = `${padZero(date.getMonth() + 1)}-${padZero(date.getDate())}-${date.getFullYear()}`;

    const studentRef = ref(db, `${studentRoot}/${studentId}`);

    // First update the selected plan
    update(studentRef, { selectedPlan: planKey })
        .then(() => get(ref(db, `plans/${planKey}`))) // Get plan details
        .then((planSnapshot) => {
            if (!planSnapshot.exists()) throw new Error("Plan not found");
            const plan = planSnapshot.val();

            // Check if the plan is "C"
            const isCustomPlan = plan.name === 'C';

            // Create HTML here where we have access to plan data
            const planDetailsHTML = `
                <div style="text-align: left; margin: 10px 0;">
                    <p><strong>Plan Name:</strong> ${plan.name}</p>
                    <p><strong>Description:</strong> ${plan.description}</p>
                    <p><strong>Down Payment:</strong> ₱${plan.downPayment}</p>
                    <p><strong>Monthly Payment:</strong> ₱${plan.monthlyPayment}</p>
                </div>
            `;

            const downPayment = plan.downPayment || 0;

            if (isCustomPlan) {
                return null;
            } else {
                if (downPayment <= 0) return null;

                return Promise.all([
                    getProcessedBy(),
                    push(ref(db, `${studentRoot}/${studentId}/paymentHistory`)),
                    downPayment,
                    planDetailsHTML
                ]);
            }
        })
        .then((planDetailsHTML) => {

            document.querySelectorAll('#payment-category, #monthly-payment-select, #activities, #additional-fees, #payment-amount, #confirm-payment')
                .forEach(el => el.disabled = false);
        })
        .catch((error) => {
            console.error("Plan save error:", error);
            Swal.fire("Error", "Failed to save plan selection", "error");
        });
}

function updatePlanUI(planKey) {
    if (!planKey) return;

    get(ref(db, "plans/" + planKey)).then(snapshot => {
        if (snapshot.exists()) {
            const plan = snapshot.val();
            const selectedPlanText = document.getElementById("selected-plan-text");
            const selectedPlanDesc = document.getElementById("selected-plan-description");
            const downPaymentElement = document.getElementById("selected-plan-downpayment");
            const monthlyElement = document.getElementById("selected-plan-monthly");

            // Get parent elements and strong tag
            const downPaymentParent = downPaymentElement.parentElement;
            const strongElement = downPaymentParent.querySelector('strong');
            const monthlyParent = monthlyElement.parentElement;

            // Update basic plan info
            selectedPlanText.textContent = plan.name || "None";
            selectedPlanDesc.textContent = plan.description || "None";
            downPaymentElement.textContent = `₱${plan.downPayment || 0}`;
            monthlyElement.textContent = `₱${plan.monthlyPayment || 0}`;

            // Check if plan name is "A" to modify display
            if (plan.name === "A") {
                strongElement.textContent = "Amount: ";
                monthlyParent.style.display = 'none';
            } else {
                strongElement.textContent = "Down Payment: ";
                monthlyParent.style.display = 'block';
            }

            // Enable the payment category dropdown
            document.getElementById('payment-category').disabled = false;



            // Rest of your existing UI update code
            document.getElementById('payment-category').disabled = false;
            document.getElementById('monthly-payment-select').disabled = false;
            document.getElementById('activities').disabled = false;
            document.getElementById('additional-fees').disabled = false;
            document.getElementById('payment-amount').disabled = false;
            document.getElementById('confirm-payment').disabled = false;
        }
    }).catch(error => console.error("Error fetching plan details:", error));
}

document.getElementById("plan")?.addEventListener("change", async (event) => {
    const planDropdown = event.target;
    const newPlanKey = planDropdown.value;
    const previousPlanKey = student.selectedPlan || "";
    const changePlanLabel = document.querySelector('label[for="plan"]');

    if (!newPlanKey) return;

    try {
        const planSnapshot = await get(ref(db, `plans/${newPlanKey}`));
        if (!planSnapshot.exists()) throw new Error("Plan not found");
        const plan = planSnapshot.val();

        // Define planDetailsHTML here (keep for first dialog)
        const planDetailsHTML = `
    <div style="text-align: left; margin: 10px 0;">
        <p><strong>Plan Name:</strong> ${plan.name}</p>
        <p><strong>Description:</strong> ${plan.description}</p>
        ${plan.name === 'A'
                ? `<p><strong>Amount:</strong> ₱${plan.downPayment}</p>`
                : `<p><strong>Down Payment:</strong> ₱${plan.downPayment}</p>
               <p><strong>Monthly Payment:</strong> ₱${plan.monthlyPayment}</p>`
            }
    </div>
`;

        const confirmation = await Swal.fire({
            title: "Final Plan Selection",
            html: `
                You're about to choose:<br><br>
                ${planDetailsHTML}
                <strong style="color: #dc3545;">This selection is permanent and cannot be changed later!</strong>
            `,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Confirm Selection",
            cancelButtonText: "Cancel",
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            width: "600px"
        });

        if (confirmation.isConfirmed) {
            await saveSelectedPlan(student.studentId, newPlanKey);

            // Enable payment categories
            document.getElementById('payment-category').disabled = false;
            document.getElementById('monthly-payment-select').disabled = studentData.OldBalance > 0; // Check OldBalance here
            document.getElementById('activities').disabled = false;
            document.getElementById('additional-fees').disabled = false;

            Swal.fire({
                title: "Plan Locked In!",
                html: `
                    <div style="text-align: left; margin: 10px 0;">
                        <p><strong>Plan Name:</strong> ${plan.name}</p>
                        <p><strong>Description:</strong> ${plan.description}</p>
                        ${plan.name === 'A'
                        ? `<p><strong>Amount:</strong> ₱${plan.downPayment}</p>`
                        : `<p><strong>Down Payment:</strong> ₱${plan.downPayment}</p>
                               <p><strong>Monthly Payment:</strong> ₱${plan.monthlyPayment}</p>`
                    }
                    </div>
                    <strong style="color: #28a745;">This plan is now active and cannot be changed.</strong>
                `,
                icon: "success",
                confirmButtonText: "Understood"
            });

            document.getElementById('payment-category').disabled = false;
            document.getElementById('monthly-payment-select').disabled = false;
            document.getElementById('activities').disabled = false;
            document.getElementById('additional-fees').disabled = false;
            document.getElementById('payment-amount').disabled = false;
            document.getElementById('confirm-payment').disabled = false;



            changePlanLabel.textContent = "Selected Plan (Cannot be changed):";

            student.selectedPlan = newPlanKey;
            updatePlanUI(newPlanKey);
        } else {
            planDropdown.value = previousPlanKey;
        }
    } catch (error) {
        console.error("Error:", error);
        planDropdown.value = previousPlanKey;
        Swal.fire("Error", "Failed to process plan selection", "error");
    }
});

// Add this to your initialization code
function initializePaymentCategories() {
    // Always enable these categories
    document.getElementById('activities').disabled = false;
    document.getElementById('additional-fees').disabled = false;

    // Monthly payment starts disabled until plan is selected and OldBalance is 0
    document.getElementById('monthly-payment-select').disabled = true;
}

// Call this when the page loads
initializePaymentCategories();
//////////////////////////////////////////////////-----DISCOUNTS----/////////////////////////////////////////////////////////////////////////// 

async function loadAvailableDiscounts(selectedDiscountKey) {
    const discountDropdown = document.getElementById("discount");

    try {
        // Load student data
        const studentRef = ref(db, `${getStudentRoot()}/${student.studentId}`);
        const studentSnapshot = await get(studentRef);
        const studentData = studentSnapshot.val() || {};

        // Clear dropdown and add default option
        discountDropdown.innerHTML = "<option value=''>Select a Discount</option>";

        // Add hardcoded full scholarship first
        const scholarshipOption = document.createElement("option");
        scholarshipOption.value = "FULL_SCHOLARSHIP";
        scholarshipOption.textContent = "Full Scholarship - ₱0";
        scholarshipOption.selected = "FULL_SCHOLARSHIP" === studentData.selectedDiscount;
        discountDropdown.appendChild(scholarshipOption);

        // Load and add database discounts
        const snapshot = await get(ref(db, "discounts"));
        if (snapshot.exists()) {
            const discountsData = snapshot.val();
            for (const [key, discount] of Object.entries(discountsData)) {
                const option = document.createElement("option");
                option.value = key;
                option.textContent = `${discount.discountName} - ₱${discount.discountAmount}`;
                option.selected = key === studentData.selectedDiscount;
                discountDropdown.appendChild(option);
            }
        }

        // Update UI
        if (studentData.selectedDiscount) {
            updateDiscountUI(studentData.Discount, studentData.selectedDiscount);
        }
    } catch (error) {
        console.error("Error loading discounts:", error);
    }
}
function saveSelectedDiscount(studentId, discountKey, discountText) {
    if (!studentId) {
        console.error("No student selected.");
        return;
    }

    const studentRoot = getStudentRoot();
    const studentRef = ref(db, `${studentRoot}/${studentId}`);
    update(studentRef, {
        selectedDiscount: discountKey,
        selectedDiscountText: discountText
    })
        .then(() => {
            student.selectedDiscount = discountKey;
            student.selectedDiscountText = discountText;

            updateDiscountUI(discountText, discountKey);

            Swal.fire({
                icon: 'success',
                title: 'Discount Applied',
                text: 'Discount has been locked and applied successfully.',
                confirmButtonText: 'Okay'
            });
        })
        .catch(error => {
            console.error("Error updating discount:", error);
            Swal.fire("Error", "Failed to save discount.", "error");
        });
}
document.getElementById("discount")?.addEventListener("change", async (event) => {
    const selectedDiscountKey = event.target.value;
    const previousDiscountKey = student.selectedDiscount || "";

    if (!selectedDiscountKey) return;

    try {
        let discount;
        // Handle hardcoded full scholarship
        if (selectedDiscountKey === "FULL_SCHOLARSHIP") {
            discount = {
                discountName: "Full Scholarship",
                discountAmount: 0,
                isFullScholarship: true
            };
        } else {
            // Handle database discounts
            const discountSnapshot = await get(ref(db, `discounts/${selectedDiscountKey}`));
            if (!discountSnapshot.exists()) throw new Error("Discount not found");
            discount = discountSnapshot.val();
        }

        const confirmation = await Swal.fire({
            title: "Apply Discount?",
            html: `
                <div style="text-align: left;">
                    <p><strong>Discount Name:</strong> ${discount.discountName}</p>
                    <p><strong>Amount:</strong> ₱${discount.discountAmount}</p>
                    ${discount.isFullScholarship ?
                    '<p style="color: #dc3545;"><strong>THIS WILL CLEAR ALL BALANCES!</strong></p>' :
                    '<p style="color: #dc3545;"><strong>This discount will be locked until manually removed.</strong></p>'}
                </div>
            `,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Apply Discount",
            cancelButtonText: "Cancel",
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33"
        });

        if (confirmation.isConfirmed) {
            const studentRef = ref(db, `${getStudentRoot()}/${student.studentId}`);

            const updates = {
                selectedDiscount: selectedDiscountKey,
                Discount: discount.discountName,
                discountAmount: discount.discountAmount
            };

            if (discount.isFullScholarship) {
                const studentSnapshot = await get(studentRef);
                const studentData = studentSnapshot.val() || {};

                // Clear all balances
                updates.OldBalance = 0;
                updates.remainingBalance = 0;

                // Reset activity balances
                if (studentData.activitiesBalances) {
                    updates.activitiesBalances = Object.keys(studentData.activitiesBalances).reduce((acc, key) => {
                        acc[key] = { ...studentData.activitiesBalances[key], remaining: 0 };
                        return acc;
                    }, {});
                }

                // Reset fee balances
                if (studentData.feeBalances) {
                    updates.feeBalances = Object.keys(studentData.feeBalances).reduce((acc, key) => {
                        acc[key] = { ...studentData.feeBalances[key], remaining: 0 };
                        return acc;
                    }, {});
                }

                // Handle tuition payments
                if (studentData.selectedPlan) {
                    const planSnapshot = await get(ref(db, `plans/${studentData.selectedPlan}`));
                    const plan = planSnapshot.val();
                    updates.paidDownpayment = plan.downPayment || 0;
                    updates.paidMonthlyAmount = (plan.monthlyPayment || 0) * 10;
                }
            }

            await update(studentRef, updates);

            // Update local student object
            student.selectedDiscount = selectedDiscountKey;
            student.Discount = discount.discountName;
            student.discountAmount = discount.discountAmount;

            // Update UI
            updateDiscountUI(discount.discountName, selectedDiscountKey);

            Swal.fire({
                icon: 'success',
                title: discount.isFullScholarship ? 'Full Scholarship Applied' : 'Discount Applied',
                text: discount.isFullScholarship
                    ? 'All balances have been cleared permanently!'
                    : 'Discount has been locked and applied successfully.',
                confirmButtonText: 'Okay'
            });
        } else {
            event.target.value = previousDiscountKey;
            updateDiscountUI(student.Discount, student.selectedDiscount);
        }
    } catch (error) {
        console.error("Error applying discount:", error);
        event.target.value = previousDiscountKey;
        updateDiscountUI(student.Discount, student.selectedDiscount);
        Swal.fire({
            icon: 'error',
            title: 'Application Failed',
            text: error.message.includes("not found")
                ? 'The selected discount is no longer available'
                : 'Failed to apply discount',
            confirmButtonText: 'Okay'
        });
    }
});

function updateDiscountUI(discountText, discountKey) {
    const discountName = document.getElementById("selected-discount-text");
    const discountAmount = document.getElementById("selected-discount-amount");
    const discountDropdown = document.getElementById("discount");

    if (discountKey) {
        discountName.textContent = discountText;

        if (discountKey === "FULL_SCHOLARSHIP") {
            discountAmount.textContent = "₱0";
        } else {
            get(ref(db, `discounts/${discountKey}`)).then(snap => {
                if (snap.exists()) {
                    discountAmount.textContent = `₱${snap.val().discountAmount}`;
                }
            });
        }

        discountDropdown.value = discountKey;
        discountDropdown.disabled = true;
        document.getElementById("remove-discount-btn").style.display = "block";
    } else {
        discountName.textContent = "None";
        discountAmount.textContent = "₱0";
        discountDropdown.value = "";
        discountDropdown.disabled = false;
        document.getElementById("remove-discount-btn").style.display = "none";
    }
}

function removeDiscount(studentId) {
    if (!studentId) {
        console.error("No student selected.");
        return;
    }

    const studentRoot = getStudentRoot();
    const studentRef = ref(db, `${studentRoot}/${studentId}`);

    // First get current student data to check discount type and backup values
    get(studentRef).then(studentSnapshot => {
        const studentData = studentSnapshot.val() || {};
        const wasFullScholarship = studentData.selectedDiscount === "FULL_SCHOLARSHIP";

        const updates = {
            selectedDiscount: null,
            selectedDiscountText: "None",
            discountAmount: 0
        };

        if (wasFullScholarship) {
            // Restore original values from backup fields
            updates.paidDownpayment = studentData.originalPaidDownpayment || 0;
            updates.paidMonthlyAmount = studentData.originalPaidMonthlyAmount || 0;
            updates.paidActivityAmount = studentData.originalPaidActivityAmount || 0;
            updates.paidFeesAmount = studentData.originalPaidFeesAmount || 0;
            updates.OldBalance = studentData.originalOldBalance || 0;

            // Restore activity and fee balances
            updates.activitiesBalances = studentData.originalActivitiesBalances || {};
            updates.feeBalances = studentData.originalFeeBalances || {};

            // Clear backup fields
            updates.originalPaidDownpayment = null;
            updates.originalPaidMonthlyAmount = null;
            updates.originalPaidActivityAmount = null;
            updates.originalPaidFeesAmount = null;
            updates.originalOldBalance = null;
            updates.originalActivitiesBalances = null;
            updates.originalFeeBalances = null;
        }

        return update(studentRef, updates);
    })
        .then(() => {
            // Refresh all calculations
            return updateBalanceSummary();
        })
        .then(() => {
            // Update local student object
            student.selectedDiscount = null;
            student.selectedDiscountText = "None";
            updateDiscountUI("None", null);

            Swal.fire({
                icon: 'success',
                title: 'Discount Removed',
                text: 'All calculations have been reverted to pre-scholarship state',
                confirmButtonText: 'Okay'
            });
        })
        .catch(error => {
            console.error("Error removing discount:", error);
            Swal.fire("Error", "Failed to remove discount and revert calculations", "error");
        });
}

document.getElementById("remove-discount-btn")?.addEventListener("click", () => {
    if (student && student.studentId) {
        removeDiscount(student.studentId);
    }
});

if (studentData) {
    try {
        student = JSON.parse(decodeURIComponent(studentData));

        // Add real-time listener
        const studentDataRef = ref(db, `${getStudentRoot()}/${student.studentId}`);
        onValue(studentDataRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                updateDiscountUI(data.Discount, data.selectedDiscount);
            }
        });

        console.log(student); // Log the student object to debug

        if (!student.name || !student.grade) {
            console.error("Student data is missing name or grade");
        }

        document.getElementById("student-name").textContent = student.name || "None";
        document.getElementById("student-number").textContent = student.studentId || "None";
        document.getElementById("grade-level").textContent = student.grade || "None";

        let studentRef;
        switch (student.type) {
            case 'dropout':
                studentRef = ref(db, `Dropouts/${student.studentId}`);
                break;
            case 'repeater':
                studentRef = ref(db, `Repeaters/${student.studentId}`);
                break;
            default:
                studentRef = ref(db, `Students/CurrentSchoolYear/${student.studentId}`);
        }

        get(studentRef).then(snapshot => {
            if (snapshot.exists()) {
                const studentData = snapshot.val();

                const selectedPlanKey = studentData.selectedPlan;
                const selectedDiscountKey = studentData.selectedDiscount;

                if (selectedPlanKey) {
                    get(ref(db, `plans/${selectedPlanKey}`)).then(planSnapshot => {
                        if (planSnapshot.exists()) {
                            const plan = planSnapshot.val();
                            updatePlanUI(selectedPlanKey); // Update the UI with plan details
                        }
                    }).catch(error => console.error("Error fetching plan:", error));
                }
                if (selectedDiscountKey) {
                    get(ref(db, `discounts/${selectedDiscountKey}`)).then(discountSnapshot => {
                        if (discountSnapshot.exists()) {
                            const discount = discountSnapshot.val();
                            updateDiscountUI(discount.discountName, selectedDiscountKey); // Update the UI with discount details
                        }
                    }).catch(error => console.error("Error fetching discount:", error));
                }

            }
        }).catch(error => {
            console.error("Error fetching student data:", error);
        });

        const oldBalance = studentData.OldBalance || 0;
        document.getElementById('monthly-payment-select').disabled = oldBalance > 0;

        loadPlansForStudent(student.grade, student.selectedPlan); // Load plans based on student grade
        loadAvailableDiscounts(student.selectedDiscount);
        enableDropdowns(); // Enable dropdowns once data is loaded

    } catch (error) {
        console.error("Error parsing student data:", error);
    }
} else {
    console.error("No student data in URL parameters.");
}

//////////////////////////////////////////////////-----Add Fees & Activities-----/////////////////////////////////////////////////////////////////////////// 

document.querySelector(".activity-button").addEventListener("click", openModal);

async function openModal() {
    document.getElementById("modal").style.display = "block";
    await loadActivities();
    await loadAdditionalFees();
}

document.getElementById("close-modal").addEventListener("click", closeModal);

function closeModal() {
    document.getElementById("modal").style.display = "none";
}
// Add this helper function to determine the student's grade category
function getGradeCategory(gradeLevel) {
    // Handle numbers/undefined/null and convert to string
    const grade = String(gradeLevel || "").toLowerCase().trim();

    // First check for pre-elementary keywords
    if (grade.includes('nursery') ||
        grade.includes('kinder') ||
        grade.includes('pre elem')) {
        return 'preElem';
    }

    // Extract numeric value if exists
    const gradeNumber = parseInt(grade.replace(/\D/g, ''), 10) || 0;

    if (gradeNumber >= 1 && gradeNumber <= 6) {
        return 'elem';
    } else if (gradeNumber >= 7 && gradeNumber <= 10) {
        return 'jh';
    } else if (gradeNumber >= 11 && gradeNumber <= 12) {
        return 'sh';
    }
    return 'unknown';
}

async function loadActivities() {
    const container = document.getElementById("activities-container");
    container.innerHTML = "";

    try {
        const snapshot = await get(ref(db, "activities"));
        if (snapshot.exists()) {
            const activitiesData = snapshot.val();
            const studentRoot = getStudentRoot();
            const studentRef = ref(db, `${studentRoot}/${student.studentId}`);
            const studentSnapshot = await get(studentRef);
            const studentData = studentSnapshot.val() || {};
            const gradeCategory = getGradeCategory(student.grade);

            const activitiesBalances = studentData.activitiesBalances || {};
            const selectedActivities = normalizeSelection(studentData.selectedActivity);

            for (const activityKey in activitiesData) {
                const activity = activitiesData[activityKey];
                const activityGrades = activity.grades || {};
                if (!activityGrades[gradeCategory]) {
                    continue; // Skip activities not applicable to the student's grade
                }

                const checkboxDiv = document.createElement("div");
                checkboxDiv.classList.add("activity-option");

                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.value = activityKey;
                checkbox.id = `activity-${activityKey}`;

                const activityBalance = activitiesBalances[activityKey];
                const remaining = activityBalance?.remaining ?? activity.amount;

                if (remaining <= 0) {
                    checkbox.checked = false;
                    checkbox.disabled = true;
                } else {
                    checkbox.checked = selectedActivities.includes(activityKey);
                    checkbox.disabled = false;
                }

                const label = document.createElement("label");
                label.setAttribute("for", `activity-${activityKey}`);
                label.textContent = `${activity.name} - ₱${activity.amount}`;

                checkboxDiv.append(checkbox, label);
                container.appendChild(checkboxDiv);
            }
        }
    } catch (error) {
        console.error("Error loading activities:", error);
    }
}

async function loadAdditionalFees() {
    const container = document.getElementById("additional-fees-container");
    container.innerHTML = "";

    try {
        const snapshot = await get(ref(db, "fees"));
        if (snapshot.exists()) {
            const feesData = snapshot.val();
            const studentRoot = getStudentRoot();
            const studentRef = ref(db, `${studentRoot}/${student.studentId}`);
            const studentSnapshot = await get(studentRef);
            const studentData = studentSnapshot.val();
            const gradeCategory = getGradeCategory(student.grade);

            const selectedFees = studentData.selectedFees || [];
            const feeBalances = studentData.feeBalances || {};

            for (const feeKey in feesData) {
                const fee = feesData[feeKey];
                const isRequired = fee.required || false;
                const feeGrades = fee.grades || {};
                if (!isRequired && !feeGrades[gradeCategory]) {
                    continue; // Skip fees not applicable to the student's grade and not required
                }

                const checkboxDiv = document.createElement("div");
                checkboxDiv.classList.add("fee-option");

                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.value = feeKey;
                checkbox.id = feeKey;

                const feeBalance = feeBalances[feeKey];
                if (feeBalance && feeBalance.remaining <= 0) {
                    checkbox.checked = false;
                    checkbox.disabled = true;
                } else {
                    checkbox.checked = selectedFees.includes(feeKey);
                    checkbox.disabled = false;
                }

                const label = document.createElement("label");
                label.setAttribute("for", feeKey);
                label.textContent = `${fee.name} - ₱${fee.amount}`;

                checkboxDiv.appendChild(checkbox);
                checkboxDiv.appendChild(label);
                container.appendChild(checkboxDiv);
            }
        } else {
            console.log("No fees found.");
        }
    } catch (error) {
        console.error("Error fetching fees:", error);
    }
}

document.getElementById("save-selection").addEventListener("click", async () => {
    const date = new Date();
    const padZero = (num) => String(num).padStart(2, '0');
    const formattedDate = `${padZero(date.getMonth() + 1)}-${padZero(date.getDate())}-${date.getFullYear()}`;

    try {
        const studentRoot = getStudentRoot();
        const studentRef = ref(db, `${studentRoot}/${student.studentId}`);
        const studentSnapshot = await get(studentRef);
        const studentData = studentSnapshot.val() || {};

        const existingFeeBalances = studentData.feeBalances || {};
        const existingActivityBalances = studentData.activitiesBalances || {};

        const selectedActivities = Array.from(
            document.querySelectorAll("#activities-container input[type='checkbox']:checked")
        ).map(checkbox => checkbox.value);

        const selectedFees = Array.from(
            document.querySelectorAll("#additional-fees-container input[type='checkbox']:checked")
        ).map(checkbox => checkbox.value);

        const activitiesSnapshot = await get(ref(db, "activities"));
        const activitiesData = activitiesSnapshot.val() || {};
        const activitiesBalances = { ...existingActivityBalances };

        selectedActivities.forEach(activityId => {
            if (!activitiesBalances[activityId] && activitiesData[activityId]) {
                activitiesBalances[activityId] = {
                    name: activitiesData[activityId].name,
                    amount: activitiesData[activityId].amount,
                    remaining: activitiesData[activityId].amount
                };
            }
        });

        Object.keys(activitiesBalances).forEach(activityId => {
            if (!selectedActivities.includes(activityId) && activitiesBalances[activityId].remaining > 0) {
                delete activitiesBalances[activityId];
            }
        });

        const feesSnapshot = await get(ref(db, "fees"));
        const feesData = feesSnapshot.val() || {};
        const feeBalances = { ...existingFeeBalances };

        selectedFees.forEach(feeId => {
            if (!feeBalances[feeId] && feesData[feeId]) {
                feeBalances[feeId] = {
                    name: feesData[feeId].name,
                    amount: feesData[feeId].amount,
                    remaining: feesData[feeId].amount
                };
            }
        });

        Object.keys(feeBalances).forEach(feeId => {
            if (!selectedFees.includes(feeId) && feeBalances[feeId].remaining > 0) {
                delete feeBalances[feeId];
            }
        });

        const activityTotal = Object.values(activitiesBalances).reduce((sum, activity) => sum + activity.remaining, 0);
        const feeTotal = Object.values(feeBalances).reduce((sum, fee) => sum + fee.remaining, 0);

        const { isConfirmed } = await Swal.fire({
            title: 'Confirm Selection',
            html: `
                <div class="text-left">
                    ${selectedActivities.length ? `
                        <h6>Selected Activities (₱${activityTotal.toFixed(2)})</h6>
                        <div class="ms-3">${await formatActivityNames(selectedActivities)}</div>
                    ` : ''}
                    
                    ${selectedFees.length ? `
                        <h6 class="mt-2">Selected Fees (₱${feeTotal.toFixed(2)})</h6>
                        <div class="ms-3">${await formatFeeNames(selectedFees)}</div>
                    ` : ''}
                    
                    <hr>
                    <h5>New Totals:</h5>
                    <div class="ms-3">
                        <strong>Activity Total:</strong> ₱${activityTotal.toFixed(2)}<br>
                        <strong>Fees Total:</strong> ₱${feeTotal.toFixed(2)}
                    </div>
                </div>
            `,
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: 'Confirm',
            cancelButtonText: 'Cancel',
        });

        if (isConfirmed) {
            await update(studentRef, {
                selectedActivity: selectedActivities,
                selectedFees: selectedFees,
                activitiesBalances: activitiesBalances,
                feeBalances: feeBalances,
                totalActivityPrice: activityTotal,
                totalFeesPrice: feeTotal,
                lastUpdated: formattedDate
            });

            Swal.fire('Saved!', 'Selection updated successfully', 'success');
            closeModal();
            updateBalanceSummary();
        }
    } catch (error) {
        console.error("Save error:", error);
        Swal.fire('Error', 'Failed to save selection', 'error');
    }
});

async function formatActivityNames(activityIds) {
    const names = [];
    for (const id of activityIds) {
        const snapshot = await get(ref(db, `activities/${id}`));
        if (snapshot.exists()) {
            const activity = snapshot.val();
            names.push(`${activity.name} (₱${activity.amount})`);
        }
    }
    return names.join('<br>');
}

async function formatFeeNames(feeIds) {
    const names = [];
    for (const id of feeIds) {
        const snapshot = await get(ref(db, `fees/${id}`));
        if (snapshot.exists()) {
            const fee = snapshot.val();
            names.push(`${fee.name} (₱${fee.amount})`);
        }
    }
    return names.join('<br>');
}

//////////////////////////////////////////////////-----BALANCE-----/////////////////////////////////////////////////////////////////////////// 

async function updateBalanceSummary() {
    try {
        const studentRoot = getStudentRoot();
        const studentRef = ref(db, `${studentRoot}/${student.studentId}`);
        const studentSnapshot = await get(studentRef);
        const studentData = studentSnapshot.val() || {};

        // Handle full scholarship first
        if (studentData.selectedDiscount === "FULL_SCHOLARSHIP") {
            const updates = {
                remainingBalance: 0,
                OldBalance: 0
            };

            // Update database
            await update(studentRef, updates);

            // Safely update UI elements
            const safeUpdate = (elementId, value) => {
                const el = document.getElementById(elementId);
                if (el) el.textContent = value;
            };

            safeUpdate("remaining-balance", "₱0.00");
            safeUpdate("discount-amount", "₱0.00");
            safeUpdate("old-balance-amount", "₱0.00");
            return;
        }

        // Proceed with normal calculations
        const selectedActivityIds = studentData.selectedActivity
            ? Array.isArray(studentData.selectedActivity)
                ? studentData.selectedActivity
                : Object.values(studentData.selectedActivity)
            : [];

        const selectedFees = studentData.selectedFees
            ? Array.isArray(studentData.selectedFees)
                ? studentData.selectedFees
                : Object.values(studentData.selectedFees)
            : [];

        // Balance calculations
        const activitiesBalances = studentData.activitiesBalances || {};
        const feeBalances = studentData.feeBalances || {};

        const totalActivityPrice = Object.values(activitiesBalances).reduce(
            (sum, activity) => sum + (activity.remaining || 0), 0
        );

        const totalFeesPrice = Object.values(feeBalances).reduce(
            (sum, fee) => sum + (fee.remaining || 0), 0
        );

        const paidActivity = parseFloat(studentData.paidActivityAmount) || 0;
        const paidFees = parseFloat(studentData.paidFeesAmount) || 0;

        // Previous balance handling
        let prevBal = 0;
        if (student.source !== 'archive') {
            prevBal = studentData.OldBalance || 0;
        } else {
            const previousSYKey = await getPreviousSchoolYearKey();
            if (previousSYKey) {
                const schoolYearRef = ref(db, `SchoolYear/${previousSYKey}/Balance/${student.studentId}`);
                const schoolYearSnapshot = await get(schoolYearRef);
                prevBal = schoolYearSnapshot.exists()
                    ? schoolYearSnapshot.val().OldBalance || 0
                    : 0;
            }
        }

        // Main balance calculation logic
        let remainingBalance = 0;
        let monthlyPayment = 0;
        let discountAmount = 0;
        let tuitionFee = 0;

        if (student.type === 'dropout') {
            const planSnapshot = await get(ref(db, `plans/${studentData.selectedPlan}`));
            const planData = planSnapshot.val() || {};
            monthlyPayment = planData.monthlyPayment || 0;

            const tuitionBalance = Math.max(
                (studentData.MonthsAttended * monthlyPayment) -
                (studentData.paidMonthlyAmount || 0),
                0
            );

            remainingBalance = tuitionBalance +
                Object.values(studentData.feeBalances || {}).reduce((sum, fee) => sum + (fee.remaining || 0), 0) +
                Object.values(studentData.activitiesBalances || {}).reduce((sum, activity) => sum + (activity.remaining || 0), 0);
        }
        else if (student.source === 'archive') {
            remainingBalance = prevBal;
        }
        else {
            // Current student calculations
            const gradeLevel = student.grade;
            const tuitionFeeKey = gradeLevel === "Pre-Elem" ? "Pre-Elem" : `grade${gradeLevel}`;

            const [
                planSnapshot,
                discountSnapshot,
                tuitionFeeSnapshot
            ] = await Promise.all([
                get(ref(db, `plans/${studentData.selectedPlan}`)),
                get(ref(db, `discounts/${studentData.selectedDiscount}`)),
                get(ref(db, `tuitionFees/${tuitionFeeKey}`))
            ]);

            const planData = planSnapshot.val() || {};
            const discountData = discountSnapshot.val() || {};
            const tuitionData = tuitionFeeSnapshot.val() || {};

            const downPayment = planData.downPayment || 0;
            monthlyPayment = planData.monthlyPayment || 0;
            discountAmount = discountData.discountAmount || 0;
            tuitionFee = tuitionData.tuitionFee || (downPayment + (monthlyPayment * 10));

            let remainingTuitionFee;
            const paidDownpayment = studentData.paidDownpayment || 0;

            if (planData.name === 'C') {
                remainingTuitionFee = Math.max(tuitionFee - discountAmount - paidDownpayment, 0);
            } else {
                const remainingDownpayment = Math.max(downPayment - paidDownpayment, 0);
                const tuitionAfterDownpayment = tuitionFee - discountAmount - downPayment;
                remainingTuitionFee = Math.max(tuitionAfterDownpayment, 0) + remainingDownpayment;
            }

            const paidMonthly = parseFloat(studentData.paidMonthlyAmount) || 0;
            remainingBalance = remainingTuitionFee - paidMonthly +
                (totalActivityPrice - paidActivity) +
                (totalFeesPrice - paidFees) +
                prevBal;
        }

        // Update database
        await update(studentRef, { remainingBalance });

        // Safe UI updates with null checks
        const safeUpdate = (elementId, value) => {
            const el = document.getElementById(elementId);
            if (el) el.textContent = value;
        };

        safeUpdate("remaining-balance", `₱${remainingBalance.toFixed(2)}`);
        safeUpdate("monthly-payment", `₱${monthlyPayment.toFixed(2)}`);
        safeUpdate("discount-amount", `₱${discountAmount.toFixed(2)}`);
        safeUpdate("tuition-fee", `₱${tuitionFee.toFixed(2)}`);
        safeUpdate("total-fee-price", `₱${totalFeesPrice.toFixed(2)}`);
        safeUpdate("additional-fees-amount", `₱${totalFeesPrice.toFixed(2)}`);

        // Load activity names
        const activityNames = await Promise.all(
            selectedActivityIds.map(async (id) => {
                const snapshot = await get(ref(db, `activities/${id}`));
                return snapshot.val()?.name || 'Unknown Activity';
            })
        );
        safeUpdate("activity-name",
            activityNames.length > 0 ? activityNames.join(", ") : 'No Activities Selected');
        safeUpdate("activity-price",
            `₱${Object.values(activitiesBalances).reduce((sum, a) => sum + (a.remaining || 0), 0).toFixed(2)}`);

        // Load fee names
        const feeNames = await Promise.all(
            selectedFees.map(async (id) => {
                const snapshot = await get(ref(db, `fees/${id}`));
                return snapshot.val()?.name || 'Unknown Fee';
            })
        );
        safeUpdate("selected-fees-list",
            feeNames.length > 0 ? feeNames.join(", ") : 'No Miscellaneous Selected');

    } catch (error) {
        console.error("Balance update error:", error);
        Swal.fire("Error", "Failed to update balance calculations", "error");
    }
}


function setUpRealtimeListeners() {

    if (student) {
        const backButton = document.getElementById('backButton');
        if (backButton) {
            backButton.href = `/html/students.html?search=${encodeURIComponent(student.studentId)}`;
        }
    }

    const studentRoot = getStudentRoot();
    const studentRef = ref(db, `${studentRoot}/${student.studentId}`);

    onValue(studentRef, (snapshot) => {
        if (snapshot.exists()) {
            const studentData = snapshot.val();
            student.OldBalance = studentData.OldBalance || 0;
            student.remainingBalance = studentData.remainingBalance || 0;
            const oldBalance = studentData.OldBalance || 0;
            const hasSelectedPlan = !!studentData.selectedPlan;

            // Update UI elements
            document.getElementById('old-balance-amount').textContent =
                `₱${student.OldBalance.toFixed(2)}`;

            // Always enable these categories
            document.getElementById('activities').disabled = false;
            document.getElementById('additional-fees').disabled = false;

            // Monthly Payment logic
            const monthlyPaymentOption = document.getElementById('monthly-payment-select');
            monthlyPaymentOption.disabled = oldBalance > 0 || !hasSelectedPlan;

            // Enable/disable payment amount and confirm button based on category
            const category = document.getElementById('payment-category').value;
            const isOldBalanceCategory = category === "Old Balance";
            document.getElementById('payment-amount').disabled = false;
            document.getElementById('confirm-payment').disabled = false;

            updateBalanceSummary();
        }
    });

    const tuitionFeeRef = ref(db, `tuitionFees/grade${student.gradeLevel}`);
    onValue(tuitionFeeRef, (snapshot) => {
        if (snapshot.exists()) {
            updateBalanceSummary(); // Recalculate balance if tuition fee changes
        }
    });

    const selectedPlanRef = ref(db, `plans/${student.selectedPlan}`);
    onValue(selectedPlanRef, (snapshot) => {
        if (snapshot.exists()) {
            updateBalanceSummary(); // Recalculate balance if selected plan changes
        }
    });

    const selectedDiscountRef = ref(db, `discounts/${student.selectedDiscount}`);
    onValue(selectedDiscountRef, (snapshot) => {
        if (snapshot.exists()) {
            updateBalanceSummary(); // Recalculate balance if selected discount  changes
        }
    });

    const selectedActivityRef = ref(db, `activities/${student.selectedActivity}`);
    onValue(selectedActivityRef, (snapshot) => {
        if (snapshot.exists()) {
            updateBalanceSummary(); // Recalculate balance if selected activity changes
        }
    });

    const selectedFeesRef = ref(db, `fees/${student.selectedFees}`);
    onValue(selectedFeesRef, (snapshot) => {
        if (snapshot.exists()) {
            updateBalanceSummary(); // Recalculate balance if selected fee changes
        }
    });
}
setUpRealtimeListeners();
updateBalanceSummary();

document.addEventListener("DOMContentLoaded", function () {
    const studentRoot = getStudentRoot();
    const studentRef = ref(db, `${studentRoot}/${student.studentId}`);
    let currentSort = {
        column: 'date',  // Default sort column is date
        direction: 'desc', // Default sort direction is descending
    };

    function sortPayments(paymentsArray) {
        return paymentsArray.sort((a, b) => {
            let comparison = 0;

            if (currentSort.column === 'date') {
                comparison = new Date(b.date) - new Date(a.date); // For date column (most recent first)
            } else if (currentSort.column === 'mode') {
                comparison = a.modeOfPayment.localeCompare(b.modeOfPayment);
            } else if (currentSort.column === 'category') {
                comparison = a.category.localeCompare(b.category);
            }

            if (currentSort.direction === 'asc') {
                comparison = -comparison;
            }

            return comparison;
        });
    }
    let paymentHistoryListener = null;

    async function loadPaymentHistory(category = "Def") {
        const paymentsList = document.getElementById("payments-list");
        paymentsList.innerHTML = "";  // Clear existing content

        if (paymentHistoryListener) {
            paymentHistoryListener();
        }

        try {
            const studentRoot = getStudentRoot(); // Get the correct root path
            const paymentHistoryRef = ref(db, `${studentRoot}/${student.studentId}/paymentHistory`);

            paymentHistoryListener = onValue(paymentHistoryRef, async (snapshot) => {
                paymentsList.innerHTML = "";  // Clear previous content

                if (snapshot.exists()) {
                    const paymentHistory = snapshot.val();
                    let paymentsArray = Object.entries(paymentHistory).map(([key, value]) => ({
                        id: key,
                        ...value
                    }));

                    if (category !== "Def") {
                        paymentsArray = paymentsArray.filter(payment => payment.category === category);
                    }

                    paymentsArray = sortPayments(paymentsArray);

                    const fragment = document.createDocumentFragment();

                    for (const payment of paymentsArray) {
                        const row = await createPaymentRow(payment);
                        fragment.appendChild(row);
                    }

                    paymentsList.appendChild(fragment);
                } else {
                    const row = document.createElement("tr");
                    const cell = document.createElement("td");
                    cell.colSpan = 7;
                    cell.textContent = "No payment history found.";
                    row.appendChild(cell);
                    paymentsList.appendChild(row);
                }
            });

        } catch (error) {
            console.error("Error loading payment history:", error);
            Swal.fire('Error', 'Failed to load payment history. Please try again.', 'error');
        }
    }

    async function createPaymentRow(payment) {
        const row = document.createElement("tr");

        const cells = [
            payment.transactionID || "N/A",
            new Date(payment.date).toLocaleDateString(),
            `₱${payment.amount.toFixed(2)}`,
            payment.modeOfPayment,
            payment.category,
            payment.processedBy
        ];

        cells.forEach(text => {
            const cell = document.createElement("td");
            cell.textContent = text;
            row.appendChild(cell);
        });

        const activityOrFeeCell = document.createElement("td");
        if (payment.category === "Activities") {
            const activityNames = await getActivityNames(payment);
            activityOrFeeCell.textContent = activityNames.join(", ") || "-";
        } else if (payment.category === "Additional Fees") {
            if (payment.appliedFees) {
                const feeDetails = payment.appliedFees.map(f =>
                    `${f.feeName}: ₱${f.amountPaid.toFixed(2)}`
                ).join(", ");
                activityOrFeeCell.textContent = feeDetails;
            } else {
                activityOrFeeCell.textContent = "-";
            }
        } else {
            activityOrFeeCell.textContent = "-";
        }
        row.appendChild(activityOrFeeCell);

        return row;
    }

    async function getActivityNames(payment) {
        const studentRoot = getStudentRoot();
        const studentRef = ref(db, `${studentRoot}/${student.studentId}`);
        const studentSnapshot = await get(studentRef);
        const studentData = studentSnapshot.val();

        if (studentData && studentData.selectedActivity) {
            const activityIds = studentData.selectedActivity;
            let activityNames = [];

            for (let activityId of activityIds) {
                const activitySnapshot = await get(ref(db, `activities/${activityId}`));
                const activityData = activitySnapshot.val();
                if (activityData && activityData.name) {
                    activityNames.push(activityData.name);
                }
            }

            return activityNames;
        }

        return [];
    }

    document.getElementById("payment-category-sort").addEventListener("change", (event) => {
        const category = event.target.value;
        loadPaymentHistory(category);
    });

    document.getElementById("date-header").addEventListener("click", function () {
        currentSort.column = 'date';
        currentSort.direction = currentSort.direction === 'desc' ? 'asc' : 'desc';
        loadPaymentHistory();
    });

    document.getElementById("mode-header").addEventListener("click", function () {
        currentSort.column = 'mode';
        currentSort.direction = currentSort.direction === 'desc' ? 'asc' : 'desc';
        loadPaymentHistory();
    });

    document.getElementById("category-header").addEventListener("click", function () {
        currentSort.column = 'category';
        currentSort.direction = currentSort.direction === 'desc' ? 'asc' : 'desc';
        loadPaymentHistory();
    });

    loadPaymentHistory();
});

//////////////////////////////////////////////////-----PAYMENT----/////////////////////////////////////////////////////////////////////////// 

function setupPaymentListeners() {
    const studentRoot = getStudentRoot();
    const studentRef = ref(db, `${studentRoot}/${student.studentId}`);

    onValue(studentRef, (snapshot) => {
        if (snapshot.exists()) {
            loadPaymentDataFromSnapshot(snapshot);
        }
    });

    onValue(ref(db, 'activities'), () => updateActivityPrices());
    onValue(ref(db, 'fees'), () => updateFeePrices());
    onValue(ref(db, 'plans'), () => updatePlanPrices());
    onValue(ref(db, 'discounts'), () => updateBalanceSummary());
    onValue(ref(db, 'tuitionFees'), () => updateBalanceSummary());

}

async function loadAdditionalFeeSelection() {
    const container = document.getElementById("additional-fee-checkboxes");
    container.innerHTML = "";

    try {
        const studentRoot = getStudentRoot();
        const studentRef = ref(db, `${studentRoot}/${student.studentId}`);
        const snapshot = await get(studentRef);
        const studentData = snapshot.val() || {};

        const feeBalances = studentData.feeBalances || {};
        const selectedFees = studentData.selectedFees || [];

        const feesSnapshot = await get(ref(db, "fees"));
        const feesData = feesSnapshot.val() || {};

        for (const [feeId, balance] of Object.entries(feeBalances)) {
            if (balance.remaining <= 0) continue;

            const feeName = feesData[feeId]?.name || "Unknown Fee";

            const div = document.createElement("div");
            div.className = "fee-payment-option";

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.value = feeId;
            checkbox.id = `fee-${feeId}`;
            checkbox.dataset.remaining = balance.remaining; // Add data attribute

            checkbox.addEventListener('change', updateAdditionalFeesAmount);

            const label = document.createElement("label");
            label.htmlFor = `fee-${feeId}`;
            label.textContent = `${feeName} - Remaining: ₱${balance.remaining.toFixed(2)}`;

            div.append(checkbox, label);
            container.appendChild(div);
        }

        updateAdditionalFeesAmount();

    } catch (error) {
        console.error("Error loading fee selection:", error);
        Swal.fire("Error", "Failed to load fee options", "error");
    }
}

// Modify loadActivitySelection function
async function loadActivitySelection() {
    const container = document.getElementById("activities-checkboxes");
    container.innerHTML = "";

    try {
        const studentRoot = getStudentRoot();
        const studentRef = ref(db, `${studentRoot}/${student.studentId}`);
        const snapshot = await get(studentRef);
        const studentData = snapshot.val() || {};
        const activitiesBalances = studentData.activitiesBalances || {};

        for (const [activityId, balance] of Object.entries(activitiesBalances)) {
            if (balance.remaining <= 0) continue;

            const div = document.createElement("div");
            div.className = "activity-payment-option";

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.value = activityId;
            checkbox.id = `activity-${activityId}`;
            checkbox.dataset.remaining = balance.remaining;

            // Add change listener to update activities amount
            checkbox.addEventListener('change', updateActivitiesAmount);

            const label = document.createElement("label");
            label.htmlFor = `activity-${activityId}`;
            label.textContent = `${balance.name} - Remaining: ₱${balance.remaining.toFixed(2)}`;

            div.append(checkbox, label);
            container.appendChild(div);
        }

        // Initial update
        updateActivitiesAmount();
    } catch (error) {
        console.error("Error loading activities:", error);
    }
}

function updateAdditionalFeesAmount() {
    const checkedBoxes = document.querySelectorAll('#additional-fee-checkboxes input[type="checkbox"]:checked');
    let total = 0;
    checkedBoxes.forEach(checkbox => {
        total += parseFloat(checkbox.dataset.remaining) || 0;
    });
    document.getElementById('additional-fees-amount').textContent = `${total.toFixed(2)}`;
}

async function loadPaymentDataFromSnapshot(studentSnapshot) {
    const studentData = studentSnapshot.val();

    if (studentData) {
        const selectedActivityIds = normalizeSelection(studentData.selectedActivity);
        const selectedFees = normalizeSelection(studentData.selectedFees);
        const selectedPlanKey = studentData.selectedPlan;

        const planSnapshot = await get(ref(db, `plans/${selectedPlanKey}`));
        const planData = planSnapshot.val();
        const monthlyPayment = planData?.monthlyPayment || 0;
        document.getElementById("monthly-payment-amount").textContent = `₱${monthlyPayment.toFixed(2)}`;

        const activityTotal = await calculateTotal(selectedActivityIds, 'activities', 'amount');
        document.getElementById("activities-amount").textContent = `${activityTotal.toFixed(2)}`;

        updateList('activities-list', selectedActivityIds, 'activities');
        updateList('additional-fees-list', selectedFees, 'fees');
    }
}

function updateActivitiesAmount() {
    const checkedBoxes = document.querySelectorAll('#activities-checkboxes input[type="checkbox"]:checked');
    let total = 0;
    checkedBoxes.forEach(checkbox => {
        total += parseFloat(checkbox.dataset.remaining) || 0;
    });
    document.getElementById('activities-amount').textContent = `₱${total.toFixed(2)}`;
}

function normalizeSelection(selection) {
    if (!selection) return [];
    return Array.isArray(selection) ? selection : Object.values(selection);
}

async function calculateTotal(ids, path, field) {
    let total = 0;
    for (const id of ids) {
        const snapshot = await get(ref(db, `${path}/${id}`));
        total += parseFloat(snapshot.val()?.[field]) || 0;
    }
    return total;
}

async function updateList(elementId, ids, path) {
    const names = [];
    for (const id of ids) {
        const snapshot = await get(ref(db, `${path}/${id}`));
        names.push(snapshot.val()?.name || `Unknown ${path.slice(0, -1)}`);
    }
    document.getElementById(elementId).textContent =
        names.length > 0 ? names.join(", ") : `No ${path === 'activities' ? 'Activities' : 'Fees'} Selected`;
}

async function updateActivityPrices() {
    const studentRoot = getStudentRoot();
    const studentSnapshot = await get(ref(db, `${studentRoot}/${student.studentId}`));
    const selectedActivityIds = normalizeSelection(studentSnapshot.val()?.selectedActivity);
    const total = await calculateTotal(selectedActivityIds, 'activities', 'amount');
    document.getElementById("activities-amount").textContent = `₱${total.toFixed(2)}`;
}

async function updateFeePrices() {
    const studentRoot = getStudentRoot();
    const studentSnapshot = await get(ref(db, `${studentRoot}/${student.studentId}`));
    const selectedFees = normalizeSelection(studentSnapshot.val()?.selectedFees);
    const total = await calculateTotal(selectedFees, 'fees', 'amount');
    document.getElementById("additional-fees-amount").textContent = `₱${total.toFixed(2)}`;
}

async function updatePlanPrices() {
    const studentRoot = getStudentRoot();
    const studentSnapshot = await get(ref(db, `${studentRoot}/${student.studentId}`));
    const planKey = studentSnapshot.val()?.selectedPlan;
    const planSnapshot = await get(ref(db, `plans/${planKey}`));
    const monthlyPayment = planSnapshot.val()?.monthlyPayment || 0;
    document.getElementById("monthly-payment-amount").textContent = `₱${monthlyPayment.toFixed(2)}`;
}

setupPaymentListeners();

document.getElementById("payment-category").addEventListener("change", (event) => {
    const category = event.target.value;

    document.getElementById("monthly-payment-details").style.display = "none";
    document.getElementById("activity-details").style.display = "none";
    document.getElementById("additional-fee-details").style.display = "none";
    document.getElementById("activities-selection").style.display = "none";
    document.getElementById("additional-fee-selection").style.display = "none";
    document.getElementById("old-balance-details").style.display = "none";

    if (category === "Monthly Payment") {
        document.getElementById("monthly-payment-details").style.display = "block";
    } else if (category === "Activities") {
        document.getElementById("activity-details").style.display = "block";
        document.getElementById("activities-selection").style.display = "block";
        loadActivitySelection(); // This now includes amount updates
    } else if (category === "Additional Fees") {
        document.getElementById("additional-fee-details").style.display = "block";
        document.getElementById("additional-fee-selection").style.display = "block";
        loadAdditionalFeeSelection(); // Load current fee balances
    } else if (category === "Old Balance") {
        document.getElementById("old-balance-details").style.display = "block";
        // Refresh display with latest value
        document.getElementById("old-balance-amount").textContent =
            `₱${student.OldBalance?.toFixed(2) || "0.00"}`;
        document.getElementById('payment-amount').disabled = false;
        document.getElementById('confirm-payment').disabled = false;
    }

});


// 1. Get Previous School Year Key
async function getPreviousSchoolYearKey() {
    const currentSYRef = ref(db, 'CurrentSY');
    const snapshot = await get(currentSYRef);
    if (!snapshot.exists()) return null;

    const currentStart = parseInt(snapshot.val().startSY);
    const currentEnd = parseInt(snapshot.val().endSY);

    // Calculate previous school year (current SY - 1 year)
    const previousSY = {
        start: currentStart - 1,
        end: currentEnd - 1
    };

    return `${previousSY.start}-${previousSY.end}`;
}

// 3. Modified Payment Handler for Old Balances
async function handleOldBalancePayment(studentId, paymentAmount, paymentDetails) {
    const previousSYKey = await getPreviousSchoolYearKey();
    if (!previousSYKey) {
        throw new Error("No previous school year found");
    }

    // Check if student is from archive
    const studentRoot = getStudentRoot(); // Returns "SchoolYear/..." if archive

    const db = getDatabase();
    const dbUpdates = {};
    const newPaymentKey = push(ref(db, 'payments')).key;

    const studentRef = ref(db, `${studentRoot}/${student.studentId}`);
    const [studentSnapshot] = await Promise.all([get(studentRef)]);
    const studentData = studentSnapshot.exists() ? studentSnapshot.val() : {};
    const gradeLevel = studentData.Grade || "";

    if (student.source === 'archive') {
        if (gradeLevel === "12") {
            // Archive student: Update SchoolYear node
            const schoolYearRef = ref(db, `SchoolYear/${previousSYKey}/Balance/${studentId}`);
            const [schoolYearSnapshot] = await Promise.all([
                get(schoolYearRef)
            ]);
            const currentSchoolYear = schoolYearSnapshot.val() || {};
            const schoolYearOldBalance = currentSchoolYear.OldBalance || 0;
            const newSchoolYearOld = Math.max(schoolYearOldBalance - paymentAmount, 0);

            // Update previous school year's Balance
            dbUpdates[`SchoolYear/${previousSYKey}/Balance/${studentId}/OldBalance`] = newSchoolYearOld;
            dbUpdates[`SchoolYear/${previousSYKey}/Balance/${studentId}/remainingBalance`] = newSchoolYearOld;

            // Get current archive's data
            const currentArchiveRef = ref(db, `SchoolYear/${student.schoolYear}/Balance/${studentId}`);
            const currentArchiveSnapshot = await get(currentArchiveRef);
            const currentArchiveData = currentArchiveSnapshot.val() || {};

            // Update feeBalances in current archive
            const feeBalances = currentArchiveData.feeBalances || {};
            for (const feeId in feeBalances) {
                feeBalances[feeId].remaining = Math.max(feeBalances[feeId].remaining - paymentAmount, 0);
            }
            dbUpdates[`SchoolYear/${student.schoolYear}/Balance/${studentId}/feeBalances`] = feeBalances;

            // Update activitiesBalances in current archive
            const activitiesBalances = currentArchiveData.activitiesBalances || {};
            for (const activityId in activitiesBalances) {
                activitiesBalances[activityId].remaining = Math.max(activitiesBalances[activityId].remaining - paymentAmount, 0);
            }
            dbUpdates[`SchoolYear/${student.schoolYear}/Balance/${studentId}/activitiesBalances`] = activitiesBalances;

            // Recalculate total fees and activities
            const totalFeesPrice = Object.values(feeBalances).reduce((sum, fee) => sum + fee.remaining, 0);
            const totalActivityPrice = Object.values(activitiesBalances).reduce((sum, activity) => sum + activity.remaining, 0);
            dbUpdates[`SchoolYear/${student.schoolYear}/Balance/${studentId}/totalFeesPrice`] = totalFeesPrice;
            dbUpdates[`SchoolYear/${student.schoolYear}/Balance/${studentId}/totalActivityPrice`] = totalActivityPrice;

            // Update remaining balance in current archive
            const remainingBalance = newSchoolYearOld + totalFeesPrice + totalActivityPrice;
            dbUpdates[`SchoolYear/${student.schoolYear}/Balance/${studentId}/remainingBalance`] = remainingBalance;

            // Add payment to current archive's payment history
            dbUpdates[`SchoolYear/${student.schoolYear}/Balance/${studentId}/paymentHistory/${newPaymentKey}`] = paymentDetails;
        } else {
            // Get current balances
            const studentRef = ref(db, `Students/CurrentSchoolYear/${studentId}`);
            const schoolYearRef = ref(db, `SchoolYear/${previousSYKey}/Balance/${studentId}`);

            const [studentSnapshot, schoolYearSnapshot] = await Promise.all([
                get(studentRef),
                get(schoolYearRef)
            ]);

            // Student balances
            const currentStudent = studentSnapshot.val() || {};
            const currentRemaining = currentStudent.remainingBalance || 0;
            const currentOldBalance = currentStudent.OldBalance || 0;

            // School Year balances
            const currentSchoolYear = schoolYearSnapshot.val() || {};
            const schoolYearOldBalance = currentSchoolYear.OldBalance || 0;

            // Calculate new balances
            const newRemaining = Math.max(currentRemaining - paymentAmount, 0);
            const newStudentOld = Math.max(currentOldBalance - paymentAmount, 0);
            const newSchoolYearOld = Math.max(schoolYearOldBalance - paymentAmount, 0);

            // Update Students node
            dbUpdates[`Students/CurrentSchoolYear/${studentId}/remainingBalance`] = newRemaining;
            dbUpdates[`Students/CurrentSchoolYear/${studentId}/OldBalance`] = newStudentOld;

            // Update SchoolYear node
            dbUpdates[`SchoolYear/${previousSYKey}/Balance/${studentId}/OldBalance`] = newSchoolYearOld;
            dbUpdates[`SchoolYear/${previousSYKey}/Balance/${studentId}/remainingBalance`] = newSchoolYearOld;

            dbUpdates[`SchoolYear/${previousSYKey}/Balance/${studentId}/paymentHistory/${newPaymentKey}`] = paymentDetails;
        }
    } else {
        // Get current balances
        const studentRef = ref(db, `Students/CurrentSchoolYear/${studentId}`);
        const schoolYearRef = ref(db, `SchoolYear/${previousSYKey}/Balance/${studentId}`);

        const [studentSnapshot, schoolYearSnapshot] = await Promise.all([
            get(studentRef),
            get(schoolYearRef)
        ]);

        // Student balances
        const currentStudent = studentSnapshot.val() || {};
        const currentRemaining = currentStudent.remainingBalance || 0;
        const currentOldBalance = currentStudent.OldBalance || 0;

        // School Year balances
        const currentSchoolYear = schoolYearSnapshot.val() || {};
        const schoolYearOldBalance = currentSchoolYear.OldBalance || 0;

        // Calculate new balances
        const newRemaining = Math.max(currentRemaining - paymentAmount, 0);
        const newStudentOld = Math.max(currentOldBalance - paymentAmount, 0);
        const newSchoolYearOld = Math.max(schoolYearOldBalance - paymentAmount, 0);

        // Update Students node
        dbUpdates[`Students/CurrentSchoolYear/${studentId}/remainingBalance`] = newRemaining;
        dbUpdates[`Students/CurrentSchoolYear/${studentId}/OldBalance`] = newStudentOld;

        // Update SchoolYear node
        dbUpdates[`SchoolYear/${previousSYKey}/Balance/${studentId}/OldBalance`] = newSchoolYearOld;
        dbUpdates[`SchoolYear/${previousSYKey}/Balance/${studentId}/remainingBalance`] = newSchoolYearOld;

        dbUpdates[`SchoolYear/${previousSYKey}/Balance/${studentId}/paymentHistory/${newPaymentKey}`] = paymentDetails;

        if (student.type === 'dropout') {
            delete dbUpdates[`SchoolYear/${previousSYKey}/Balance/${studentId}/remainingBalance`];
            delete dbUpdates[`Students/CurrentSchoolYear/${studentId}/remainingBalance`];
            delete dbUpdates[`SchoolYear/${student.schoolYear}/Balance/${studentId}/remainingBalance`];
        }

    }
    await update(ref(db), dbUpdates);
}

document.getElementById("confirm-payment").addEventListener("click", async () => {
    const category = document.getElementById("payment-category").value;
    if (category === "preventDefault") {
        Swal.fire('Missing Payment Category', 'Please select a Payment Category.', 'error');
        return;
    }

    const paymentMethod = document.getElementById("payment-mode").value;
    const paymentAmountStr = document.getElementById("payment-amount").value;

    if (!paymentAmountStr || isNaN(paymentAmountStr)) {
        Swal.fire('Invalid Amount', 'Please enter a valid payment amount.', 'error');
        return;
    }

    const paymentAmount = parseFloat(paymentAmountStr);
    if (paymentAmount <= 0) {
        Swal.fire('Invalid Amount', 'Please enter an amount greater than zero.', 'error');
        return;
    }

    const studentRoot = getStudentRoot();
    const studentRef = ref(db, `${studentRoot}/${student.studentId}`);
    const snapshot = await get(studentRef);
    const studentData = snapshot.val();

    if (category === "Monthly Payment") {
        const selectedPlanKey = studentData.selectedPlan;
        const planSnapshot = await get(ref(db, `plans/${selectedPlanKey}`));
        const planData = planSnapshot.val();
        const monthlyPayment = planData?.monthlyPayment || 0;
        const selectDiscount = studentData.selectedDiscount;
        const paidTuition = studentData.paidMonthlyAmount;
        const discountSnapshot = await get(ref(db, `discounts/${selectDiscount}`));
        const discountAmount = discountSnapshot.val()?.discountAmount || 0;

        const RemainTuition = (monthlyPayment * 10) - discountAmount - paidTuition;

        if (RemainTuition < paymentAmount) {
            Swal.fire("Error", "The Entered Amount is Exceeded from the Tuition Fee", "error");
            return;
        }
    } else if (category === "Downpayment") {

        // Get payment values from student data
        const paidDownpayment = studentData.paidDownpayment || 0;
        const discountAmount = studentData.discountAmount || 0;

        // Get grade-based tuition fee
        const gradeLevel = studentData.Grade || "";
        const tuitionFeeKey = ["Nursery", "Kinder 1", "Kinder 2"].includes(gradeLevel)
            ? "Pre-Elem"
            : `grade${gradeLevel}`;
        const tuitionSnapshot = await get(ref(db, `tuitionFees/${tuitionFeeKey}`));
        const tuitionFee = tuitionSnapshot.exists() ? tuitionSnapshot.val() : 0;

        // Calculate remaining tuition after discount and payments
        const remainingTuitionFee = Math.max(tuitionFee - discountAmount - paidDownpayment, 0);

        // Get actual downpayment amount from plan
        const selectedPlanKey = studentData.selectedPlan;
        const planSnapshot = await get(ref(db, `plans/${selectedPlanKey}`));
        const planData = planSnapshot.val();
        const Downpayment = planData?.downPayment || 0;

        // Now validate against actual downpayment amount
        if (paymentAmount > Downpayment) {
            Swal.fire("Error",
                `Downpayment cannot exceed ₱${Downpayment.toFixed(2)}`,
                "error");
            return;
        }
    }
    // Add validation for Activities category
    else if (category === "Activities") {
        const checkedBoxes = document.querySelectorAll('#activities-checkboxes input[type="checkbox"]:checked');
        let total = 0;
        checkedBoxes.forEach(checkbox => {
            total += parseFloat(checkbox.dataset.remaining) || 0;
        });

        if (total < paymentAmount) {
            Swal.fire("Error", "Please Enter the Exact Amount for Selected Activities", "error");
            return;
        }
    }
    else if (category === "Additional Fees") {
        const checkedBoxes = document.querySelectorAll('#additional-fee-checkboxes input[type="checkbox"]:checked');
        let total = 0;
        checkedBoxes.forEach(checkbox => {
            total += parseFloat(checkbox.dataset.remaining) || 0;
        });

        if (total < paymentAmount) {
            Swal.fire("Error", "Please Enter the Exact Amount", "error");
            return;
        }
    }
    else if (category === "Old Balance") {
        const currentBalance = student.OldBalance || 0;

        if (currentBalance <= 0) {
            Swal.fire('Error', 'No remaining old balance', 'error');
            return;
        }

        if (paymentAmount > currentBalance) {
            Swal.fire('Error', `Payment amount exceeds owed balance of ₱${currentBalance.toFixed(2)}`, 'error');
            return;
        }
    }
    // Only add to payment history if not Old Balance
    else if (category !== "Old Balance") {
        const studentRoot = getStudentRoot();
        const paymentRef = push(ref(db, `${studentRoot}/${student.studentId}/paymentHistory`));
        await set(paymentRef, paymentDetails);
    }

    Swal.fire({
        title: 'Confirm Payment',
        html: `
            <strong>Category:</strong> ${category}<br>
            <strong>Amount:</strong> ₱${paymentAmount.toFixed(2)}<br>
            <strong>Payment Method:</strong> ${paymentMethod}
        `,
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Confirm',
        cancelButtonText: 'Cancel',
    }).then(async (result) => {
        if (result.isConfirmed) {
            const date = new Date();
            const padZero = (num) => String(num).padStart(2, '0');
            const selectedDate = document.getElementById('historyDateFilter').value;
            let formattedDate;

            if (selectedDate) {
                const [year, month, day] = selectedDate.split('-');
                formattedDate = `${month}-${day}-${year}`;
            } else {
                // Fallback to current date if empty
                const date = new Date();
                const padZero = (num) => String(num).padStart(2, '0');
                formattedDate = `${padZero(date.getMonth() + 1)}-${padZero(date.getDate())}-${date.getFullYear()}`;
            }

            const processedBy = await getProcessedBy();

            try {
                const updates = {};

                // Initialize paymentDetails here before any conditionals
                const paymentDetails = {
                    transactionID: generateTransactionID(category),
                    date: formattedDate,
                    amount: paymentAmount,
                    modeOfPayment: paymentMethod,
                    category: category,
                    processedBy: processedBy
                };

                if (student.type === 'dropout') {
                    const planSnapshot = await get(ref(db, `plans/${studentData.selectedPlan}`));
                    const planData = planSnapshot.val();
                    const monthlyPayment = planData?.monthlyPayment || 0;

                    const newPaid = (studentData.paidMonthlyAmount || 0) + paymentAmount;
                    const baseBalance = (studentData.MonthsAttended || 0) * monthlyPayment;

                    updates.paidMonthlyAmount = newPaid;
                    updates.remainingBalance = Math.max(baseBalance - newPaid, 0);

                    // Apply the updates to the student's record in the Dropouts node
                    await update(studentRef, updates);

                    // Add payment to history
                    const paymentRef = push(ref(db, `Dropouts/${student.studentId}/paymentHistory`));
                    await set(paymentRef, paymentDetails);
                } else {

                    switch (category) {
                        case "Monthly Payment":
                            updates.paidDownpayment = (studentData.paidDownpayment || 0) + paymentAmount;
                            break;

                        case "Downpayment":
                            // Get fresh student data
                            const studentDataSnapshot = await get(studentRef);
                            const currentStudentData = studentDataSnapshot.val();

                            // Declare all variables first
                            const gradeLevel = currentStudentData.Grade || "";
                            const tuitionFeeKey = ["Nursery", "Kinder 1", "Kinder 2"].includes(gradeLevel)
                                ? "Pre-Elem"
                                : `grade${gradeLevel}`;

                            // Get tuition fee
                            const tuitionSnapshot = await get(ref(db, `tuitionFees/${tuitionFeeKey}`));
                            const tuitionFee = tuitionSnapshot.exists() ? tuitionSnapshot.val() : 0;

                            // Get payment values
                            const discountAmount = currentStudentData.discountAmount || 0;
                            const paidDownpayment = currentStudentData.paidDownpayment || 0;
                            const paidMonthly = currentStudentData.paidMonthlyAmount || 0;
                            const prevBal = currentStudentData.OldBalance || 0;

                            // Calculate balances
                            const totalActivityPrice = Object.values(currentStudentData.activitiesBalances || {})
                                .reduce((sum, activity) => sum + activity.remaining, 0);
                            const totalFeesPrice = Object.values(currentStudentData.feeBalances || {})
                                .reduce((sum, fee) => sum + fee.remaining, 0);

                            // Update downpayment
                            updates.paidDownpayment = paidDownpayment + paymentAmount;

                            // Calculate remaining balance with proper declaration
                            const remainingTuitionFee = Math.max(
                                tuitionFee - discountAmount - updates.paidDownpayment,
                                0
                            );

                            // Declare and calculate remainingBalance
                            const remainingBalance = remainingTuitionFee - paidMonthly +
                                (totalActivityPrice - (currentStudentData.paidActivityAmount || 0)) +
                                (totalFeesPrice - (currentStudentData.paidFeesAmount || 0)) +
                                prevBal;

                            // Add to updates
                            updates.remainingBalance = remainingBalance;
                            break;

                        // In the confirm payment handler (case "Activities")
                        case "Activities":
                            const selectedActivities = Array.from(
                                document.querySelectorAll('#activities-checkboxes input:checked')
                            ).map(cb => cb.value);

                            if (selectedActivities.length === 0) {
                                Swal.fire("Error", "Please select at least one activity to pay", "error");
                                return;
                            }

                            // Get current balances from Dropouts node for dropout students
                            const dropoutActivitiesPath = student.type === 'dropout' ?
                                `Dropouts/${student.studentId}/activitiesBalances` :
                                `${studentRoot}/${student.studentId}/activitiesBalances`;

                            const activitiesSnapshot = await get(ref(db, dropoutActivitiesPath));
                            const activitiesBalances = activitiesSnapshot.exists() ? activitiesSnapshot.val() : {};

                            let remainingPayment = paymentAmount;

                            selectedActivities.forEach(activityId => {
                                if (!activitiesBalances[activityId]) return;

                                const activity = activitiesBalances[activityId];
                                const amountPaid = Math.min(activity.remaining, remainingPayment);

                                activity.remaining -= amountPaid;
                                remainingPayment -= amountPaid;

                                paymentDetails.appliedActivities = paymentDetails.appliedActivities || [];
                                paymentDetails.appliedActivities.push({
                                    activityId,
                                    activityName: activity.name,
                                    amountPaid
                                });
                            });

                            // Update Dropouts node directly for dropout students
                            if (student.type === 'dropout') {
                                await update(ref(db, `Dropouts/${student.studentId}`), {
                                    activitiesBalances,
                                    remainingBalance: studentData.remainingBalance - paymentAmount
                                });
                            } else {
                                updates.activitiesBalances = activitiesBalances;
                            }
                            break;

                        case "Additional Fees":
                            const selectedFees = Array.from(
                                document.querySelectorAll('#additional-fee-checkboxes input:checked')
                            ).map(cb => cb.value);

                            if (selectedFees.length === 0) {
                                Swal.fire("Error", "Please select at least one fee to pay", "error");
                                return;
                            }

                            // Get current balances from Dropouts node for dropout students
                            const dropoutFeesPath = student.type === 'dropout' ?
                                `Dropouts/${student.studentId}/feeBalances` :
                                `${studentRoot}/${student.studentId}/feeBalances`;

                            const feesSnapshot = await get(ref(db, dropoutFeesPath));
                            const feeBalances = feesSnapshot.exists() ? feesSnapshot.val() : {};

                            let feeRemaining = paymentAmount;

                            selectedFees.forEach(feeId => {
                                if (!feeBalances[feeId]) return;

                                const fee = feeBalances[feeId];
                                const amountPaid = Math.min(fee.remaining, feeRemaining);

                                fee.remaining -= amountPaid;
                                feeRemaining -= amountPaid;

                                paymentDetails.appliedFees = paymentDetails.appliedFees || [];
                                paymentDetails.appliedFees.push({
                                    feeId,
                                    feeName: fee.name,
                                    amountPaid
                                });
                            });

                            // Update Dropouts node directly for dropout students
                            if (student.type === 'dropout') {
                                await update(ref(db, `Dropouts/${student.studentId}`), {
                                    feeBalances,
                                    remainingBalance: studentData.remainingBalance - paymentAmount
                                });
                            } else {
                                updates.feeBalances = feeBalances;
                            }
                            break;

                        case "Old Balance":

                            const previousSYKey = await getPreviousSchoolYearKey();
                            if (!previousSYKey) {
                                throw new Error("No previous school year found");
                            }

                            // Get balance from previous school year
                            const schoolYearRef = ref(db, `SchoolYear/${previousSYKey}/Balance/${student.studentId}`);
                            const schoolYearSnapshot = await get(schoolYearRef);
                            const schoolYearBalance = schoolYearSnapshot.exists() ?
                                schoolYearSnapshot.val().OldBalance || 0 : 0;

                            // Validate payment against school year balance
                            if (paymentAmount > schoolYearBalance) {
                                Swal.fire('Error', `Payment exceeds owed balance of ₱${schoolYearBalance.toFixed(2)}`, 'error');
                                return;
                            }

                            // Use the new handler instead of direct updates
                            await handleOldBalancePayment(student.studentId, paymentAmount, paymentDetails);
                            break;
                    }
                    if (category !== "Old Balance") {
                        // Remove the line that deletes remainingBalance for dropouts
                        await update(studentRef, updates);

                        // Determine where to save payment history (correct path for dropouts)
                        const paymentRef = student.source === 'archive'
                            ? push(ref(db, `SchoolYear/${student.schoolYear}/Balance/${student.studentId}/paymentHistory`))
                            : push(ref(db, `${studentRoot}/${student.studentId}/paymentHistory`));

                        await set(paymentRef, paymentDetails);
                    }
                }
                Swal.fire({
                    title: 'Payment Confirmed',
                    text: `You paid ₱${paymentAmount.toFixed(2)} for ${category}.`,
                    icon: 'success'
                }).then(() => {
                    updateBalanceSummary();
                    // This will execute after user clicks "OK" on the success alert
                    location.reload();  // Full page reload
                });

            } catch (error) {
                console.error("Payment error:", error);
                Swal.fire('Error', 'Payment processing failed. Please check console.', 'error');
            }
        }
    });
});

function generateTransactionID(category) {
    const timestamp = new Date().getTime(); // Current timestamp (shortened)
    const randomString = Math.random().toString(36).substr(2, 6); // Random string of 6 characters

    const categoryPrefix = {
        "Activities": "ACT",
        "Monthly Payment": "MP",
        "Additional Fees": "AF",
        "Downpayment": "DP"
    };

    const prefix = categoryPrefix[category] || "GEN"; // Default to "GEN" if category not found
    return `${prefix}-${timestamp.toString().substr(5, 5)}-${randomString}`; // Shorten timestamp and add random string
}

//////////////////////////////////////////////////-----Generate PDF----/////////////////////////////////////////////////////////////////////////// 

async function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("p", "mm", "a4");
    const pageHeight = doc.internal.pageSize.height;

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const studentRoot = getStudentRoot();
    const studentRef = ref(db, `${studentRoot}/${student.studentId}`);
    const paymentHistoryRef = ref(db, `${studentRoot}/${student.studentId}/paymentHistory`);
    const activitiesRef = ref(db, "activities");
    const feesRef = ref(db, "fees");
    const plansRef = ref(db, "plans");
    const tuitionFeesRef = ref(db, "tuitionFees");
    const discountsRef = ref(db, "discounts");

    try {
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
            get(activitiesRef),
            get(feesRef),
            get(plansRef),
            get(tuitionFeesRef),
            get(discountsRef)
        ]);

        const studentData = studentSnapshot.exists() ? studentSnapshot.val() : {};
        const paymentHistory = paymentSnapshot.exists() ? Object.values(paymentSnapshot.val()) : [];
        const activitiesData = activitiesSnapshot.exists() ? activitiesSnapshot.val() : {};
        const feesData = feesSnapshot.exists() ? feesSnapshot.val() : {};
        const plansData = plansSnapshot.exists() ? plansSnapshot.val() : {};
        const tuitionFeesData = tuitionFeesSnapshot.exists() ? tuitionFeesSnapshot.val() : {};
        const discountsData = discountsSnapshot.exists() ? discountsSnapshot.val() : {};

        const syRef = ref(db, 'CurrentSY');
        const sySnapshot = await get(syRef);
        const syData = sySnapshot.exists() ? sySnapshot.val() : { startSY: '2024', endSY: '2025' };

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
        doc.text(`School Year: ${syData.startSY}-${syData.endSY}`, 81, 55);
        doc.text(`Date: ${formattedDate}`, 84, 60);

        doc.setFontSize(14);
        doc.setFont("helvetica", "normal");
        doc.text("Student Information --------------------------------------------------------------------------------------", 15, 80);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`Student Name: ${studentData.Name || student.name || "None"}`, 15, 92);
        doc.text(`Student Number: ${student.studentId || "None"}`, 15, 100);
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

        const processedBy = await getProcessedBy();
        doc.setFontSize(10);
        doc.text(`Generated by: ${processedBy}`, 80, doc.internal.pageSize.height - 10);

        const pdfBlob = doc.output("blob");
        window.open(URL.createObjectURL(pdfBlob));

    } catch (error) {
        console.error("Error generating PDF:", error);
        Swal.fire("Error", "Failed to generate PDF report", "error");
    }
}

document.getElementById('printReportBtn').addEventListener('click', generatePDF);