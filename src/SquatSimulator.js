import React, { useState, useRef } from 'react';
import {
  calculateInitialValues,
  calculateFemurLengthUpdate,
  calculateAnglesAndJoints,
  toSVGCoords
} from './squatSimulatorCalculations';
import './SquatSimulator.css';

const SquatSimulator = () => {
  const initialValues = useRef(calculateInitialValues());
  const femurDragRatio = useRef(null);
  const femurDragTSRatio = useRef(null);
  const femurDragShoulderHeight = useRef(null);

  const [parameters, setParameters] = useState({
    thighAngle: initialValues.current.thighAngle,
    shinAngle: initialValues.current.shinAngle,
    torsoLength: initialValues.current.torsoLength,
    femurLength: initialValues.current.femurLength,
    shinLength: initialValues.current.shinLength,
    feetLength: initialValues.current.feetLength
  });

  const updateParameter = (key, value) => {
    const numValue = Number(value);
    if (key === "femurLength") {
      const newFemur = numValue;
      const { newShin, newTorso, newShinAngle } = calculateFemurLengthUpdate(
        newFemur,
        parameters,
        initialValues.current,
        femurDragRatio.current,
        femurDragTSRatio.current,
        femurDragShoulderHeight.current
      );

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

  const { torsoAngleDeg, shoulderHeight, TS_ratio, angleRatio, joints } = calculateAnglesAndJoints(parameters);

  const svgAnkle = toSVGCoords(joints.ankle);
  const svgKnee = toSVGCoords(joints.knee);
  const svgHip = toSVGCoords(joints.hip);
  const svgTorsoTop = toSVGCoords(joints.torsoTop);

  const groundStart = toSVGCoords({ x: 0, y: 0 });
  const groundEnd = toSVGCoords({ x: -parameters.feetLength, y: 0 });
  const comStart = toSVGCoords({ x: -parameters.feetLength / 2, y: 0 });
  const comEnd = toSVGCoords({ x: -parameters.feetLength / 2, y: 2.0 });

  const svgConfig = {
    viewBox: "-1.05 -0.2 2.0 2.0",
    width: "100%",
    height: "auto",
    preserveAspectRatio: "xMidYMid meet"
  };

  const sliderConfigs = [
    { label: "Femur Length (m)", key: "femurLength", min: 0.25, max: 0.65, step: 0.001, bold: true },
    { label: "Thigh Angle (°)", key: "thighAngle", min: 0, max: 180, step: 0.1 },
    { label: "Shin Angle (°)", key: "shinAngle", min: -5, max: 90, step: 0.1 },
    { label: "Torso Length (m)", key: "torsoLength", min: 0.30, max: 0.75, step: 0.001 },
    { label: "Shin Length (m)", key: "shinLength", min: 0.23, max: 0.63, step: 0.001 },
    { label: "Feet Length (m)", key: "feetLength", min: 0.11, max: 0.39, step: 0.001 }
  ];

  const CalculatedOutputs = () => (
    <div className="calculated-outputs">
      <h3 className="calculated-header">Calculated Angles &amp; Ratios:</h3>
      <p>
        <strong>Torso (Back) Angle:</strong> {torsoAngleDeg.toFixed(2)}°
      </p>
      <p>
        <strong>Standing Shoulder Height:</strong> {shoulderHeight.toFixed(3)} m
      </p>
      <p>
        <strong>Torso Length : Shin Length Ratio:</strong> {TS_ratio.toFixed(3)}
      </p>
      <p>
        <strong>Shin Angle / Torso Angle Ratio:</strong> {angleRatio.toFixed(3)}
      </p>
    </div>
  );

  return (
    <div className="squat-simulator">
      <h2 className="header">Squat Simulator</h2>

      {/* Top Section for Desktop: Controls and Calculated outputs side-by-side */}
      <div className="top-section">
        <div className="controls">
          {sliderConfigs.map(config => (
            <div key={config.key} className="slider-control">
              <label className="slider-label">
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
                className="slider-input"
                {...(config.key === "femurLength" ? {
                  onPointerDown: () => {
                    const phi_current = parameters.thighAngle * Math.PI / 180;
                    const psi_current = (-parameters.shinAngle * Math.PI) / 180;
                    const currentRatio = (-parameters.feetLength / 2 -
                      parameters.shinLength * Math.sin(psi_current) -
                      parameters.femurLength * Math.sin(phi_current)) /
                      parameters.torsoLength;
                    const theta_current = Math.asin(Math.max(-1, Math.min(1, currentRatio)));
                    const backAngleDeg = Math.abs(theta_current * (180 / Math.PI));
                    femurDragRatio.current = backAngleDeg !== 0
                      ? parameters.shinAngle / backAngleDeg
                      : initialValues.current.R_shin;
                    femurDragTSRatio.current = parameters.torsoLength / parameters.shinLength;
                    femurDragShoulderHeight.current = parameters.shinLength + parameters.femurLength + parameters.torsoLength;
                  },
                  onPointerUp: () => {
                    femurDragRatio.current = null;
                    femurDragTSRatio.current = null;
                    femurDragShoulderHeight.current = null;
                  }
                } : {})}
              />
            </div>
          ))}
        </div>

        {/* Desktop Calculated Outputs (hidden on mobile) */}
        <div className="calculations desktop-only">
          <CalculatedOutputs />
        </div>
      </div>

      <hr className="separator" />

      {/* SVG Visualization */}
      <div className="visualization-container">
        <svg {...svgConfig} className="visualization-svg">
          <line
            id="foot-base"
            x1={groundStart.x}
            y1={groundStart.y}
            x2={groundEnd.x}
            y2={groundEnd.y}
            stroke="brown"
            strokeWidth="0.02"
          />

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

          {[svgAnkle, svgKnee, svgHip, svgTorsoTop].map((joint, index) => (
            <circle key={index} cx={joint.x} cy={joint.y} r="0.02" fill="black" />
          ))}
        </svg>

        <p className="legend">
          Visualization Legend: Blue = Shin, Red = Femur, Green = Torso, Brown = Foot
        </p>
      </div>

      {/* Mobile Calculated Outputs (shown only on mobile) */}
      <div className="calculations mobile-only">
        <CalculatedOutputs />
      </div>
    </div>
  );
};

export default SquatSimulator;
