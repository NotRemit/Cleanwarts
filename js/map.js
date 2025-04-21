// Map Functionality using Leaflet

// Map variables
let campusMap = null;
let userMarker = null;
let cleaningMarkers = {};
let selectedLocation = null;
let drawControl = null;
let drawnItems = null;
let selectedArea = null;

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
    
    // Initialize the FeatureGroup for drawn items
    drawnItems = new L.FeatureGroup();
    campusMap.addLayer(drawnItems);
    
    // Initialize the draw control and pass it the FeatureGroup
    drawControl = new L.Control.Draw({
        draw: {
            polyline: false,
            circle: false,
            circlemarker: false,
            marker: true,
            polygon: {
                allowIntersection: false,
                drawError: {
                    color: '#e1e100',
                    message: '<strong>Error:</strong> Polygon edges cannot intersect!'
                },
                shapeOptions: {
                    color: '#6a1b9a'
                }
            },
            rectangle: {
                shapeOptions: {
                    color: '#6a1b9a'
                }
            }
        },
        edit: {
            featureGroup: drawnItems,
            remove: true
        }
    });
    campusMap.addControl(drawControl);
    
    // Add global event listener for popup buttons using event delegation
    document.addEventListener('click', function(e) {
        // Check if clicked element is a mark cleaning button
        if (e.target && e.target.classList.contains('mark-cleaning-button')) {
            console.log('Mark for cleaning clicked via global handler');
            
            // Find the layer in drawnItems
            const layer = findLayerForPopupButton(e.target);
            if (layer) {
                openRequestCleaningModalForArea(layer);
            }
        }
        
        // Check if clicked element is a clean area button
        if (e.target && e.target.classList.contains('clean-area-button')) {
            console.log('Clean area clicked via global handler');
            
            // Find the layer in drawnItems
            const layer = findLayerForPopupButton(e.target);
            if (layer) {
                openTaskSubmissionModalForArea(layer);
            }
        }
        
        // Check if clicked element is a clean this button in an existing task
        if (e.target && e.target.classList.contains('clean-this-button')) {
            console.log('Clean this clicked via global handler');
            
            // Find the task ID from marker
            const marker = findMarkerForPopupButton(e.target);
            if (marker && marker.options.taskId) {
                const taskId = marker.options.taskId;
                const task = getTaskDataFromTaskId(taskId);
                if (task) {
                    openTaskSubmissionModal(taskId, task);
                }
            }
        }
    });
    
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
    
    // Handle draw created event
    campusMap.on('draw:created', function(e) {
        const layer = e.layer;
        selectedArea = layer;
        
        // Add the layer to the feature group
        drawnItems.addLayer(layer);
        
        // Add a popup to the drawn area
        let popupContent;
        if (layer instanceof L.Marker) {
            popupContent = `
                <div class="area-popup">
                    <h3>Cleaning Spot</h3>
                    <p>What needs cleaning here?</p>
                    <button class="mark-cleaning-button">Mark for Cleaning</button>
                    <button class="clean-area-button">Clean this Area</button>
                </div>
            `;
        } else {
            popupContent = `
                <div class="area-popup">
                    <h3>Cleaning Area</h3>
                    <p>This area needs cleaning!</p>
                    <button class="mark-cleaning-button">Mark for Cleaning</button>
                    <button class="clean-area-button">Clean this Area</button>
                </div>
            `;
        }
        
        // Create popup with content
        const popup = L.popup().setContent(popupContent);
        layer.bindPopup(popup);
        
        // Open the popup
        layer.openPopup();
        
        // Add direct event listeners to the buttons (in addition to the delegation)
        setTimeout(() => {
            const markButton = popup._contentNode.querySelector('.mark-cleaning-button');
            const cleanButton = popup._contentNode.querySelector('.clean-area-button');
            
            if (markButton) {
                markButton.addEventListener('click', function() {
                    console.log('Mark for cleaning clicked via direct handler');
                    openRequestCleaningModalForArea(layer);
                });
            }
            
            if (cleanButton) {
                cleanButton.addEventListener('click', function() {
                    console.log('Clean area clicked via direct handler');
                    openTaskSubmissionModalForArea(layer);
                });
            }
        }, 100); // Small delay to ensure the DOM elements are available
    });
}

