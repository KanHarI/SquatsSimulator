// squatSimulatorCalculations.js

// Compute the initial parameters and derived values.
export const calculateInitialValues = () => {
  const initial = {
    thighAngle: 90,      // degrees from vertical
    shinAngle: 45,       // degrees from vertical
    torsoLength: 0.50,   // meters
    femurLength: 0.48,   // meters
    shinLength: 0.41,    // meters
    feetLength: 0.24     // meters
  };
  const psi0 = -initial.shinAngle * Math.PI / 180;
  const phi = initial.thighAngle * Math.PI / 180;
  const ratio0 = (-initial.feetLength / 2 
                  - initial.shinLength * Math.sin(psi0)
                  - initial.femurLength * Math.sin(phi)) 
                  / initial.torsoLength;
  const theta0 = Math.asin(Math.max(-1, Math.min(1, ratio0)));
  // Overall initial "shoulder height" (standing): sum of segments
  const H0 = initial.shinLength + initial.femurLength + initial.torsoLength;
  // Preserve original torso and shin lengths
  const T0 = initial.torsoLength;
  const S0 = initial.shinLength;
  // Fixed ratio between shin angle and back (torso) angle (in degrees)
  const R_shin = initial.shinAngle / Math.abs(theta0 * (180/Math.PI));
  return { ...initial, psi0, phi, theta0, H0, T0, S0, R_shin };
};

// When femurLength is updated, we need to adjust torsoLength, shinLength, and shinAngle.
// This function returns the new values based on the fixed ratios captured at drag start.
export const calculateFemurLengthUpdate = (
  newFemur,
  parameters,
  initialValues,
  femurDragRatio,
  femurDragTSRatio,
  femurDragShoulderHeight
) => {
  const phi = initialValues.phi;
  const feetLength = parameters.feetLength;
  const R_fixed = femurDragRatio !== null ? femurDragRatio : initialValues.R_shin;
  const TS_fixed = femurDragTSRatio !== null ? femurDragTSRatio : (initialValues.T0 / initialValues.S0);
  const H_fixed = femurDragShoulderHeight !== null ? femurDragShoulderHeight : initialValues.H0;

  // Compute newShin and newTorso from the height constraint:
  // newShin + newFemur + newTorso = H_fixed, with newTorso = TS_fixed * newShin.
  const newShin = (H_fixed - newFemur) / (1 + TS_fixed);
  const newTorso = TS_fixed * newShin;

  // Solve for x_deg (the absolute back angle in degrees) via bisection.
  // We want x_deg such that:
  //    newShin*sin(R_fixed*x_deg*pi/180) + newTorso*sin(x_deg*pi/180)
  //    - newFemur*sin(phi) - feetLength/2 = 0.
  const f = (x_deg) => {
    return newShin * Math.sin(R_fixed * x_deg * Math.PI/180) +
           newTorso * Math.sin(x_deg * Math.PI/180) -
           newFemur * Math.sin(phi) -
           feetLength / 2;
  };

  let low = 0;
  let high = 90;
  let x_deg = 0;
  for (let i = 0; i < 30; i++) {
    x_deg = (low + high) / 2;
    const f_mid = f(x_deg);
    if (Math.abs(f_mid) < 1e-6) break;
    if (f(low) * f_mid < 0) {
      high = x_deg;
    } else {
      low = x_deg;
    }
  }
  const newShinAngle = R_fixed * x_deg;
  return { newShin, newTorso, newShinAngle };
};

// Given the current parameters, calculate angles and joint positions.
export const calculateAnglesAndJoints = (parameters) => {
  const phi = parameters.thighAngle * Math.PI / 180;
  const psi = -parameters.shinAngle * Math.PI / 180;
  const ratio =
    (-parameters.feetLength / 2 -
     parameters.shinLength * Math.sin(psi) -
     parameters.femurLength * Math.sin(phi)) /
    parameters.torsoLength;
  const thetaRadRaw = Math.asin(Math.max(-1, Math.min(1, ratio)));
  // Use the absolute back (torso) angle (in degrees) for display.
  const torsoAngleDeg = Math.abs(thetaRadRaw * (180 / Math.PI));
  // Standing shoulder height is the sum of segments.
  const shoulderHeight = parameters.shinLength + parameters.femurLength + parameters.torsoLength;
  // Other ratios for display.
  const TS_ratio = parameters.torsoLength / parameters.shinLength;
  const angleRatio = torsoAngleDeg !== 0 ? parameters.shinAngle / torsoAngleDeg : 0;

  // Calculate joint positions (in math coordinates, with y upward).
  const joints = {
    ankle: { x: 0, y: 0 },
    knee: {
      x: parameters.shinLength * Math.sin(psi),
      y: parameters.shinLength * Math.cos(psi)
    }
  };
  joints.hip = {
    x: joints.knee.x + parameters.femurLength * Math.sin(phi),
    y: joints.knee.y + parameters.femurLength * Math.cos(phi)
  };
  joints.torsoTop = {
    x: joints.hip.x + parameters.torsoLength * Math.sin(thetaRadRaw),
    y: joints.hip.y + parameters.torsoLength * Math.cos(thetaRadRaw)
  };

  return { phi, psi, thetaRadRaw, torsoAngleDeg, shoulderHeight, TS_ratio, angleRatio, joints };
};

// Convert from math coordinates (with y upward) to SVG coordinates (with y downward).
export const toSVGCoords = (point) => ({
  x: point.x,
  y: 1.5 - point.y
});
