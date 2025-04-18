// Admin Panel Functionality

// DOM Elements
const pendingTasksContainer = document.getElementById('pending-tasks');

// Variables
let pendingTasksListener = null;

// Initialize admin functionality
function loadAdminFunctionality() {
    // Load pending tasks
    loadPendingTasks();
}

// Load pending tasks
function loadPendingTasks() {
    // Clear any existing listener
    if (pendingTasksListener) {
        pendingTasksListener();
        pendingTasksListener = null;
    }
    
    // Clear the pending tasks container
    pendingTasksContainer.innerHTML = '';
    
    // Set up a real-time listener for task completions
    // This will fetch all tasks with status 'pending', regardless of where they were submitted
    pendingTasksListener = db.collection('taskCompletions')
        .where('status', '==', 'pending')
        .orderBy('submittedAt', 'desc')
        .onSnapshot(snapshot => {
            pendingTasksContainer.innerHTML = '';
            let taskCount = 0;
            
            if (snapshot.empty) {
                console.log("No pending tasks found in the first query");
                // If no pending tasks, check for task submissions in the second query
            } else {
                taskCount = snapshot.size;
                snapshot.forEach(doc => {
                    const task = doc.data();
                    console.log("Pending task found:", doc.id, task);
                    addAdminTaskCard(doc.id, task);
                });
            }
            
            // Display a message if no tasks were found
            if (taskCount === 0) {
                pendingTasksContainer.innerHTML = '<p class="no-tasks">No pending tasks to review.</p>';
            }
        }, error => {
            console.error('Error loading pending tasks:', error);
            pendingTasksContainer.innerHTML = '<p class="error-message">Error loading tasks. Please try again later.</p>';
        });
}

// Add an admin task card to the pending tasks container
function addAdminTaskCard(taskId, task) {
    console.log("Adding admin task card:", taskId, task);
    
    // Create task card element
    const taskCard = document.createElement('div');
    taskCard.classList.add('admin-task-card');
    
    // Create task images section
    const taskImages = document.createElement('div');
    taskImages.classList.add('task-images');
    
    // Before image
    const beforeImage = document.createElement('div');
    beforeImage.classList.add('before');
    if (task.beforeImage) {
        beforeImage.style.backgroundImage = `url('${task.beforeImage}')`;
    } else {
        beforeImage.textContent = 'No before image';
        beforeImage.style.display = 'flex';
        beforeImage.style.justifyContent = 'center';
        beforeImage.style.alignItems = 'center';
        beforeImage.style.backgroundColor = '#333';
    }
    
    // After image
    const afterImage = document.createElement('div');
    afterImage.classList.add('after');
    if (task.afterImage) {
        afterImage.style.backgroundImage = `url('${task.afterImage}')`;
    } else {
        afterImage.textContent = 'No after image';
        afterImage.style.display = 'flex';
        afterImage.style.justifyContent = 'center';
        afterImage.style.alignItems = 'center';
        afterImage.style.backgroundColor = '#333';
    }
    
    taskImages.appendChild(beforeImage);
    taskImages.appendChild(afterImage);
    
    // Create task info section
    const taskInfo = document.createElement('div');
    taskInfo.classList.add('task-info');
    
    // Title
    const taskTitle = document.createElement('h3');
    taskTitle.textContent = task.title || 'Untitled Task';
    
    // Description
    const taskDescription = document.createElement('p');
    taskDescription.textContent = task.description || 'No description provided';
    
    // Submitter info
    const submitterInfo = document.createElement('p');
    submitterInfo.classList.add('submitter-info');
    
    // Check that required house info exists
    if (task.userName && task.userHouse && HOUSES[task.userHouse]) {
        submitterInfo.innerHTML = `Submitted by: <strong>${task.userName}</strong> from <span class="house-badge" data-house="${task.userHouse}">${HOUSES[task.userHouse].name}</span>`;
    } else {
        submitterInfo.innerHTML = `Submitted by: <strong>${task.userName || 'Unknown User'}</strong>`;
    }
    
    // Date
    const taskDate = document.createElement('p');
    taskDate.classList.add('task-date');
    
    // Format the date
    if (task.submittedAt) {
        const date = task.submittedAt.toDate();
        const formattedDate = date.toLocaleDateString();
        taskDate.textContent = `Submitted on: ${formattedDate}`;
    } else {
        taskDate.textContent = 'Submission date unknown';
    }
    
    // Points input
    const pointsGroup = document.createElement('div');
    pointsGroup.classList.add('points-group');
    
    const pointsLabel = document.createElement('label');
    pointsLabel.textContent = 'Award points (max 100):';
    pointsLabel.setAttribute('for', `points-${taskId}`);
    
    const pointsInput = document.createElement('input');
    pointsInput.type = 'number';
    pointsInput.id = `points-${taskId}`;
    pointsInput.classList.add('points-input');
    pointsInput.min = '1';
    pointsInput.max = '100';
    pointsInput.value = TASK_POINTS.toString();
    
    pointsGroup.appendChild(pointsLabel);
    pointsGroup.appendChild(pointsInput);
    
    // Add elements to task info
    taskInfo.appendChild(taskTitle);
    taskInfo.appendChild(taskDescription);
    taskInfo.appendChild(submitterInfo);
    taskInfo.appendChild(taskDate);
    taskInfo.appendChild(pointsGroup);
    
    // Image zoom feature
    beforeImage.addEventListener('click', () => {
        showImagePreview(task.beforeImage, 'Before Image');
    });
    
    afterImage.addEventListener('click', () => {
        showImagePreview(task.afterImage, 'After Image');
    });
    
    // Admin buttons
    const adminButtons = document.createElement('div');
    adminButtons.classList.add('admin-buttons');
    
    // Approve button
    const approveButton = document.createElement('button');
    approveButton.classList.add('approve');
    approveButton.textContent = 'Approve';
    approveButton.addEventListener('click', () => {
        const pointsToAward = parseInt(document.getElementById(`points-${taskId}`).value, 10);
        if (isNaN(pointsToAward) || pointsToAward < 1 || pointsToAward > 100) {
            alert('Please enter a valid number of points between 1 and 100');
            return;
        }
        handleTaskDecision(taskId, task, 'approved', pointsToAward);
    });
    
    // Reject button
    const rejectButton = document.createElement('button');
    rejectButton.classList.add('reject');
    rejectButton.textContent = 'Reject';
    rejectButton.addEventListener('click', () => {
        handleTaskDecision(taskId, task, 'rejected', 0);
    });
    
    adminButtons.appendChild(approveButton);
    adminButtons.appendChild(rejectButton);
    
    // Add sections to task card
    taskCard.appendChild(taskImages);
    taskCard.appendChild(taskInfo);
    taskCard.appendChild(adminButtons);
    
    // Add task card to container
    pendingTasksContainer.appendChild(taskCard);
}

