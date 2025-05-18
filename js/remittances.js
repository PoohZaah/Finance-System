import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getDatabase, ref, get, set, push, update, onValue } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-database.js";

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

function formatDate(dateString) {
    const parts = dateString.split('-');
    if (parts[0].length === 4) { // Handle YYYY-MM-DD format
        const [year, month, day] = parts;
        return `${month}-${day}-${year}`;
    } else { // Handle MM-DD-YYYY format
        const [month, day, year] = parts;
        return `${month}-${day}-${year}`;
    }
}

async function fetchAllProcessedPayments() {
    const currentUser = sessionStorage.getItem("name");
    if (!currentUser) {
        console.log("User not logged in");
        return;
    }

    const nodes = ['Students/CurrentSchoolYear', 'Repeaters', 'Dropouts'];
    let totalPayments = 0;
    let transactionsOnDate = false;
    let dailyTransactions = [];
    const currentDate = new Date().toISOString().split('T')[0];

    for (const node of nodes) {
        const nodeRef = ref(db, node);
        const snapshot = await get(nodeRef);
        if (snapshot.exists()) {
            const studentsData = snapshot.val();
            Object.keys(studentsData).forEach(studentId => {
                const studentData = studentsData[studentId];
                if (studentData.paymentHistory) {
                    Object.keys(studentData.paymentHistory).forEach(paymentKey => {
                        const payment = studentData.paymentHistory[paymentKey];
                        const paymentDate = payment.date ? payment.date.split('T')[0] : null;
                        if (paymentDate === currentDate && !payment.submitted && payment.processedBy === currentUser) {
                            transactionsOnDate = true;
                            totalPayments += payment.amount;
                            dailyTransactions.push({
                                category: payment.category,
                                modeOfPayment: payment.modeOfPayment,
                                amount: payment.amount,
                                paymentKey: paymentKey,
                                studentId: studentId,
                                node: node
                            });
                        }
                    });
                }
            });
        }
    }

    const schoolYearRef = ref(db, 'SchoolYear');
    const schoolYearSnapshot = await get(schoolYearRef);
    if (schoolYearSnapshot.exists()) {
        const academicYears = schoolYearSnapshot.val();
        for (const academicYearKey of Object.keys(academicYears)) {
            const sections = ['Balance', 'Paid'];
            for (const section of sections) {
                const sectionRef = ref(db, `SchoolYear/${academicYearKey}/${section}`);
                const sectionSnapshot = await get(sectionRef);
                if (sectionSnapshot.exists()) {
                    const students = sectionSnapshot.val();
                    Object.keys(students).forEach(studentId => {
                        const student = students[studentId];
                        if (student.paymentHistory) {
                            Object.keys(student.paymentHistory).forEach(paymentKey => {
                                const payment = student.paymentHistory[paymentKey];
                                let paymentDate = payment.date ? payment.date.split('T')[0] : null;

                                if (paymentDate) {
                                    if (paymentDate.match(/^\d{2}-\d{2}-\d{4}$/)) { // MM-DD-YYYY
                                        const [mm, dd, yyyy] = paymentDate.split('-');
                                        paymentDate = `${yyyy}-${mm}-${dd}`;
                                    } else if (paymentDate.includes('/')) { // MM/DD/YYYY
                                        const [mm, dd, yyyy] = paymentDate.split('/');
                                        paymentDate = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
                                    }
                                }

                                if (paymentDate === currentDate && !payment.submitted && payment.processedBy === currentUser) {
                                    transactionsOnDate = true;
                                    totalPayments += payment.amount;
                                    dailyTransactions.push({
                                        category: payment.category,
                                        modeOfPayment: payment.modeOfPayment,
                                        amount: payment.amount,
                                        paymentKey: paymentKey,
                                        studentId: studentId,
                                        node: `SchoolYear/${academicYearKey}/${section}`
                                    });
                                }
                            });
                        }
                    });
                }
            }
        }
    }

    if (transactionsOnDate) {
        updateDailyTransactions(dailyTransactions, totalPayments, currentDate);
    } else {
        console.log("No unsubmitted payments found for today.");
    }
}

