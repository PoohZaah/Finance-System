import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";

const firebaseConfig = {
  apiKey: "AIzaSyCzmy4HDBlnveHLg1wMBk4ZYCoLd-Y1C4E",
  authDomain: "mary-josette-finance.firebaseapp.com",
  projectId: "mary-josette-finance",
  storageBucket: "mary-josette-finance.appspot.com",
  messagingSenderId: "161649825972",
  appId: "1:161649825972:web:9c45b2ef7ce85a571cdfe11"
};

const app = initializeApp(firebaseConfig);

// Function to hide staff-restricted elements
const hideStaffElements = () => {
  const dashboardLink = document.getElementById('dashboard-link');
  const reportsLink = document.getElementById('reports-link');
  
  // Get the parent <li> elements
  const dashboardListItem = dashboardLink?.closest('li');
  const reportsListItem = reportsLink?.closest('li');
  
  if (dashboardListItem) dashboardListItem.classList.add('admin-hidden');
  if (reportsListItem) reportsListItem.classList.add('admin-hidden');
};

export const checkLoginStatus = (callback) => {
  const uid = sessionStorage.getItem("uid");
  const position = sessionStorage.getItem("position");

  if (uid && position) {
      console.log(`Logged in user UID: ${uid}, Position: ${position}`);
      
      // Get navbar elements
      const dashboardItem = document.querySelector('#dashboard-link')?.closest('li');
      const reportsItem = document.querySelector('#reports-link')?.closest('li');
      
      // Hide dashboard/reports for staff
      if (position === "Staff") {
          if (dashboardItem) dashboardItem.style.display = 'none';
          if (reportsItem) reportsItem.style.display = 'none';
      } else {
          if (dashboardItem) dashboardItem.style.display = 'block';
          if (reportsItem) reportsItem.style.display = 'block';
      }

      callback(uid);
  } else {
      console.log("No user is logged in or position not set.");
      window.location.href = "/index.html";
  }
};

window.onload = function () {
  if (!sessionStorage.getItem("uid")) {
      window.location.href = "/index.html";
  }

  // Check position immediately
  const position = sessionStorage.getItem("position");
  if (position === "Staff") {
      document.body.classList.add('staff');
  }

  history.pushState(null, null, location.href);
  window.onpopstate = function () {
    history.go(1);
  };
};

document.getElementById("logout-button").addEventListener("click", (e) => {
  e.preventDefault();

  Swal.fire({
      title: "Are you sure?",
      text: "You will be logged out of your account.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, logout",
      cancelButtonText: "Cancel"
  }).then((result) => {
      if (result.isConfirmed) {
          sessionStorage.clear();

          Swal.fire({
              icon: "success",
              title: "Logged Out",
              text: "Redirecting to login...",
              timer: 1500,
              showConfirmButton: false
          }).then(() => {
              window.location.href = "/index.html";
          });
      }
  });
});
