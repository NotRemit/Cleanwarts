// House Chat Functionality

// DOM Elements
const chatPage = document.getElementById('chat-page');
const chatMessages = document.getElementById('chat-messages');
const messageInput = document.getElementById('message-input');
const sendMessageButton = document.getElementById('send-message');

// Variables
let currentUserData = null;
let messagesRef = null;
let messagesListener = null;

// Initialize chat when a user is logged in
function initChat(userData) {
    currentUserData = userData;
    
    // Set up the Firebase reference for this house's chat
    messagesRef = rtdb.ref(`houseChats/${userData.house}`);
    
    // Load existing messages and listen for new ones
    setupChatListener();
    
    // Set up message send functionality
    setupMessageSending();
}

// Set up real-time listener for chat messages
function setupChatListener() {
    // Clear any existing listener
    if (messagesListener) {
        messagesRef.off('child_added', messagesListener);
    }
    
    // Clear the messages container
    chatMessages.innerHTML = '';
    
    // Set up a new listener for messages
    messagesListener = messagesRef.orderByChild('timestamp').limitToLast(100).on('child_added', (snapshot) => {
        const message = snapshot.val();
        addMessageToChat(message);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
}

// Set up message sending functionality
function setupMessageSending() {
    // Send message on button click
    sendMessageButton.addEventListener('click', sendMessage);
    
    // Send message on Enter key
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendMessage();
        }
    });
}

// Send a message
function sendMessage() {
    const messageText = messageInput.value.trim();
    
    if (!messageText || !currentUserData) return;
    
    // Create message object
    const message = {
        text: messageText,
        sender: currentUserData.name,
        senderId: auth.currentUser.uid,
        house: currentUserData.house,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    
    // Push to Firebase
    messagesRef.push(message)
        .then(() => {
            // Clear input field
            messageInput.value = '';
        })
        .catch(error => {
            console.error('Error sending message:', error);
            alert(`Error sending message: ${error.message}`);
        });
}

// Add a message to the chat display
function addMessageToChat(message) {
    const isCurrentUser = message.senderId === auth.currentUser.uid;
    
    // Create message element
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.classList.add(isCurrentUser ? 'outgoing' : 'incoming');
    
    // Create sender element (only for incoming messages)
    if (!isCurrentUser) {
        const senderElement = document.createElement('div');
        senderElement.classList.add('sender');
        senderElement.textContent = message.sender;
        messageElement.appendChild(senderElement);
    }
    
    // Create text element
    const textElement = document.createElement('div');
    textElement.classList.add('text');
    textElement.textContent = message.text;
    messageElement.appendChild(textElement);
    
    // Create timestamp element
    const timestampElement = document.createElement('div');
    timestampElement.classList.add('timestamp');
    
    // Format the timestamp
    const date = new Date(message.timestamp);
    const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    timestampElement.textContent = formattedTime;
    
    messageElement.appendChild(timestampElement);
    
    // Add to chat
    chatMessages.appendChild(messageElement);
}

// Clean up chat when user logs out
function cleanupChat() {
    if (messagesListener) {
        messagesRef.off('child_added', messagesListener);
        messagesListener = null;
    }
    
    currentUserData = null;
    chatMessages.innerHTML = '';
} 