// Helper function to find layer from popup button
function findLayerForPopupButton(element) {
    // Traverse up to find the popup content
    let popupContent = element;
    while (popupContent && !popupContent.classList.contains('leaflet-popup-content')) {
        popupContent = popupContent.parentElement;
    }
    
    if (!popupContent) return null;
    
    // Find the associated layer
    let foundLayer = null;
    
    // Check drawn items first
    drawnItems.eachLayer(function(layer) {
        const popup = layer.getPopup();
        if (popup && popup._contentNode === popupContent.parentElement) {
            foundLayer = layer;
        }
    });
    
    // If not found in drawn items, check cleaning markers
    if (!foundLayer) {
        Object.keys(cleaningMarkers).forEach(function(taskId) {
            const marker = cleaningMarkers[taskId];
            const popup = marker.getPopup();
            if (popup && popup._contentNode === popupContent.parentElement) {
                foundLayer = marker;
            }
        });
    }
    
    return foundLayer;
}

// Helper function to find marker from popup button
function findMarkerForPopupButton(element) {
    // Traverse up to find the popup content
    let popupContent = element;
    while (popupContent && !popupContent.classList.contains('leaflet-popup-content')) {
        popupContent = popupContent.parentElement;
    }
    
    if (!popupContent) return null;
    
    // Find the associated marker
    let foundMarker = null;
    
    // Check cleaning markers
    Object.keys(cleaningMarkers).forEach(function(taskId) {
        const marker = cleaningMarkers[taskId];
        const popup = marker.getPopup();
        if (popup && popup._contentNode === popupContent.parentElement) {
            foundMarker = marker;
        }
    });
    
    return foundMarker;
}

// Get task data from task ID
function getTaskDataFromTaskId(taskId) {
    if (!cleaningMarkers[taskId]) return null;
    
    const marker = cleaningMarkers[taskId];
    
    // Use the stored task data if available
    if (marker.taskData) {
        return marker.taskData;
    }
    
    // Fallback to extracting from popup content
    const popup = marker.getPopup();
    if (!popup || !popup._contentNode) return null;
    
    const titleElement = popup._contentNode.querySelector('h3');
    const descriptionElement = popup._contentNode.querySelector('p');
    
    if (!titleElement || !descriptionElement) return null;
    
    return {
        title: titleElement.textContent,
        description: descriptionElement.textContent,
        location: {
            latitude: marker.getLatLng().lat,
            longitude: marker.getLatLng().lng
        },
        status: 'pending'
    };
}

// Open request cleaning modal for a drawn area
function openRequestCleaningModalForArea(layer) {
    console.log("Opening request cleaning modal for area");
    
    // Close any existing popups
    layer.closePopup();
    
    // Clear existing form data
    requestCleaningForm.reset();
    requestCleaningForm.removeAttribute('data-area-type');
    requestCleaningForm.removeAttribute('data-area-geojson');
    
    let areaCenter;
    let areaType = 'unknown';
    
    if (layer instanceof L.Marker) {
        areaCenter = layer.getLatLng();
        areaType = 'marker';
        console.log("This is a marker at", areaCenter);
    } else if (layer instanceof L.Polygon) {
        areaCenter = layer.getBounds().getCenter();
        areaType = 'polygon';
        console.log("This is a polygon centered at", areaCenter);
    } else if (layer instanceof L.Rectangle) {
        areaCenter = layer.getBounds().getCenter();
        areaType = 'rectangle';
        console.log("This is a rectangle centered at", areaCenter);
    }
    
    if (!areaCenter) {
        console.error("Could not determine area center");
        alert("Could not determine location. Please try again.");
        return;
    }
    
    selectedLocation = areaCenter;
    
    // Store area type
    requestCleaningForm.setAttribute('data-area-type', areaType);
    
    try {
        // Store GeoJSON representation of the area
        const geoJson = layer.toGeoJSON();
        requestCleaningForm.setAttribute('data-area-geojson', JSON.stringify(geoJson));
        console.log("GeoJSON stored:", geoJson);
    } catch (error) {
        console.error("Error converting to GeoJSON:", error);
    }
    
    // Update location display
    selectedLocationDisplay.textContent = `Area center: Lat ${areaCenter.lat.toFixed(6)}, Lng ${areaCenter.lng.toFixed(6)}`;
    
    // Show modal
    requestCleaningModal.classList.remove('hidden');
}

