# Zombie Shooter Game

A 3D browser-based zombie shooter game built with Three.js and TypeScript.

## Features

1. Three.js 3D environment with first-person and third-person camera views
2. Desktop (keyboard + mouse) and mobile (touch) controls
3. Multiple weapon types with different properties
4. Wave-based zombie progression system
5. Health and stamina mechanics
6. Melee combat when out of ammo
7. Global leaderboard using Supabase

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/zombie-shooter.git
   cd zombie-shooter
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Configure Supabase:
   - Create a Supabase account at [supabase.com](https://supabase.com)
   - Create a new project
   - Create a table called `leaderboard` with the following columns:
     - `id` (int, primary key, auto-increment)
     - `username` (text, not null)
     - `score` (int, not null)
     - `wave` (int, not null)
     - `created_at` (timestamp with timezone, default: now())
   - Update the Supabase credentials in `src/utils/DatabaseService.ts` with your project URL and anon key

4. Run the development server:
   ```
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:5173` (or the URL shown in your terminal)

## Controls

### Desktop:
- WASD or Arrow Keys: Move
- Mouse: Aim
- Left Click: Shoot
- R: Reload
- Q: Switch Weapon
- V: Toggle Camera View (First-person/Third-person)

### Mobile:
- Left side virtual joystick: Move
- Touch and drag right side: Aim
- Shoot button: Fire weapon
- Reload button: Reload weapon
- Switch button: Change weapons
- View Toggle button: Switch camera view

## Game Mechanics

1. Survive waves of zombies that get progressively harder
2. Earn weapons after completing waves
3. Use melee attacks when out of ammo (costs stamina)
4. Stamina regenerates over time
5. Health slowly regenerates
6. Submit your score to the global leaderboard

## Implementation Steps

The game was implemented in 10 steps:

1. Project Setup - Basic Three.js scene with camera, lighting, and ground
2. Player Setup - Player entity with movement controls and camera views
3. Aiming & Shooting - Aiming mechanics using Pointer Lock and touch-drag
4. Weapons System - Multiple weapons with different properties
5. Reload & Ammo System - Limited ammo with reload mechanics
6. Melee Combat & Stamina - Automatic melee attacks when close to zombies
7. Zombie AI & Waves - Different zombie types with basic AI
8. Health & Damage Indication - Screen flashing for damage indication
9. Wave System & Difficulty Scaling - Progressive difficulty increase
10. Global Leaderboard - Integration with Supabase for score tracking

## Credits

- Built with [Three.js](https://threejs.org)
- Backend powered by [Supabase](https://supabase.com)
- Bundled with [Vite](https://vitejs.dev) # zoombie-shooter
