# Cleanwarts - Hogwarts-Themed Campus Cleaning App

Cleanwarts is a web application that gamifies campus cleaning activities by creating a Hogwarts-themed environment where students join houses and compete to clean the university campus.

## Features

- User registration with house selection (Gryffindor, Hufflepuff, Ravenclaw, Slytherin)
- User authentication (login/logout)
- House-specific chat rooms for coordination
- Interactive campus map with cleaning task markers
- Users can request cleaning tasks and upload before/after photos as proof
- Admin verification of completed tasks
- House and individual leaderboards
- Mobile-responsive design
- Magical UI with Hogwarts theme

## Technologies Used

- Vanilla JavaScript (no frameworks)
- Firebase for backend services:
  - Firebase Authentication
  - Cloud Firestore for database
  - Firebase Storage for image storage
  - Firebase Realtime Database for chat functionality
- Leaflet.js for interactive maps
- CSS for styling

## Getting Started

1. Clone this repository
2. Open `index.html` in your browser
3. Register a new account or log in with an existing one

## Project Structure

```
├── index.html              # Main HTML file
├── styles/
│   └── main.css            # CSS styles
├── js/
│   ├── config.js           # Firebase configuration
│   ├── auth.js             # Authentication functionality
│   ├── map.js              # Map and tasks functionality
│   ├── chat.js             # House chat functionality
│   ├── leaderboard.js      # Leaderboards functionality
│   ├── tasks.js            # User tasks functionality
│   ├── admin.js            # Admin panel functionality
│   └── app.js              # Main application script
└── assets/                 # Images and other assets
```

## Credits

This project was created as part of a coding challenge for TechNova Hackathon.

## License

This project is available for use under the MIT License.

 