function updateDailyTransactions(transactions, totalPayments, date) {
    document.getElementById('transactionDate').textContent = formatDate(date);

    const transactionSummary = document.getElementById("transactionSummary");
    transactionSummary.innerHTML = ''; // Clear existing content

    transactions.forEach(transaction => {
        transactionSummary.innerHTML += `
                <li><span>Category</span> <span>${transaction.category}</span></li>
                <li><span>Mode of Payment</span> <span>${transaction.modeOfPayment}</span></li>
                <li><span>Amount</span> <span>₱${transaction.amount.toLocaleString('en-PH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}</span></li>
                <hr/>
            `;
    });

    document.getElementById("totalPayments").textContent = `₱${totalPayments.toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

function populateExpenseDropdown() {
    const expenseDropdown = document.getElementById('expenseDropdown');
    const expensesRef = ref(db, 'expenses');

    get(expensesRef).then((snapshot) => {
        if (snapshot.exists()) {
            const expenses = snapshot.val();
            expenseDropdown.innerHTML = '<option value="">Expense Type</option>';

            Object.entries(expenses).forEach(([key, expense]) => {
                const option = document.createElement('option');
                option.value = key;
                option.textContent = expense.name; // Only show name
                expenseDropdown.appendChild(option);
            });
        }
    }).catch((error) => {
        console.error("Error loading expenses:", error);
    });
}

const SESSION_STORAGE_KEY = 'pendingExpenses';

function addExpenseEntry() {
    const expenseDropdown = document.getElementById('expenseDropdown');
    const expenseAmount = document.getElementById('expenseAmount');
    const expensePurpose = document.getElementById('expensePurpose');
    const selectedOption = expenseDropdown.options[expenseDropdown.selectedIndex];

    if (selectedOption.value && expenseAmount.value && expensePurpose.value) {
        const expense = {
            id: selectedOption.value,
            type: selectedOption.textContent,
            amount: parseFloat(expenseAmount.value),
            purpose: expensePurpose.value
        };

        const pendingExpenses = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY)) || [];
        pendingExpenses.push(expense);
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(pendingExpenses));

        addExpenseToUI(expense);

        expenseDropdown.selectedIndex = 0;
        expenseAmount.value = '';
        expensePurpose.value = '';

        autoCalculate();
    } else {
        Swal.fire('Error!', 'Please fill all fields', 'error');
    }
}

function addExpenseToUI(expense) {
    const expenseItem = document.createElement('li');
    expenseItem.dataset.expenseId = expense.id;
    expenseItem.dataset.purpose = expense.purpose;
    expenseItem.innerHTML = `
        <span>${expense.type}</span>
        <span>₱${expense.amount.toFixed(2)}</span>
        <button class="remove-expense-btn">Remove</button>
    `;

    document.getElementById('addedExpenses').appendChild(expenseItem);
    expenseItem.querySelector('.remove-expense-btn').addEventListener('click', function () {
        expenseItem.remove();
        removeExpenseFromStorage(expense.id);
        autoCalculate();
    });
}

function removeExpenseFromStorage(id) {
    const pendingExpenses = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY)) || [];
    const updatedExpenses = pendingExpenses.filter(exp => exp.id !== id);
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updatedExpenses));
}

function autoCalculate() {
    const totalPaymentsText = document.getElementById('totalPayments').textContent.replace(/[₱,]/g, ''); // Remove commas
    const totalPayments = parseFloat(totalPaymentsText) || 0;

    const pendingExpenses = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY)) || [];
    const totalExpenses = pendingExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    const netTotal = totalPayments - totalExpenses;

    document.getElementById('totalExpenses').textContent = `₱${totalExpenses.toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;

    document.getElementById('netTotal').textContent = `₱${netTotal.toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

document.addEventListener("DOMContentLoaded", function () {
    displayLoggedInUser();
    fetchAllProcessedPayments();
    populateExpenseDropdown();
    fetchRemittances();
    setTodaysDate();

    const initialDate = document.getElementById('date').value;
    fetchPaymentsByDate(initialDate);
    attachEventListeners();

    document.getElementById('submitRemittancesBtn').addEventListener('click', saveRemittanceData);
    document.getElementById('addExpense').addEventListener('click', addExpenseEntry)

    const pendingExpenses = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY)) || [];
    pendingExpenses.forEach(expense => {
        addExpenseToUI(expense);
    });

    autoCalculate();
});

function calculate() {
    const totalPaymentsText = document.getElementById('totalPayments').textContent.replace(/[₱,]/g, ''); // Remove commas
    const totalPayments = parseFloat(totalPaymentsText) || 0;
    const expensesList = document.querySelectorAll('#addedExpenses li');
    let totalExpenses = 0;

    expensesList.forEach(item => {
        const amountText = item.children[1].textContent.replace(/[₱,]/g, ''); // Remove commas
        const expenseValue = parseFloat(amountText) || 0;
        totalExpenses += expenseValue;
    });

    const netTotal = totalPayments - totalExpenses;
    document.getElementById('totalExpenses').textContent = `₱${totalExpenses.toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
    document.getElementById('netTotal').textContent = `₱${netTotal.toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;

    if (isNaN(netTotal)) {
        Swal.fire('Calculation Error', 'Invalid inputs detected', 'error');
        return false;
    }
    return true;
}

function saveRemittanceData(event) {
    event.preventDefault();

    if (!calculate()) {
        Swal.fire('Error', 'Please fix calculation errors before submitting', 'error');
        return;
    }

    const totalPaymentsDom = parseFloat(document.getElementById('totalPayments').textContent.replace(/[₱,]/g, '')) || 0;
    const totalExpensesDom = parseFloat(document.getElementById('totalExpenses').textContent.replace(/[₱,]/g, '')) || 0;

    if (totalPaymentsDom === 0 && totalExpensesDom === 0) {
        Swal.fire({
            icon: 'error',
            title: 'Empty Submission',
            text: 'There are no payments or expenses to submit!',
        });
        return;
    }

    const userName = document.getElementById('name').value;
    const date = document.getElementById('date').value;

    const selectedDate = new Date(date + 'T00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate > today) {
        Swal.fire('Error', 'Future dates are not allowed', 'error');
        return;
    }

    fetchCurrentDaysPayments(date).then((currentDayPayments) => {
        let expenses = [];
        const expenseItems = document.querySelectorAll('#addedExpenses li');
        expenseItems.forEach(item => {
            const type = item.children[0].textContent;
            const amount = parseFloat(item.children[1].textContent.replace('₱', ''));
            const purpose = item.dataset.purpose;
            if (type && !isNaN(amount)) {
                expenses.push({ type, amount, purpose });
            }
        });

        // Calculate totals from fetched data and expenses
        const totalPaymentsData = currentDayPayments.reduce((sum, p) => sum + p.amount, 0);
        const totalExpensesData = expenses.reduce((sum, e) => sum + e.amount, 0);
        const netTotalData = totalPaymentsData - totalExpensesData;

        // Get totals from DOM
        const netTotalDom = parseFloat(document.getElementById('netTotal').textContent.replace(/[₱,]/g, ''));

        // Check for discrepancies
        if (totalPaymentsData !== totalPaymentsDom || totalExpensesData !== totalExpensesDom || netTotalData !== netTotalDom) {
            Swal.fire('Error', 'The totals have changed. Please refresh the page and try again.', 'error');
            return;
        }

        Swal.fire({
            title: 'Confirm Remittance',
            html: `You're about to submit:<br>
                  Total Payments: ₱${totalPaymentsDom.toFixed(2)}<br>
                  Total Expenses: ₱${totalExpensesDom.toFixed(2)}<br>
                  Net Total: ₱${netTotalDom.toFixed(2)}`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Confirm Submit'
        }).then((result) => {
            if (result.isConfirmed) {
                const remittancesRef = ref(db, 'remittances');
                get(remittancesRef).then((snapshot) => {
                    let existingRemittanceKey = null;
                    let existingRemittance = null;

                    if (snapshot.exists()) {
                        const remittances = snapshot.val();
                        Object.keys(remittances).forEach(key => {
                            const remittance = remittances[key];
                            if (remittance.date === date) {
                                existingRemittanceKey = key;
                                existingRemittance = remittance;
                            }
                        });
                    }

                    const updatePayments = () => {
                        currentDayPayments.forEach(payment => {
                            const paymentRef = ref(db, `${payment.node}/${payment.studentId}/paymentHistory/${payment.paymentKey}`);
                            update(paymentRef, { submitted: true });
                        });
                        document.getElementById("transactionSummary").innerHTML = '';
                        document.getElementById("totalPayments").textContent = '₱0.00';
                        document.getElementById("addedExpenses").innerHTML = '';
                        document.getElementById("totalExpenses").textContent = '₱0.00';
                        document.getElementById("netTotal").textContent = '₱0.00';
                        fetchRemittances();
                    };

                    const newRemittanceRef = push(remittancesRef);
                    set(newRemittanceRef, {
                        name: userName,
                        date: date,
                        expenses: expenses,
                        payments: currentDayPayments
                    }).then(() => {
                        return updatePayments(currentDayPayments);
                    }).then(() => {
                        sessionStorage.removeItem(SESSION_STORAGE_KEY);
                        clearUI();
                        Swal.fire('Submitted!', 'Remittance recorded successfully', 'success');
                        fetchRemittances();
                    }).catch(handleError);
                }).catch((error) => {
                    console.error("Error fetching remittances:", error);
                    Swal.fire('Error', 'Failed to fetch remittance data', 'error');
                });
            }
        });
    }).catch((error) => {
        console.error("Error fetching payments:", error);
        Swal.fire('Error', 'Failed to fetch payment data', 'error');
    });
}

function clearUI() {
    document.getElementById("transactionSummary").innerHTML = '';
    document.getElementById("totalPayments").textContent = '₱0.00';
    document.getElementById("addedExpenses").innerHTML = '';
    document.getElementById("totalExpenses").textContent = '₱0.00';
    document.getElementById("netTotal").textContent = '₱0.00';
}

function handleError(error) {
    console.error("Operation failed:", error);
    Swal.fire('Error', 'Failed to complete the operation', 'error');
}

async function fetchCurrentDaysPayments(date) {
    const currentUser = sessionStorage.getItem("name");
    if (!currentUser) {
        console.log("User not logged in");
        return [];
    }

    return new Promise(async (resolve, reject) => {
        const remittancesRef = ref(db, 'remittances');
        const remittancesSnapshot = await get(remittancesRef);
        const existingPaymentKeys = new Set();

        if (remittancesSnapshot.exists()) {
            Object.values(remittancesSnapshot.val()).forEach(remittance => {
                remittance.payments?.forEach(payment => {
                    existingPaymentKeys.add(payment.paymentKey);
                });
            });
        }

        const nodes = ['Students/CurrentSchoolYear', 'Repeaters', 'Dropouts'];
        const currentDayPayments = [];

        for (const node of nodes) {
            const studentsRef = ref(db, node);
            const snapshot = await get(studentsRef);
            if (snapshot.exists()) {
                Object.entries(snapshot.val()).forEach(([studentId, student]) => {
                    if (student.paymentHistory) {
                        Object.entries(student.paymentHistory).forEach(([paymentKey, payment]) => {
                            let paymentDate = payment.date ? payment.date.split('T')[0] : '';
                            if (paymentDate.match(/^\d{2}-\d{2}-\d{4}$/)) {
                                const [mm, dd, yyyy] = paymentDate.split('-');
                                paymentDate = `${yyyy}-${mm}-${dd}`;
                            } else if (paymentDate.includes('/')) {
                                const [mm, dd, yyyy] = paymentDate.split('/');
                                paymentDate = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
                            }

                            if (paymentDate === date && !payment.submitted && !existingPaymentKeys.has(paymentKey) && payment.processedBy === currentUser) {
                                currentDayPayments.push({
                                    transactionId: payment.transactionID,
                                    amount: payment.amount,
                                    studentId: studentId,
                                    paymentKey: paymentKey,
                                    studentName: student.Name,
                                    date: payment.date,
                                    category: payment.category,
                                    grade: student.Grade,
                                    processedBy: payment.processedBy,
                                    node: node
                                });
                            }
                        });
                    }
                });
            }
        }

        const schoolYearRef = ref(db, 'SchoolYear');
        const schoolYearSnapshot = await get(schoolYearRef);
        if (schoolYearSnapshot.exists()) {
            const academicYears = schoolYearSnapshot.val();

            for (const academicYearKey of Object.keys(academicYears)) {
                const sections = ['Balance', 'Paid'];

                for (const section of sections) {
                    const sectionRef = ref(db, `SchoolYear/${academicYearKey}/${section}`);
                    const sectionSnapshot = await get(sectionRef);

                    if (sectionSnapshot.exists()) {
                        Object.entries(sectionSnapshot.val()).forEach(([studentId, student]) => {
                            if (student.paymentHistory) {
                                Object.entries(student.paymentHistory).forEach(([paymentKey, payment]) => {
                                    let paymentDate = payment.date ? payment.date.split('T')[0] : '';
                                    // Handle date format
                                    if (paymentDate.match(/^\d{2}-\d{2}-\d{4}$/)) {
                                        const [mm, dd, yyyy] = paymentDate.split('-');
                                        paymentDate = `${yyyy}-${mm}-${dd}`;
                                    } else if (paymentDate.includes('/')) {
                                        const [mm, dd, yyyy] = paymentDate.split('/');
                                        paymentDate = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
                                    }

                                    if (paymentDate === date && !payment.submitted && !existingPaymentKeys.has(paymentKey) && payment.processedBy === currentUser) {
                                        currentDayPayments.push({
                                            transactionId: payment.transactionID,
                                            amount: payment.amount,
                                            studentId: studentId,
                                            paymentKey: paymentKey,
                                            studentName: student.Name,
                                            date: payment.date,
                                            category: payment.category,
                                            grade: student.Grade,
                                            processedBy: payment.processedBy,
                                            node: `SchoolYear/${academicYearKey}/${section}`
                                        });
                                    }
                                });
                            }
                        });
                    }
                }
            }
        }

        resolve(currentDayPayments);
    });
}

let currentPage = 1;
let rowsPerPage = 5;
let currentFilterDate = null;

function fetchRemittances(filterDate = null) {
    const remittancesRef = ref(db, 'remittances');
    onValue(remittancesRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            let dataArray = Object.values(data);

            if (filterDate) {
                dataArray = dataArray.filter(remittance =>
                    remittance.date === filterDate
                );
            }

            dataArray.sort((a, b) => new Date(a.date) - new Date(b.date));
            updateRemittanceTable(dataArray);
            setupPagination(dataArray, document.querySelector('#historyTable tbody'), rowsPerPage);
        } else {
            console.log("No remittance data available.");
        }
    }, (error) => {
        console.error("Error fetching data: ", error);
    });
}

function updateRemittanceTable(data) {
    const tableBody = document.querySelector('#historyTable tbody');
    tableBody.innerHTML = ''; // Clear existing rows
    displayPage(data, tableBody, rowsPerPage, currentPage);
}

function setTodaysDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    document.getElementById('date').value = `${year}-${month}-${day}`;
}

document.getElementById('date').addEventListener('change', function () {
    const selectedDate = this.value;
    fetchPaymentsByDate(selectedDate);
});

async function fetchPaymentsByDate(date) {
    const currentUser = sessionStorage.getItem("name");
    if (!currentUser) {
        console.log("User not logged in");
        return;
    }

    const nodes = ['Students/CurrentSchoolYear', 'Repeaters', 'Dropouts'];
    let totalPayments = 0;
    let dailyTransactions = [];

    // Process regular nodes (Students, Repeaters, Dropouts)
    for (const node of nodes) {
        const nodeRef = ref(db, node);
        const snapshot = await get(nodeRef);
        if (snapshot.exists()) {
            Object.entries(snapshot.val()).forEach(([studentId, student]) => {
                if (student.paymentHistory) {
                    Object.entries(student.paymentHistory).forEach(([key, payment]) => {
                        let paymentDate = payment.date ? payment.date.split('T')[0] : '';
                        // Handle date format conversion
                        if (paymentDate.match(/^\d{2}-\d{2}-\d{4}$/)) {
                            const [mm, dd, yyyy] = paymentDate.split('-');
                            paymentDate = `${yyyy}-${mm}-${dd}`;
                        } else if (paymentDate.includes('/')) {
                            const [mm, dd, yyyy] = paymentDate.split('/');
                            paymentDate = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
                        }

                        if (paymentDate === date && !payment.submitted && payment.processedBy === currentUser) {
                            totalPayments += payment.amount;
                            dailyTransactions.push({
                                category: payment.category,
                                modeOfPayment: payment.modeOfPayment,
                                amount: payment.amount,
                                paymentKey: key,
                                studentId: studentId,
                                node: node
                            });
                        }
                    });
                }
            });
        }
    }

    // Process SchoolYear node
    const schoolYearRef = ref(db, 'SchoolYear');
    const schoolYearSnapshot = await get(schoolYearRef);
    if (schoolYearSnapshot.exists()) {
        const academicYears = schoolYearSnapshot.val();

        for (const academicYearKey of Object.keys(academicYears)) {
            const sections = ['Balance', 'Paid'];

            for (const section of sections) {
                const sectionRef = ref(db, `SchoolYear/${academicYearKey}/${section}`);
                const sectionSnapshot = await get(sectionRef);

                if (sectionSnapshot.exists()) {
                    Object.entries(sectionSnapshot.val()).forEach(([studentId, student]) => {
                        if (student.paymentHistory) {
                            Object.entries(student.paymentHistory).forEach(([paymentKey, payment]) => {
                                let paymentDate = payment.date ? payment.date.split('T')[0] : '';

                                // Convert payment date to YYYY-MM-DD format
                                if (paymentDate) {
                                    if (paymentDate.match(/^\d{2}-\d{2}-\d{4}$/)) { // MM-DD-YYYY
                                        const [mm, dd, yyyy] = paymentDate.split('-');
                                        paymentDate = `${yyyy}-${mm}-${dd}`;
                                    } else if (paymentDate.includes('/')) { // MM/DD/YYYY
                                        const [mm, dd, yyyy] = paymentDate.split('/');
                                        paymentDate = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
                                    }
                                }

                                if (paymentDate === date && !payment.submitted && payment.processedBy === currentUser) {
                                    totalPayments += payment.amount;
                                    dailyTransactions.push({
                                        category: payment.category,
                                        modeOfPayment: payment.modeOfPayment,
                                        amount: payment.amount,
                                        paymentKey: paymentKey,
                                        studentId: studentId,
                                        node: `SchoolYear/${academicYearKey}/${section}`
                                    });
                                }
                            });
                        }
                    });
                }
            }
        }
    }

    updateDailyTransactions(dailyTransactions, totalPayments, date);
}

function setupPagination(items, tbody, rowsPerPage) {
    currentPage = 1;
    updatePageInfo(items, rowsPerPage);

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
        displayPage(items, tbody, rowsPerPage, currentPage);
        updatePageInfo(items, rowsPerPage); // Update page info after change
    }
}

function updatePageInfo(items, rowsPerPage) {
    const totalPages = Math.ceil(items.length / rowsPerPage);
    document.querySelector('#pageInfo').textContent = `Page ${currentPage} of ${totalPages}`;
}

function displayPage(data, tbody, rowsPerPage, page) {
    tbody.innerHTML = '';
    let start = rowsPerPage * (page - 1);
    let end = start + rowsPerPage;
    let paginatedItems = data.slice(start, end);

    paginatedItems.forEach((item, index) => {
        let row = tbody.insertRow();

        row.insertCell(0).textContent = formatDate(item.date);

        const totalPayments = item.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
        row.insertCell(1).textContent = `₱${totalPayments.toLocaleString('en-PH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;

        const totalExpenses = item.expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;
        row.insertCell(2).textContent = `₱${totalExpenses.toLocaleString('en-PH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;

        const totalRemittances = totalPayments - totalExpenses;
        row.insertCell(3).textContent = `₱${totalRemittances.toLocaleString('en-PH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;

        row.setAttribute('data-index', index + start);
        row.className = 'clickable-row';
        row.addEventListener('click', () => displayDetailsModal(data[index + start]));
    });
}

function displayDetailsModal(remittance) {
    const modal = document.getElementById('detailsModal');
    const content = document.getElementById('modalContent');

    const totalPayments = remittance.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
    const totalExpenses = remittance.expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;
    const totalRemittances = totalPayments - totalExpenses;

    let currentPaymentsPage = 1;
    let currentExpensesPage = 1;
    const itemsPerPage = 3;

    function renderModalContent() {
        const paymentsStart = (currentPaymentsPage - 1) * itemsPerPage;
        const paymentsEnd = paymentsStart + itemsPerPage;
        const expensesStart = (currentExpensesPage - 1) * itemsPerPage;
        const expensesEnd = expensesStart + itemsPerPage;

        const displayedPayments = remittance.payments?.slice(paymentsStart, paymentsEnd) || [];
        const displayedExpenses = remittance.expenses?.slice(expensesStart, expensesEnd) || [];

        content.innerHTML = `
            <div class="modal-section">
                <h3>Summary</h3>
                <p><strong>Date:</strong> ${formatDate(remittance.date)}</p>
                <p><strong>Submitted by:</strong> ${remittance.name}</p>
                <p><strong>Total Payments:</strong> ₱${totalPayments.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                <p><strong>Total Expenses:</strong> ₱${totalExpenses.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                <p><strong>Total Remittances:</strong> ₱${totalRemittances.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
            </div>
            <hr>
            <div class="modal-section">
                <div class="section-header">
                    <h3>Payment Details</h3>
                    ${remittance.payments?.length > itemsPerPage ? `
                        <div class="pagination-controls">
                            <button class="pagination-btn" id="prevPaymentsPage" ${currentPaymentsPage === 1 ? 'disabled' : ''}>←</button>
                            <span>Page ${currentPaymentsPage} of ${Math.ceil(remittance.payments.length / itemsPerPage)}</span>
                            <button class="pagination-btn" id="nextPaymentsPage" ${currentPaymentsPage === Math.ceil(remittance.payments.length / itemsPerPage) ? 'disabled' : ''}>→</button>
                        </div>
                    ` : ''}
                </div>
        `;

        if (displayedPayments.length > 0) {
            content.innerHTML += `
                <table class="modal-table">
                    <thead>
                        <tr>
                            <th>Student</th>
                            <th>Grade</th>
                            <th>Category</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${displayedPayments.map(payment => `
                            <tr>
                                <td>${payment.studentName || 'N/A'}</td>
                                <td>${payment.grade || 'N/A'}</td>
                                <td>${payment.category || 'N/A'}</td>
                                <td>₱${payment.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else {
            content.innerHTML += '<p>No payments were recorded on this date.</p>';
        }

        content.innerHTML += `
            </div>
            <hr>
            <div class="modal-section">
                <div class="section-header">
                    <h3>Expense Details</h3>
                    ${remittance.expenses?.length > itemsPerPage ? `
                        <div class="pagination-controls">
                            <button class="pagination-btn" id="prevExpensesPage" ${currentExpensesPage === 1 ? 'disabled' : ''}>←</button>
                            <span>Page ${currentExpensesPage} of ${Math.ceil(remittance.expenses.length / itemsPerPage)}</span>
                            <button class="pagination-btn" id="nextExpensesPage" ${currentExpensesPage === Math.ceil(remittance.expenses.length / itemsPerPage) ? 'disabled' : ''}>→</button>
                        </div>
                    ` : ''}
                </div>
        `;

        if (displayedExpenses.length > 0) {
            content.innerHTML += `
                <table class="modal-table">
                    <thead>
                        <tr>
                            <th>Type</th>
                            <th>Amount</th>
                            <th>Purpose</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${displayedExpenses.map(expense => `
                            <tr>
                                <td>${expense.type || 'N/A'}</td>
                                <td>₱${expense.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                                <td>${expense.purpose || 'N/A'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else {
            content.innerHTML += '<p>No expenses were recorded on this date.</p>';
        }

        content.innerHTML += `</div>`;

        document.getElementById('prevPaymentsPage')?.addEventListener('click', () => {
            if (currentPaymentsPage > 1) {
                currentPaymentsPage--;
                renderModalContent();
            }
        });

        document.getElementById('nextPaymentsPage')?.addEventListener('click', () => {
            if (currentPaymentsPage < Math.ceil(remittance.payments.length / itemsPerPage)) {
                currentPaymentsPage++;
                renderModalContent();
            }
        });

        document.getElementById('prevExpensesPage')?.addEventListener('click', () => {
            if (currentExpensesPage > 1) {
                currentExpensesPage--;
                renderModalContent();
            }
        });

        document.getElementById('nextExpensesPage')?.addEventListener('click', () => {
            if (currentExpensesPage < Math.ceil(remittance.expenses.length / itemsPerPage)) {
                currentExpensesPage++;
                renderModalContent();
            }
        });
    }

    renderModalContent();

    modal.style.display = "block";

    const downloadPdfBtn = document.getElementById('downloadPdfBtn');
    downloadPdfBtn.onclick = () => {
        generateAndDisplayPdf(remittance);
    };

    const closeSpan = document.querySelector('.close');
    closeSpan.onclick = function () {
        modal.style.display = "none";
    };

    window.onclick = function (event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    };
}

function generateAndDisplayPdf(remittance) {
    if (!window.jspdf) {
        console.error("jsPDF library is not loaded.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("p", "mm", "a4");
    const img = new Image();
    img.src = "/images/mja-logo.png";

    img.onload = async function () {
        doc.addImage(img, "PNG", 40, 13, 23, 23);

        const db = getDatabase();
        const currentSYRef = ref(db, 'CurrentSY');
        const snapshot = await get(currentSYRef);

        let schoolYear = "N/A";
        if (snapshot.exists()) {
            const { startSY, endSY } = snapshot.val();
            schoolYear = `${startSY}-${endSY}`;
        }

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(`School Year: ${schoolYear}`, 84, 30);

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

        // Collections Table
        if (remittance.payments?.length > 0) {
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
                styles: { fontSize: 10, cellPadding: 4 },
                headStyles: { fillColor: [91, 102, 120], textColor: 255, fontStyle: "bold" },
                bodyStyles: { fillColor: [255, 255, 255] },
                columnStyles: { 0: { cellWidth: 10 } }
            });

            startY = doc.lastAutoTable.finalY + 12;
        }

        if (remittance.expenses?.length > 0) {
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
                styles: { fontSize: 10, cellPadding: 4 },
                headStyles: { fillColor: [91, 102, 120], textColor: 255, fontStyle: "bold" },
                bodyStyles: { fillColor: [255, 255, 255] },
                columnStyles: { 0: { cellWidth: 10 } }
            });

            startY = doc.lastAutoTable.finalY + 10;
        }

        // After the last autoTable (expenses or collections)
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


        const loggedInUserName = sessionStorage.getItem("name") || "Unknown User";
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);

        const pdfBlob = doc.output("blob");
        const blobURL = URL.createObjectURL(pdfBlob);

        const newWindow = window.open(blobURL, "_blank");
        if (!newWindow) {
            alert("Pop-up blocked! Please allow pop-ups for this site.");
        }
    };
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

    document.getElementById('historyDateFilter').addEventListener('change', function (e) {
        currentFilterDate = e.target.value;
        fetchRemittances(currentFilterDate);
    });

    document.getElementById('clearDateFilterBtn').addEventListener('click', clearDateFilter);
});

function clearDateFilter() {
    document.getElementById('historyDateFilter').value = '';
    currentFilterDate = null;
    fetchRemittances();
}