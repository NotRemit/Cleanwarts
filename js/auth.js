// Authentication Functionality

// DOM Elements
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const showRegisterLink = document.getElementById('show-register');
const showLoginLink = document.getElementById('show-login');
const logoutButton = document.getElementById('logout-button');
const adminLogoutButton = document.getElementById('admin-logout-button');

// Auth Container and Dashboard Container
const authContainer = document.getElementById('auth-container');
const dashboardContainer = document.getElementById('dashboard-container');
const adminContainer = document.getElementById('admin-container');

// House Selection Variables
let selectedHouse = null;
const houseOptions = document.querySelectorAll('.house-option');

// Toggle between login and register forms
showRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
});

showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
});

// Handle house selection
houseOptions.forEach(option => {
    option.addEventListener('click', () => {
        // Remove selected class from all options
        houseOptions.forEach(opt => opt.classList.remove('selected'));
        // Add selected class to clicked option
        option.classList.add('selected');
        // Store selected house
        selectedHouse = option.getAttribute('data-house');
    });
});

// Login Event Listener
document.getElementById('login-button').addEventListener('click', async () => {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
        alert('Please enter both email and password');
        return;
    }
    
    try {
        await auth.signInWithEmailAndPassword(email, password);
        // Auth state change listener will handle redirection
    } catch (error) {
        console.error('Login error:', error);
        
        // Handle specific error codes better
        if (error.code === 'auth/network-request-failed') {
            alert('Network error: Please check your internet connection.');
        } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            alert('Invalid email or password. Please try again.');
        } else {
            alert(`Login failed: ${error.message}`);
        }
    }
});

