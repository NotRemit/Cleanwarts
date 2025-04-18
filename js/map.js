// Map Functionality using Leaflet

// Map variables
let campusMap = null;
let userMarker = null;
let cleaningMarkers = {};
let selectedLocation = null;

// DOM elements
const mapPage = document.getElementById('map-page');
const campusMapElement = document.getElementById('campus-map');
const requestCleaningButton = document.getElementById('request-cleaning');
const taskSubmissionModal = document.getElementById('task-submission-modal');
const requestCleaningModal = document.getElementById('request-cleaning-modal');
const closeModalButtons = document.querySelectorAll('.close-modal');
const selectedLocationDisplay = document.getElementById('selected-location');

// Task submission form
const taskSubmissionForm = document.getElementById('task-submission-form');
const beforeImageInput = document.getElementById('before-image');
const afterImageInput = document.getElementById('after-image');
const beforePreview = document.getElementById('before-preview');
const afterPreview = document.getElementById('after-preview');

// Request cleaning form
const requestCleaningForm = document.getElementById('request-cleaning-form');

// Initialize map when map page is shown
function initMap() {
    if (campusMap) return; // Map already initialized
    
    // Create map centered on campus
    campusMap = L.map(campusMapElement).setView(
        [DEFAULT_CAMPUS_COORDINATES.lat, DEFAULT_CAMPUS_COORDINATES.lng], 
        DEFAULT_CAMPUS_COORDINATES.zoom
    );
    
    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(campusMap);
    
    // Add user location marker
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const userLatLng = [position.coords.latitude, position.coords.longitude];
            
            // Create a custom marker for user location
            const userIcon = L.divIcon({
                className: 'user-location-marker',
                html: '<div class="user-marker-icon"></div>',
                iconSize: [20, 20]
            });
            
            userMarker = L.marker(userLatLng, { icon: userIcon }).addTo(campusMap);
            userMarker.bindPopup("You are here").openPopup();
            
            // Center map on user location
            campusMap.setView(userLatLng, DEFAULT_CAMPUS_COORDINATES.zoom);
        },
        (error) => {
            console.error("Error getting user location:", error);
        }
    );
    
    // Add markers for cleaning tasks from Firestore
    loadCleaningTasks();
    
    // Set up map click handler for request cleaning
    campusMap.on('click', function(e) {
        if (requestCleaningModal.classList.contains('hidden')) return;
        
        selectedLocation = e.latlng;
        selectedLocationDisplay.textContent = `Latitude: ${selectedLocation.lat.toFixed(6)}, Longitude: ${selectedLocation.lng.toFixed(6)}`;
        
        // Show marker at selected location (temporary)
        if (userMarker) {
            campusMap.removeLayer(userMarker);
        }
        
        userMarker = L.marker([selectedLocation.lat, selectedLocation.lng]).addTo(campusMap);
        userMarker.bindPopup("Selected Location").openPopup();
    });
}

// Load cleaning tasks from Firestore
async function loadCleaningTasks() {
    try {
        const tasksSnapshot = await db.collection('cleaningTasks').get();
        
        tasksSnapshot.forEach(doc => {
            const task = doc.data();
            addMarkerForTask(doc.id, task);
        });
        
        // Set up real-time listener for new tasks
        db.collection('cleaningTasks').onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    addMarkerForTask(change.doc.id, change.doc.data());
                } else if (change.type === 'modified') {
                    updateMarkerForTask(change.doc.id, change.doc.data());
                } else if (change.type === 'removed') {
                    removeMarkerForTask(change.doc.id);
                }
            });
        });
    } catch (error) {
        console.error('Error loading cleaning tasks:', error);
    }
}

// Add marker for a cleaning task
function addMarkerForTask(taskId, task) {
    if (!campusMap) return;
    
    const markerColor = task.status === 'approved' ? 'green' : 'red';
    
    const markerIcon = L.divIcon({
        className: `task-marker ${task.status}`,
        html: `<div class="marker-icon" style="background-color: ${markerColor};"></div>`,
        iconSize: [30, 30]
    });
    
    const marker = L.marker([task.location.latitude, task.location.longitude], { 
        icon: markerIcon,
        taskId: taskId
    }).addTo(campusMap);
    
    marker.bindPopup(`
        <div class="task-popup">
            <h3>${task.title}</h3>
            <p>${task.description}</p>
            <p>Status: ${task.status}</p>
            ${task.status === 'pending' ? '<button class="clean-this-button">Clean This</button>' : ''}
        </div>
    `);
    
    marker.on('popupopen', function() {
        const popup = this.getPopup();
        const cleanThisButton = popup._contentNode.querySelector('.clean-this-button');
        
        if (cleanThisButton) {
            cleanThisButton.addEventListener('click', function() {
                openTaskSubmissionModal(taskId, task);
            });
        }
    });
    
    cleaningMarkers[taskId] = marker;
}

