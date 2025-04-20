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
    
    // Update dashboard stats after a short delay (to ensure auth is loaded)
    setTimeout(() => {
        if (auth.currentUser) {
            // Just update the dashboard stats directly
            updateDashboardStats()
                .then(() => console.log("Initial dashboard update complete"))
                .catch(error => console.error("Error in initial dashboard update:", error));
        }
    }, 3000);
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

// Calculate house points (excluding admin users)
async function calculateHousePoints() {
    try {
        // Get current user first to check permissions
        const currentUserDoc = await db.collection('users').doc(auth.currentUser.uid).get();
        if (!currentUserDoc.exists) {
            throw new Error("Current user document not found");
        }
        
        const currentUserData = currentUserDoc.data();
        const isAdmin = currentUserData.isAdmin === true;
        
        // If not admin, use the read-only approach instead to avoid permission errors
        if (!isAdmin) {
            console.log("Non-admin user detected, using read-only approach");
            return await updateDashboardStats();
        }
        
        // --- Below code only runs for admin users ---
        
        // Get all valid houses from the HOUSES configuration
        const validHouseIds = Object.keys(HOUSES);
        const houses = {};
        
        // Initialize house data for all valid houses
        for (const houseId of validHouseIds) {
            houses[houseId] = {
                name: HOUSES[houseId].name,
                points: 0,
                memberCount: 0
            };
        }
        
        // Get all house documents that exist in Firestore
        const housesSnapshot = await db.collection('houses').get();
        
        // Add existing house data
        housesSnapshot.forEach(doc => {
            if (houses[doc.id]) {
                // Use existing document data but reset points and memberCount for recalculation
            houses[doc.id] = {
                name: doc.data().name,
                points: 0,
                memberCount: 0
            };
            }
        });
        
        // Get all users except admin users
        const usersSnapshot = await db.collection('users')
            .where('isAdmin', '==', false)
            .get();
        
        // Sum up points for each house
        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            // Extra check to skip any admin users that might slip through
            if (userData.email === 'admin@gmail.com') return;
            
            if (userData.house && houses[userData.house]) {
                houses[userData.house].points += (userData.points || 0);
                houses[userData.house].memberCount += 1;
            }
        });
        
        // Update house documents since we're an admin
        try {
            // Update or create the houses collection with calculated points
        const batch = db.batch();
        
        for (const [houseId, houseData] of Object.entries(houses)) {
            const houseRef = db.collection('houses').doc(houseId);
                
                // Check if this house document exists
                const houseDoc = await houseRef.get();
                
                if (houseDoc.exists) {
                    // Update existing document
            batch.update(houseRef, {
                points: houseData.points,
                memberCount: houseData.memberCount
            });
                } else {
                    // Create new document if it doesn't exist
                    batch.set(houseRef, {
                        name: houseData.name,
                        points: houseData.points,
                        memberCount: houseData.memberCount
                    });
                }
        }
        
        await batch.commit();
            console.log("House points calculated and updated successfully by admin");
            
            // Update dashboard UI with the calculated data
            if (currentUserData.house && houses[currentUserData.house]) {
                document.getElementById('house-points').textContent = houses[currentUserData.house].points;
            }
            
            // Update house rank
            updateHouseRanking(currentUserData.house);
            
            return houses;
        } catch (error) {
            console.error("Admin failed to update house points:", error);
            // Fall back to read-only method if we fail
            await updateDashboardStats();
            return null;
        }
    } catch (error) {
        console.error("Error in calculate house points:", error);
        // Always fall back to updateDashboardStats on any error
        await updateDashboardStats();
        return null;
    }
}

// Helper function to update house ranking display
async function updateHouseRanking(userHouse) {
    if (!userHouse) return;
    
    try {
        const housesSnapshot = await db.collection('houses')
            .orderBy('points', 'desc')
            .get();
        
        if (!housesSnapshot.empty) {
            let rank = 1;
            let found = false;
            let totalHouses = housesSnapshot.size;
            
            housesSnapshot.forEach(doc => {
                if (doc.id === userHouse) {
                    document.getElementById('house-rank').textContent = `${rank}/${totalHouses}`;
                    found = true;
                }
                rank++;
            });
            
            if (!found) {
                document.getElementById('house-rank').textContent = '-';
            }
        }
    } catch (error) {
        console.error("Error getting house rank:", error);
        document.getElementById('house-rank').textContent = '-';
    }
}

