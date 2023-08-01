import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import Confetti from 'react-dom-confetti';
import Modal from 'react-modal';

function App() {
  const [name, setName] = useState("");
  const [timerLength, setTimerLength] = useState(10);
  const submitRef = React.useRef(null);
  const [score, setScore] = useState(0);
  const [countdown, setCountdown] = useState(null);
  const [numDigits, setNumDigits] = useState(7);
  const [digitSequence, setDigitSequence] = useState([]);
  const [showSubmit, setShowSubmit] = useState(false);
  const [userSequence, setUserSequence] = useState([]);
  const [alertMessage, setAlertMessage] = useState("");
  const [reversedSequence, setReversedSequence] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const sequenceRef = useRef(null);
  const confettiConfig = {
    angle: 90,
    spread: 360,
    startVelocity: 20,
    elementCount: 200,
    dragFriction: 0.12,
    duration: 3000,
    stagger: 3,
    width: "10px",
    height: "10px",
    perspective: "500px",
    colors: ["#a864fd", "#29cdff", "#78ff44", "#ff718d", "#fdff6a"]
  };

  function generateSequence() {
    const sequence = Array.from({ length: numDigits }, () => Math.floor(Math.random() * 10));
    setDigitSequence(sequence);
    setReversedSequence([...sequence].reverse());
    setCountdown(timerLength);

    setTimeout(() => {
    if (sequenceRef.current) {
      sequenceRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    }, 100);  // Delay of 100 milliseconds
  }

  useEffect(() => {
    if (digitSequence.length > 0) {
      setCountdown(timerLength);
  
      const timer = setTimeout(() => {
        setDigitSequence([]);
        setShowSubmit(true);
      }, timerLength * 1000);
      const countdownTimer = setInterval(() => {
        setCountdown(prevCountdown => prevCountdown > 0 ? prevCountdown - 1 : 0);
      }, 1000);
      return () => {
        clearTimeout(timer);
        clearInterval(countdownTimer);
      };
    }
  }, [digitSequence]);

  useEffect(() => {
    if (countdown === 0 && submitRef.current) {
      submitRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [countdown]);

  function checkSequence() {
    if (userSequence.join(' ') !== reversedSequence.join(' ')) {
      setAlertMessage(`Incorrect, try again. Expected sequence was: ${reversedSequence.join(' ')}`);
    } else {
      setAlertMessage('Correct!');
      setScore(prevScore => prevScore + numDigits - 4);
    }
    setUserSequence([]);
    setShowSubmit(false);
    setShowModal(true);
  }

  function resetGame() {
    setNumDigits(7);
    setDigitSequence([]);
    setShowSubmit(false);
    setUserSequence([]);
    setAlertMessage("");
    setReversedSequence([]);
    setShowModal(false);
  }

  function handleClick(num) {
    if (userSequence.length < numDigits) {
      setUserSequence(prevSequence => [...prevSequence, num]);
    }
  }

  return (
    <div className="App">
      <h1>Phonologic Memory Game</h1>
      <h2>{name ? `${name}, your score: ${score}` : `Your score: ${score}`}</h2>
      <div className="confetti-container">
        <Confetti active={alertMessage === 'Correct!'} config={confettiConfig} />
      </div>
      <hr />
      <div className="input-text">
        <p> Let's start by configuring the game :</p> 
        <label>
          - Your name:&nbsp; 
          <input type="text" value={name} onChange={e => setName(e.target.value)} />
        </label>
        <p>- I want the sequence to be :&nbsp;
          <select value={numDigits} onChange={e => setNumDigits(Number(e.target.value))}>
            {Array.from({ length: 14 }, (_, i) => i + 5).map(num => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
          &nbsp;numbers long
        </p>
        <p> 
          - I want the timer to be set to:&nbsp; 
          <select value={timerLength} onChange={e => setTimerLength(Number(e.target.value))}>
            {Array.from({ length: 14 }, (_, i) => i + 5).map(num => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select> 
          &nbsp;seconds
        </p>
      </div>
      <hr />
      <div className="explain-text">
        <p>Click "Generate Sequence" to start.</p> 
        <p>A random sequence of numbers will be shown. Memorize this sequence, as it will disappear after 10 seconds. You will then have to enter the sequence in reverse.</p>
      </div>
      <button onClick={generateSequence}>Generate Sequence</button>
      <p>Time left: {countdown}</p>
      <div className="sequence-container" ref={sequenceRef}>
        {digitSequence.map((digit, i) => (
          <div key={i} className="sequence-item">{digit}</div>
        ))}
      </div>
      {showSubmit && (
        <>
          <p>Enter the sequence now:</p>
          <div className="user-sequence-container">
            {userSequence.map((num, i) => (
              <div key={i} className="sequence-item entered-number">{num}</div>
            ))}
          </div>
          <div className="number-pad">
            {[...Array(9).keys()].map((_, i) => (
              <div 
                key={i+1} 
                className="sequence-item number-pad-item" 
                onClick={() => handleClick(i+1)}
              >
                {i+1}
              </div>
            ))}
            <div></div>
            <div 
              key={0} 
              className="sequence-item number-pad-item" 
              onClick={() => handleClick(0)}
            >
              0
            </div>
            <div 
              key={"delete"} 
              className="sequence-item number-pad-item delete"
              onClick={() => setUserSequence(prevSequence => prevSequence.slice(0, -1))}
            >
              Del
            </div>
            <div></div>
          </div>
          <button type="submit" onClick={checkSequence} ref={submitRef}>Submit</button>
        </>
      )}
      {showModal && (
        <Modal isOpen={showModal} onRequestClose={() => setShowModal(false)}>
          <h2>Résultats</h2>
          <p>{alertMessage}</p>
          <button type="reset" onClick={resetGame}>Try again ↺</button>
        </Modal>
      )}
    </div>
  );
}

export default App;
