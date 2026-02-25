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
  angle: 90, spread: 360, startVelocity: 20, elementCount: 200,
  dragFriction: 0.12, duration: 3000, stagger: 3,
  width: '10px', height: '10px', perspective: '500px',
  colors: ['#a864fd', '#29cdff', '#78ff44', '#ff718d', '#fdff6a'],
};

// XP needed to reach each level (index 0 = level 1 threshold = 0)
const LEVEL_XP = [0, 50, 150, 300, 500, 800, 1200, 1800, 2600, 3600];
const LEVEL_NAMES = [
  'Beginner', 'Apprentice', 'Trainee', 'Adept',
  'Expert', 'Master', 'Champion', 'Legend', 'Grandmaster', 'Mythic',
];

function getLevel(xp) {
  let lvl = 1;
  for (let i = 0; i < LEVEL_XP.length; i++) {
    if (xp >= LEVEL_XP[i]) lvl = i + 1;
    else break;
  }
  return Math.min(lvl, LEVEL_XP.length);
}

const TIPS = [
  { id: 1,  text: 'Say digits aloud as you read — your "inner voice" (phonological loop) is your strongest memory tool.' },
  { id: 2,  text: 'Chunking works! Group digits into 3s like a phone number — your brain handles 3 items far more easily than 9.' },
  { id: 3,  text: 'Create a vivid story linking the digits. Bizarre or emotional images stick much better than abstract numbers.' },
  { id: 4,  text: 'Focus on the rhythm or melody of the sequence rather than each digit individually.' },
  { id: 5,  text: 'Before reversing, picture the sequence written on a whiteboard — then mentally read it right to left.' },
  { id: 6,  text: 'Anchor the last digit first. In reverse recall, it\'s the first thing you\'ll need.' },
  { id: 7,  text: 'Pair consecutive digits into two-digit numbers (4→7 becomes "47") to cut your memory load in half.' },
  { id: 8,  text: 'Stay calm and breathe. Stress physically shrinks working memory. Trust your practice.' },
  { id: 9,  text: 'Assign an image to each digit (0=ball, 1=candle, 2=swan…) for visual-spatial encoding.' },
  { id: 10, text: 'Short daily sessions beat long cramming. Even 5 focused minutes a day builds lasting capacity.' },
];

