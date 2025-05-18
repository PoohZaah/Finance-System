import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getDatabase, ref, get, set, push } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-database.js";

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

function displayLoggedInUser() {
    const userName = sessionStorage.getItem("name");
    if (userName) {
        document.getElementById("name").value = userName;
    } else {
        console.log("User not logged in or session expired");
    }
}

function fetchAllProcessedPayments() {
    const loggedInUser = sessionStorage.getItem("name");

    const studentsRef = ref(db, 'Students');
    get(studentsRef).then((snapshot) => {
        if (snapshot.exists()) {
            const studentsData = snapshot.val();
            let totalPayments = 0;
            let totalCashPayments = 0; // Track only cash payments
            let transactionsOnDate = false;
            let dailyTransactions = [];
            const currentDate = new Date().toISOString().split('T')[0]; // Get current date in yyyy-mm-dd format

            Object.keys(studentsData).forEach(studentId => {
                const studentData = studentsData[studentId];

                if (studentData.paymentHistory) {
                    const paymentHistoryKeys = Object.keys(studentData.paymentHistory);
                    paymentHistoryKeys.forEach(paymentKey => {
                        const payment = studentData.paymentHistory[paymentKey];
                        const paymentDate = payment.date.split('T')[0]; // Extract the date part (yyyy-mm-dd)

                        if (payment.processedBy === loggedInUser && paymentDate === currentDate) {
                            transactionsOnDate = true;
                            totalPayments += payment.amount;

                            dailyTransactions.push({
                                transactionId: payment.transactionID,
                                amount: payment.amount
                            });
                        }
                    });
                }
            });

            if (transactionsOnDate) {
                updateDailyTransactions(dailyTransactions, totalPayments, totalCashPayments, currentDate);
            } else {
                console.log("No payments processed by this admin/staff today.");
            }
        }
    }).catch((error) => {
        console.error(error);
    });
}

function updateDailyTransactions(transactions, totalPayments, totalCashPayments, date) {
    const transactionSummary = document.getElementById("transactionSummary");
    transactionSummary.innerHTML = `
            <li><span>Date</span> <span>${date}</span></li> <!-- Display current date -->
        `;

    transactions.forEach(transaction => {
        transactionSummary.innerHTML += `
                <li><span>Transaction ID</span> <span>${transaction.transactionId}</span></li>
                <li><span>Amount</span> <span>₱${transaction.amount}</span></li>
                <hr />
            `;
    });

    document.getElementById("totalAmount").textContent = `₱${totalPayments}`;
}

document.addEventListener("DOMContentLoaded", function () {
    displayLoggedInUser();
    fetchAllProcessedPayments();
    fetchRemittances();
    setTodaysDate();
    attachEventListeners();

    document.querySelector('#remittanceForm').addEventListener('click', function (event) {
        if (event.target.classList.contains('add-expense-button')) {
            const lastEntry = document.querySelector('.expense-entry:last-child');
            const amount = lastEntry.querySelector('.expenseAmount').value;
            const type = lastEntry.querySelector('.expenseType').value;
            if (!amount || !type) {
                Swal.fire({
                    title: 'Error!',
                    text: 'Please fill out all fields before adding a new expense.',
                    icon: 'error',
                    confirmButtonText: 'OK'
                });
            } else {
                addExpenseEntry();
            }
        }
    });

    document.querySelector('#expensesContainer').addEventListener('click', function (event) {
        if (event.target.classList.contains('remove-expense-button')) {
            removeExpenseEntry(event.target);
        }
    });

    document.getElementById('calculate').addEventListener('click', calculate);
});

function addExpenseEntry() {
    const expenseAmount = document.querySelector('.expenseAmount');
    const expenseType = document.querySelector('.expenseType');

    if (expenseAmount.value && expenseType.value) {
        const amount = parseFloat(expenseAmount.value) || 0; // Default to 0 if conversion fails
        const type = expenseType.value;

        const expenseItem = document.createElement('li');
        expenseItem.innerHTML = `<span>${type}</span> <span>₱${amount.toFixed(2)}</span>`;
        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remove';
        removeBtn.className = 'remove-expense-btn';
        expenseItem.appendChild(removeBtn);
        document.getElementById('addedExpenses').appendChild(expenseItem);

        removeBtn.addEventListener('click', function () {
            expenseItem.remove();
        });

        expenseAmount.value = '';
        expenseType.value = '';
    } else {
        Swal.fire({
            title: 'Error!',
            text: 'Please fill out all fields before adding a new expense.',
            icon: 'error',
            confirmButtonText: 'OK'
        });
    }
}

function removeExpenseEntry(button) {
    button.parentElement.remove();
}

function calculate() {
    const totalPaymentsText = document.getElementById('totalAmount').textContent.replace('₱', '');
    const totalPayments = parseFloat(totalPaymentsText) || 0;
    const expensesList = document.querySelectorAll('#addedExpenses li');
    let totalExpenses = 0;

    expensesList.forEach(item => {
        const amountText = item.children[1].textContent.replace('₱', '');
        const expenseValue = parseFloat(amountText) || 0;
        totalExpenses += expenseValue;
    });

    const netTotal = totalPayments - totalExpenses;
    document.getElementById('totalExpenses').textContent = `₱${totalExpenses.toFixed(2)}`;
    document.getElementById('netTotal').textContent = `₱${netTotal.toFixed(2)}`;

    if (isNaN(netTotal)) {
        Swal.fire('Calculation Error', 'Invalid inputs detected', 'error');
    }
}

