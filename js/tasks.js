// Tasks Functionality

// DOM Elements
const myTasksPage = document.getElementById('my-tasks-page');
const tasksContainer = document.getElementById('tasks-container');

// Variables
let tasksListener = null;

// Initialize tasks when a user is logged in
function initTasks(userData) {
    // Load user's tasks
    loadUserTasks();
}

// Load user's tasks
function loadUserTasks() {
    // Clear any existing listener
    if (tasksListener) {
        tasksListener();
        tasksListener = null;
    }
    
    // Clear the tasks container
    tasksContainer.innerHTML = '';
    
    // Get current user
    const user = auth.currentUser;
    if (!user) return;
    
    // Set up a real-time listener for this user's task completions
    tasksListener = db.collection('taskCompletions')
        .where('userId', '==', user.uid)
        .orderBy('submittedAt', 'desc')
        .onSnapshot(snapshot => {
            tasksContainer.innerHTML = '';
            
            if (snapshot.empty) {
                tasksContainer.innerHTML = '<p class="no-tasks">You haven\'t completed any cleaning tasks yet. Check the map for areas that need cleaning!</p>';
                return;
            }
            
            snapshot.forEach(doc => {
                const task = doc.data();
                addTaskCard(doc.id, task);
            });
        }, error => {
            console.error('Error loading tasks:', error);
        });
}

// Add a task card to the tasks container
function addTaskCard(taskId, task) {
    // Create task card element
    const taskCard = document.createElement('div');
    taskCard.classList.add('task-card');
    
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
    
    // Status
    const taskStatus = document.createElement('div');
    taskStatus.classList.add('task-status', task.status);
    taskStatus.textContent = task.status.charAt(0).toUpperCase() + task.status.slice(1);
    
    // Add elements to task info
    taskInfo.appendChild(taskTitle);
    taskInfo.appendChild(taskDescription);
    taskInfo.appendChild(taskDate);
    taskInfo.appendChild(taskStatus);
    
    // Add sections to task card
    taskCard.appendChild(taskImages);
    taskCard.appendChild(taskInfo);
    
    // Add task card to container
    tasksContainer.appendChild(taskCard);
}

// Clean up tasks when user logs out
function cleanupTasks() {
    if (tasksListener) {
        tasksListener();
        tasksListener = null;
    }
    
    tasksContainer.innerHTML = '';
} 