function App() {
  /* ── Persisted ──────────────────────────────────────────────────────────── */
  const [darkMode, setDarkMode] = useState(() => {
    const s = localStorage.getItem('phonoDark');
    return s !== null ? s === 'true'
      : (window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false);
  });
  const [xp, setXp] = useState(() =>
    parseInt(localStorage.getItem('phonoXP') || '0', 10));
  const [bestScore, setBestScore] = useState(() =>
    parseInt(localStorage.getItem('phonoMemBest') || '0', 10));
  const [dismissedTips, setDismissedTips] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('phonoDismissedTips') || '[]')); }
    catch { return new Set(); }
  });

  /* ── Settings ───────────────────────────────────────────────────────────── */
  const [name, setName] = useState('');
  const [timerLength, setTimerLength] = useState(10);
  const [numDigits, setNumDigits] = useState(7);
  const [gameMode, setGameMode] = useState('normal'); // 'normal' | 'timed'
  const [autoScale, setAutoScale] = useState(false);

  /* ── Core game ──────────────────────────────────────────────────────────── */
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [digitSequence, setDigitSequence] = useState([]);
  const [reversedSequence, setReversedSequence] = useState([]);
  const [countdown, setCountdown] = useState(null);
  const [showSubmit, setShowSubmit] = useState(false);
  const [userSequence, setUserSequence] = useState([]);
  const [tilesRevealed, setTilesRevealed] = useState(false);

  /* ── Challenge mode ─────────────────────────────────────────────────────── */
  const [challengeTimeLeft, setChallengeTimeLeft] = useState(null);
  const [challengeRound, setChallengeRound] = useState(0);
  const [multiplier, setMultiplier] = useState(1.0);
  const [challengeActive, setChallengeActive] = useState(false);

  /* ── Result ─────────────────────────────────────────────────────────────── */
  const [showModal, setShowModal] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [enteredSequence, setEnteredSequence] = useState([]);
  const [errorIndex, setErrorIndex] = useState(null);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [earnedXP, setEarnedXP] = useState(0);
  const [didLevelUp, setDidLevelUp] = useState(false);

  /* ── Tips ───────────────────────────────────────────────────────────────── */
  const [activeTip, setActiveTip] = useState(null);

  /* ── PWA install ────────────────────────────────────────────────────────── */
  const [installPrompt, setInstallPrompt] = useState(null);

  /* ── Refs (avoid stale closures in effects/timeouts) ───────────────────── */
  const submitRef = useRef(null);
  const sequenceRef = useRef(null);
  const numDigitsRef = useRef(numDigits);
  const timerLengthRef = useRef(timerLength);
  const challengeActiveRef = useRef(challengeActive);
  const challengeTimeLeftRef = useRef(challengeTimeLeft);

  useEffect(() => { numDigitsRef.current = numDigits; }, [numDigits]);
  useEffect(() => { timerLengthRef.current = timerLength; }, [timerLength]);
  useEffect(() => { challengeActiveRef.current = challengeActive; }, [challengeActive]);
  useEffect(() => { challengeTimeLeftRef.current = challengeTimeLeft; }, [challengeTimeLeft]);

  /* ── Dark mode ──────────────────────────────────────────────────────────── */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('phonoDark', String(darkMode));
  }, [darkMode]);

  /* ── PWA beforeinstallprompt ────────────────────────────────────────────── */
  useEffect(() => {
    const handler = e => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  /* ── Show first tip on load ─────────────────────────────────────────────── */
  useEffect(() => {
    const available = TIPS.filter(t => !dismissedTips.has(t.id));
    if (available.length > 0) setActiveTip(available[0]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Keyboard ───────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!showSubmit) return;
    function onKey(e) {
      if (e.key >= '0' && e.key <= '9') {
        setUserSequence(prev =>
          prev.length < numDigitsRef.current ? [...prev, parseInt(e.key, 10)] : prev);
      } else if (e.key === 'Backspace') {
        setUserSequence(prev => prev.slice(0, -1));
      } else if (e.key === 'Enter' && submitRef.current && !submitRef.current.disabled) {
        submitRef.current.click();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showSubmit]);

  /* ── Challenge countdown ────────────────────────────────────────────────── */
  useEffect(() => {
    if (!challengeActive || challengeTimeLeft === null) return;
    if (challengeTimeLeft <= 0) {
      setChallengeActive(false);
      setDigitSequence([]);
      setShowSubmit(false);
      setUserSequence([]);
      setCountdown(null);
      setTilesRevealed(false);
      setShowModal(true);
      return;
    }
    const t = setTimeout(() => setChallengeTimeLeft(p => p - 1), 1000);
    return () => clearTimeout(t);
  }, [challengeActive, challengeTimeLeft]);

  /* ── Sequence hide timer ────────────────────────────────────────────────── */
  useEffect(() => {
    if (digitSequence.length === 0) return;
    const tl = timerLengthRef.current;
    const hideTimer = setTimeout(() => {
      setTilesRevealed(false);
      setTimeout(() => {
        setDigitSequence([]);
        setShowSubmit(true);
      }, 350); // wait for flip-out
    }, tl * 1000);
    const tickTimer = setInterval(() =>
      setCountdown(prev => prev > 0 ? prev - 1 : 0), 1000);
    return () => { clearTimeout(hideTimer); clearInterval(tickTimer); };
  }, [digitSequence]); // intentionally only digitSequence

  /* ── Scroll to numpad when timer expires ────────────────────────────────── */
  useEffect(() => {
    if (countdown === 0 && submitRef.current)
      submitRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [countdown]);

  /* ── Generate a new sequence ────────────────────────────────────────────── */
  function generateSequence() {
    const nd = numDigitsRef.current;
    const tl = timerLengthRef.current;
    const seq = Array.from({ length: nd }, () => Math.floor(Math.random() * 10));
    setDigitSequence(seq);
    setReversedSequence([...seq].reverse());
    setCountdown(tl);
    setShowSubmit(false);
    setUserSequence([]);
    setTilesRevealed(false);
    setTimeout(() => {
      setTilesRevealed(true);
      sequenceRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 60);
  }

  /* ── Start timed challenge ──────────────────────────────────────────────── */
  function startChallenge() {
    setScore(0);
    setStreak(0);
    setChallengeRound(0);
    setMultiplier(1.0);
    setChallengeActive(true);
    setChallengeTimeLeft(60);
    generateSequence();
  }

  /* ── Check user's answer ────────────────────────────────────────────────── */
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
      const basePts = numDigitsRef.current - 4;
      const currentMult = gameMode === 'timed' ? multiplier : 1;
      const pts = Math.round(basePts * currentMult);
      const xpGained = basePts * 10;
      const oldLevel = getLevel(xp);
      const newXP = xp + xpGained;
      const newLevel = getLevel(newXP);

      setScore(prev => {
        const ns = prev + pts;
        if (ns > bestScore) {
          setBestScore(ns);
          localStorage.setItem('phonoMemBest', String(ns));
        }
        return ns;
      });
      setStreak(prev => {
        const ns = prev + 1;
        // Auto-scale every 3 correct
        if (autoScale && ns % 3 === 0) {
          const nd = Math.min(numDigitsRef.current + 1, 18);
          numDigitsRef.current = nd;
          setNumDigits(nd);
        }
        // Auto-scale timer every 5 correct
        if (autoScale && ns % 5 === 0) {
          const nt = Math.max(timerLengthRef.current - 1, 5);
          timerLengthRef.current = nt;
          setTimerLength(nt);
        }
        // Show a tip every 3rd correct
        if (ns % 3 === 0) showNextTip(dismissedTips);
        return ns;
      });
      setEarnedPoints(pts);
      setEarnedXP(xpGained);
      setXp(newXP);
      localStorage.setItem('phonoXP', String(newXP));
      setDidLevelUp(newLevel > oldLevel);

      if (gameMode === 'timed') {
        setChallengeRound(r => r + 1);
        setMultiplier(m => parseFloat((m + 0.1).toFixed(1)));
      }
    } else {
      setStreak(0);
      setEarnedPoints(0);
      setEarnedXP(0);
      setDidLevelUp(false);
      if (gameMode === 'timed') setMultiplier(1.0);
    }

    if (gameMode === 'timed' && challengeActiveRef.current) {
      // Auto-continue in challenge mode
      setTimeout(() => {
        if (challengeActiveRef.current && challengeTimeLeftRef.current > 0) {
          setEnteredSequence([]);
          setReversedSequence([]);
          setErrorIndex(null);
          generateSequence();
        }
      }, 1000);
    } else {
      setShowModal(true);
    }
  }

  function showNextTip(curDismissed) {
    const available = TIPS.filter(t => !(curDismissed || dismissedTips).has(t.id));
    if (available.length > 0) {
      setActiveTip(available[Math.floor(Math.random() * available.length)]);
    }
  }

  function dismissTip() {
    if (!activeTip) return;
    const newSet = new Set([...dismissedTips, activeTip.id]);
    setDismissedTips(newSet);
    localStorage.setItem('phonoDismissedTips', JSON.stringify([...newSet]));
    setActiveTip(null);
  }

  /* ── Reset for next round ───────────────────────────────────────────────── */
  function resetGame() {
    setDigitSequence([]);
    setShowSubmit(false);
    setUserSequence([]);
    setEnteredSequence([]);
    setReversedSequence([]);
    setShowModal(false);
    setErrorIndex(null);
    setCountdown(null);
    setTilesRevealed(false);
    if (gameMode === 'timed') {
      setChallengeActive(false);
      setChallengeTimeLeft(null);
      setChallengeRound(0);
      setMultiplier(1.0);
    }
  }

  /* ── Derived values ─────────────────────────────────────────────────────── */
  const isPlaying = digitSequence.length > 0;
  const timerPct = countdown !== null && timerLength > 0
    ? (countdown / timerLength) * 100 : 100;
  const barColor = timerPct > 50 ? '#10d385' : timerPct > 25 ? '#FFC107' : '#ff4444';
  const level = getLevel(xp);
  const prevXP = LEVEL_XP[level - 1];
  const nextXP = LEVEL_XP[level] ?? null;
  const xpPct = nextXP ? ((xp - prevXP) / (nextXP - prevXP)) * 100 : 100;
  const levelTier = level >= 7 ? 'high' : level >= 4 ? 'mid' : 'low';
  const isChallengeEnd = gameMode === 'timed' && !challengeActive && showModal;

  /* ── Render digits in visual chunks of 3 ───────────────────────────────── */
  function renderChunked(digits, baseClass, withFlip = false) {
    return digits.map((d, i) => {
      const isChunkStart = i > 0 && i % 3 === 0;
      return (
        <React.Fragment key={i}>
          {isChunkStart && <div className="chunk-gap" />}
          <div
            className={`sequence-item ${baseClass}${withFlip && tilesRevealed ? ' revealed' : ''}`}
            style={withFlip ? { transitionDelay: `${i * 55}ms` } : {}}
          >
            {d}
          </div>
        </React.Fragment>
      );
    });
  }

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div className="App" data-level={levelTier}>

      {/* ── Header ── */}
      <div className="app-header">
        <h1>Phonologic Memory</h1>
        <div className="header-controls">
          {installPrompt && (
            <button className="icon-btn install-btn" onClick={() => {
              installPrompt.prompt();
              installPrompt.userChoice.then(() => setInstallPrompt(null));
            }}>⬇ Install</button>
          )}
          <button
            className="icon-btn dark-toggle"
            onClick={() => setDarkMode(d => !d)}
            title="Toggle dark mode"
          >
            {darkMode ? '☀' : '🌙'}
          </button>
        </div>
      </div>

      {/* ── Score bar ── */}
      <div className="score-bar">
        <span className="score-item">{name || 'Score'}: <strong>{score} pts</strong></span>
        <span className="score-item">Best: <strong>{bestScore} pts</strong></span>
        <span className="score-item">Streak: <strong>{streak} 🔥</strong></span>
      </div>

      {/* ── XP / level bar ── */}
      <div className="xp-row">
        <span className="level-badge">Lv {level} · {LEVEL_NAMES[level - 1]}</span>
        <div className="xp-track">
          <div className="xp-fill" style={{ width: `${xpPct}%` }} />
        </div>
        <span className="xp-num">{xp} XP{nextXP ? ` / ${nextXP}` : ' (MAX)'}</span>
      </div>

      {/* ── Challenge bar ── */}
      {challengeActive && (
        <div className={`challenge-bar${challengeTimeLeft <= 10 ? ' urgent' : ''}`}>
          <span>⏱ {challengeTimeLeft}s</span>
          <span>Round {challengeRound + 1}</span>
          <span className="multiplier-badge">×{multiplier.toFixed(1)}</span>
        </div>
      )}

      <div className="confetti-container">
        <Confetti active={isCorrect && showModal} config={confettiConfig} />
      </div>

      <hr />

      {/* ── Setup ── */}
      <div className="setup-section">
        <label className="input-text">
          Name:&nbsp;
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Optional"
          />
        </label>

        <div className="mode-selector">
          <button
            className={`mode-btn${gameMode === 'normal' ? ' active' : ''}`}
            onClick={() => { setGameMode('normal'); resetGame(); }}
          >Normal</button>
          <button
            className={`mode-btn${gameMode === 'timed' ? ' active' : ''}`}
            onClick={() => { setGameMode('timed'); resetGame(); }}
          >⏱ 60s Challenge</button>
        </div>

        <div className="preset-row">
          <span>Quick:&nbsp;</span>
          {PRESETS.map(p => (
            <button
              key={p.label}
              className="preset-btn"
              onClick={() => {
                setNumDigits(p.digits); numDigitsRef.current = p.digits;
                setTimerLength(p.timer); timerLengthRef.current = p.timer;
              }}
            >{p.label}</button>
          ))}
        </div>

        <div className="config-row input-text">
          <label>Digits:&nbsp;
            <select value={numDigits} onChange={e => {
              const v = Number(e.target.value);
              setNumDigits(v); numDigitsRef.current = v;
            }}>
              {Array.from({ length: 14 }, (_, i) => i + 5).map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <label>Timer:&nbsp;
            <select value={timerLength} onChange={e => {
              const v = Number(e.target.value);
              setTimerLength(v); timerLengthRef.current = v;
            }}>
              {Array.from({ length: 14 }, (_, i) => i + 5).map(n => (
                <option key={n} value={n}>{n}s</option>
              ))}
            </select>
          </label>
          <label className="autoscale-label">
            <input
              type="checkbox"
              checked={autoScale}
              onChange={e => setAutoScale(e.target.checked)}
            />
            &nbsp;Auto-scale
          </label>
        </div>
      </div>

      <hr />

      <div className="explain-text">
        <p>Memorize the sequence, then type it in <strong>reverse order</strong>.</p>
        {gameMode === 'timed'
          ? <p>60 seconds · unlimited rounds · multiplier grows with each correct answer!</p>
          : <p>Timer: <strong>{timerLength}s</strong> · Keys: <kbd>0–9</kbd> <kbd>⌫</kbd> <kbd>↵</kbd></p>
        }
        {autoScale && <p className="autoscale-hint">Auto-scale: difficulty increases every 3 correct answers.</p>}
      </div>

      <button
        onClick={gameMode === 'timed' && !challengeActive ? startChallenge : generateSequence}
        disabled={isPlaying}
      >
        {isPlaying ? '⏳ Memorize!'
          : gameMode === 'timed' ? '▶ Start Challenge'
          : '▶ Generate Sequence'}
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
        {renderChunked(digitSequence, 'seq-tile', true)}
      </div>

      {/* ── Input phase ── */}
      {showSubmit && (
        <>
          <p className="enter-prompt">Enter in <strong>reverse order</strong>:</p>
          <p className="progress-hint">{userSequence.length} / {numDigits} digits</p>

          <div className="user-sequence-container">
            {renderChunked(userSequence, 'entered-number')}
          </div>

          <div className="number-pad">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
              <button
                key={n}
                className="pad-btn"
                onClick={() => setUserSequence(p =>
                  p.length < numDigits ? [...p, n] : p)}
              >{n}</button>
            ))}
            <button className="pad-btn del-btn"
              onClick={() => setUserSequence(p => p.slice(0, -1))}>⌫</button>
            <button className="pad-btn"
              onClick={() => setUserSequence(p =>
                p.length < numDigits ? [...p, 0] : p)}>0</button>
            <button
              className="pad-btn submit-pad-btn"
              ref={submitRef}
              onClick={checkSequence}
              disabled={userSequence.length !== numDigits}
            >✓</button>
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
          {isChallengeEnd ? (
            <>
              <h2>⏱ Time's up!</h2>
              <div className="modal-body">
                <p>You completed <strong>{challengeRound}</strong> rounds.</p>
                <p className="points-earned">{score} pts</p>
                <p>All-time best: <strong>{bestScore} pts</strong></p>
              </div>
            </>
          ) : (
            <>
              <h2>{isCorrect ? '🎉 Correct!' : '❌ Incorrect'}</h2>
              {isCorrect ? (
                <div className="modal-body">
                  <p>Well done{name ? `, ${name}` : ''}!</p>
                  <p>All <strong>{numDigits} digits</strong> recalled in reverse.</p>
                  {streak > 1 && <p className="streak-badge">🔥 {streak} in a row!</p>}
                  <p className="points-earned">+{earnedPoints} pts</p>
                  <p className="xp-earned">+{earnedXP} XP</p>
                  {didLevelUp && (
                    <p className="level-up-msg">
                      🆙 Level up! You're now Level {level} — {LEVEL_NAMES[level - 1]}!
                    </p>
                  )}
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
                        >{d}</span>
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
                        >{d}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <button className="reset-btn" onClick={resetGame}>↺ Play again</button>
        </Modal>
      )}

      {/* ── Tip toast ── */}
      {activeTip && (
        <div className="tip-toast">
          <span className="tip-icon">💡</span>
          <span className="tip-text">{activeTip.text}</span>
          <button className="tip-dismiss" onClick={dismissTip} aria-label="Dismiss tip">✕</button>
        </div>
      )}
    </div>
  );
}

export default App;
