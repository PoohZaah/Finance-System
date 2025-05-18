import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCzmy4HDBlnveHLg1wMBk4ZYCoLd-Y1C4E",
  authDomain: "mary-josette-finance.firebaseapp.com",
  databaseURL: "https://mary-josette-finance-default-rtdb.firebaseio.com/",
  projectId: "mary-josette-finance",
  storageBucket: "mary-josette-finance.appspot.com",
  messagingSenderId: "161649825972",
  appId: "1:161649825972:web:9c45b2ef7ce85a571cdfe1"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const restrictedElements = ['dashboard-link', 'reports-link', 'archive-link'];

const updateVisibility = (position) => {
  restrictedElements.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.classList.toggle('admin-visible', position === 'Admin');
    }
  });
};

// Immediate check from sessionStorage
const initialPosition = sessionStorage.getItem('position');
if (initialPosition) updateVisibility(initialPosition);

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const uid = sessionStorage.getItem('uid');
    if (!uid) {
      window.location.href = '/index.html';
      return;
    }

    const staffRef = ref(db, `staff/${uid}`);
    const snapshot = await get(staffRef);

    if (snapshot.exists()) {
      const staffData = Object.values(snapshot.val())[0];
      const dbPosition = staffData.position;

      if (sessionStorage.getItem('position') !== dbPosition) {
        sessionStorage.setItem('position', dbPosition);
        updateVisibility(dbPosition);
      }

      // Final update after verification
      updateVisibility(dbPosition);
    } else {
      window.location.href = '/index.html';
    }
  } catch (error) {
    console.error('Error:', error);
    window.location.href = '/index.html';
  }
});