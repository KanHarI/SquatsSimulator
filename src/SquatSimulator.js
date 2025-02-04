import React, { useState } from 'react';

const SquatSimulator = () => {
  // State with anatomically-based defaults
  const [parameters, setParameters] = useState({
    thighAngle: 95,      // degrees from vertical
    shinAngle: 45,       // degrees from vertical (positive = backward lean)
    torsoLength: 0.52,   // meters (typical height * 0.288)
    femurLength: 0.45,   // meters (typical height * 0.245)
    shinLength: 0.43,    // meters (typical height * 0.246)
    feetLength: 0.25     // meters (typical height * 0.152)
  });

  const updateParameter = (key, value) => {
    setParameters(prev => ({ ...prev, [key]: Number(value) }));
  };

  // Convert angles to radians
  const phi = (parameters.thighAngle * Math.PI) / 180;
  const psi = (-parameters.shinAngle * Math.PI) / 180;  // Negative to reverse direction

  // Calculate torso angle using updated balance equation considering shin angle
  const ankleOffset = parameters.shinLength * Math.sin(psi);
  const ratio =
    (-parameters.feetLength / 2 - ankleOffset - parameters.femurLength * Math.sin(phi)) /
    parameters.torsoLength;
  const thetaRad = Math.asin(Math.max(-1, Math.min(1, ratio)));
  const torsoAngleDeg = thetaRad * (180 / Math.PI);

  // Calculate joint positions in “math” coordinates (with y increasing upward)
  const joints = {
    ankle: { x: 0, y: 0 },
    knee: {
      x: parameters.shinLength * Math.sin(psi),
      y: parameters.shinLength * Math.cos(psi)
    }
  };

  // Calculate hip position from knee using thigh angle
  joints.hip = {
    x: joints.knee.x + parameters.femurLength * Math.sin(phi),
    y: joints.knee.y + parameters.femurLength * Math.cos(phi)
  };

  // Calculate torso top position
  joints.torsoTop = {
    x: joints.hip.x + parameters.torsoLength * Math.sin(thetaRad),
    y: joints.hip.y + parameters.torsoLength * Math.cos(thetaRad)
  };

  // Convert math coordinates (y increasing upward) to SVG coordinates (y increasing downward)
  // Originally we did: transform="translate(0, 1.5) scale(1, -1)"
  // Now we compute it for each point.
  const toSVGCoords = (point) => ({
    x: point.x,
    y: 1.5 - point.y
  });

  // Compute SVG positions for joints and key points
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

  // Previously, the viewBox was set to "-1.05 -0.2 2.0 2.0".
  const svgConfig = {
    viewBox: "-1.05 -0.2 2.0 2.0",
    width: 500,
    height: 500
  };

  // Slider configuration remains the same
  const sliderConfigs = [
    { label: "Thigh Angle (°)", key: "thighAngle", min: 0, max: 180, step: 0.1 },
    { label: "Shin Angle (°)", key: "shinAngle", min: -5, max: 90, step: 0.1 },
    { label: "Torso Length (m)", key: "torsoLength", min: 0.40, max: 0.65, step: 0.001 },
    { label: "Femur Length (m)", key: "femurLength", min: 0.35, max: 0.55, step: 0.001 },
    { label: "Shin Length (m)", key: "shinLength", min: 0.33, max: 0.53, step: 0.001 },
    { label: "Feet Length (m)", key: "feetLength", min: 0.21, max: 0.29, step: 0.001 }
  ];

  return (
    <div className="max-w-2xl mx-auto p-4 font-sans">
      <h2 className="text-2xl font-bold mb-4">Squat Simulator</h2>

      {/* Parameter Controls */}
      <div className="space-y-4 mb-6">
        {sliderConfigs.map(config => (
          <div key={config.key} className="flex flex-col">
            <label className="mb-1">
              {config.label}: {parameters[config.key].toFixed(3)}
              {config.key.includes('Angle') ? '°' : 'm'}
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