// Show image preview in fullscreen
function showImagePreview(imageUrl, title) {
    if (!imageUrl) return;
    
    const modal = document.createElement('div');
    modal.classList.add('modal');
    modal.style.display = 'flex';
    modal.style.zIndex = '2000';
    
    const modalContent = document.createElement('div');
    modalContent.classList.add('modal-content');
    modalContent.style.padding = '20px';
    modalContent.style.maxWidth = '90%';
    modalContent.style.maxHeight = '90vh';
    
    const closeBtn = document.createElement('span');
    closeBtn.classList.add('close-modal');
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    const titleElement = document.createElement('h3');
    titleElement.textContent = title;
    titleElement.style.marginBottom = '15px';
    
    const image = document.createElement('img');
    image.src = imageUrl;
    image.style.maxWidth = '100%';
    image.style.maxHeight = 'calc(90vh - 80px)';
    image.style.objectFit = 'contain';
    
    modalContent.appendChild(closeBtn);
    modalContent.appendChild(titleElement);
    modalContent.appendChild(image);
    modal.appendChild(modalContent);
    
    document.body.appendChild(modal);
    
    // Close on clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

// Handle admin decision (approve/reject)
async function handleTaskDecision(taskId, task, decision, pointsToAward) {
    try {
        // Confirm the action
        if (!confirm(`Are you sure you want to ${decision} this task?`)) {
            return;
        }
        
        // Start a loading indicator
        const decisionInProgress = document.createElement('div');
        decisionInProgress.className = 'decision-progress';
        decisionInProgress.innerHTML = `<p>Processing ${decision} action...</p>`;
        document.getElementById('pending-tasks').appendChild(decisionInProgress);
        
        // Update task status
        await db.collection('taskCompletions').doc(taskId).update({
            status: decision,
            reviewedAt: firebase.firestore.FieldValue.serverTimestamp(),
            pointsAwarded: decision === 'approved' ? pointsToAward : 0
        });
        
        // If approved, update:
        // 1. The original cleaning task marker to green
        // 2. Award points to the user
        // 3. Add points to the house
        if (decision === 'approved') {
            console.log(`Approving task ${taskId} for user ${task.userId} from house ${task.userHouse} with ${pointsToAward} points`);
            
            // Update the original cleaning task if it's not a temporary task
            if (task.taskId && !task.taskId.startsWith('temp_')) {
                try {
                    const cleaningTask = await db.collection('cleaningTasks').doc(task.taskId).get();
                    if (cleaningTask.exists) {
                        await db.collection('cleaningTasks').doc(task.taskId).update({
                            status: 'approved',
                            lastCleanedAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                        console.log(`Updated cleaning task ${task.taskId} status to approved`);
                    }
                } catch (error) {
                    console.error("Error updating cleaning task:", error);
                }
            }
            
            // Award points to user
            try {
                await db.collection('users').doc(task.userId).update({
                    points: firebase.firestore.FieldValue.increment(pointsToAward),
                    tasks: firebase.firestore.FieldValue.increment(1)
                });
                console.log(`Awarded ${pointsToAward} points to user ${task.userId}`);
            } catch (error) {
                console.error("Error updating user points:", error);
                alert(`Unable to award points to user. Error: ${error.message}`);
            }
            
            // Add points to house
            try {
                if (task.userHouse) {
                    await db.collection('houses').doc(task.userHouse).update({
                        points: firebase.firestore.FieldValue.increment(pointsToAward)
                    });
                    console.log(`Awarded ${pointsToAward} points to house ${task.userHouse}`);
                }
            } catch (error) {
                console.error("Error updating house points:", error);
                alert(`Unable to award points to house. Error: ${error.message}`);
            }
            
            alert(`Task approved! ${pointsToAward} points awarded to ${task.userName} and ${HOUSES[task.userHouse].name}.`);
        } else {
            alert('Task rejected.');
        }
        
        // Remove loading indicator
        document.querySelector('.decision-progress')?.remove();
    } catch (error) {
        console.error(`Error ${decision} task:`, error);
        alert(`Error ${decision} task: ${error.message}`);
        // Remove loading indicator if error occurs
        document.querySelector('.decision-progress')?.remove();
    }
}

// Clean up admin functionality
function cleanupAdminFunctionality() {
    if (pendingTasksListener) {
        pendingTasksListener();
        pendingTasksListener = null;
    }
    
    pendingTasksContainer.innerHTML = '';
}