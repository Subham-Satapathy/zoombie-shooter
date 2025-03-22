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
  const game = new Game()
  // Make game instance globally accessible
  window.gameInstance = game
  
  game.init()
  
  // Handle window resize
  window.addEventListener('resize', () => {
    game.onWindowResize()
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
    // Only request pointer lock if game is running and we're not on mobile
    // And only if pointer lock isn't already active
    if (game.isRunning && !game.inputController.isMobile && 
        !document.pointerLockElement && 
        document.getElementById('game-over')?.classList.contains('hidden')) {
      game.renderer.domElement.requestPointerLock()
    }
  })
})
