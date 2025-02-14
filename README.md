# Squats Simulator

A React-based interactive simulator for visualizing and analyzing squat mechanics. This tool helps users understand the biomechanics of squats by providing a dynamic visualization of body segments and joint angles during the squat movement.

## Features

- Interactive visualization of squat mechanics
- Real-time calculation of:
  - Thigh angle
  - Shin angle
  - Torso angle
  - Joint positions (ankle, knee, hip)
- Adjustable body segment lengths:
  - Torso
  - Femur (thigh)
  - Shin
  - Feet
- Maintains biomechanically accurate proportions and relationships between segments

## Technical Details

The simulator uses mathematical models to calculate:
- Joint positions in a 2D coordinate system
- Angle relationships between body segments
- Biomechanical constraints and ratios
- SVG-based visualization

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/KanHarI/SquatsSimulator.git
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The application will be available at http://localhost:3000 in your browser.

## Building for Production

To create a production build:

```bash
npm run build
```

This will create an optimized build in the `build` folder.

## Deployment

The project is configured for GitHub Pages deployment. To deploy:

```bash
npm run deploy
```

## License

This project is open source and available for educational and research purposes.
