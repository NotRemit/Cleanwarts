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
    
    // Set up a real-time listener for pending task completions
    pendingTasksListener = db.collection('taskCompletions')
        .where('status', '==', 'pending')
        .orderBy('submittedAt', 'desc')
        .onSnapshot(snapshot => {
            pendingTasksContainer.innerHTML = '';
            
            if (snapshot.empty) {
                pendingTasksContainer.innerHTML = '<p class="no-tasks">No pending tasks to review.</p>';
                return;
            }
            
            snapshot.forEach(doc => {
                const task = doc.data();
                addAdminTaskCard(doc.id, task);
            });
        }, error => {
            console.error('Error loading pending tasks:', error);
        });
}

// Add an admin task card to the pending tasks container
function addAdminTaskCard(taskId, task) {
    // Create task card element
    const taskCard = document.createElement('div');
    taskCard.classList.add('admin-task-card');
    
    // Create task images section
    const taskImages = document.createElement('div');
    taskImages.classList.add('task-images');
    
    // Before image
    const beforeImage = document.createElement('div');
    beforeImage.classList.add('before');
    beforeImage.style.backgroundImage = `url('${task.beforeImage}')`;
    
    // After image
    const afterImage = document.createElement('div');
    afterImage.classList.add('after');
    afterImage.style.backgroundImage = `url('${task.afterImage}')`;
    
    taskImages.appendChild(beforeImage);
    taskImages.appendChild(afterImage);
    
    // Create task info section
    const taskInfo = document.createElement('div');
    taskInfo.classList.add('task-info');
    
    // Title
    const taskTitle = document.createElement('h3');
    taskTitle.textContent = task.title;
    
    // Description
    const taskDescription = document.createElement('p');
    taskDescription.textContent = task.description;
    
    // Submitter info
    const submitterInfo = document.createElement('p');
    submitterInfo.classList.add('submitter-info');
    submitterInfo.innerHTML = `Submitted by: <strong>${task.userName}</strong> from <span class="house-badge" data-house="${task.userHouse}">${HOUSES[task.userHouse].name}</span>`;
    
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
    
    // Add elements to task info
    taskInfo.appendChild(taskTitle);
    taskInfo.appendChild(taskDescription);
    taskInfo.appendChild(submitterInfo);
    taskInfo.appendChild(taskDate);
    
    // Admin buttons
    const adminButtons = document.createElement('div');
    adminButtons.classList.add('admin-buttons');
    
    // Approve button
    const approveButton = document.createElement('button');
    approveButton.classList.add('approve');
    approveButton.textContent = 'Approve';
    approveButton.addEventListener('click', () => {
        handleTaskDecision(taskId, task, 'approved');
    });
    
    // Reject button
    const rejectButton = document.createElement('button');
    rejectButton.classList.add('reject');
    rejectButton.textContent = 'Reject';
    rejectButton.addEventListener('click', () => {
        handleTaskDecision(taskId, task, 'rejected');
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

// Handle admin decision (approve/reject)
async function handleTaskDecision(taskId, task, decision) {
    try {
        // Confirm the action
        if (!confirm(`Are you sure you want to ${decision} this task?`)) {
            return;
        }
        
        // Update task status
        await db.collection('taskCompletions').doc(taskId).update({
            status: decision,
            reviewedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // If approved, update:
        // 1. The original cleaning task marker to green
        // 2. Award points to the user
        // 3. Add points to the house
        if (decision === 'approved') {
            // Update the original cleaning task
            const cleaningTask = await db.collection('cleaningTasks').doc(task.taskId).get();
            if (cleaningTask.exists) {
                await db.collection('cleaningTasks').doc(task.taskId).update({
                    status: 'approved'
                });
            }
            
            // Award points to user
            await db.collection('users').doc(task.userId).update({
                points: firebase.firestore.FieldValue.increment(TASK_POINTS),
                tasks: firebase.firestore.FieldValue.increment(1)
            });
            
            // Add points to house
            await db.collection('houses').doc(task.userHouse).update({
                points: firebase.firestore.FieldValue.increment(TASK_POINTS)
            });
            
            alert(`Task approved! ${TASK_POINTS} points awarded to ${task.userName} and ${HOUSES[task.userHouse].name}.`);
        } else {
            alert('Task rejected.');
        }
    } catch (error) {
        console.error(`Error ${decision} task:`, error);
        alert(`Error ${decision} task: ${error.message}`);
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