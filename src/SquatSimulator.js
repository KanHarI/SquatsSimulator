import React, { useState, useRef } from 'react';

const SquatSimulator = () => {
  // Compute initial values once and store them in a ref.
  // This preserves the original configuration for scaling purposes.
  const initialValues = useRef((() => {
    const initial = {
      thighAngle: 95,      // degrees from vertical
      shinAngle: 45,       // degrees from vertical
      torsoLength: 0.52,   // meters
      femurLength: 0.45,   // meters
      shinLength: 0.43,    // meters
      feetLength: 0.25     // meters
    };
    const psi0 = -initial.shinAngle * Math.PI / 180; // initial shin angle (radians)
    const phi = initial.thighAngle * Math.PI / 180;    // thigh angle (radians)
    const ratio0 = (-initial.feetLength / 2 
                    - initial.shinLength * Math.sin(psi0)
                    - initial.femurLength * Math.sin(phi))
                    / initial.torsoLength;
    const theta0 = Math.asin(Math.max(-1, Math.min(1, ratio0)));
    // Overall initial height (vertical distance from ankle to torso top)
    const H0 = initial.shinLength * Math.cos(psi0)
             + initial.femurLength * Math.cos(phi)
             + initial.torsoLength * Math.cos(theta0);
    // Preserve the torso and shin lengths as originally specified
    const T0 = initial.torsoLength;
    const S0 = initial.shinLength;
    // Preserve the ratio between shin angle and back angle (in degrees)
    const R_shin = initial.shinAngle / Math.abs(theta0 * (180 / Math.PI));
    return { ...initial, psi0, phi, theta0, H0, T0, S0, R_shin };
  })());

  // --- STATE ---
  const [parameters, setParameters] = useState({
    thighAngle: initialValues.current.thighAngle,
    shinAngle: initialValues.current.shinAngle,
    torsoLength: initialValues.current.torsoLength,
    femurLength: initialValues.current.femurLength,
    shinLength: initialValues.current.shinLength,
    feetLength: initialValues.current.feetLength
  });

  // --- UPDATE FUNCTION ---
  const updateParameter = (key, value) => {
    const numValue = Number(value);
    if (key === "femurLength") {
      // When femur length changes, update femurLength as well as torsoLength, shinLength, and shinAngle.
      const newFemur = numValue;
      const { psi0, phi, T0, S0, H0, theta0, R_shin, feetLength } = initialValues.current;
      // Preserve overall height H0.
      // With unchanged thigh angle, the femur’s vertical contribution is newFemur * cos(phi).
      // Let the scaling factor k update the torso and shin lengths:
      const denominator = (S0 * Math.cos(psi0) + T0 * Math.cos(theta0));
      const k = (H0 - newFemur * Math.cos(phi)) / denominator;
      const newTorso = T0 * k;
      const newShin = S0 * k;

      // Update the shin angle so that its ratio to the back angle remains constant.
      // The balance equation for the back (torso) angle (theta) is:
      //    ratio = (-feetLength/2 - newShin*sin(psi_new) - newFemur*sin(phi)) / newTorso,
      // with psi_new = -newShinAngle*(pi/180).
      // We require:
      //    newShinAngle = R_shin * |theta (in degrees)|
      // Solve this via fixed-point iteration:
      const solveShinAngle = (x_init) => {
        let x = x_init;
        for (let i = 0; i < 10; i++) {
          const psi_new = -x * Math.PI / 180;
          const val = (-feetLength / 2 - newShin * Math.sin(psi_new) - newFemur * Math.sin(phi)) / newTorso;
          const clamped = Math.max(-1, Math.min(1, val));
          const theta_new = Math.asin(clamped); // theta in radians (likely negative)
          const x_new = R_shin * Math.abs(theta_new * (180 / Math.PI));
          x = x_new;
        }
        return x;
      };
      const newShinAngle = solveShinAngle(parameters.shinAngle);

      setParameters(prev => ({
        ...prev,
        femurLength: newFemur,
        torsoLength: newTorso,
        shinLength: newShin,
        shinAngle: newShinAngle
      }));
    } else {
      setParameters(prev => ({ ...prev, [key]: numValue }));
    }
  };

  // --- CALCULATIONS ---
  // Compute angles (in radians) from current state.
  const phi = (parameters.thighAngle * Math.PI) / 180;
  const psi = (-parameters.shinAngle * Math.PI) / 180;
  const ratio =
    (-parameters.feetLength / 2
     - parameters.shinLength * Math.sin(psi)
     - parameters.femurLength * Math.sin(phi)) /
    parameters.torsoLength;
  // Compute the back (torso) angle (in radians). It is likely negative due to the geometry.
  const thetaRadRaw = Math.asin(Math.max(-1, Math.min(1, ratio)));
  // For display, show the absolute value (positive) of the back angle.
  const torsoAngleDeg = Math.abs(thetaRadRaw * (180 / Math.PI));

  // --- JOINT POSITIONS ---
  // Define joints in “math” coordinates (with y upward)
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

  // --- COORDINATE CONVERSION ---
  // Convert “math” coordinates (with y upward) to SVG coordinates (with y downward)
  // using an offset of 1.5 (mimicking transform="translate(0, 1.5) scale(1, -1)")
  const toSVGCoords = (point) => ({
    x: point.x,
    y: 1.5 - point.y
  });
  const svgAnkle    = toSVGCoords(joints.ankle);
  const svgKnee     = toSVGCoords(joints.knee);
  const svgHip      = toSVGCoords(joints.hip);
  const svgTorsoTop = toSVGCoords(joints.torsoTop);

  // Ground (foot) line endpoints
  const groundStart = toSVGCoords({ x: 0, y: 0 });
  const groundEnd   = toSVGCoords({ x: -parameters.feetLength, y: 0 });

  // Center-of-mass guide line endpoints
  const comStart = toSVGCoords({ x: -parameters.feetLength / 2, y: 0 });
  const comEnd   = toSVGCoords({ x: -parameters.feetLength / 2, y: 2.0 });

  // --- SVG CONFIGURATION ---
  const svgConfig = {
    viewBox: "-1.05 -0.2 2.0 2.0",
    width: 500,
    height: 500
  };

  // --- SLIDER CONFIGURATION ---
  // Reorder so that "Femur Length" is first and mark it to be bold.
  const sliderConfigs = [
    { label: "Femur Length (m)", key: "femurLength", min: 0.2, max: 0.7, step: 0.001, bold: true },
    { label: "Thigh Angle (°)", key: "thighAngle", min: 0, max: 180, step: 0.1 },
    { label: "Shin Angle (°)", key: "shinAngle", min: -5, max: 90, step: 0.1 },
    { label: "Torso Length (m)", key: "torsoLength", min: 0.20, max: 0.85, step: 0.001 },
    { label: "Shin Length (m)", key: "shinLength", min: 0.13, max: 0.73, step: 0.001 },
    { label: "Feet Length (m)", key: "feetLength", min: 0.11, max: 0.49, step: 0.001 }
  ];

  return (
    <div className="max-w-2xl mx-auto p-4 font-sans">
      <h2 className="text-2xl font-bold mb-4">Squat Simulator</h2>

      {/* Parameter Controls */}
      <div className="space-y-4 mb-6">
        {sliderConfigs.map(config => (
          <div key={config.key} className="flex flex-col">
            <label className="mb-1">
              {config.bold ? (
                <strong>
                  {config.label}: {parameters[config.key].toFixed(3)}
                  {config.key.includes('Angle') ? '°' : 'm'}
                </strong>
              ) : (
                <>
                  {config.label}: {parameters[config.key].toFixed(3)}
                  {config.key.includes('Angle') ? '°' : 'm'}
                </>
              )}
            </label>
            <input
              type="range"
              min={config.min}
              max={config.max}
              step={config.step}
              value={parameters[config.key]}
              onChange={(e) => updateParameter(config.key, e.target.value)}
              className="w-full"
            />
          </div>
        ))}
      </div>

      <hr className="my-6" />

      {/* Calculated Outputs */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">Calculated Angles:</h3>
        <p className="mb-2">
          <strong>Torso (Back) Angle:</strong> {torsoAngleDeg.toFixed(2)}°
        </p>
        <p>
          <strong>Backward Lean (at ankle):</strong> {parameters.shinAngle.toFixed(2)}°
        </p>
      </div>

      {/* SVG Visualization without a transform */}
      <svg
        viewBox={svgConfig.viewBox}
        width={svgConfig.width}
        height={svgConfig.height}
        className="border border-gray-300"
      >
        {/* Ground and feet representation */}
        <line
          id="foot-base"
          x1={groundStart.x}
          y1={groundStart.y}
          x2={groundEnd.x}
          y2={groundEnd.y}
          stroke="brown"
          strokeWidth="0.02"
        />

        {/* Center of mass guide */}
        <line
          id="com-guide"
          x1={comStart.x}
          y1={comStart.y}
          x2={comEnd.x}
          y2={comEnd.y}
          stroke="gray"
          strokeDasharray="0.03,0.03"
          strokeWidth="0.005"
        />

        {/* Body segments */}
        <line
          id="shin"
          x1={svgAnkle.x}
          y1={svgAnkle.y}
          x2={svgKnee.x}
          y2={svgKnee.y}
          stroke="blue"
          strokeWidth="0.02"
        />
        <line
          id="femur"
          x1={svgKnee.x}
          y1={svgKnee.y}
          x2={svgHip.x}
          y2={svgHip.y}
          stroke="red"
          strokeWidth="0.02"
        />
        <line
          id="torso"
          x1={svgHip.x}
          y1={svgHip.y}
          x2={svgTorsoTop.x}
          y2={svgTorsoTop.y}
          stroke="green"
          strokeWidth="0.02"
        />

        {/* Joint markers */}
        {[svgAnkle, svgKnee, svgHip, svgTorsoTop].map((joint, index) => (
          <circle key={index} cx={joint.x} cy={joint.y} r="0.02" fill="black" />
        ))}
      </svg>

      <p className="text-center mt-2 text-sm text-gray-600">
        Visualization Legend: Blue = Shin, Red = Femur, Green = Torso, Brown = Foot
      </p>
    </div>
  );
};

export default SquatSimulator;