function saveRemittanceData() {
    const userName = document.getElementById('name').value;
    const date = document.getElementById('date').value;

    let expenses = [];
    const expenseItems = document.querySelectorAll('#addedExpenses li');
    expenseItems.forEach(item => {
        const type = item.children[0].textContent;
        const amount = parseFloat(item.children[1].textContent.replace('₱', ''));
        if (type && !isNaN(amount)) {
            expenses.push({ type, amount });
        }
    });

    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

    document.getElementById('totalExpenses').textContent = `₱${totalExpenses.toFixed(2)}`;

    const totalPaymentsText = document.getElementById('totalAmount').textContent.replace('₱', '');
    const totalPayments = parseFloat(totalPaymentsText);
    const netTotal = totalPayments - totalExpenses;

    if (isNaN(netTotal) || totalPayments === 0) {
        Swal.fire({
            title: 'Incomplete Data',
            text: 'Please ensure that payments and expenses are processed and calculated before submitting.',
            icon: 'warning',
            confirmButtonText: 'OK'
        });
    } else {
        Swal.fire({
            title: 'Are you sure?',
            text: "Do you want to save this remittance data?",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, save it!'
        }).then((result) => {
            if (result.isConfirmed) {
                const dbRef = ref(db, 'remittances');
                const newRemittanceRef = push(dbRef);
                set(newRemittanceRef, {
                    name: userName,
                    date: date,
                    expenses,
                    totalExpenses,
                    totalRemittances: netTotal
                }).then(() => {
                    Swal.fire(
                        'Saved!',
                        'Your remittance data has been saved.',
                        'success'
                    );
                    fetchRemittances();
                }).catch((error) => {
                    console.error("Failed to save data: ", error);
                    Swal.fire(
                        'Failed!',
                        'There was a problem saving your data.',
                        'error'
                    );
                });
            }
        });
    }
}

let currentPage = 1;
let rowsPerPage = 5;

function fetchRemittances() {
    const remittancesRef = ref(db, 'remittances');
    get(remittancesRef).then((snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const dataArray = Object.values(data); // Convert object to array for easier manipulation
            updateRemittanceTable(dataArray);
            setupPagination(dataArray, document.querySelector('#historyTable tbody'), rowsPerPage);
        } else {
            console.log("No remittance data available.");
        }
    }).catch((error) => {
        console.error("Error fetching data: ", error);
    });
}

function updateRemittanceTable(data) {
    const tableBody = document.querySelector('#historyTable tbody');
    tableBody.innerHTML = ''; // Clear existing rows
    displayPage(data, tableBody, rowsPerPage, currentPage);
}

function setTodaysDate() {
    function updateDate() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        document.getElementById('date').value = `${year}-${month}-${day}`;
    }
    
    updateDate();
    setInterval(updateDate, 60000); // Update every 60 seconds
}

function setupPagination(items, tbody, rowsPerPage) {
    document.querySelector('#pageInfo').textContent = `Page ${currentPage} of ${Math.ceil(items.length / rowsPerPage)}`;

    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');

    prevPageBtn.addEventListener('click', function () {
        changePage(-1, items, tbody, rowsPerPage);
    });

    nextPageBtn.addEventListener('click', function () {
        changePage(1, items, tbody, rowsPerPage);
    });
}

function changePage(direction, items, tbody, rowsPerPage) {
    let newPage = currentPage + direction;
    let totalPages = Math.ceil(items.length / rowsPerPage);

    if (newPage > 0 && newPage <= totalPages) {
        currentPage = newPage;
        displayPage(items, tbody, rowsPerPage, currentPage);  // Updated to use displayPage directly
    }
}

function displayPage(data, tbody, rowsPerPage, page) {
    tbody.innerHTML = ''; // Clear the table first
    let start = rowsPerPage * (page - 1);
    let end = start + rowsPerPage;
    let paginatedItems = data.slice(start, end);

    paginatedItems.forEach((item, index) => {
        let row = tbody.insertRow();
        row.insertCell(0).textContent = item.name;
        row.insertCell(1).textContent = item.date;
        row.insertCell(2).textContent = `₱${item.totalExpenses}`;
        row.insertCell(3).textContent = `₱${item.totalRemittances}`;
        row.setAttribute('data-index', index + start); // Set index for referencing the data array
        row.className = 'clickable-row'; // Add class for styling if needed
        row.addEventListener('click', () => displayDetailsModal(data[index + start])); // Function to display details
    });
}

function displayDetailsModal(remittance) {
    const modal = document.getElementById('detailsModal');
    const span = document.getElementsByClassName("close")[0];
    const content = document.getElementById('modalContent');

    content.innerHTML = `<strong>Date:</strong> ${remittance.date}<br>
                            <strong>Total Remittances:</strong> ₱${remittance.totalRemittances}<br>
                            <strong>Expenses:</strong><ul>`;
    remittance.expenses.forEach(exp => {
        content.innerHTML += `<li>${exp.type}: ₱${exp.amount}</li>`;
    });
    content.innerHTML += '</ul>';

    modal.style.display = "block";

    span.onclick = function () {
        modal.style.display = "none";
    }

    window.onclick = function (event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }
}

function attachEventListeners() {
    document.getElementById('remittanceForm').addEventListener('submit', function (event) {
        event.preventDefault(); // Prevent the form from submitting traditionally
        saveRemittanceData();
    });
}

async function fetchAndDisplaySchoolYear() {
    const db = getDatabase();
    const currentSYRef = ref(db, 'CurrentSY');

    try {
        const snapshot = await get(currentSYRef);
        if (snapshot.exists()) {
            const data = snapshot.val();
            const schoolYear = `${data.startSY}-${data.endSY}`;
            document.getElementById('schoolyear').textContent = `${schoolYear}`;
        } else {
            console.log("No school year data available");
        }
    } catch (error) {
        console.error("Error fetching school year:", error);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    fetchAndDisplaySchoolYear();
});