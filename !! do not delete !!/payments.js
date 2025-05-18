import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import {  getDatabase, ref, get, set, update, onValue, push } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-database.js";

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

//////////////////////////////////////////////////-----Get User Details-----/////////////////////////////////////////////////////////////////////////// 

async function getUserName(uid) {
    const staffRef = ref(db, `staff/`);  
    const snapshot = await get(staffRef);

    if (snapshot.exists()) {
        const staffData = snapshot.val();
        console.log('All staff data:', staffData);  // Log the entire staff data
        
        for (let staffId in staffData) {
            console.log(`Checking staff group: ${staffId}`);
            const staffEntries = staffData[staffId];
            
            for (let entryId in staffEntries) {
                console.log(`Checking entryId: ${entryId} -`, staffEntries[entryId]);

                if (staffEntries[entryId].uid === uid) {
                    console.log(`Found matching staff: ${staffEntries[entryId].name}`);
                    return staffEntries[entryId].name; 
                }
            }
        }
    }
    console.log("No matching staff found.");
    return "Unknown";
}

async function getProcessedBy() {
    const user = auth.currentUser;  // Get the current logged-in user
    let processedBy = "Admin";  // Default to "Admin" if no user is found

    if (user) {
        const uid = user.uid;  // Get the logged-in user's UID
        console.log(`Logged-in user UID: ${uid}`);  // Log the UID of the logged-in user

        try {
            processedBy = await getUserName(uid);
            console.log(`ProcessedBy: ${processedBy}`);  // Log the processedBy name after fetching
        } catch (error) {
            console.error("Error fetching staff name:", error);
            processedBy = "Admin";
        }
    }

    console.log(`Final processedBy value: ${processedBy}`);  // Log the final value of processedBy
    return processedBy;  // Return the processedBy value (either user's name or "Admin")
}

//////////////////////////////////////////////////-----PLANS-----/////////////////////////////////////////////////////////////////////////// 

async function loadPlansForStudent(grade, selectedPlanKey) {
    const planDropdown = document.getElementById("plan");
    if (!planDropdown) {
        console.error("Plan dropdown missing.");
        return;
    }

    try {
        const snapshot = await get(ref(db, "plans"));
        if (snapshot.exists()) {
            const plansData = snapshot.val();
            planDropdown.innerHTML = "";

            const defaultOption = document.createElement("option");
            defaultOption.value = "";
            defaultOption.textContent = "Select a Plan";
            planDropdown.appendChild(defaultOption);

            let foundPlan = false;
            const gradeString = String(grade);

            for (const planKey in plansData) {
                const plan = plansData[planKey];

                if (String(plan.Grade) === gradeString) {
                    const option = document.createElement("option");
                    option.value = planKey;
                    option.textContent = `${plan.name} - ₱${plan.downPayment}`;
                    planDropdown.appendChild(option);

                    if (selectedPlanKey && planKey === selectedPlanKey) {
                        option.selected = true;
                        foundPlan = true;
                    }
                }
            }

            if (!foundPlan && selectedPlanKey) {
                console.warn("Saved plan not found in available options.");
            }

        } else {
            console.log("No plans found.");
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

    const studentRef = ref(db, `Students/${studentId}`);
    update(studentRef, { selectedPlan: planKey }) // Store only the plan ID
        .then(() => {
            console.log("Plan updated successfully:", planKey);
            updatePlanUI(planKey); // Update the UI to reflect the selected plan ID

            Swal.fire({
                icon: 'success',
                title: 'Plan Updated',
                text: `The plan has been updated successfully.`,
                confirmButtonText: 'Okay',
                confirmButtonColor: '#3085d6',
            });
        })
        .catch(error => {
            console.error("Error updating plan:", error);
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: 'There was an error updating the plan. Please try again.',
                confirmButtonText: 'Okay',
                confirmButtonColor: '#d33',
            });
        });
}

function updatePlanUI(planKey) {
    const planTextElement = document.getElementById("selected-plan-text");
    const planDescriptionElement = document.getElementById("selected-plan-description");
    const planMonthlyPaymentElement = document.getElementById("selected-plan-monthly");
    const planDownPaymentElement = document.getElementById("selected-plan-downpayment");

    planTextElement.textContent = "None";
    planDescriptionElement.textContent = "None";
    planMonthlyPaymentElement.textContent = "₱0";
    planDownPaymentElement.textContent = "₱0";

    get(ref(db, "plans/" + planKey)).then(snapshot => {
        if (snapshot.exists()) {
            const plan = snapshot.val();
            planTextElement.textContent = plan.name || "No Name Available";
            planDescriptionElement.textContent = plan.description || "No Description Available";
            planMonthlyPaymentElement.textContent = `₱${plan.monthlyPayment || 0}`;
            planDownPaymentElement.textContent = `₱${plan.downPayment || 0}`;
        }
    }).catch(error => console.error("Error fetching plan details:", error));
}

document.getElementById("plan")?.addEventListener("change", (event) => {
    const selectedPlanKey = event.target.value;
    if (selectedPlanKey) {
        saveSelectedPlan(student.studentId, selectedPlanKey);
    }
});

//////////////////////////////////////////////////-----DISCOUNTS----/////////////////////////////////////////////////////////////////////////// 

