# Zombie Shooter Game

A 3D browser-based zombie shooter game built with Three.js and TypeScript.

## Features

1. Three.js 3D environment with first-person and third-person camera views
2. Desktop (keyboard + mouse) and mobile (touch) controls
3. Multiple weapon types with different properties
4. Wave-based zombie progression system
5. Health and stamina mechanics
6. Melee combat when out of ammo
7. Real-time global leaderboard using Supabase

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

3. Configure Supabase for real-time leaderboard:
   - Create a Supabase account at [supabase.com](https://supabase.com)
   - Create a new project
   - Create a table called `leaderboard` with the following columns:
     - `id` (int, primary key, auto-increment)
     - `username` (text, not null)
     - `score` (int, not null)
     - `wave` (int, not null)
     - `created_at` (timestamp with timezone, default: now())
   - Enable Row Level Security (RLS) for the table
   - Add a policy to allow anyone to read (`SELECT`) from the table
   - Add a policy to allow anyone to insert (`INSERT`) into the table
   - Enable real-time functionality for the table
   - Update the Supabase credentials in `src/utils/DatabaseService.ts` with your project URL and anon key:
     ```typescript
     const supabaseUrl = 'https://your-project-id.supabase.co';
     const supabaseKey = 'your-public-anon-key';
     ```

4. Run the development server:
   ```
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:5173` (or the URL shown in your terminal)

## Setting Up Supabase (Detailed Instructions)

### 1. Create a Supabase Account and Project
1. Go to [supabase.com](https://supabase.com) and sign up for an account
2. Create a new project and give it a name
3. Note your project URL and public anon key (from Settings > API)

### 2. Create the Leaderboard Table
1. In your Supabase dashboard, go to the Table Editor
2. Click "Create a new table"
3. Name it `leaderboard`
4. Add the following columns:
   - `id` (type: int8, Primary Key enabled, Identity enabled)
   - `username` (type: text, Default Value: NULL, Is Nullable: false)
   - `score` (type: int8, Default Value: NULL, Is Nullable: false)
   - `wave` (type: int8, Default Value: NULL, Is Nullable: false)
   - `created_at` (type: timestamptz, Default Value: `now()`)
5. Click "Save" to create the table

### 3. Configure Row Level Security (RLS)
1. Go to the Authentication > Policies
2. Find the `leaderboard` table and click "Enable RLS"
3. Add a policy for SELECT:
   - Policy name: "Allow anyone to read scores"
   - Using expression: `true`
   - Check the SELECT operation
   - Click "Save policy"
4. Add a policy for INSERT:
   - Policy name: "Allow anyone to add scores"
   - Using expression: `true`
   - Check the INSERT operation
   - Click "Save policy"

### 4. Enable Real-time
1. Go to Database > Replication
2. In the "Real-time" section, click "Manage"
3. Add the `leaderboard` table to the list of tables that enable real-time
4. Click "Save"

### 5. Update the Game Code
1. Open `src/utils/DatabaseService.ts`
2. Update the Supabase URL and key with your values:
   ```typescript
   const supabaseUrl = 'https://your-project-id.supabase.co';
   const supabaseKey = 'your-public-anon-key';
   ```

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
10. Real-time Global Leaderboard - Integration with Supabase for real-time score tracking

## Credits

- Built with [Three.js](https://threejs.org)
- Backend powered by [Supabase](https://supabase.com)
- Bundled with [Vite](https://vitejs.dev)

## Troubleshooting Leaderboard Issues

If you're experiencing problems with the leaderboard functionality, such as seeing "Failed to submit score" errors, follow these steps:

### 1. Check the Browser Console for Errors
- Open your browser's developer tools (F12 or right-click -> Inspect)
- Look for any error messages in the Console tab that might provide specific information about what's going wrong

### 2. Verify Supabase Configuration
- Ensure you've correctly set up the Supabase project following the steps in the "Setting Up Supabase" section
- Verify that the table name is exactly `leaderboard` (case-sensitive)
- Confirm the table has all the required columns with the correct types
- Make sure Row Level Security (RLS) is enabled with appropriate policies for INSERT and SELECT

### 3. Check Credentials
- Confirm that you've replaced the placeholder Supabase URL and anon key in `src/utils/DatabaseService.ts` with your actual project credentials
- The URL should look like: `https://your-project-id.supabase.co`
- The anon key should be the "anon" / "public" key from your Supabase project settings, not the service role key

### 4. Test Database Connection
- You can add a test record directly in the Supabase dashboard to verify the table is working
- If using the Table Editor in Supabase, you should be able to manually insert a test score

### 5. Enable Detailed Logging
- If you're still having issues, you can enable more detailed Supabase logging by adding this code to your DatabaseService constructor:
  ```typescript
  // Enable detailed logging
  this.supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event, session);
  });
  ```

### 6. Check Network Connectivity
- Ensure your browser can connect to the Supabase servers
- Check if any ad blockers or privacy extensions might be blocking API requests

### 7. CORS Issues
- If you see CORS errors in the console, verify that your Supabase project's API settings allow requests from your game's host domain
