# 3D Interactive Scene with Navigation

A React-based 3D interactive scene built with Three.js, featuring pre-loaded 3D models, navigation mesh pathfinding, and first-person camera controls. Users can explore the 3D environment by clicking on the navmesh to move the camera along obstacle-avoiding paths.

## Live Demo

🌐 **Project Link:** [https://project-ebon-three-24.vercel.app/](https://project-ebon-three-24.vercel.app/)

## Features

### ✅ Completed Tasks

1. **Model Pre-loading with Progress Tracking**

   - Both 3D models (base model and navmesh) are pre-loaded into the scene
   - Real-time loading progress displayed with detailed percentage
   - Custom loader component shows loading status until all assets are fully loaded

2. **Model Positioning and Rotation**

   - Both models are loaded at the specified position:
     - Position: `x: 0, y: 0, z: 0`
     - Rotation: `x: 0, y: 0, z: 0`

3. **Transparent NavMesh**

   - Navmesh is loaded as a transparent object
   - Fully functional for pathfinding but invisible to users
   - Enables click detection for navigation

4. **Initial Camera Position**

   - Camera is positioned at:
     - Position: `x: -1.1508156, y: -1.6764000, z: 0.9319295`
     - Rotation: `x: -1.7284384, y: -0.6981315, z: -1.2633993`
   - **Note:** The initial camera orientation differs from the specified rotation values - the camera is currently facing downwards instead of forward. This is a known implementation difference that may need adjustment based on the desired viewing angle.

5. **Smooth Look-Around Controls**

   - Mouse drag and touch drag support for looking around
   - Smooth camera rotation while maintaining position
   - Camera does not tilt (no roll rotation)
   - First-person view experience

6. **Pathfinding Navigation**
   - Double-click on navmesh to initiate camera movement
   - Camera moves smoothly along the shortest possible path
   - Obstacle avoidance using pathfinding algorithm
   - Maintains camera height during movement
   - Natural, human-like movement (not abrupt or mechanical)
   - Smooth acceleration and deceleration for realistic movement

## Technology Stack

- **React 19.1.1** - UI framework
- **Vite 7.1.7** - Build tool and dev server
- **Three.js 0.181.0** - 3D graphics library
- **@react-three/fiber 9.4.0** - React renderer for Three.js
- **@react-three/drei 10.7.6** - Useful helpers for react-three-fiber
- **three-pathfinding 1.3.0** - Pathfinding library for navigation mesh
- **Zustand 5.0.2** - State management for loading progress

## Project Structure

```
src/
├── components/
│   ├── BaseModel.jsx          # 3D base model component
│   ├── NavMesh.jsx            # Navigation mesh component (transparent)
│   ├── CameraController.jsx   # Camera controls and pathfinding
│   ├── Loader.jsx             # Loading progress component
│   ├── Lights.jsx             # Scene lighting
│   └── Scene.jsx              # Main scene component
├── store/
│   └── LoadingStore.jsx       # Loading state management
├── App.jsx                    # Main application component
└── main.jsx                   # Application entry point
```

## Key Components

### CameraController

- Handles first-person camera controls
- Implements mouse/touch drag for looking around
- Manages pathfinding-based navigation
- Smooth camera movement with acceleration/deceleration
- Maintains camera height above ground

### Loader

- Displays loading progress with percentage
- Shows current asset being loaded
- Automatically hides when loading is complete

### NavMesh

- Loads navigation mesh as transparent object
- Handles double-click detection
- Provides pathfinding data for camera movement

### BaseModel

- Loads and displays the main 3D model
- Configures shadow casting and receiving
- Tracks loading progress

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

## Usage

1. Wait for all models to load (progress bar will show loading status)
2. Once loaded, you can:
   - **Look around:** Click and drag (or touch and drag on mobile) to rotate the camera
   - **Navigate:** Double-click anywhere on the navmesh to move the camera to that location
   - The camera will automatically find the shortest path and move smoothly while avoiding obstacles

## Known Issues

- **Camera Initial Orientation:** The initial camera rotation differs from the specified values. The camera is currently facing downwards instead of forward, which may need adjustment based on the desired viewing angle.

## License

This project is private and proprietary.
