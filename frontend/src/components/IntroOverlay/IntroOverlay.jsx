import { useEffect, useState, useRef } from 'react';
import './IntroOverlay.css';

const HOLD = 2600; // ms the sequence plays before auto-exit
const EXIT = 750;  // ms exit transition

const WORD  = 'TETROBOT'.split('');
const CUBES = [0, 1, 2, 3, 4, 5]; // six modules assembling

export default function IntroOverlay({ onDone }) {
  const [exiting, setExiting] = useState(false);
  const done = useRef(false);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    setExiting(true);
    setTimeout(onDone, EXIT);
  };

  useEffect(() => {
    const t = setTimeout(finish, HOLD);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`intro${exiting ? ' intro--exit' : ''}`} onClick={finish}>
      <div className="intro-glow" />
      <div className="intro-grid" />

      <div className="intro-stage">
        <div className="intro-modules">
          {CUBES.map(i => (
            <span key={i} className="intro-cube" style={{ '--i': i }} />
          ))}
        </div>

        <h1 className="intro-word" aria-label="TETROBOT">
          {WORD.map((ch, i) => (
            <span key={i} className="intro-letter" style={{ '--i': i }}>{ch}</span>
          ))}
        </h1>

        <div className="intro-underline" />

        <div className="intro-tagline">
          <span className="intro-sub">MODULAR&nbsp;ROBOTICS</span>
          <span className="intro-dot" />
          <span className="intro-by">BY NISCHAY SAI</span>
        </div>
      </div>

      <div className="intro-skip">click to skip</div>
    </div>
  );
}
