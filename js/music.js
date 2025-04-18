// Music player control
document.addEventListener('DOMContentLoaded', function() {
    const bgMusic = document.getElementById('bg-music');
    const musicControls = document.getElementById('music-controls');
    
    // Check for saved user preference
    const isMuted = localStorage.getItem('bgMusicMuted') === 'true';
    
    // Function to try playing the music
    const tryPlayMusic = function() {
        console.log('Attempting to play music...');
        if (!bgMusic.paused) {
            console.log('Music is already playing');
            return;
        }
        
        // Play the music
        const playPromise = bgMusic.play();
        
        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    console.log('Music playback started successfully');
                })
                .catch(error => {
                    console.error('Playback failed:', error);
                });
        }
    };
    
    // Set initial state
    if (isMuted) {
        musicControls.classList.add('muted');
        bgMusic.muted = true;
    } else {
        // Try to play music immediately
        tryPlayMusic();
        
        // Also try again after a short delay (sometimes helps)
        setTimeout(tryPlayMusic, 1000);
    }
    
    // Try playing when user interacts with the page
    const userInteractionHandler = function() {
        tryPlayMusic();
        
        // Remove event listeners after first interaction
        document.removeEventListener('click', userInteractionHandler);
        document.removeEventListener('keydown', userInteractionHandler);
        document.removeEventListener('touchstart', userInteractionHandler);
    };
    
    // Add event listeners for user interaction
    document.addEventListener('click', userInteractionHandler);
    document.addEventListener('keydown', userInteractionHandler);
    document.addEventListener('touchstart', userInteractionHandler);
    
    // Toggle mute on click
    musicControls.addEventListener('click', function(event) {
        // Prevent the click from propagating to document
        event.stopPropagation();
        
        if (musicControls.classList.contains('muted')) {
            // Unmute
            musicControls.classList.remove('muted');
            bgMusic.muted = false;
            tryPlayMusic();
            localStorage.setItem('bgMusicMuted', 'false');
        } else {
            // Mute
            musicControls.classList.add('muted');
            bgMusic.muted = true;
            localStorage.setItem('bgMusicMuted', 'true');
        }
    });
}); 