// Set up refresh dashboard button
function setupRefreshButton() {
    const refreshButton = document.getElementById('refresh-dashboard');
    if (refreshButton) {
        refreshButton.addEventListener('click', async () => {
            if (refreshButton.classList.contains('refreshing')) return;
            
            refreshButton.classList.add('refreshing');
            
            try {
            if (auth.currentUser) {
                    // Just update dashboard stats directly
                    await updateDashboardStats();
                    console.log("Dashboard refreshed");
                }
            } catch (error) {
                console.error("Error refreshing dashboard:", error);
            } finally {
                // Always remove the refreshing state
                setTimeout(() => {
                    refreshButton.classList.remove('refreshing');
                }, 500);
            }
        });
    }
}

// Helper function to ensure house exists
async function ensureHouseExists(houseId) {
    if (!houseId || !HOUSES[houseId]) return Promise.resolve();
    
    try {
        const houseDoc = await db.collection('houses').doc(houseId).get();
        
        if (!houseDoc.exists) {
            // Create the house document if it doesn't exist
            await db.collection('houses').doc(houseId).set({
                name: HOUSES[houseId].name,
                points: 0,
                memberCount: 0
            });
            console.log(`Created missing house document for ${houseId}`);
        }
        
        return Promise.resolve();
    } catch (error) {
        console.error(`Error ensuring house ${houseId} exists:`, error);
        return Promise.reject(error);
    }
}

// Helper function to update dashboard stats without trying to update house documents
async function updateDashboardStats() {
    if (!auth.currentUser) return;
    
    try {
        // Get current user data
        const userDoc = await db.collection('users').doc(auth.currentUser.uid).get();
        if (!userDoc.exists) {
            console.warn("User document not found for dashboard update");
            return;
        }
        
        const userData = userDoc.data();
        
        // 1. Update user points - directly from user document
                            document.getElementById('user-points').textContent = userData.points || 0;
                            document.getElementById('user-task-count').textContent = userData.tasks || 0;
                            
        // 2. Get house points from houses collection - same as leaderboard
        if (userData.house) {
            try {
                // Get house data
                const houseDoc = await db.collection('houses').doc(userData.house).get();
                
                if (houseDoc.exists) {
                    // Update house points in dashboard
                    document.getElementById('house-points').textContent = houseDoc.data().points || 0;
                } else {
                    // If house document doesn't exist, show 0
                    document.getElementById('house-points').textContent = '0';
                }
                
                // Get house ranking
                const housesSnapshot = await db.collection('houses')
                    .orderBy('points', 'desc')
                    .get();
                
                let rank = 1;
                let found = false;
                let totalHouses = housesSnapshot.size;
                
                housesSnapshot.forEach(doc => {
                    if (doc.id === userData.house) {
                        document.getElementById('house-rank').textContent = `${rank}/${totalHouses}`;
                        found = true;
                    }
                    rank++;
                });
                
                if (!found) {
                    document.getElementById('house-rank').textContent = '-';
                }
            } catch (error) {
                console.error("Error getting house data:", error);
                document.getElementById('house-points').textContent = '0';
                document.getElementById('house-rank').textContent = '-';
            }
        }
        
        // 3. Get platform tasks - count of approved tasks
        try {
            const tasksSnapshot = await db.collection('taskCompletions')
                .where('status', '==', 'approved')
                .get();
            
            document.getElementById('total-tasks').textContent = tasksSnapshot.size;
        } catch (error) {
            console.error("Error getting platform tasks:", error);
            document.getElementById('total-tasks').textContent = '0';
        }
        
        console.log("Dashboard updated successfully with data from collections");
    } catch (error) {
        console.error("Error updating dashboard:", error);
        // Fallback values
        document.getElementById('user-points').textContent = '0';
        document.getElementById('user-task-count').textContent = '0';
        document.getElementById('house-points').textContent = '0';
        document.getElementById('house-rank').textContent = '-';
        document.getElementById('total-tasks').textContent = '0';
    }
} 