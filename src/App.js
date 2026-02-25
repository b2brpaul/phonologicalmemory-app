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

// ── Memory technique tips keyed by digit count ───────────────────────────
const MEMORY_TIPS = [
  {
    minDigits: 5, maxDigits: 6,
    label: 'Chunking',
    hint: 'Group into chunks of 2–3',
    detail: [
      'Split the sequence into small groups of 2–3 digits (e.g., "47·29·1").',
      'Say each chunk like a word — "forty-seven", "twenty-nine", "one".',
      'To recall in reverse: reverse each chunk, then say the chunks in reverse order.',
      'With only 5–6 digits, one confident read-through is usually enough.',
    ],
  },
  {
    minDigits: 7, maxDigits: 9,
    label: 'Rhythm & Melody',
    hint: 'Give the digits a beat',
    detail: [
      'Read the sequence with a rhythmic pattern — group into "3–2–2" chunks.',
      'Stress the first digit of each group, like a song lyric.',
      'Tap a finger for each digit as you memorize to reinforce the rhythm.',
      'To recall in reverse: replay the melody backwards in your mind.',
    ],
  },
  {
    minDigits: 10, maxDigits: 12,
    label: 'Number–Image Story',
    hint: 'Turn digits into a vivid story',
    detail: [
      'Assign each digit an image: 0=sun, 1=candle, 2=swan, 3=heart, 4=sailboat, 5=hook, 6=elephant, 7=cliff, 8=snowman, 9=balloon.',
      'Chain the images into a brief story as you read the digits.',
      'To recall in reverse: rewind the story scene by scene.',
      'Tip: work in pairs — "14" = candle + sailboat = "candle on a boat".',
    ],
  },
  {
    minDigits: 13, maxDigits: 18,
    label: 'Memory Palace',
    hint: 'Place digits in a familiar space',
    detail: [
      'Picture a familiar route: front door → hallway → kitchen → living room…',
      'Place each chunk of 2–3 digits as a vivid object at each location.',
      'To recall in reverse: mentally walk the route backwards, collecting each object.',
      'The more bizarre or exaggerated the image, the easier it sticks.',
    ],
  },
];

function getTipForDigits(n) {
  return MEMORY_TIPS.find(t => n >= t.minDigits && n <= t.maxDigits)
    || MEMORY_TIPS[MEMORY_TIPS.length - 1];
}

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

  const [showTips, setShowTips] = useState(false);

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

  // ── Scroll to top when input phase begins so the prompt is visible ──────
  useEffect(() => {
    if (showSubmit) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [showSubmit]);

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
  const activePreset = PRESETS.find(p => p.digits === numDigits && p.timer === timerLength) ?? null;
  const currentTip = getTipForDigits(numDigits);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="App" data-input-active={showSubmit ? 'true' : 'false'}>
      <h1>Phonologic Memory Game</h1>

      <div className="score-bar">
        <span className="score-item">
          {name || 'Score'}: <strong>{score} pts</strong>
        </span>
        <span className="score-item">
          Best: <strong>{bestScore} pts</strong>
        </span>
        <span
          className="score-item score-item--streak"
          data-active={streak > 1 ? 'true' : 'false'}
        >
          Streak: <strong>{streak} {streak > 0 ? '🔥' : '—'}</strong>
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
              className={`preset-btn${activePreset?.label === p.label ? ' preset-btn--active' : ''}`}
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

        {/* ── Memory Tips panel ── */}
        <div className="tips-section">
          <button
            className="tips-toggle"
            onClick={() => setShowTips(v => !v)}
            aria-expanded={showTips}
          >
            💡 Memory technique for this level {showTips ? '▲' : '▼'}
          </button>
          {showTips && (
            <div className="tips-content">
              <span className="tips-level-label">{currentTip.label}</span>
              <ul className="tips-list">
                {currentTip.detail.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          )}
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
          <div
            key={i}
            className="sequence-item"
            style={{ animationDelay: `${i * 0.06}s` }}
          >
            {digit}
          </div>
        ))}
        {isPlaying && (
          <p className="ingame-tip">💡 {currentTip.hint}</p>
        )}
      </div>

      {/* ── Input phase (fixed overlay at bottom) ── */}
      {showSubmit && (
        <div className="input-overlay">
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
        </div>
      )}

      {/* ── Result modal ── */}
      {showModal && (
        <Modal
          isOpen={showModal}
          onRequestClose={resetGame}
          className={`result-modal${isCorrect ? ' result-modal--success' : ' result-modal--failure'}`}
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

              <p className="modal-tip">
                Try: <strong>{currentTip.label}</strong> — {currentTip.hint}. Tap "Memory technique" before your next attempt.
              </p>
            </div>
          )}

          <button className="reset-btn" onClick={resetGame}>↺ Try again</button>
        </Modal>
      )}
    </div>
  );
}

export default App;