// Open task submission modal for an area
function openTaskSubmissionModalForArea(layer) {
    console.log("Opening task submission for area");
    
    // Close any existing popups
    layer.closePopup();
    
    // Find a task near this area
    const tasksNearby = findTasksNearArea(layer);
    console.log("Found nearby tasks:", tasksNearby.length);
    
    if (tasksNearby.length > 0) {
        // Use the first nearby task
        openTaskSubmissionModal(tasksNearby[0].id, tasksNearby[0].task);
    } else {
        // If no nearby tasks, create a temporary task for this area
        let areaCenter;
        
        if (layer instanceof L.Marker) {
            areaCenter = layer.getLatLng();
        } else if (layer instanceof L.Polygon || layer instanceof L.Rectangle) {
            areaCenter = layer.getBounds().getCenter();
        }
        
        if (areaCenter) {
            const tempTask = {
                title: "New Cleaning Task",
                description: "Please describe what you cleaned in this area",
                location: {
                    latitude: areaCenter.lat,
                    longitude: areaCenter.lng
                },
                status: 'pending'
            };
            
            // Generate a temporary ID
            const tempId = "temp_" + Date.now();
            
            // Open submission modal with temporary task
            openTaskSubmissionModal(tempId, tempTask);
        } else {
            alert("No cleaning tasks found in this area. Please mark the area for cleaning first.");
        }
    }
}

// Find tasks near a drawn area
function findTasksNearArea(layer) {
    const results = [];
    const MAX_DISTANCE = 0.0005; // Approximately 50 meters
    
    let areaCenter;
    if (layer instanceof L.Marker) {
        areaCenter = layer.getLatLng();
    } else if (layer instanceof L.Polygon || layer instanceof L.Rectangle) {
        areaCenter = layer.getBounds().getCenter();
    } else {
        return results;
    }
    
    // Check all markers
    for (const taskId in cleaningMarkers) {
        const marker = cleaningMarkers[taskId];
        const markerLatLng = marker.getLatLng();
        
        const distance = Math.sqrt(
            Math.pow(areaCenter.lat - markerLatLng.lat, 2) + 
            Math.pow(areaCenter.lng - markerLatLng.lng, 2)
        );
        
        if (distance <= MAX_DISTANCE) {
            // Use the stored task data if available, otherwise create it from popup content
            if (marker.taskData) {
                results.push({
                    id: taskId,
                    task: marker.taskData
                });
            } else {
                // Fallback to extracting from popup content
                try {
                    const popupContent = marker.getPopup()._contentNode;
                    if (popupContent) {
                        results.push({
                            id: taskId,
                            task: {
                                title: popupContent.querySelector('h3').textContent,
                                description: popupContent.querySelector('p').textContent,
                                location: {
                                    latitude: markerLatLng.lat,
                                    longitude: markerLatLng.lng
                                },
                                status: 'pending'
                            }
                        });
                    }
                } catch (error) {
                    console.error("Error extracting task data from popup:", error);
                }
            }
        }
    }
    
    return results;
}