// Update marker for an existing task
function updateMarkerForTask(taskId, task) {
    if (cleaningMarkers[taskId]) {
        removeMarkerForTask(taskId);
    }
    
    addMarkerForTask(taskId, task);
}

// Remove marker for a task
function removeMarkerForTask(taskId) {
    if (cleaningMarkers[taskId]) {
        campusMap.removeLayer(cleaningMarkers[taskId]);
        delete cleaningMarkers[taskId];
    }
}

// Open task submission modal
function openTaskSubmissionModal(taskId, task) {
    taskSubmissionModal.classList.remove('hidden');
    
    // Store the task ID in the form
    taskSubmissionForm.setAttribute('data-task-id', taskId);
    
    // Pre-fill form with task data
    document.getElementById('task-title').value = task.title;
    document.getElementById('task-description').value = task.description;
}

// Open request cleaning modal
requestCleaningButton.addEventListener('click', () => {
    requestCleaningModal.classList.remove('hidden');
    selectedLocation = null;
    selectedLocationDisplay.textContent = 'No location selected';
});

// Close modals
closeModalButtons.forEach(button => {
    button.addEventListener('click', () => {
        taskSubmissionModal.classList.add('hidden');
        requestCleaningModal.classList.add('hidden');
        
        // Reset forms
        taskSubmissionForm.reset();
        requestCleaningForm.reset();
        
        // Clear image previews
        beforePreview.style.backgroundImage = '';
        afterPreview.style.backgroundImage = '';
    });
});

// Image preview for before/after photos
beforeImageInput.addEventListener('change', function() {
    previewImage(this, beforePreview);
});

afterImageInput.addEventListener('change', function() {
    previewImage(this, afterPreview);
});

// Preview an image in the specified container
function previewImage(input, previewElement) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            previewElement.style.backgroundImage = `url('${e.target.result}')`;
        };
        
        reader.readAsDataURL(input.files[0]);
    }
}

// Submit task form
taskSubmissionForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const taskId = this.getAttribute('data-task-id');
    const title = document.getElementById('task-title').value;
    const description = document.getElementById('task-description').value;
    const beforeImage = beforeImageInput.files[0];
    const afterImage = afterImageInput.files[0];
    
    if (!taskId || !title || !description || !beforeImage || !afterImage) {
        alert('Please fill in all fields and upload before/after images');
        return;
    }
    
    try {
        // Get current user
        const user = auth.currentUser;
        if (!user) {
            alert('You must be logged in to submit a task');
            return;
        }
        
        // Get user data
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data();
        
        // Upload before image
        const beforeImageRef = storage.ref(`tasks/${taskId}/before_${Date.now()}`);
        await beforeImageRef.put(beforeImage);
        const beforeImageUrl = await beforeImageRef.getDownloadURL();
        
        // Upload after image
        const afterImageRef = storage.ref(`tasks/${taskId}/after_${Date.now()}`);
        await afterImageRef.put(afterImage);
        const afterImageUrl = await afterImageRef.getDownloadURL();
        
        // Create completion submission in Firestore
        await db.collection('taskCompletions').add({
            taskId: taskId,
            userId: user.uid,
            userName: userData.name,
            userHouse: userData.house,
            title: title,
            description: description,
            beforeImage: beforeImageUrl,
            afterImage: afterImageUrl,
            status: 'pending',
            submittedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Close modal and reset form
        taskSubmissionModal.classList.add('hidden');
        taskSubmissionForm.reset();
        beforePreview.style.backgroundImage = '';
        afterPreview.style.backgroundImage = '';
        
        alert('Task submission successful! An admin will review your submission.');
    } catch (error) {
        console.error('Error submitting task:', error);
        alert(`Error submitting task: ${error.message}`);
    }
});

// Submit request cleaning form
requestCleaningForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const title = document.getElementById('request-title').value;
    const description = document.getElementById('request-description').value;
    
    if (!title || !description || !selectedLocation) {
        alert('Please fill in all fields and select a location on the map');
        return;
    }
    
    try {
        // Get current user
        const user = auth.currentUser;
        if (!user) {
            alert('You must be logged in to request cleaning');
            return;
        }
        
        // Add cleaning task to Firestore
        await db.collection('cleaningTasks').add({
            title: title,
            description: description,
            location: {
                latitude: selectedLocation.lat,
                longitude: selectedLocation.lng
            },
            requestedBy: user.uid,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Close modal and reset form
        requestCleaningModal.classList.add('hidden');
        requestCleaningForm.reset();
        selectedLocation = null;
        selectedLocationDisplay.textContent = 'No location selected';
        
        alert('Cleaning request submitted successfully!');
    } catch (error) {
        console.error('Error submitting cleaning request:', error);
        alert(`Error submitting cleaning request: ${error.message}`);
    }
}); 