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
    
    console.log("%c ADMIN LOGIN INFO", "background: #ff0000; color: white; font-size: 20px");
    console.log("%c Email: admin@gmail.com | Password: 123456", "background: #000; color: white; font-size: 16px");
    
    // Special handling for admin account
    if (email === 'admin@gmail.com' && password === '123456') {
        console.log('%c ADMIN LOGIN ATTEMPT DETECTED', 'background: green; color: white; font-size: 16px');
        
        try {
            // First try to sign in with admin credentials
            try {
                await auth.signInWithEmailAndPassword(email, password);
                console.log('Admin signed in successfully');
                
                // Make sure the user has admin privileges
                const user = auth.currentUser;
                const userDoc = await db.collection('users').doc(user.uid).get();
                
                if (!userDoc.exists || !userDoc.data().isAdmin) {
                    console.log('Updating user with admin privileges');
                    await db.collection('users').doc(user.uid).set({
                        name: 'Administrator',
                        email: 'admin@gmail.com',
                        mobile: '1234567890',
                        house: 'gryffindor',
                        points: 100,
                        tasks: 0,
                        isAdmin: true,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                }
            } catch (signInError) {
                // If sign in fails, create the admin account
                if (signInError.code === 'auth/user-not-found' || signInError.code === 'auth/wrong-password') {
                    console.log('Admin account not found, creating it now');
                    
                    // Create the admin user
                    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                    const user = userCredential.user;
                    
                    // Set up admin privileges
                    await db.collection('users').doc(user.uid).set({
                        name: 'Administrator',
                        email: 'admin@gmail.com',
                        mobile: '1234567890',
                        house: 'gryffindor',
                        points: 100,
                        tasks: 0,
                        isAdmin: true,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    console.log('Admin account created successfully');
                } else {
                    throw signInError; // Re-throw other errors
                }
            }
        } catch (error) {
            console.error('Admin login/creation error:', error);
            alert(`Admin login failed: ${error.message}`);
        }
        return;
    }
    
    // Normal user login
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
            // Special handling for admin account
            if (user.email === 'admin@gmail.com') {
                console.log('Admin user detected in auth state change');
                
                // Check if the admin document exists
                const userDoc = await db.collection('users').doc(user.uid).get();
                
                if (!userDoc.exists) {
                    // Create the admin document if it doesn't exist
                    console.log('Creating admin user document');
                    await db.collection('users').doc(user.uid).set({
                        name: 'Administrator',
                        email: 'admin@gmail.com',
                        mobile: '1234567890',
                        house: 'gryffindor',
                        points: 100,
                        tasks: 0,
                        isAdmin: true,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                } else if (!userDoc.data().isAdmin) {
                    // Ensure the user has admin privileges
                    console.log('Updating admin privileges');
                    await db.collection('users').doc(user.uid).update({
                        isAdmin: true,
                        name: 'Administrator'
                    });
                }
                
                // Show admin panel, hide others
                authContainer.classList.add('hidden');
                dashboardContainer.classList.add('hidden');
                adminContainer.classList.remove('hidden');
                
                // Set admin name
                document.getElementById('admin-name').textContent = 'Administrator';
                
                // Load admin specific functionality
                loadAdminFunctionality();
                return;
            }
            
            // Regular user handling
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
        // Set up real-time listeners for user data updates
        const userListener = db.collection('users').doc(userId)
            .onSnapshot(doc => {
                if (doc.exists) {
                    const userData = doc.data();
                    
                    // Update user points and task count in real-time
                    document.getElementById('user-points').textContent = userData.points || 0;
                    document.getElementById('user-task-count').textContent = userData.tasks || 0;
                    
                    // Update user info
                    updateUserInfo(userData);
                }
            }, error => {
                console.error("Error getting real-time user data:", error);
            });
            
        // Store listener for cleanup
        window.activeListeners = window.activeListeners || {};
        window.activeListeners.userListener = userListener;
        
        // Set up real-time listener for house data
        const houseListener = db.collection('houses').doc(userData.house)
            .onSnapshot(doc => {
                if (doc.exists) {
                    const houseData = doc.data();
                    document.getElementById('house-points').textContent = houseData.points;
                }
            }, error => {
                console.error("Error getting real-time house data:", error);
            });
        
        // Store listener for cleanup
        window.activeListeners.houseListener = houseListener;
        
        // Set up real-time listener for house rankings
        const rankingListener = db.collection('houses')
            .orderBy('points', 'desc')
            .onSnapshot(snapshot => {
                let rank = 1;
                let found = false;
                let totalHouses = snapshot.size;
                
                snapshot.forEach(doc => {
                    if (doc.id === userData.house) {
                        document.getElementById('house-rank').textContent = `${rank}/${totalHouses}`;
                        found = true;
                    }
                    rank++;
                });
                
                if (!found) {
                    document.getElementById('house-rank').textContent = '-';
                }
            }, error => {
                console.error("Error getting real-time house rankings:", error);
            });
        
        // Store listener for cleanup
        window.activeListeners.rankingListener = rankingListener;
        
        // Set up real-time listener for total tasks completed on the platform
        const tasksListener = db.collection('taskCompletions')
            .where('status', '==', 'approved')
            .onSnapshot(snapshot => {
                document.getElementById('total-tasks').textContent = snapshot.size;
            }, error => {
                console.error("Error getting real-time total tasks:", error);
            });
        
        // Store listener for cleanup
        window.activeListeners.tasksListener = tasksListener;
        
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
        document.getElementById('total-tasks').textContent = '0';
    }
} 