// Register Event Listener
document.getElementById('register-button').addEventListener('click', async () => {
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const mobile = document.getElementById('register-mobile').value;
    const password = document.getElementById('register-password').value;
    
    if (!name || !email || !mobile || !password || !selectedHouse) {
        alert('Please fill in all fields and select a house');
        return;
    }
    
    try {
        // Create user with email and password
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Add user data to Firestore
        await db.collection('users').doc(user.uid).set({
            name: name,
            email: email,
            mobile: mobile,
            house: selectedHouse,
            points: 0,
            tasks: 0,
            isAdmin: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Also update house collection with a new member
        await db.collection('houses').doc(selectedHouse).update({
            memberCount: firebase.firestore.FieldValue.increment(1)
        }).catch(async () => {
            // If house document doesn't exist, create it
            await db.collection('houses').doc(selectedHouse).set({
                name: HOUSES[selectedHouse].name,
                points: 0,
                memberCount: 1
            });
        });
        
        // Auth state change listener will handle redirection
        alert(`Welcome to ${HOUSES[selectedHouse].name}, ${name}!`);
    } catch (error) {
        console.error('Registration error:', error);
        
        if (error.code === 'auth/email-already-in-use') {
            alert('This email is already in use. Please use a different email or login.');
        } else if (error.code === 'auth/network-request-failed') {
            alert('Network error: Please check your internet connection.');
        } else {
            alert(`Registration failed: ${error.message}`);
        }
    }
});

// Logout Event Listeners
if (logoutButton) {
    logoutButton.addEventListener('click', () => {
        auth.signOut();
    });
}

if (adminLogoutButton) {
    adminLogoutButton.addEventListener('click', () => {
        auth.signOut();
    });
}

// Auth State Change Listener
auth.onAuthStateChanged(async (user) => {
    if (user) {
        // User is signed in
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                
                // Check if user is an admin
                if (userData.isAdmin) {
                    // Show admin panel, hide others
                    authContainer.classList.add('hidden');
                    dashboardContainer.classList.add('hidden');
                    adminContainer.classList.remove('hidden');
                    
                    // Set admin name
                    document.getElementById('admin-name').textContent = userData.name;
                    
                    // Load admin specific functionality
                    loadAdminFunctionality();
                } else {
                    // Regular user
                    authContainer.classList.add('hidden');
                    adminContainer.classList.add('hidden');
                    dashboardContainer.classList.remove('hidden');
                    
                    // Update UI with user info
                    updateUserInfo(userData);
                    
                    // Load user dashboard data
                    loadDashboardData(userData, user.uid);
                }
            } else if (!navigator.onLine) {
                // Handle offline case
                console.log('User is offline, loading limited dashboard');
                authContainer.classList.add('hidden');
                adminContainer.classList.add('hidden');
                dashboardContainer.classList.remove('hidden');
                
                // Show a simple offline notification
                const offlineNotice = document.createElement('div');
                offlineNotice.classList.add('offline-notice');
                offlineNotice.textContent = 'You are currently offline. Some features may be limited.';
                document.querySelector('header').appendChild(offlineNotice);
                
                // Create default user data for demo
                const demoUserData = {
                    name: 'Demo User',
                    house: 'gryffindor',
                    points: 0,
                    tasks: 0
                };
                
                // Update UI with demo data
                updateUserInfo(demoUserData);
                
                // Load demo dashboard data
                loadDashboardData(demoUserData, user.uid);
            } else {
                console.error('User document does not exist');
                auth.signOut();
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
            
            if (error.message.includes('offline') || error.code === 'unavailable') {
                // Handle offline error
                console.log('App is offline, loading limited dashboard');
                authContainer.classList.add('hidden');
                adminContainer.classList.add('hidden');
                dashboardContainer.classList.remove('hidden');
                
                // Create default user data for offline mode
                const fallbackUserData = {
                    name: user.email ? user.email.split('@')[0] : 'User',
                    house: 'gryffindor',
                    points: 0,
                    tasks: 0
                };
                
                // Update UI with offline fallback data
                updateUserInfo(fallbackUserData);
                
                // Try to load dashboard with fallback data
                loadDashboardData(fallbackUserData, user.uid);
            } else {
                // For other errors, just sign out
                auth.signOut();
            }
        }
    } else {
        // User is signed out
        authContainer.classList.remove('hidden');
        dashboardContainer.classList.add('hidden');
        adminContainer.classList.add('hidden');
        
        // Clear form fields
        document.getElementById('login-email').value = '';
        document.getElementById('login-password').value = '';
        document.getElementById('register-name').value = '';
        document.getElementById('register-email').value = '';
        document.getElementById('register-mobile').value = '';
        document.getElementById('register-password').value = '';
        
        // Reset house selection
        houseOptions.forEach(opt => opt.classList.remove('selected'));
        selectedHouse = null;
        
        // Remove any offline notices if they exist
        const offlineNotice = document.querySelector('.offline-notice');
        if (offlineNotice) {
            offlineNotice.remove();
        }
    }
});

// Update user info in the UI
function updateUserInfo(userData) {
    // Set user name
    document.getElementById('user-name').textContent = userData.name;
    document.getElementById('welcome-name').textContent = userData.name;
    
    // Set house badge
    const houseBadge = document.getElementById('user-house');
    houseBadge.textContent = HOUSES[userData.house].name;
    houseBadge.setAttribute('data-house', userData.house);
    
    // Set house info in welcome banner
    document.getElementById('house-name').textContent = HOUSES[userData.house].name;
    document.getElementById('house-crest').src = HOUSES[userData.house].crest;
}

// Load dashboard data
async function loadDashboardData(userData, userId) {
    try {
        // Load house points
        const houseDoc = await db.collection('houses').doc(userData.house).get();
        if (houseDoc.exists) {
            const houseData = houseDoc.data();
            document.getElementById('house-points').textContent = houseData.points;
        } else {
            // Fallback for offline or demo mode
            document.getElementById('house-points').textContent = '0';
        }
        
        // Load user points and task count
        document.getElementById('user-points').textContent = userData.points || 0;
        document.getElementById('user-task-count').textContent = userData.tasks || 0;
        
        // Load house rank - with error handling for offline mode
        try {
            const housesSnapshot = await db.collection('houses').orderBy('points', 'desc').get();
            let rank = 1;
            let found = false;
            
            housesSnapshot.forEach(doc => {
                if (doc.id === userData.house) {
                    document.getElementById('house-rank').textContent = `${rank}/${housesSnapshot.size}`;
                    found = true;
                }
                rank++;
            });
            
            if (!found) {
                document.getElementById('house-rank').textContent = '-';
            }
        } catch (error) {
            console.error('Error loading house rank:', error);
            document.getElementById('house-rank').textContent = '-';
        }
        
        // Load actual components
        initChat(userData);
        initLeaderboards(userData);
        initTasks(userData);
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        
        // Fallback for offline mode
        document.getElementById('house-points').textContent = '0';
        document.getElementById('user-points').textContent = '0';
        document.getElementById('user-task-count').textContent = '0';
        document.getElementById('house-rank').textContent = '-';
    }
} 