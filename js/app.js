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
    
    // Set up refresh dashboard button
    setupRefreshButton();
    
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
    // Clean up real-time listeners
    if (window.activeListeners) {
        if (window.activeListeners.userListener) {
            window.activeListeners.userListener();
        }
        if (window.activeListeners.houseListener) {
            window.activeListeners.houseListener();
        }
        if (window.activeListeners.rankingListener) {
            window.activeListeners.rankingListener();
        }
        if (window.activeListeners.tasksListener) {
            window.activeListeners.tasksListener();
        }
        window.activeListeners = {};
    }
    
    // Reset dashboard data
    document.getElementById('user-points').textContent = '0';
    document.getElementById('user-task-count').textContent = '0';
    document.getElementById('house-points').textContent = '0';
    document.getElementById('house-rank').textContent = '-';
    document.getElementById('total-tasks').textContent = '0';
    
    // Clean up component-specific functionality
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

// Set up refresh dashboard button
function setupRefreshButton() {
    const refreshButton = document.getElementById('refresh-dashboard');
    if (refreshButton) {
        refreshButton.addEventListener('click', () => {
            // Show spinning animation
            refreshButton.classList.add('refreshing');
            
            // Get current user
            const user = auth.currentUser;
            if (user) {
                // Get fresh data
                db.collection('users').doc(user.uid).get().then(doc => {
                    if (doc.exists) {
                        const userData = doc.data();
                        // Manually update dashboard elements
                        document.getElementById('user-points').textContent = userData.points || 0;
                        document.getElementById('user-task-count').textContent = userData.tasks || 0;
                        
                        // Update house data
                        db.collection('houses').doc(userData.house).get().then(houseDoc => {
                            if (houseDoc.exists) {
                                const houseData = houseDoc.data();
                                document.getElementById('house-points').textContent = houseData.points;
                            }
                            
                            // Update total platform tasks
                            db.collection('taskCompletions')
                                .where('status', '==', 'approved')
                                .get()
                                .then(tasksSnapshot => {
                                    document.getElementById('total-tasks').textContent = tasksSnapshot.size;
                                    
                                    // Remove spinning animation after all data is loaded
                                    setTimeout(() => {
                                        refreshButton.classList.remove('refreshing');
                                    }, 500);
                                })
                                .catch(error => {
                                    console.error("Error refreshing total tasks:", error);
                                    refreshButton.classList.remove('refreshing');
                                });
                        }).catch(error => {
                            console.error("Error refreshing house data:", error);
                            refreshButton.classList.remove('refreshing');
                        });
                    } else {
                        refreshButton.classList.remove('refreshing');
                    }
                }).catch(error => {
                    console.error("Error refreshing user data:", error);
                    refreshButton.classList.remove('refreshing');
                });
            } else {
                refreshButton.classList.remove('refreshing');
            }
        });
    }
} 