async function loadAvailableDiscounts(selectedDiscountKey) {
    const discountDropdown = document.getElementById("discount");
    if (!discountDropdown) {
        console.error("Discount dropdown missing.");
        return;
    }

    try {
        const snapshot = await get(ref(db, "discounts"));
        if (snapshot.exists()) {
            const discountsData = snapshot.val();
            discountDropdown.innerHTML = ""; // Clear options

            const defaultOption = document.createElement("option");
            defaultOption.value = "";
            defaultOption.textContent = "Select a Discount";
            discountDropdown.appendChild(defaultOption);

            let foundDiscount = false;

            for (const discountKey in discountsData) {
                const discount = discountsData[discountKey];

                const option = document.createElement("option");
                option.value = discountKey;
                option.textContent = `${discount.discountName} - ₱${discount.discountAmount}`;
                discountDropdown.appendChild(option);

                if (selectedDiscountKey && discountKey === selectedDiscountKey) {
                    option.selected = true;
                    foundDiscount = true;
                }
            }

            if (!foundDiscount && selectedDiscountKey) {
                console.warn("Saved discount not found in available options.");
            }

        } else {
            console.log("No discounts found.");
        }
    } catch (error) {
        console.error("Error fetching discounts:", error);
    }
}

function saveSelectedDiscount(studentId, discountKey, discountText) {
    if (!studentId) {
        console.error("No student selected.");
        return;
    }

    const studentRef = ref(db, `Students/${studentId}`);
    update(studentRef, { selectedDiscount: discountKey, selectedDiscountText: discountText })
        .then(() => {
            console.log("Discount updated successfully:", discountText);
            updateDiscountUI(discountText, discountKey); // Update the UI immediately after saving

            Swal.fire({
                icon: 'success',
                title: 'Discount Updated',
                text: `The discount has been updated to ${discountText}.`,
                confirmButtonText: 'Okay',
                confirmButtonColor: '#3085d6',
            });
        })
        .catch(error => {
            console.error("Error updating discount:", error);
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: 'There was an error updating the discount. Please try again.',
                confirmButtonText: 'Okay',
                confirmButtonColor: '#d33',
            });
        });
}

document.getElementById("plan")?.addEventListener("change", (event) => {
    const selectedPlan = event.target.value;
    const selectedPlanText = event.target.options[event.target.selectedIndex].text;
    if (selectedPlan) saveSelectedPlan(student.studentId, selectedPlan, selectedPlanText);
});

document.getElementById("discount")?.addEventListener("change", (event) => {
    const selectedDiscount = event.target.value;
    const selectedDiscountText = event.target.options[event.target.selectedIndex].text;
    if (selectedDiscount) saveSelectedDiscount(student.studentId, selectedDiscount, selectedDiscountText);
});

function updateDiscountUI(discountText, discountKey) {
    document.getElementById("selected-discount-text").textContent = discountText || "None";

    get(ref(db, "discounts/" + discountKey)).then(snapshot => {
        if (snapshot.exists()) {
            const discount = snapshot.val();
            document.getElementById("selected-discount-amount").textContent = discount.discountAmount || "0";
        } else {
            document.getElementById("selected-discount-amount").textContent = "₱0"; // If no discount amount is found
        }
    }).catch(error => console.error("Error fetching discount amount:", error));

    const discountTextElement = document.getElementById("selected-discount-text");
    const discountAmountElement = document.getElementById("selected-discount-amount");
    const removeDiscountBtn = document.getElementById("remove-discount-btn");

    discountTextElement.textContent = discountText || "None";

    if (discountKey) {
        get(ref(db, "discounts/" + discountKey)).then(snapshot => {
            if (snapshot.exists()) {
                const discount = snapshot.val();
                discountAmountElement.textContent = `₱${discount.discountAmount || 0}`;
                removeDiscountBtn.style.display = "block"; // Show remove button
            }
        }).catch(error => console.error("Error fetching discount amount:", error));
    } else {
        discountAmountElement.textContent = "₱0";
        removeDiscountBtn.style.display = "none"; // Hide remove button if no discount
    }
}

