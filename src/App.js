import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import Confetti from 'react-dom-confetti';
import Modal from 'react-modal';

Modal.setAppElement('#root');

const PRESETS = [
  { label: 'Easy',   digits: 5,  timer: 15 },
  { label: 'Medium', digits: 7,  timer: 10 },
  { label: 'Hard',   digits: 10, timer: 8  },
  { label: 'Expert', digits: 14, timer: 6  },
];

const confettiConfig = {
  angle: 90,
  spread: 360,
  startVelocity: 20,
  elementCount: 200,
  dragFriction: 0.12,
  duration: 3000,
  stagger: 3,
  width: '10px',
  height: '10px',
  perspective: '500px',
  colors: ['#a864fd', '#29cdff', '#78ff44', '#ff718d', '#fdff6a'],
};

function App() {
  const [name, setName] = useState('');
  const [timerLength, setTimerLength] = useState(10);
  const [numDigits, setNumDigits] = useState(7);

  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestScore, setBestScore] = useState(
    () => parseInt(localStorage.getItem('phonoMemBest') || '0', 10)
  );

  const [digitSequence, setDigitSequence] = useState([]);
  const [reversedSequence, setReversedSequence] = useState([]);
  const [countdown, setCountdown] = useState(null);

  const [showSubmit, setShowSubmit] = useState(false);
  const [userSequence, setUserSequence] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [enteredSequence, setEnteredSequence] = useState([]);
  const [errorIndex, setErrorIndex] = useState(null);
  const [earnedPoints, setEarnedPoints] = useState(0);

  const submitRef = useRef(null);
  const sequenceRef = useRef(null);

  // ── Keyboard support: digits 0–9, Backspace, Enter ──────────────────────
  useEffect(() => {
    if (!showSubmit) return;

    function onKey(e) {
      if (e.key >= '0' && e.key <= '9') {
        setUserSequence(prev =>
          prev.length < numDigits ? [...prev, parseInt(e.key, 10)] : prev
        );
      } else if (e.key === 'Backspace') {
        setUserSequence(prev => prev.slice(0, -1));
      } else if (e.key === 'Enter') {
        // Delegate to submit button; disabled attribute prevents premature submit
        if (submitRef.current && !submitRef.current.disabled) {
          submitRef.current.click();
        }
      }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showSubmit, numDigits]);

  // ── Generate a new sequence ──────────────────────────────────────────────
  function generateSequence() {
    const seq = Array.from({ length: numDigits }, () => Math.floor(Math.random() * 10));
    setDigitSequence(seq);
    setReversedSequence([...seq].reverse());
    setCountdown(timerLength);
    setShowSubmit(false);
    setUserSequence([]);
    setTimeout(() => sequenceRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }

  // ── Countdown & hide sequence ────────────────────────────────────────────
  useEffect(() => {
    if (digitSequence.length === 0) return;

    const hideTimer = setTimeout(() => {
      setDigitSequence([]);
      setShowSubmit(true);
    }, timerLength * 1000);

    const tickTimer = setInterval(() => {
      setCountdown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      clearTimeout(hideTimer);
      clearInterval(tickTimer);
    };
  }, [digitSequence, timerLength]);

  // ── Scroll to numpad when timer expires ─────────────────────────────────
  useEffect(() => {
    if (countdown === 0 && submitRef.current) {
      submitRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [countdown]);

  // ── Check the user's answer ──────────────────────────────────────────────
  function checkSequence() {
    const entered = [...userSequence];
    const badIdx = entered.findIndex((d, i) => d !== reversedSequence[i]);
    const correct = badIdx === -1;

    setEnteredSequence(entered);
    setUserSequence([]);
    setShowSubmit(false);
    setIsCorrect(correct);
    setErrorIndex(correct ? null : badIdx);

    if (correct) {
      const pts = numDigits - 4;
      const newScore = score + pts;
      const newStreak = streak + 1;
      setScore(newScore);
      setStreak(newStreak);
      setEarnedPoints(pts);
      if (newScore > bestScore) {
        setBestScore(newScore);
        localStorage.setItem('phonoMemBest', String(newScore));
      }
    } else {
      setStreak(0);
      setEarnedPoints(0);
    }

    setShowModal(true);
  }

  // ── Reset for next round (preserves difficulty settings) ────────────────
  function resetGame() {
    setDigitSequence([]);
    setShowSubmit(false);
    setUserSequence([]);
    setEnteredSequence([]);
    setReversedSequence([]);
    setShowModal(false);
    setErrorIndex(null);
    setCountdown(null);
  }

  function handleClick(num) {
    if (userSequence.length < numDigits) {
      setUserSequence(prev => [...prev, num]);
    }
  }

  // ── Derived display values ───────────────────────────────────────────────
  const isPlaying = digitSequence.length > 0;
  const timerPct = (countdown !== null && timerLength > 0)
    ? (countdown / timerLength) * 100 : 100;
  const barColor = timerPct > 50 ? '#10d385' : timerPct > 25 ? '#FFC107' : '#ff4444';

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="App">
      <h1>Phonologic Memory Game</h1>

      <div className="score-bar">
        <span className="score-item">
          {name || 'Score'}: <strong>{score} pts</strong>
        </span>
        <span className="score-item">
          Best: <strong>{bestScore} pts</strong>
        </span>
        <span className="score-item">
          Streak: <strong>{streak} 🔥</strong>
        </span>
      </div>

      <div className="confetti-container">
        <Confetti active={isCorrect && showModal} config={confettiConfig} />
      </div>

      <hr />

      {/* ── Setup section ── */}
      <div className="setup-section">
        <label className="input-text">
          Your name:&nbsp;
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Optional"
          />
        </label>

        <div className="preset-row">
          <span>Quick start:&nbsp;</span>
          {PRESETS.map(p => (
            <button
              key={p.label}
              className="preset-btn"
              onClick={() => { setNumDigits(p.digits); setTimerLength(p.timer); }}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="config-row input-text">
          <label>
            Sequence:&nbsp;
            <select value={numDigits} onChange={e => setNumDigits(Number(e.target.value))}>
              {Array.from({ length: 14 }, (_, i) => i + 5).map(n => (
                <option key={n} value={n}>{n} digits</option>
              ))}
            </select>
          </label>
          <label>
            &nbsp;&nbsp;Timer:&nbsp;
            <select value={timerLength} onChange={e => setTimerLength(Number(e.target.value))}>
              {Array.from({ length: 14 }, (_, i) => i + 5).map(n => (
                <option key={n} value={n}>{n}s</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <hr />

      <div className="explain-text">
        <p>Memorize the sequence, then enter it in <strong>reverse order</strong>.</p>
        <p>
          You have <strong>{timerLength} seconds</strong> to memorize it.&nbsp;
          Keyboard supported: <kbd>0–9</kbd>, <kbd>Backspace</kbd>, <kbd>Enter</kbd>.
        </p>
      </div>

      <button onClick={generateSequence} disabled={isPlaying}>
        {isPlaying ? '⏳ Memorize!' : '▶ Generate Sequence'}
      </button>

      {/* ── Timer bar ── */}
      {countdown !== null && (
        <div className="timer-wrapper">
          <div className="timer-bar-track">
            <div
              className="timer-bar-fill"
              style={{ width: `${timerPct}%`, backgroundColor: barColor }}
            />
          </div>
          <span className="timer-text">{countdown}s</span>
        </div>
      )}

      {/* ── Digit sequence display ── */}
      <div className="sequence-container" ref={sequenceRef}>
        {digitSequence.map((digit, i) => (
          <div key={i} className="sequence-item">{digit}</div>
        ))}
      </div>

      {/* ── Input phase ── */}
      {showSubmit && (
        <>
          <p className="enter-prompt">Enter the sequence in <strong>reverse order</strong>:</p>
          <p className="progress-hint">{userSequence.length} / {numDigits} digits entered</p>

          <div className="user-sequence-container">
            {userSequence.map((n, i) => (
              <div key={i} className="sequence-item entered-number">{n}</div>
            ))}
          </div>

          <div className="number-pad">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
              <button key={n} className="pad-btn" onClick={() => handleClick(n)}>{n}</button>
            ))}
            <button className="pad-btn del-btn" onClick={() => setUserSequence(p => p.slice(0, -1))}>⌫</button>
            <button className="pad-btn" onClick={() => handleClick(0)}>0</button>
            <button
              className="pad-btn submit-pad-btn"
              ref={submitRef}
              onClick={checkSequence}
              disabled={userSequence.length !== numDigits}
            >
              ✓
            </button>
          </div>
        </>
      )}

      {/* ── Result modal ── */}
      {showModal && (
        <Modal
          isOpen={showModal}
          onRequestClose={resetGame}
          className="result-modal"
          overlayClassName="modal-overlay"
        >
          <h2>{isCorrect ? '🎉 Correct!' : '❌ Incorrect'}</h2>

          {isCorrect ? (
            <div className="modal-body">
              <p>Well done{name ? `, ${name}` : ''}!</p>
              <p>You recalled all <strong>{numDigits} digits</strong> in reverse order.</p>
              {streak > 1 && (
                <p className="streak-badge">🔥 {streak} in a row!</p>
              )}
              <p className="points-earned">+{earnedPoints} points</p>
            </div>
          ) : (
            <div className="modal-body comparison">
              <p>Almost! Here's where it went wrong:</p>

              <div className="comparison-row">
                <span className="comparison-label">You entered:</span>
                <div className="comparison-seq">
                  {enteredSequence.map((d, i) => (
                    <span
                      key={i}
                      className={`cmp-digit ${
                        errorIndex === null ? 'right'
                        : i < errorIndex ? 'right'
                        : i === errorIndex ? 'wrong'
                        : ''
                      }`}
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>

              <div className="comparison-row">
                <span className="comparison-label">Expected:</span>
                <div className="comparison-seq">
                  {reversedSequence.map((d, i) => (
                    <span
                      key={i}
                      className={`cmp-digit ${i === errorIndex ? 'expected' : ''}`}
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          <button className="reset-btn" onClick={resetGame}>↺ Try again</button>
        </Modal>
      )}
    </div>
  );
}

export default App;