// Load cleaning tasks from Firestore
async function loadCleaningTasks() {
    try {
        const tasksSnapshot = await db.collection('cleaningTasks').get();
        
        tasksSnapshot.forEach(doc => {
            const task = doc.data();
            // Only add markers for pending tasks
            if (task.status !== 'approved') {
                addMarkerForTask(doc.id, task);
            }
        });
        
        // Set up real-time listener for new tasks
        db.collection('cleaningTasks').onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    const task = change.doc.data();
                    // Only add marker if the task is not approved
                    if (task.status !== 'approved') {
                        addMarkerForTask(change.doc.id, task);
                    }
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
    
    // Store task data directly in the marker for easier access
    marker.taskData = task;
    
    // Add event listener for popup opening to attach button functionality
    marker.on('popupopen', function() {
        const popup = this.getPopup();
        const cleanThisButton = popup._contentNode.querySelector('.clean-this-button');
        
        if (cleanThisButton) {
            // Remove any existing event listeners to avoid duplicates
            const newButton = cleanThisButton.cloneNode(true);
            cleanThisButton.parentNode.replaceChild(newButton, cleanThisButton);
            
            // Add the event listener to the new button
            newButton.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Clean this clicked via marker popup handler');
                openTaskSubmissionModal(taskId, marker.taskData);
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
    
    // Only add marker back if status is not approved
    if (task.status !== 'approved') {
        addMarkerForTask(taskId, task);
    }
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
        
        // Get user data including house information
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (!userDoc.exists) {
            alert('User profile not found. Please try again or contact support.');
            return;
        }
        
        const userData = userDoc.data();
        
        // Upload before image
        const beforeImageRef = storage.ref(`tasks/${taskId}/before_${Date.now()}`);
        await beforeImageRef.put(beforeImage);
        const beforeImageURL = await beforeImageRef.getDownloadURL();
        
        // Upload after image
        const afterImageRef = storage.ref(`tasks/${taskId}/after_${Date.now()}`);
        await afterImageRef.put(afterImage);
        const afterImageURL = await afterImageRef.getDownloadURL();
        
        // Create task completion record with user name and house
        await db.collection('taskCompletions').add({
            taskId: taskId,
            userId: user.uid,
            userName: userData.name || user.displayName || 'Unknown User',
            userHouse: userData.house || 'gryffindor',
            title: title,
            description: description,
            beforeImage: beforeImageURL,
            afterImage: afterImageURL,
            status: 'pending',
            submittedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Close modal
        taskSubmissionModal.classList.add('hidden');
        
        // Reset form
        taskSubmissionForm.reset();
        beforePreview.style.backgroundImage = '';
        afterPreview.style.backgroundImage = '';
        
        alert('Task submission successful! An admin will review your submission.');
    } catch (error) {
        console.error('Error submitting task:', error);
        alert('Error submitting task: ' + error.message);
    }
});

// Submit request cleaning form
requestCleaningForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    console.log("Request cleaning form submitted");
    
    const title = document.getElementById('request-title').value;
    const description = document.getElementById('request-description').value;
    const areaType = this.getAttribute('data-area-type');
    const areaGeoJson = this.getAttribute('data-area-geojson');
    
    if (!title || !description) {
        alert('Please fill in title and description');
        return;
    }
    
    if (!selectedLocation) {
        alert('Please select a location on the map');
        return;
    }
    
    console.log("Form data:", {
        title, 
        description, 
        location: selectedLocation,
        areaType,
        hasGeoJson: !!areaGeoJson
    });
    
    try {
        // Get current user
        const user = auth.currentUser;
        if (!user) {
            alert('You must be logged in to request cleaning');
            return;
        }
        
        // Create cleaning task
        const taskData = {
            title: title,
            description: description,
            location: {
                latitude: selectedLocation.lat,
                longitude: selectedLocation.lng
            },
            requestedBy: user.uid,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Add area data if available
        if (areaType && areaGeoJson) {
            console.log("Adding area data to task");
            taskData.areaType = areaType;
            taskData.areaGeoJson = areaGeoJson;
        }
        
        console.log("Saving task to Firestore:", taskData);
        const docRef = await db.collection('cleaningTasks').add(taskData);
        console.log("Task saved with ID:", docRef.id);
        
        // Close modal
        requestCleaningModal.classList.add('hidden');
        
        // Reset form
        requestCleaningForm.reset();
        requestCleaningForm.removeAttribute('data-area-type');
        requestCleaningForm.removeAttribute('data-area-geojson');
        selectedLocation = null;
        selectedLocationDisplay.textContent = 'No location selected';
        
        alert('Cleaning request submitted successfully!');
    } catch (error) {
        console.error('Error requesting cleaning:', error);
        alert('Error requesting cleaning: ' + error.message);
    }
}); 