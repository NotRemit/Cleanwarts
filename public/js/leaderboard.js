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
    
    // Show loading indicator
    const loadingElement = document.createElement('div');
    loadingElement.classList.add('loading-indicator');
    loadingElement.textContent = 'Loading leaderboard...';
    housesRankings.appendChild(loadingElement);
    
    // Set up a real-time listener for houses
    housesListener = db.collection('houses')
        .orderBy('points', 'desc')
        .onSnapshot(snapshot => {
            housesRankings.innerHTML = '';
            
            let rank = 1;
            const totalHouses = snapshot.size;
            
            // No houses found
            if (totalHouses === 0) {
                const noDataElement = document.createElement('div');
                noDataElement.classList.add('no-data-message');
                noDataElement.textContent = 'No house data available.';
                housesRankings.appendChild(noDataElement);
                return;
            }
            
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
                
                // Set background color based on rank
                if (rank === 1) {
                    rowElement.classList.add('first-place');
                } else if (rank === 2) {
                    rowElement.classList.add('second-place');
                } else if (rank === 3) {
                    rowElement.classList.add('third-place');
                }
                
                // Create the columns
                const rankColumn = document.createElement('span');
                rankColumn.textContent = rank;
                rankColumn.classList.add('rank-column');
                
                const houseColumn = document.createElement('span');
                houseColumn.innerHTML = `
                    <img src="${HOUSES[houseId]?.crest || 'assets/hogwarts.svg'}" class="leaderboard-house-crest" />
                    <span class="house-badge" data-house="${houseId}">
                        ${house.name}
                    </span>
                    <span class="member-count">(${house.memberCount || 0} members)</span>
                `;
                houseColumn.classList.add('house-column');
                
                const pointsColumn = document.createElement('span');
                pointsColumn.textContent = house.points || 0;
                pointsColumn.classList.add('points-column');
                
                // Add columns to the row
                rowElement.appendChild(rankColumn);
                rowElement.appendChild(houseColumn);
                rowElement.appendChild(pointsColumn);
                
                // Add row to the leaderboard
                housesRankings.appendChild(rowElement);
                
                rank++;
            });
            
            // Add the last updated timestamp
            const lastUpdatedElement = document.createElement('div');
            lastUpdatedElement.classList.add('last-updated');
            lastUpdatedElement.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
            housesRankings.appendChild(lastUpdatedElement);
            
        }, error => {
            console.error('Error loading houses leaderboard:', error);
            housesRankings.innerHTML = '<div class="error-message">Error loading leaderboard data. Please try again later.</div>';
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
    
    // Show loading indicator
    const loadingElement = document.createElement('div');
    loadingElement.classList.add('loading-indicator');
    loadingElement.textContent = 'Loading house members...';
    individualsRankings.appendChild(loadingElement);
    
    // Get the current house name to display in the header
    const houseName = HOUSES[currentUserHouse]?.name || 'Unknown House';
    const houseCrest = HOUSES[currentUserHouse]?.crest || 'assets/hogwarts.svg';
    
    // Create a header for the individuals leaderboard
    const headerElement = document.createElement('div');
    headerElement.classList.add('individuals-header');
    headerElement.innerHTML = `
        <img src="${houseCrest}" class="house-crest-large" />
        <h3>${houseName} Members</h3>
    `;
    individualsRankings.appendChild(headerElement);
    
    // Set up a real-time listener for users in the current user's house
    individualsListener = db.collection('users')
        .where('house', '==', currentUserHouse)
        .where('isAdmin', '==', false)
        .orderBy('points', 'desc')
        .limit(20)
        .onSnapshot(snapshot => {
            // Remove the loading indicator and keep the header
            individualsRankings.innerHTML = '';
            individualsRankings.appendChild(headerElement);
            
            // No users found
            if (snapshot.empty) {
                const noDataElement = document.createElement('div');
                noDataElement.classList.add('no-data-message');
                noDataElement.textContent = 'No members found in this house.';
                individualsRankings.appendChild(noDataElement);
                return;
            }
            
            let rank = 1;
            snapshot.forEach(doc => {
                const user = doc.data();
                const userId = doc.id;
                
                // Skip admin users as a fallback check
                if (user.email === 'admin@gmail.com') {
                    return;
                }
                
                // Create a row for this user
                const rowElement = document.createElement('div');
                rowElement.classList.add('leaderboard-row');
                
                // Add a highlight class if this is the current user
                if (userId === auth.currentUser.uid) {
                    rowElement.classList.add('current-user');
                }
                
                // Set background color based on rank
                if (rank === 1) {
                    rowElement.classList.add('first-place');
                } else if (rank === 2) {
                    rowElement.classList.add('second-place');
                } else if (rank === 3) {
                    rowElement.classList.add('third-place');
                }
                
                // Create the columns
                const rankColumn = document.createElement('span');
                rankColumn.textContent = rank;
                rankColumn.classList.add('rank-column');
                
                const nameColumn = document.createElement('span');
                nameColumn.textContent = user.name;
                nameColumn.classList.add('name-column');
                
                // Add a small badge for the current user
                if (userId === auth.currentUser.uid) {
                    nameColumn.innerHTML = `${user.name} <span class="you-badge">YOU</span>`;
                }
                
                // Add the number of tasks completed
                nameColumn.innerHTML += `<span class="tasks-badge">${user.tasks || 0} tasks</span>`;
                
                const pointsColumn = document.createElement('span');
                pointsColumn.textContent = user.points || 0;
                pointsColumn.classList.add('points-column');
                
                // Add columns to the row
                rowElement.appendChild(rankColumn);
                rowElement.appendChild(nameColumn);
                rowElement.appendChild(pointsColumn);
                
                // Add row to the leaderboard
                individualsRankings.appendChild(rowElement);
                
                rank++;
            });
            
            // Add the last updated timestamp
            const lastUpdatedElement = document.createElement('div');
            lastUpdatedElement.classList.add('last-updated');
            lastUpdatedElement.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
            individualsRankings.appendChild(lastUpdatedElement);
            
        }, error => {
            console.error('Error loading individuals leaderboard:', error);
            individualsRankings.innerHTML = '<div class="error-message">Error loading member data. Please try again later.</div>';
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