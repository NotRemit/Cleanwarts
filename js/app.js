// Main Application Script

// DOM Elements
const navItems = document.querySelectorAll('nav li');
const pages = document.querySelectorAll('.page');
const actionButtons = document.querySelectorAll('.action-button');

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Set up navigation
    setupNavigation();
    
    // Set up quick action buttons
    setupActionButtons();
    
    // Add network status detection
    setupNetworkStatusMonitoring();
    
    // Remove Firebase emulator warning
    removeFirebaseEmulatorWarning();
});

// Set up navigation between pages
function setupNavigation() {
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const pageName = item.getAttribute('data-page');
            
            // Update active navigation item
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Show selected page, hide others
            pages.forEach(page => {
                if (page.id === `${pageName}-page`) {
                    page.classList.remove('hidden');
                    
                    // Initialize map if showing map page
                    if (pageName === 'map') {
                        initMap();
                    }
                } else {
                    page.classList.add('hidden');
                }
            });
        });
    });
}

// Set up quick action buttons on dashboard
function setupActionButtons() {
    actionButtons.forEach(button => {
        button.addEventListener('click', () => {
            const action = button.getAttribute('data-action');
            
            // Find the navigation item with matching page and click it
            navItems.forEach(nav => {
                if (nav.getAttribute('data-page') === action) {
                    nav.click();
                }
            });
        });
    });
}

// Set up network status monitoring
function setupNetworkStatusMonitoring() {
    function updateNetworkStatus() {
        if (navigator.onLine) {
            // Online - remove any offline notices
            const offlineNotice = document.querySelector('.offline-notice');
            if (offlineNotice) {
                offlineNotice.remove();
            }
        } else {
            // Offline - add notice if not already present
            if (!document.querySelector('.offline-notice') && document.querySelector('header')) {
                const offlineNotice = document.createElement('div');
                offlineNotice.classList.add('offline-notice');
                offlineNotice.textContent = 'You are currently offline. Some features may be limited.';
                document.querySelector('header').appendChild(offlineNotice);
            }
        }
    }

    // Initial check
    updateNetworkStatus();

    // Add event listeners for network status changes
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
}

// Function to load user-specific functionality after login
function loadDashboardData(userData, userId) {
    // Initialize chat
    initChat(userData);
    
    // Initialize leaderboards
    initLeaderboards(userData);
    
    // Initialize tasks
    initTasks(userData);
}

// Function to clean up when user logs out
function cleanupDashboard() {
    cleanupChat();
    cleanupLeaderboards();
    cleanupTasks();
    
    if (campusMap) {
        campusMap.remove();
        campusMap = null;
    }
}

// Remove Firebase emulator warning
function removeFirebaseEmulatorWarning() {
    // Check for the warning element periodically and remove it
    const removeWarning = () => {
        const warnings = document.querySelectorAll('.firebase-emulator-warning');
        if (warnings.length > 0) {
            warnings.forEach(warning => {
                warning.remove();
            });
        }
    };
    
    // Initial removal
    removeWarning();
    
    // Set interval to keep checking and removing
    setInterval(removeWarning, 1000);
} 