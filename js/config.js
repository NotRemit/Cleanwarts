// Firebase Configuration for Local Demo
const firebaseConfig = {
    apiKey: "demo-key-for-local-use",
    authDomain: "demo-cleanwarts.firebaseapp.com",
    projectId: "demo-cleanwarts",
    storageBucket: "demo-cleanwarts.appspot.com",
    messagingSenderId: "000000000000",
    appId: "1:000000000000:web:000000000000",
    measurementId: "G-0000000000"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Firebase Services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
const rtdb = firebase.database();

// Connect to local emulators
if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    console.log("Using Firebase Local Emulators");
    db.useEmulator("localhost", 8080);
    auth.useEmulator("http://localhost:9099");
    rtdb.useEmulator("localhost", 9000);
    storage.useEmulator("localhost", 9199);
}

// Enable offline persistence
db.enablePersistence()
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.log('Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
      console.log('The current browser does not support all of the features required to enable persistence');
    }
  });

// Default Campus Coordinates (modify as needed for your university campus)
const DEFAULT_CAMPUS_COORDINATES = {
    lat: 20.168055, // Default latitude (set to your campus center)
    lng: 85.707394, // Default longitude
    zoom: 16 // Default zoom level
};

// House Configuration
const HOUSES = {
    gryffindor: {
        name: "Gryffindor",
        colors: {
            primary: "#740001",
            secondary: "#d3a625"
        },
        crest: "assets/gryffindor.svg"
    },
    hufflepuff: {
        name: "Hufflepuff",
        colors: {
            primary: "#ecb939",
            secondary: "#000000"
        },
        crest: "assets/hufflepuff.svg"
    },
    ravenclaw: {
        name: "Ravenclaw",
        colors: {
            primary: "#0e1a40",
            secondary: "#946b2d"
        },
        crest: "assets/ravenclaw.svg"
    },
    slytherin: {
        name: "Slytherin",
        colors: {
            primary: "#1a472a",
            secondary: "#aaaaaa"
        },
        crest: "assets/slytherin.svg"
    }
};

// Demo data generator
function generateDemoData() {
    if (!window.localStorage.getItem('demoDataInitialized')) {
        console.log("Generating demo data...");
        
        // Create demo houses with points
        const houses = ['gryffindor', 'hufflepuff', 'ravenclaw', 'slytherin'];
        houses.forEach((house, index) => {
            db.collection('houses').doc(house).set({
                name: HOUSES[house].name,
                points: Math.floor(Math.random() * 500),
                memberCount: Math.floor(Math.random() * 50) + 10
            });
        });
        
        // Create demo cleaning tasks on the map
        const demoLocations = [
            { lat: DEFAULT_CAMPUS_COORDINATES.lat + 0.001, lng: DEFAULT_CAMPUS_COORDINATES.lng + 0.001 },
            { lat: DEFAULT_CAMPUS_COORDINATES.lat - 0.001, lng: DEFAULT_CAMPUS_COORDINATES.lng - 0.001 },
            { lat: DEFAULT_CAMPUS_COORDINATES.lat + 0.002, lng: DEFAULT_CAMPUS_COORDINATES.lng - 0.001 },
            { lat: DEFAULT_CAMPUS_COORDINATES.lat - 0.002, lng: DEFAULT_CAMPUS_COORDINATES.lng + 0.002 }
        ];
        
        demoLocations.forEach((location, index) => {
            db.collection('cleaningTasks').add({
                title: `Demo Cleaning Task ${index + 1}`,
                description: `This is a demo cleaning task for area ${index + 1}`,
                location: {
                    latitude: location.lat,
                    longitude: location.lng
                },
                requestedBy: 'demo-user',
                status: index % 2 === 0 ? 'pending' : 'approved',
                createdAt: firebase.firestore.Timestamp.now()
            });
        });
        
        // Mark as initialized
        window.localStorage.setItem('demoDataInitialized', 'true');
    }
}

// Create a demo admin account for testing
async function createDemoAdminUser() {
    try {
        // Admin credentials
        const adminEmail = 'admin@gmail.com';
        const adminPassword = '123456';
        
        // Check if demo admin exists
        const adminSnapshot = await db.collection('users').where('email', '==', adminEmail).get();
        
        if (adminSnapshot.empty) {
            // Create a demo admin user
            auth.createUserWithEmailAndPassword(adminEmail, adminPassword)
                .then(async (userCredential) => {
                    const user = userCredential.user;
                    
                    // Add admin data
                    await db.collection('users').doc(user.uid).set({
                        name: 'Administrator',
                        email: adminEmail,
                        mobile: '1234567890',
                        house: 'gryffindor',
                        points: 0,
                        tasks: 0,
                        isAdmin: true,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    console.log('Admin account created');
                })
                .catch((error) => {
                    console.error('Error creating admin:', error);
                    
                    // If the account already exists but we couldn't find it in Firestore
                    if (error.code === 'auth/email-already-in-use') {
                        console.log('Admin account exists in Auth but not in Firestore. Trying to sign in...');
                        
                        // Try to sign in with the admin credentials
                        auth.signInWithEmailAndPassword(adminEmail, adminPassword)
                            .then(async (userCredential) => {
                                const user = userCredential.user;
                                
                                // Add admin data to Firestore
                                await db.collection('users').doc(user.uid).set({
                                    name: 'Administrator',
                                    email: adminEmail,
                                    mobile: '1234567890',
                                    house: 'gryffindor',
                                    points: 0,
                                    tasks: 0,
                                    isAdmin: true,
                                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                                });
                                
                                console.log('Admin account data created in Firestore');
                                
                                // Sign out again to not interfere with normal login
                                auth.signOut();
                            })
                            .catch((signInError) => {
                                console.error('Error signing in as admin:', signInError);
                            });
                    }
                });
        } else {
            console.log('Admin account already exists');
            
            // Ensure the account has admin privileges
            const adminDoc = adminSnapshot.docs[0];
            if (!adminDoc.data().isAdmin) {
                await db.collection('users').doc(adminDoc.id).update({
                    isAdmin: true
                });
                console.log('Updated existing account with admin privileges');
            }
        }
    } catch (error) {
        console.error('Error checking for admin:', error);
    }
}

// Initialize demo data for any environment
// Always create the admin account regardless of hostname
setTimeout(() => {
    // Only generate other demo data if on localhost
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        generateDemoData();
    }
    
    // Always ensure admin account exists
    createDemoAdminUser();
}, 2000);

// Task Points Configuration
const TASK_POINTS = 10; // Points awarded per approved task 