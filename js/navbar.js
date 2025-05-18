document.addEventListener("DOMContentLoaded", function () {
    const sidebar = document.getElementById("nav-bar");
    const closeSidebar = document.getElementById("close-sidebar");
    const sidebarToggle = document.getElementById("header-toggle");
    const body = document.body;
    const logo = document.querySelector(".sidebar .logo img");
    const navLinks = document.querySelectorAll(".nav_link span");
    const navLabels = document.querySelectorAll(".nav_link span");

    navLinks.forEach(link => {
        if (window.location.href.includes(link.getAttribute("href"))) {
            link.parentElement.classList.add("active");
        }
    });

    sidebar.classList.remove("closed");
    sidebarToggle.style.display = "none";

    function closeSidebarFn() {
        sidebar.classList.add("closed");
        sidebarToggle.style.display = "block";
        logo.style.width = "40px";
        logo.style.height = "40px";
        navLinks.forEach(label => label.style.display = "none");

        closeSidebar.style.display = "none";

        navLabels.forEach(label => {
            label.style.opacity = "0";
            setTimeout(() => {
                label.style.visibility = "hidden";
            }, 3000);
        });
    }

    function openSidebarFn() {
        sidebar.classList.remove("closed");
        sidebarToggle.style.display = "none";
        logo.style.width = "100px";
        logo.style.height = "100px";
        navLinks.forEach(label => label.style.display = "inline");

        closeSidebar.style.display = "block";

        navLabels.forEach(label => {
            label.style.visibility = "visible";
            setTimeout(() => {
                label.style.opacity = "1";
            }, 50);
        });
    }

    closeSidebar.addEventListener("click", closeSidebarFn);
    sidebarToggle.addEventListener("click", openSidebarFn);

    const overlay = document.getElementById("sidebar-overlay");
    overlay.addEventListener("click", closeSidebarFn);

    document.addEventListener("click", function (event) {
        if (!sidebar.contains(event.target) && !sidebarToggle.contains(event.target)) {
            closeSidebarFn();
        }
    });
});
