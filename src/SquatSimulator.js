import React, { useState, useRef } from 'react';

const SquatSimulator = () => {
  // Compute initial values once and store them.
  // These values serve as a fallback if no drag is in progress.
  const initialValues = useRef((() => {
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
  })());

  // We'll use these refs to store fixed ratios while dragging the femur slider.
  const femurDragRatio = useRef(null);       // (shin angle)/(back angle) fixed during drag
  const femurDragTSRatio = useRef(null);       // torsoLength/shinLength fixed during drag
  const femurDragShoulderHeight = useRef(null); // standing shoulder height fixed during drag

  // State holds the current parameters.
  const [parameters, setParameters] = useState({
    thighAngle: initialValues.current.thighAngle,
    shinAngle: initialValues.current.shinAngle,
    torsoLength: initialValues.current.torsoLength,
    femurLength: initialValues.current.femurLength,
    shinLength: initialValues.current.shinLength,
    feetLength: initialValues.current.feetLength
  });

  // Update function.
  // For femurLength, we adjust torsoLength, shinLength, and shinAngle so that:
  //   (i) the ratio (shinAngle)/(backAngle) remains fixed,
  //   (ii) the ratio torsoLength/shinLength remains fixed, and
  //   (iii) the standing shoulder height (shinLength+femurLength+torsoLength) remains constant.
  // In this implementation we first compute newShin and newTorso from the standing height,
  // then solve (by bisection) for x₍deg₎, the absolute back (torso) angle in degrees, from:
  //
  //   newShin*sin(R_fixed*x_deg*pi/180)
  //   + newTorso*sin(x_deg*pi/180)
  //   - newFemur*sin(phi)
  //   - feetLength/2  = 0.
  //
  // Finally, we set the new shin angle = R_fixed*x_deg.
  const updateParameter = (key, value) => {
    const numValue = Number(value);
    if (key === "femurLength") {
      const newFemur = numValue;
      const { phi } = initialValues.current; // thigh angle in radians (assumed constant)
      const feetLength = parameters.feetLength; // assume feetLength is unchanged

      // Get the fixed ratios (captured on drag start) or fall back to initial values.
      const R_fixed = femurDragRatio.current !== null
                        ? femurDragRatio.current
                        : initialValues.current.R_shin;
      const TS_fixed = femurDragTSRatio.current !== null
                        ? femurDragTSRatio.current
                        : (initialValues.current.T0 / initialValues.current.S0);
      const H_fixed = femurDragShoulderHeight.current !== null
                        ? femurDragShoulderHeight.current
                        : initialValues.current.H0;

      // (1) Compute newShin and newTorso from the height constraint:
      // newShin + newFemur + newTorso = H_fixed with newTorso = TS_fixed * newShin.
      const newShin = (H_fixed - newFemur) / (1 + TS_fixed);
      const newTorso = TS_fixed * newShin;

      // (2) Solve for x_deg (the absolute back angle in degrees).
      // We want to find x_deg such that:
      //    newShin*sin(R_fixed*x_deg*pi/180)
      //  + newTorso*sin(x_deg*pi/180)
      //  - newFemur*sin(phi)
      //  - feetLength/2 = 0.
      const f = (x_deg) => {
        return newShin * Math.sin(R_fixed * x_deg * Math.PI/180) +
               newTorso * Math.sin(x_deg * Math.PI/180) -
               newFemur * Math.sin(phi) -
               feetLength / 2;
      };

      // Use bisection in degrees. We expect a solution in [0, 90].
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
      // (3) The new shin angle (in degrees) is given by:
      const newShinAngle = R_fixed * x_deg;
      // (Note: the back (torso) angle in radians is -x_deg*pi/180; here we keep only its magnitude.)

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
  // Compute angles (radians) from current state.
  const phi = (parameters.thighAngle * Math.PI) / 180;
  const psi = (-parameters.shinAngle * Math.PI) / 180;
  const ratio =
    (-parameters.feetLength / 2 -
     parameters.shinLength * Math.sin(psi) -
     parameters.femurLength * Math.sin(phi)) /
    parameters.torsoLength;
  const thetaRadRaw = Math.asin(Math.max(-1, Math.min(1, ratio)));
  // For display, use the absolute back (torso) angle (in degrees).
  const torsoAngleDeg = Math.abs(thetaRadRaw * (180 / Math.PI));

  // Compute "shoulder height" as standing height: simply sum the lengths.
  const shoulderHeight = parameters.shinLength + parameters.femurLength + parameters.torsoLength;

  // Also compute the ratio of torso length to shin length.
  const TS_ratio = parameters.torsoLength / parameters.shinLength;
  // And the ratio between shin angle and back (torso) angle.
  const angleRatio = torsoAngleDeg !== 0 ? parameters.shinAngle / torsoAngleDeg : 0;

  // --- JOINT POSITIONS (in math coordinates, with y upward) ---
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
  // Convert from math coordinates (y upward) to SVG coordinates (y downward)
  // by offsetting y by 1.5 (mimicking transform="translate(0, 1.5) scale(1,-1)")
  const toSVGCoords = (point) => ({
    x: point.x,
    y: 1.5 - point.y
  });
  const svgAnkle    = toSVGCoords(joints.ankle);
  const svgKnee     = toSVGCoords(joints.knee);
  const svgHip      = toSVGCoords(joints.hip);
  const svgTorsoTop = toSVGCoords(joints.torsoTop);

  // Ground (foot) line endpoints.
  const groundStart = toSVGCoords({ x: 0, y: 0 });
  const groundEnd   = toSVGCoords({ x: -parameters.feetLength, y: 0 });
  // Center-of-mass guide endpoints.
  const comStart = toSVGCoords({ x: -parameters.feetLength / 2, y: 0 });
  const comEnd   = toSVGCoords({ x: -parameters.feetLength / 2, y: 2.0 });

  // --- SVG CONFIGURATION ---
  const svgConfig = {
    viewBox: "-1.05 -0.2 2.0 2.0",
    width: 500,
    height: 500
  };

  // --- SLIDER CONFIGURATION ---
  // Femur Length is first (its label is bold). For the femur slider,
  // we attach onMouseDown and onMouseUp events to capture the fixed ratios.
  const sliderConfigs = [
    { label: "Femur Length (m)", key: "femurLength", min: 0.25, max: 0.65, step: 0.001, bold: true },
    { label: "Thigh Angle (°)", key: "thighAngle", min: 0, max: 180, step: 0.1 },
    { label: "Shin Angle (°)", key: "shinAngle", min: -5, max: 90, step: 0.1 },
    { label: "Torso Length (m)", key: "torsoLength", min: 0.30, max: 0.75, step: 0.001 },
    { label: "Shin Length (m)", key: "shinLength", min: 0.23, max: 0.63, step: 0.001 },
    { label: "Feet Length (m)", key: "feetLength", min: 0.11, max: 0.39, step: 0.001 }
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
              {...(config.key === "femurLength" ? {
                onMouseDown: () => {
                  // Capture fixed ratios at the start of the femur drag.
                  const phi_current = parameters.thighAngle * Math.PI / 180;
                  const psi_current = (-parameters.shinAngle * Math.PI) / 180;
                  const currentRatio = (-parameters.feetLength / 2 -
                                        parameters.shinLength * Math.sin(psi_current) -
                                        parameters.femurLength * Math.sin(phi_current)) / parameters.torsoLength;
                  const theta_current = Math.asin(Math.max(-1, Math.min(1, currentRatio)));
                  const backAngleDeg = Math.abs(theta_current * (180/Math.PI));
                  femurDragRatio.current = backAngleDeg !== 0
                    ? parameters.shinAngle / backAngleDeg
                    : initialValues.current.R_shin;
                  femurDragTSRatio.current = parameters.torsoLength / parameters.shinLength;
                  // For standing shoulder height, simply sum the lengths.
                  femurDragShoulderHeight.current = parameters.shinLength + parameters.femurLength + parameters.torsoLength;
                },
                onMouseUp: () => {
                  femurDragRatio.current = null;
                  femurDragTSRatio.current = null;
                  femurDragShoulderHeight.current = null;
                }
              } : {})}
            />
          </div>
        ))}
      </div>

      <hr className="my-6" />

      {/* Calculated Outputs */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">Calculated Angles & Ratios:</h3>
        <p className="mb-2">
          <strong>Torso (Back) Angle:</strong> {torsoAngleDeg.toFixed(2)}°
        </p>
        <p className="mb-2">
          <strong>Backward Lean (at ankle):</strong> {parameters.shinAngle.toFixed(2)}°
        </p>
        <p className="mb-2">
          <strong>Standing Shoulder Height:</strong> {shoulderHeight.toFixed(3)} m
        </p>
        <p className="mb-2">
          <strong>Torso Length : Shin Length Ratio:</strong> {TS_ratio.toFixed(3)}
        </p>
        <p className="mb-2">
          <strong>Shin Angle / Torso Angle Ratio:</strong> {angleRatio.toFixed(3)}
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

        {/* Center-of-mass guide */}
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
