// Leaderboard Functionality

// DOM Elements
const leaderboardPage = document.getElementById('leaderboard-page');
const tabButtons = document.querySelectorAll('.tab-button');
const housesLeaderboard = document.getElementById('houses-leaderboard');
const individualsLeaderboard = document.getElementById('individuals-leaderboard');
const housesRankings = document.getElementById('houses-rankings');
const individualsRankings = document.getElementById('individuals-rankings');

// Variables
let currentUserHouse = null;
let housesListener = null;
let individualsListener = null;

// Initialize leaderboards when a user is logged in
function initLeaderboards(userData) {
    currentUserHouse = userData.house;
    
    // Set up tab switching
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            
            // Toggle active class on buttons
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Show the selected leaderboard
            if (tabName === 'houses') {
                housesLeaderboard.classList.remove('hidden');
                individualsLeaderboard.classList.add('hidden');
                loadHousesLeaderboard();
            } else {
                housesLeaderboard.classList.add('hidden');
                individualsLeaderboard.classList.remove('hidden');
                loadIndividualsLeaderboard();
            }
        });
    });
    
    // Load the houses leaderboard by default
    loadHousesLeaderboard();
}

// Load houses leaderboard data
function loadHousesLeaderboard() {
    // Clear any existing listener
    if (housesListener) {
        housesListener();
        housesListener = null;
    }
    
    // Clear the rankings container
    housesRankings.innerHTML = '';
    
    // Set up a real-time listener for houses
    housesListener = db.collection('houses')
        .orderBy('points', 'desc')
        .onSnapshot(snapshot => {
            housesRankings.innerHTML = '';
            
            let rank = 1;
            snapshot.forEach(doc => {
                const house = doc.data();
                const houseId = doc.id;
                
                // Create a row for this house
                const rowElement = document.createElement('div');
                rowElement.classList.add('leaderboard-row');
                
                // Add a highlight class if this is the user's house
                if (houseId === currentUserHouse) {
                    rowElement.classList.add('current-user-house');
                }
                
                // Create the columns
                const rankColumn = document.createElement('span');
                rankColumn.textContent = rank;
                
                const houseColumn = document.createElement('span');
                houseColumn.innerHTML = `
                    <span class="house-badge" data-house="${houseId}">
                        ${house.name}
                    </span>
                `;
                
                const pointsColumn = document.createElement('span');
                pointsColumn.textContent = house.points || 0;
                
                // Add columns to the row
                rowElement.appendChild(rankColumn);
                rowElement.appendChild(houseColumn);
                rowElement.appendChild(pointsColumn);
                
                // Add row to the leaderboard
                housesRankings.appendChild(rowElement);
                
                rank++;
            });
        }, error => {
            console.error('Error loading houses leaderboard:', error);
        });
}

// Load individuals leaderboard data
function loadIndividualsLeaderboard() {
    // Clear any existing listener
    if (individualsListener) {
        individualsListener();
        individualsListener = null;
    }
    
    // Clear the rankings container
    individualsRankings.innerHTML = '';
    
    // Set up a real-time listener for users in the current user's house
    individualsListener = db.collection('users')
        .where('house', '==', currentUserHouse)
        .orderBy('points', 'desc')
        .limit(20) // Limit to top 20 users for performance
        .onSnapshot(snapshot => {
            individualsRankings.innerHTML = '';
            
            let rank = 1;
            snapshot.forEach(doc => {
                const user = doc.data();
                const userId = doc.id;
                
                // Create a row for this user
                const rowElement = document.createElement('div');
                rowElement.classList.add('leaderboard-row');
                
                // Add a highlight class if this is the current user
                if (userId === auth.currentUser.uid) {
                    rowElement.classList.add('current-user');
                }
                
                // Create the columns
                const rankColumn = document.createElement('span');
                rankColumn.textContent = rank;
                
                const nameColumn = document.createElement('span');
                nameColumn.textContent = user.name;
                
                const pointsColumn = document.createElement('span');
                pointsColumn.textContent = user.points || 0;
                
                // Add columns to the row
                rowElement.appendChild(rankColumn);
                rowElement.appendChild(nameColumn);
                rowElement.appendChild(pointsColumn);
                
                // Add row to the leaderboard
                individualsRankings.appendChild(rowElement);
                
                rank++;
            });
        }, error => {
            console.error('Error loading individuals leaderboard:', error);
        });
}

// Clean up leaderboards when user logs out
function cleanupLeaderboards() {
    if (housesListener) {
        housesListener();
        housesListener = null;
    }
    
    if (individualsListener) {
        individualsListener();
        individualsListener = null;
    }
    
    currentUserHouse = null;
    housesRankings.innerHTML = '';
    individualsRankings.innerHTML = '';
} 