function removeDiscount(studentId) {
    if (!studentId) {
        console.error("No student selected.");
        return;
    }

    const studentRef = ref(db, `Students/${studentId}`);

    update(studentRef, { selectedDiscount: null, selectedDiscountText: "None" })
        .then(() => {
            console.log("Discount removed successfully.");

            updateDiscountUI("None", null);

            Swal.fire({
                icon: 'success',
                title: 'Discount Removed',
                text: 'The discount has been successfully removed.',
                confirmButtonText: 'Okay',
                confirmButtonColor: '#3085d6',
            });
        })
        .catch(error => {
            console.error("Error removing discount:", error);
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: 'There was an error removing the discount. Please try again.',
                confirmButtonText: 'Okay',
                confirmButtonColor: '#d33',
            });
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
        console.log(student); // Log the student object to debug

        if (!student.name || !student.grade) {
            console.error("Student data is missing name or grade");
        }

        document.getElementById("student-name").textContent = student.name || "None";
        document.getElementById("student-number").textContent = student.studentId || "None";
        document.getElementById("grade-level").textContent = student.grade || "None";

        const studentRef = ref(db, `Students/${student.studentId}`);

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

async function loadActivities() {
    const container = document.getElementById("activities-container");
    container.innerHTML = ""; // Clear previous checkboxes

    try {
        const snapshot = await get(ref(db, "activities"));
        if (snapshot.exists()) {
            const activitiesData = snapshot.val();
            const studentRef = ref(db, `Students/${student.studentId}`);
            const studentSnapshot = await get(studentRef);
            const studentData = studentSnapshot.val();
            const selectedActivities = studentData.selectedActivity || [];

            for (const activityKey in activitiesData) {
                const activity = activitiesData[activityKey];

                const checkboxDiv = document.createElement("div");
                checkboxDiv.classList.add("activity-option");

                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.value = activityKey;  // Use activityKey to identify activity
                checkbox.id = `activity-${activityKey}`;
                
                // Auto-tick the checkbox if the activity is selected by the student
                if (selectedActivities.includes(activityKey)) {
                    checkbox.checked = true;
                }

                const label = document.createElement("label");
                label.setAttribute("for", `activity-${activityKey}`);
                label.textContent = `${activity.name} - ${activity.amount}`;  // Display activity name and amount

                checkboxDiv.appendChild(checkbox);
                checkboxDiv.appendChild(label);

                container.appendChild(checkboxDiv);
            }
            container.style.visibility = "visible"; // Show activities once loaded
        } else {
            console.log("No activities found.");
        }
    } catch (error) {
        console.error("Error fetching activities:", error);
    }
}

async function loadAdditionalFees() {
    const container = document.getElementById("additional-fees-container");
    container.innerHTML = ""; // Clear previous checkboxes

    try {
        const snapshot = await get(ref(db, "fees"));
        if (snapshot.exists()) {
            const feesData = snapshot.val();
            const studentRef = ref(db, `Students/${student.studentId}`);
            const studentSnapshot = await get(studentRef);
            const studentData = studentSnapshot.val();
            const selectedFees = studentData.selectedFees || [];

            for (const feeKey in feesData) {
                const fee = feesData[feeKey];

                const checkboxDiv = document.createElement("div");
                checkboxDiv.classList.add("fee-option");

                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.value = feeKey;  // Keep feeKey as value for unique identification
                checkbox.id = feeKey;
                
                // Auto-tick the checkbox if the fee is selected by the student
                if (selectedFees.includes(feeKey)) {
                    checkbox.checked = true;
                }

                const label = document.createElement("label");
                label.setAttribute("for", feeKey);
                label.textContent = `${fee.name} - ${fee.amount}`;  // Display fee name and amount

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
    const selectedActivities = [];
    const checkboxes = document.querySelectorAll("#activities-container input[type='checkbox']:checked");
    checkboxes.forEach(checkbox => {
        selectedActivities.push(checkbox.value);
    });

    const selectedFees = [];
    const feeCheckboxes = document.querySelectorAll("#additional-fees-container input[type='checkbox']:checked");
    feeCheckboxes.forEach(checkbox => {
        selectedFees.push(checkbox.value);
    });

    const studentRef = ref(db, `Students/${student.studentId}`);
    const studentSnapshot = await get(studentRef);
    const studentData = studentSnapshot.val();

    // Get previous selections and balances
    const previousActivities = studentData.selectedActivity || [];
    const previousFees = studentData.selectedFees || [];
    const currentActivityBalance = studentData.totalActivityPrice || 0;
    const currentFeesBalance = studentData.totalFeesPrice || 0;

    // Calculate changes
    const addedActivities = selectedActivities.filter(a => !previousActivities.includes(a));
    const removedActivities = previousActivities.filter(a => !selectedActivities.includes(a));
    const addedFees = selectedFees.filter(f => !previousFees.includes(f));
    const removedFees = previousFees.filter(f => !selectedFees.includes(f));

    // Calculate balance changes
    const { totalPrice: addedActivityAmount } = await getActivityDetails(addedActivities);
    const { totalPrice: removedActivityAmount } = await getActivityDetails(removedActivities);
    const { totalFees: addedFeesAmount } = await getFeeDetails(addedFees);
    const { totalFees: removedFeesAmount } = await getFeeDetails(removedFees);

    // Update balances using DELTA changes only
    const newActivityBalance = currentActivityBalance + addedActivityAmount - removedActivityAmount;
    const newFeesBalance = currentFeesBalance + addedFeesAmount - removedFeesAmount;

    Swal.fire({
        title: 'Your Selection Summary',
        html: `
            <strong>Added Activities:</strong><br>${addedActivities.length ? await formatItems(addedActivities, 'activities') : 'None'}<br>
            <strong>Removed Activities:</strong><br>${removedActivities.length ? await formatItems(removedActivities, 'activities') : 'None'}<br>
            <strong>Added Fees:</strong><br>${addedFees.length ? await formatItems(addedFees, 'fees') : 'None'}<br>
            <strong>Removed Fees:</strong><br>${removedFees.length ? await formatItems(removedFees, 'fees') : 'None'}<br>
            <hr>
            <strong>New Activity Balance:</strong> ₱${newActivityBalance.toLocaleString()}<br>
            <strong>New Fees Balance:</strong> ₱${newFeesBalance.toLocaleString()}
        `,
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Confirm',
        cancelButtonText: 'Cancel',
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const updates = {
                    selectedActivity: selectedActivities,
                    selectedFees: selectedFees,
                    totalActivityPrice: newActivityBalance,
                    totalFeesPrice: newFeesBalance
                };

                // Update activity participation
                await updateActivityParticipation(addedActivities, removedActivities, student.studentId);

                await update(studentRef, updates);
                Swal.fire('Saved!', 'Your selection has been saved.', 'success');
                closeModal();
                updateBalanceSummary();
            } catch (error) {
                console.error("Error saving data: ", error);
                Swal.fire('Error', 'There was an error while saving your selection. Please try again.', 'error');
            }
        }
    });
});

// Helper function to format items list
async function formatItems(itemIds, type) {
    const items = [];
    for (const id of itemIds) {
        const snapshot = await get(ref(db, `${type}/${id}`));
        if (snapshot.exists()) {
            items.push(`${snapshot.val().name} (₱${snapshot.val().amount})`);
        }
    }
    return items.join('<br>');
}

// Update activity participation
async function updateActivityParticipation(added, removed, studentId) {
    // Add to new activities
    for (const activityId of added) {
        const activityRef = ref(db, `activities/${activityId}`);
        const activitySnapshot = await get(activityRef);
        const currentJoined = activitySnapshot.val()?.joined || [];
        if (!currentJoined.includes(studentId)) {
            await update(activityRef, {
                joined: [...currentJoined, studentId]
            });
        }
    }

    // Remove from old activities
    for (const activityId of removed) {
        const activityRef = ref(db, `activities/${activityId}`);
        const activitySnapshot = await get(activityRef);
        const currentJoined = activitySnapshot.val()?.joined || [];
        await update(activityRef, {
            joined: currentJoined.filter(id => id !== studentId)
        });
    }
}

// Function to fetch activity details
async function getActivityDetails(activityIds) {
    let activityDetails = '';
    let totalPrice = 0;
    let joined = [];

    for (let activityId of activityIds) {
        const activityRef = ref(db, `activities/${activityId}`);
        const activitySnapshot = await get(activityRef);
        const activityData = activitySnapshot.val();

        if (activityData) {
            activityDetails += `${activityData.name} - ₱${activityData.amount}<br>`;
            totalPrice += activityData.amount;
            joined = activityData.joined || [];
        }
    }

    return { activityDetails, totalPrice, joined };
}
// Function to fetch fee details
async function getFeeDetails(feeIds) {
    let feeDetails = '';
    let totalFees = 0;

    for (let feeId of feeIds) {
        const feeRef = ref(db, `fees/${feeId}`);
        const feeSnapshot = await get(feeRef);
        const feeData = feeSnapshot.val();

        if (feeData) {
            feeDetails += `${feeData.name} - ₱${feeData.amount}<br>`;
            totalFees += feeData.amount;
        }
    }

    return { feeDetails, totalFees };
}

//////////////////////////////////////////////////-----BALANCE-----/////////////////////////////////////////////////////////////////////////// 

async function updateBalanceSummary() {
    const studentRef = ref(db, `Students/${student.studentId}`);
    const studentSnapshot = await get(studentRef);
    const studentData = studentSnapshot.val();

    if (studentData) {
        // Convert selectedActivity to array
        const selectedActivityRaw = studentData.selectedActivity;
        const selectedActivityIds = selectedActivityRaw 
            ? (Array.isArray(selectedActivityRaw) 
                ? selectedActivityRaw 
                : Object.values(selectedActivityRaw))
            : [];

        // Convert selectedFees to array
        const selectedFeesRaw = studentData.selectedFees;
        const selectedFees = selectedFeesRaw 
            ? (Array.isArray(selectedFeesRaw) 
                ? selectedFeesRaw 
                : Object.values(selectedFeesRaw))
            : [];

        const gradeLevel = studentData.Grade;
        const selectedPlanKey = studentData.selectedPlan;
        const selectedDiscountKey = studentData.selectedDiscount;

        // Get Tuition Fee
        const tuitionFeeSnapshot = await get(ref(db, `tuitionFees/grade${gradeLevel}`));
        const tuitionFee = tuitionFeeSnapshot.val() || 0;

        // Get Payment Plan
        const planSnapshot = await get(ref(db, `plans/${selectedPlanKey}`));
        const planData = planSnapshot.val();
        const downPayment = planData?.downPayment || 0;
        const monthlyPayment = planData?.monthlyPayment || 0;

        // Get Discount
        const discountSnapshot = await get(ref(db, `discounts/${selectedDiscountKey}`));
        const discountAmount = discountSnapshot.val()?.discountAmount || 0;

        // Get Balances
        const totalActivityPrice = studentData.totalActivityPrice || 0;
        const totalFeesPrice = studentData.totalFeesPrice || 0;

        // Calculate Remaining Tuition
        let remainingTuitionFee = tuitionFee - discountAmount - downPayment;
        remainingTuitionFee = Math.max(remainingTuitionFee, 0);

        // Get Paid Amounts
        const paidActivity = studentData.paidActivityAmount || 0;
        const paidFees = studentData.paidFeesAmount || 0;
        const paidMonthly = studentData.paidMonthlyAmount || 0;

        // Calculate Total Remaining Balance
        const remainingBalance = remainingTuitionFee + 
            (monthlyPayment * 10 - paidMonthly) + 
            (totalActivityPrice - paidActivity) + 
            (totalFeesPrice - paidFees);

        // Update Database
        await update(studentRef, {
            remainingBalance: remainingBalance
        });

        // Update UI Elements
        document.getElementById("remaining-balance").textContent = `₱${remainingBalance.toFixed(2)}`;
        document.getElementById("monthly-payment").textContent = `₱${monthlyPayment.toFixed(2)}`;
        document.getElementById("discount-amount").textContent = `₱${discountAmount.toFixed(2)}`;
        document.getElementById("tuition-fee").textContent = `₱${tuitionFee.toFixed(2)}`;

        // Update Activity Display
        let activityNames = [];
        for (const activityId of selectedActivityIds) {
            const activitySnapshot = await get(ref(db, `activities/${activityId}`));
            const activityData = activitySnapshot.val();
            activityNames.push(activityData?.name || 'Unknown Activity');
        }
        document.getElementById("activity-name").textContent = 
            activityNames.length > 0 ? activityNames.join(", ") : 'No Activity Selected';
        document.getElementById("activity-price").textContent = `₱${totalActivityPrice.toFixed(2)}`;

        // Update Fees Display
        let feeNames = [];
        for (const feeKey of selectedFees) {
            const feeSnapshot = await get(ref(db, `fees/${feeKey}`));
            const feeData = feeSnapshot.val();
            feeNames.push(feeData?.name || 'Unknown Fee');
        }
        document.getElementById("selected-fees-list").textContent = 
            feeNames.length > 0 ? feeNames.join(", ") : 'No Additional Fees';
        document.getElementById("total-fee-price").textContent = `₱${totalFeesPrice.toFixed(2)}`;
    }
}

// Set up real-time listeners to detect changes in student, tuition fee, plan, discount, activity, and fees
function setUpRealtimeListeners() {
    const studentRef = ref(db, `Students/${student.studentId}`);
    onValue(studentRef, (snapshot) => {
        if (snapshot.exists()) {
            updateBalanceSummary(); // Recalculate balance if student data changes
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
            updateBalanceSummary(); // Recalculate balance if selected discount changes
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

//////////////////////////////////////////////////-----PAYMENT----/////////////////////////////////////////////////////////////////////////// 
// Load payment data for the student
async function loadPaymentData() {
    const studentRef = ref(db, `Students/${student.studentId}`);
    const studentSnapshot = await get(studentRef);
    const studentData = studentSnapshot.val();

    if (studentData) {
        // Convert selectedActivity to array if stored as object
        const selectedActivityRaw = studentData.selectedActivity;
        const selectedActivityIds = selectedActivityRaw
            ? (Array.isArray(selectedActivityRaw)
                ? selectedActivityRaw
                : Object.values(selectedActivityRaw))
            : [];

        // Convert selectedFees to array if stored as object
        const selectedFeesRaw = studentData.selectedFees;
        const selectedFees = selectedFeesRaw
            ? (Array.isArray(selectedFeesRaw)
                ? selectedFeesRaw
                : Object.values(selectedFeesRaw))
            : [];

        const gradeLevel = studentData.Grade;
        const selectedPlanKey = studentData.selectedPlan;

        // Fetch Monthly Payment
        const planSnapshot = await get(ref(db, `plans/${selectedPlanKey}`));
        const planData = planSnapshot.val();
        const monthlyPayment = planData ? planData.monthlyPayment : 0;

        // Fetch Balances
        const totalActivityPrice = studentData.totalActivityPrice || 0;
        const totalFeesPrice = studentData.totalFeesPrice || 0;

        // Display Monthly Payment
        document.getElementById("monthly-payment-amount").textContent = `₱${monthlyPayment.toFixed(2)}`;

        // Load Activity Names
        let activityNames = [];
        for (const activityId of selectedActivityIds) {
            const activitySnapshot = await get(ref(db, `activities/${activityId}`));
            const activityData = activitySnapshot.val();
            activityNames.push(activityData?.name || 'Unknown Activity');
        }
        document.getElementById("activities-list").textContent =
            activityNames.length > 0 ? activityNames.join(", ") : 'No Activity Selected';
        document.getElementById("activities-amount").textContent = `₱${totalActivityPrice.toFixed(2)}`;

        // Load Fee Names
        let selectedFeeNames = [];
        for (const feeKey of selectedFees) {
            const feeSnapshot = await get(ref(db, `fees/${feeKey}`));
            const feeData = feeSnapshot.val();
            selectedFeeNames.push(feeData?.name || 'Unknown Fee');
        }
        document.getElementById("additional-fees-list").textContent =
            selectedFeeNames.length > 0 ? selectedFeeNames.join(", ") : 'No Additional Fees';
        document.getElementById("additional-fees-amount").textContent = `₱${totalFeesPrice.toFixed(2)}`;

        // UI Controls
        document.getElementById("payment-category").disabled = false;
        document.getElementById("mode-of-payment").disabled = false;
        document.getElementById("additional-fee-details").style.display = "none";
        document.getElementById("monthly-payment-details").style.display = "none";
        document.getElementById("activity-details").style.display = "none";
    }
}
// Handle payment category selection and display corresponding details
document.getElementById("payment-category").addEventListener("change", (event) => {
    const category = event.target.value;

    if (category === "Monthly Payment") {
        document.getElementById("monthly-payment-details").style.display = "block";
        document.getElementById("activity-details").style.display = "none";
        document.getElementById("additional-fee-details").style.display = "none";
    } else if (category === "Activities") {
        document.getElementById("monthly-payment-details").style.display = "none";
        document.getElementById("activity-details").style.display = "block";
        document.getElementById("additional-fee-details").style.display = "none";
    } else if (category === "Additional Fees") {
        document.getElementById("monthly-payment-details").style.display = "none";
        document.getElementById("activity-details").style.display = "none";
        document.getElementById("additional-fee-details").style.display = "block";
    }
});

// Handle mode of payment selection and transaction number visibility
document.getElementById("mode-of-payment").addEventListener("change", (event) => {
    const paymentMethod = event.target.value;

    if (paymentMethod === "Cash") {
        document.getElementById("transaction-number-container").style.display = "none";
    } else {
        document.getElementById("transaction-number-container").style.display = "block";
    }
});

// Handle payment confirmation
document.getElementById("confirm-payment").addEventListener("click", async () => {
    // Validate Payment Category (must not be the default value)
    const category = document.getElementById("payment-category").value;
    if (category === "preventDefault") {
        Swal.fire('Missing Payment Category', 'Please select a Payment Category.', 'error');
        return;
    }

    // Validate Mode of Payment (must not be the default value)
    const paymentMethod = document.getElementById("mode-of-payment").value;
    if (paymentMethod === "Default") {
        Swal.fire('Missing Mode of Payment', 'Please select a Mode of Payment.', 'error');
        return;
    }

    // Validate Payment Amount
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

    // Retrieve Transaction Number (optional)
    const transactionNumberField = document.getElementById("transaction-number");
    const transactionNumber = transactionNumberField ? transactionNumberField.value.trim() : '';

    let processedBy = await getProcessedBy();

    // Generate a unique Transaction ID based on category, timestamp, and random string
    const transactionID = generateTransactionID(category);

    // SweetAlert confirmation with optional transaction number display if applicable
    Swal.fire({
        title: 'Confirm Payment',
        html: `
            <strong>Category:</strong> ${category} <br>
            <strong>Amount:</strong> ₱${paymentAmount.toFixed(2)} <br>
            <strong>Payment Method:</strong> ${paymentMethod} <br>
            ${paymentMethod !== "Cash" ? `<strong>Transaction ${transactionNumber ? "Number" : "ID"}:</strong> ${transactionNumber || transactionID}` : ''}
        `,
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Confirm',
        cancelButtonText: 'Cancel',
    }).then(async (result) => {
        if (result.isConfirmed) {
            const studentRef = ref(db, `Students/${student.studentId}`);
            const studentSnapshot = await get(studentRef);
            const studentData = studentSnapshot.val();

            // Create payment history entry with generated Transaction ID
            const paymentHistoryRef = ref(db, `Students/${student.studentId}/paymentHistory`);
            const newPaymentRef = push(paymentHistoryRef);
            await set(newPaymentRef, {
                transactionID: transactionID,  // Generated Transaction ID
                transactionNumber: transactionNumber, // Optional transaction number, may be empty
                date: new Date().toISOString(),
                amount: paymentAmount,
                modeOfPayment: paymentMethod,
                category: category,
                processedBy: processedBy
            });


            let balanceError;
            switch(category) {
                case "Monthly Payment":
                    if (studentData.remainingBalance <= 0) {
                        balanceError = 'Monthly balance is already settled';
                    }
                    break;
                case "Activities":
                    if (studentData.totalActivityPrice <= 0) {
                        balanceError = 'Activity balance is already settled';
                    }
                    break;
                case "Additional Fees":
                    if (studentData.totalFeesPrice <= 0) {
                        balanceError = 'Additional fees balance is already settled';
                    }
                    break;
            }

            if (balanceError) {
                Swal.fire('No Remaining balance left', `${balanceError}. No payment needed.`, 'error');
                return;
            }

            // Update balances based on category
            if (category === "Monthly Payment") {
                const newRemainingBalance = Math.max(studentData.remainingBalance - paymentAmount, 0);
                const newPaidMonthlyAmount = (studentData.paidMonthlyAmount || 0) + paymentAmount;
                await update(studentRef, {
                    remainingBalance: newRemainingBalance,
                    paidMonthlyAmount: newPaidMonthlyAmount
                });
            } else if (category === "Activities") {
                const newActivityBalance = Math.max(studentData.totalActivityPrice - paymentAmount, 0);
                await update(studentRef, { totalActivityPrice: newActivityBalance });
            } else if (category === "Additional Fees") {
                const newFeesBalance = Math.max(studentData.totalFeesPrice - paymentAmount, 0);
                await update(studentRef, { totalFeesPrice: newFeesBalance });
            }

            Swal.fire('Payment Confirmed', `You paid ₱${paymentAmount.toFixed(2)} for ${category}.`, 'success');

            // Reload payment history and update balances
            loadPaymentHistory();
            updateBalanceSummary();
            loadPaymentData();

            location.reload();
        }
    });
});                     

// Function to generate a unique Transaction ID with category prefix
function generateTransactionID(category) {
    const timestamp = new Date().getTime(); // Current timestamp (shortened)
    const randomString = Math.random().toString(36).substr(2, 6); // Random string of 6 characters

    // Category prefixes
    const categoryPrefix = {
        "Activities": "ACT",
        "Monthly Payment": "MP",
        "Additional Fees": "AF"
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

    // Fetch student data
    const studentRef = ref(db, `Students/${student.studentId}`);
    const studentSnapshot = await get(studentRef);
    const studentData = studentSnapshot.val();

    // Fetch payment history
    const paymentHistoryRef = ref(db, `Students/${student.studentId}/paymentHistory`);
    const paymentSnapshot = await get(paymentHistoryRef);
    const paymentHistory = paymentSnapshot.exists() ? Object.values(paymentSnapshot.val()) : [];

    // Calculate total paid balance
    const totalPaid = paymentHistory.reduce((acc, payment) => acc + payment.amount, 0);

    // Check Loyalty status
    let loyaltyStatus = 'NO';
    if (studentData.selectedDiscount) {
        const discountRef = ref(db, `discounts/${studentData.selectedDiscount}`);
        const discountSnapshot = await get(discountRef);
        if (discountSnapshot.exists() && discountSnapshot.val().discountName === 'Loyalty') {
            loyaltyStatus = 'YES';
        }
    }

    // Fetch plan name if selectedPlanText is missing
    let selectedPlanText = studentData.selectedPlanText || "None";
    if (studentData.selectedPlan && !studentData.selectedPlanText) {
        const planRef = ref(db, `plans/${studentData.selectedPlan}`);
        const planSnapshot = await get(planRef);
        if (planSnapshot.exists()) {
            selectedPlanText = planSnapshot.val().name || "None";
        }
    }

    const today = new Date();
    const formattedDate = `${monthNames[today.getMonth()]} ${String(today.getDate()).padStart(2, '0')}, ${today.getFullYear()}`;

    const img = new Image();
    img.src = "/images/mja-logo.png";

    await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve; // Handle image loading errors
    });

    // Add logo centered at top
    doc.addImage(img, "PNG", 85, 10, 30, 30);

    // Fetch Current School Year
    const syRef = ref(db, 'CurrentSY');
    const sySnapshot = await get(syRef);
    const syData = sySnapshot.exists() ? sySnapshot.val() : { startSY: '2024', endSY: '2025' };

    // Header Section
    doc.setFont("helvetica", "bold");

    doc.setFontSize(15);
    doc.text("Student Financial Report", 70, 50);
    doc.setFontSize(10);
    doc.setFontSize(10);
    doc.text(`School Year: ${syData.startSY}-${syData.endSY}`, 81, 55);
    doc.text(`Date: ${formattedDate}`, 84, 60);

    // Student Information Section
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text("Student Information --------------------------------------------------------------------------------------", 15, 80);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Student Name: ${studentData.Name}`, 15, 92);
    doc.text(`Student Number: ${student.studentId}`, 15, 100);
    doc.text(`Grade Level: ${studentData.Grade}`, 15, 108);
    doc.text(`Plan: ${selectedPlanText}`, 15, 116);

    // Balance Summary Section
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text("Balance Summary ---------------------------------------------------------------------------------------", 15, 130);
    
    // Left Column
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`Remaining Balance: ${(studentData.remainingBalance || 0).toFixed(2)}`, 15, 142);
    doc.text(`Paid Balance: ${totalPaid.toFixed(2)}`, 15, 150);
    doc.text(`Other Activities Balance: ${(studentData.totalActivityPrice || 0).toFixed(2)}`, 15, 158);

    // Right Column (Discounts)
    const discountText = studentData.selectedDiscountText || "";
    const checkMark = "YES";
    const crossMark = "None";

    doc.text(`Discount: ${discountText}`, 110, 142);
    doc.text(`Loyalty: ${discountText.includes("Loyalty") ? checkMark : crossMark}`, 110, 150);
    doc.text(`Family Member: ${crossMark}`, 110, 158);
    doc.text(`3rd Child: ${discountText.includes("3rd Child") ? checkMark : crossMark}`, 110, 166);
    doc.text(`Honor: ${crossMark}`, 110, 174);

    // Payment History Table
    let currentY = 180;
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text("Payment History -----------------------------------------------------------------------------------------", 15, currentY + 15);

  // Prepare table data
  const headers = [['Date', 'Category', 'Mode', 'Amount', 'Processed By', 'Transaction ID']];
  const data = paymentHistory.map(payment => {
      const date = new Date(payment.date);
      return [
          `${monthNames[date.getMonth()].substring(0,3)} ${date.getDate()}, ${date.getFullYear()}`,
          payment.category,
          payment.modeOfPayment,
          `${payment.amount.toFixed(2)}`,
          payment.processedBy,
          payment.transactionID
      ];
  });

  // Calculate total payment
  const totalPayment = paymentHistory.reduce((acc, payment) => acc + payment.amount, 0);

// Add AutoTable
doc.autoTable({
    startY: currentY + 25,
    head: headers,
    body: data,
    theme: "grid",
    styles: { 
        fontSize: 10, 
        cellPadding: 4, 
        valign: "middle", 
        halign: "center" 
    },
    headStyles: { 
        fillColor: [91, 102, 120], 
        textColor: 255, 
        fontStyle: "bold" 
    },
    didDrawPage: function (data) {
        // Add total payment row at the end of the table
        doc.autoTable({
            startY: data.cursor.y,
            body: [
                [
                    { content: "Total Payment:", colSpan: 4, styles: { halign: "left", fontStyle: "bold" } }, // Spans Date, Category, Mode, and Amount columns
                    { content: totalPayment.toFixed(2), styles: { halign: "center", fontStyle: "bold" } } // Total amount aligned with "Transaction ID"
                ]
            ],
            theme: "grid",
            styles: { 
                fontSize: 10, 
                cellPadding: 4, 
                valign: "middle", 
                halign: "center" 
            },
            columnStyles: {
                0: { cellWidth: 'auto' }, // Adjust column widths as needed
                1: { cellWidth: 'auto' },
                2: { cellWidth: 'auto' },
                3: { cellWidth: 'auto' },
                4: { cellWidth: 'auto' },
                5: { cellWidth: 'auto' }
            }
        });
    }
});

    // Generated by footer
    const processedBy = await getProcessedBy();
    doc.setFontSize(10);
    doc.text(`Generated by: ${processedBy}`, 80, doc.internal.pageSize.height - 10);

    // Open PDF in new window
    const pdfBlob = doc.output("blob");
    window.open(URL.createObjectURL(pdfBlob));
}

// Attach to print button
document.getElementById('printReportBtn').addEventListener('click', generatePDF);


// Load payment history based on category
document.addEventListener("DOMContentLoaded", function () {
    // Initialize global sort state
    let currentSort = {
        column: 'date',  // Default sort column is date
        direction: 'desc', // Default sort direction is descending
    };

    // Sort payments based on selected column and direction
    function sortPayments(paymentsArray) {
        return paymentsArray.sort((a, b) => {
            let comparison = 0;

            // Compare based on the column selected for sorting
            if (currentSort.column === 'date') {
                comparison = new Date(b.date) - new Date(a.date); // For date column (most recent first)
            } else if (currentSort.column === 'mode') {
                comparison = a.modeOfPayment.localeCompare(b.modeOfPayment);
            } else if (currentSort.column === 'category') {
                comparison = a.category.localeCompare(b.category);
            }

            // Adjust the comparison based on the sort direction
            if (currentSort.direction === 'asc') {
                comparison = -comparison;
            }

            return comparison;
        });
    }

    // Load payment history based on selected category
    async function loadPaymentHistory(category = "Def") {
        const paymentsList = document.getElementById("payments-list");
        paymentsList.innerHTML = "";  // Clear existing table rows

        try {
            const paymentHistoryRef = ref(db, `Students/${student.studentId}/paymentHistory`);
            const snapshot = await get(paymentHistoryRef);

            if (snapshot.exists()) {
                const paymentHistory = snapshot.val();
                let paymentsArray = Object.entries(paymentHistory).map(([key, value]) => ({
                    id: key,
                    ...value
                }));

                // Filter payments by selected category
                if (category !== "Def") {
                    paymentsArray = paymentsArray.filter(payment => payment.category === category);
                }

                // Sort payments based on current sort state
                paymentsArray = sortPayments(paymentsArray);

                // Populate the table
                for (const payment of paymentsArray) {
                    const row = document.createElement("tr");

                    // Transaction ID - Now placed first
                    const transactionIDCell = document.createElement("td");
                    transactionIDCell.textContent = payment.transactionID || "N/A";
                    row.appendChild(transactionIDCell);

                    // Date
                    const dateCell = document.createElement("td");
                    dateCell.textContent = new Date(payment.date).toLocaleDateString();
                    row.appendChild(dateCell);

                    // Amount
                    const amountCell = document.createElement("td");
                    amountCell.textContent = `₱${payment.amount.toFixed(2)}`;
                    row.appendChild(amountCell);

                    // Mode of Payment
                    const modeCell = document.createElement("td");
                    modeCell.textContent = payment.modeOfPayment;
                    row.appendChild(modeCell);

                    // Category
                    const categoryCell = document.createElement("td");
                    categoryCell.textContent = payment.category;
                    row.appendChild(categoryCell);

                    // Processed By
                    const processedByCell = document.createElement("td");
                    processedByCell.textContent = payment.processedBy;
                    row.appendChild(processedByCell);

                    // Activity Name / Fee Name
                    const activityOrFeeCell = document.createElement("td");
                    if (payment.category === "Activities") {
                        const activityNames = await getActivityNames(payment);  // Fetch activity names
                        activityOrFeeCell.textContent = activityNames.join(", ") || "Unknown Activity";
                    } else if (payment.category === "Additional Fees") {
                        const feeNames = await getFeeNames(payment);  // Fetch fee names
                        activityOrFeeCell.textContent = feeNames.join(", ") || "Unknown Fee";
                    } else {
                        activityOrFeeCell.textContent = "-";
                    }
                    row.appendChild(activityOrFeeCell);

                    paymentsList.appendChild(row);
                }
            } else {
                const row = document.createElement("tr");
                const cell = document.createElement("td");
                cell.colSpan = 7;
                cell.textContent = "No payment history found.";
                row.appendChild(cell);
                paymentsList.appendChild(row);
            }
        } catch (error) {
            console.error("Error loading payment history:", error);
            Swal.fire('Error', 'Failed to load payment history. Please try again.', 'error');
        }
    }

    // Fetch activity names based on the selectedActivity array
    async function getActivityNames(payment) {
        const studentRef = ref(db, `Students/${student.studentId}`);
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

    // Fetch fee names based on the selectedFees array
    async function getFeeNames(payment) {
        const studentRef = ref(db, `Students/${student.studentId}`);
        const studentSnapshot = await get(studentRef);
        const studentData = studentSnapshot.val();

        if (studentData && studentData.selectedFees) {
            const feeIds = studentData.selectedFees;
            let feeNames = [];

            for (let feeId of feeIds) {
                const feeSnapshot = await get(ref(db, `fees/${feeId}`));
                const feeData = feeSnapshot.val();
                if (feeData && feeData.name) {
                    feeNames.push(feeData.name);
                }
            }

            return feeNames;
        }

        return [];
    }

    // Handle payment category selection and display corresponding details
    document.getElementById("payment-category-sort").addEventListener("change", (event) => {
        const category = event.target.value;
        loadPaymentHistory(category);
    });

    // Sorting headers
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

    // Call to load payment data
    loadPaymentHistory();
});

loadPaymentData();