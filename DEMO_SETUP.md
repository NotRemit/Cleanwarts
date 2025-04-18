# Cleanwarts Demo Setup

This guide explains how to run Cleanwarts with local Firebase emulators for a hackathon demo.

## Prerequisites

1. Node.js and npm installed on your computer
2. Firebase CLI installed globally: `npm install -g firebase-tools`

## Setup Instructions

1. **Clone or download the Cleanwarts repository**

2. **Install Firebase tools globally (if not already installed)**
   ```
   npm install -g firebase-tools
   ```

3. **Initialize Firebase in the project directory (one-time setup)**
   ```
   firebase login
   firebase init emulators
   ```
   - When prompted, select the following emulators:
     - Authentication
     - Firestore
     - Storage
     - Realtime Database
     - Hosting
     - Emulator UI

4. **Start the Firebase emulators**
   ```
   firebase emulators:start
   ```

5. **Open the application**
   - Navigate to http://localhost:5000 in your browser
   - The app will automatically connect to the local emulators
   - A demo admin account will be created: `admin@cleanwarts.demo` / `admin123`

## Features Available in Demo Mode

- User registration and login (data stored locally)
- House selection
- House-specific chat rooms
- Interactive campus map with demo cleaning tasks
- Task submission with image uploads
- Admin verification of tasks (using the demo admin account)
- House and individual leaderboards

## How Demo Mode Works

1. When the app detects it's running on localhost, it automatically connects to local Firebase emulators
2. Demo data is generated when the app starts, including:
   - The four Hogwarts houses with random points
   - Several cleaning tasks placed on the map
   - A demo admin account

3. You can test all app features without an internet connection or real Firebase project

## Emulator UI

- The Firebase Emulator UI is available at http://localhost:4000
- You can use it to:
  - View and edit Firestore data
  - Manage authentication accounts
  - Monitor storage uploads
  - Inspect Realtime Database

## Troubleshooting

**If the emulators fail to start:**
- Make sure ports 9099, 8080, 9000, 9199, 5000, and 4000 are not in use by other applications
- Try running `firebase emulators:start --only auth,firestore,database,storage,hosting`

**If the app doesn't connect to emulators:**
- Check the browser console for connection errors
- Ensure you're accessing the app via http://localhost:5000

**If images don't upload:**
- Verify the storage emulator is running
- Check browser console for specific error messages

## Cleaning Up Demo Data

If you want to reset the demo data:
1. Stop the emulators (Ctrl+C in the terminal)
2. Clear local storage in your browser for localhost
3. Restart the emulators 