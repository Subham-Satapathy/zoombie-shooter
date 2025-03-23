import './style.css'
import { Game } from './game/Game'

// Make Game instance available globally
declare global {
  interface Window { 
    gameInstance: Game;
  }
}

// Initialize the game once the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Remove any existing pointer-lock blocker elements from previous versions
  const existingBlocker = document.getElementById('pointer-lock-blocker');
  if (existingBlocker) {
    existingBlocker.remove();
  }
  
  const game = new Game()
  // Make game instance globally accessible
  window.gameInstance = game
  
  game.init()
  
  // Handle window resize
  window.addEventListener('resize', () => {
    game.onWindowResize()
  })
  
  // Setup start button
  const startButton = document.getElementById('start-button') as HTMLElement
  startButton?.addEventListener('click', () => {
    // Hide the start screen
    const startScreen = document.getElementById('start-screen') as HTMLElement
    startScreen?.classList.add('hidden')
    
    // Start the game
    game.start()
    
    // Focus on game container for pointer lock
    const gameContainer = document.getElementById('game-container') as HTMLElement
    gameContainer?.focus()
    
    // Request pointer lock for all devices
    game.renderer.domElement.requestPointerLock()
  })
  
  // Setup view leaderboard button
  const viewLeaderboardBtn = document.getElementById('view-leaderboard') as HTMLElement
  let leaderboardUpdateHandler: ((scores: any) => void) | null = null;
  
  viewLeaderboardBtn?.addEventListener('click', async () => {
    // Show leaderboard popup
    const leaderboardPopup = document.getElementById('leaderboard-popup') as HTMLElement
    if (leaderboardPopup) {
      leaderboardPopup.classList.remove('hidden')
      
      // Load top scores
      const popupLeaderboard = document.getElementById('popup-leaderboard') as HTMLElement
      if (popupLeaderboard) {
        // Clear previous entries
        popupLeaderboard.innerHTML = '<div class="loading">Loading scores...</div>'
        
        // Create handler function for updates
        leaderboardUpdateHandler = (scores: any[]) => {
          if (scores.length === 0) {
            popupLeaderboard.innerHTML = '<p class="no-scores">No scores yet. Be the first to play!</p>'
            return
          }
          
          // Create table
          const table = document.createElement('table')
          
          // Add header
          const thead = document.createElement('thead')
          thead.innerHTML = `
            <tr>
              <th style="text-align: left;">Rank</th>
              <th style="text-align: left;">Username</th>
              <th style="text-align: right;">Score</th>
              <th style="text-align: right;">Wave</th>
            </tr>
          `
          table.appendChild(thead)
          
          // Add rows
          const tbody = document.createElement('tbody')
          scores.forEach((entry, index) => {
            const row = document.createElement('tr')
            row.innerHTML = `
              <td style="text-align: left;">${index + 1}</td>
              <td style="text-align: left;">${entry.username}</td>
              <td style="text-align: right;">${entry.score}</td>
              <td style="text-align: right;">${entry.wave}</td>
            `
            tbody.appendChild(row)
          })
          
          table.appendChild(tbody)
          popupLeaderboard.innerHTML = ''
          popupLeaderboard.appendChild(table)
        }
        
        // Fetch initial scores
        const topScores = await game.dbService.getTopScores(10)
        
        // Update UI with initial scores
        leaderboardUpdateHandler(topScores)
        
        // Subscribe to real-time updates
        game.dbService.subscribeToLeaderboard(leaderboardUpdateHandler)
      }
    }
  })
  
  // Setup close leaderboard button
  const closeLeaderboardBtn = document.getElementById('close-leaderboard') as HTMLElement
  closeLeaderboardBtn?.addEventListener('click', () => {
    const leaderboardPopup = document.getElementById('leaderboard-popup') as HTMLElement
    if (leaderboardPopup) {
      leaderboardPopup.classList.add('hidden')
      
      // Unsubscribe from real-time updates when closing
      if (leaderboardUpdateHandler) {
        game.dbService.unsubscribeFromLeaderboard(leaderboardUpdateHandler)
        leaderboardUpdateHandler = null
      }
    }
  })
  
  // Setup button event listeners
  const viewToggleBtn = document.getElementById('view-toggle-btn') as HTMLElement
  viewToggleBtn?.addEventListener('click', () => {
    game.toggleCameraView()
  })
  
  // Mobile controls
  const shootBtn = document.getElementById('shoot-btn') as HTMLElement
  const reloadBtn = document.getElementById('reload-btn') as HTMLElement
  const weaponSwitchBtn = document.getElementById('weapon-switch-btn') as HTMLElement
  
  // Use both touch and pointer events for all devices
  shootBtn?.addEventListener('touchstart', (e) => {
    e.preventDefault()
    game.startShooting()
  })
  shootBtn?.addEventListener('touchend', (e) => {
    e.preventDefault()
    game.stopShooting()
  })
  
  shootBtn?.addEventListener('pointerdown', () => game.startShooting())
  shootBtn?.addEventListener('pointerup', () => game.stopShooting())
  shootBtn?.addEventListener('pointerleave', () => game.stopShooting())
  
  reloadBtn?.addEventListener('click', () => game.reload())
  weaponSwitchBtn?.addEventListener('click', () => game.switchWeapon())
  
  // Game over UI
  const restartGameBtn = document.getElementById('restart-game') as HTMLElement
  const submitScoreBtn = document.getElementById('submit-score') as HTMLElement
  
  // Add restart button event listener
  if (restartGameBtn) {
    console.log("Setting up restart button event listener")
    restartGameBtn.onclick = (e) => {
      e.preventDefault()
      console.log("Restart button clicked - main event handler")
      game.restart()
      return false
    }
  }
  
  submitScoreBtn?.addEventListener('click', (e) => {
    e.preventDefault()
    const usernameInput = document.getElementById('username-input') as HTMLInputElement
    game.submitScore(usernameInput.value)
  })
  
  // Add a click handler on the game container to re-establish pointer lock
  const gameContainer = document.getElementById('game-container') as HTMLElement
  gameContainer?.addEventListener('click', () => {
    // Request pointer lock if it's not already active and the game is running
    if (game.isRunning && 
        !document.pointerLockElement && 
        document.getElementById('game-over')?.classList.contains('hidden') &&
        document.getElementById('start-screen')?.classList.contains('hidden')) {
      game.renderer.domElement.requestPointerLock()
    }
  })
})
