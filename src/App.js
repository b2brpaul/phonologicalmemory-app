import React, { useState, useEffect } from 'react';
import './App.css';
import logo from './logo.svg';
import Confetti from 'react-dom-confetti';

function App() {
  const [score, setScore] = useState(0);
  const [countdown, setCountdown] = useState(null);
  const [numDigits, setNumDigits] = useState(10);
  const [digitSequence, setDigitSequence] = useState([]);
  const [showSubmit, setShowSubmit] = useState(false);
  const [userSequence, setUserSequence] = useState([]);
  const [alertMessage, setAlertMessage] = useState("");
  const [reversedSequence, setReversedSequence] = useState([]);
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
    setUserSequence(Array(numDigits).fill('-'));  // Initialise userSequence with dashes
    setCountdown(10);
  }

  function handleClick(num) {
    setUserSequence(prevSequence => {
      const index = prevSequence.indexOf('-');
      if (index !== -1) {
        return [...prevSequence.slice(0, index), num, ...prevSequence.slice(index + 1)];
      }
      return [...prevSequence, num];
    });
  }

  useEffect(() => {
    if (digitSequence.length > 0) {
      setCountdown(10);
      const timer = setTimeout(() => {
        setDigitSequence([]);
        setShowSubmit(true);
      }, 10000);
      const countdownTimer = setInterval(() => {
        setCountdown(prevCountdown => prevCountdown - 1);
      }, 1000);
      return () => {
        clearTimeout(timer);
        clearInterval(countdownTimer);
      }
    }
  }, [digitSequence]);
  useEffect(() => {
  if (showSubmit) {
    window.scrollTo(0, document.body.scrollHeight);
    }
  }, [showSubmit]);

  function checkSequence() {
    if (userSequence.join(' ') !== reversedSequence.join(' ')) {
      setAlertMessage(`Incorrect, try again. Expected sequence was: ${reversedSequence.join(' ')}`);
    } else {
      setAlertMessage('Correct!');
      setScore(prevScore => prevScore + numDigits - 4);
    }
    setUserSequence([]);
    setShowSubmit(false);
  }

  function resetGame() {
    setNumDigits(10);
    setDigitSequence([]);
    setShowSubmit(false);
    setUserSequence([]);
    setAlertMessage("");
    setReversedSequence([]);
  }

  return (
    <div className="App">
      <h1>Phonologic Memory Game</h1>
      <h2>Your Score: {score}</h2>
      <Confetti active={alertMessage === 'Correct!'} config={confettiConfig} />
      <p> Let's start. I want the sequence to be :
        <select value={numDigits} onChange={e => setNumDigits(Number(e.target.value))}>
          {Array.from({ length: 16 }, (_, i) => i + 5).map(num => (
            <option key={num} value={num}>{num}</option>
          ))}
        </select>
         numbers long
      </p>
      <p>Click "Generate Sequence" to start. A random sequence of numbers will be shown. Memorize this sequence, as it will disappear after 10 seconds. You will then have to enter the sequence in reverse.</p>
      <button onClick={generateSequence}>Generate Sequence</button>
      <p>Time left: {countdown}</p>
      <div className="sequence-container">
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
          <button type="submit" onClick={checkSequence}>Submit</button>
        </>
      )}
      {alertMessage && (
        <>
          <p>{alertMessage}</p>
          <button type="reset" onClick={resetGame}>Try again ↺</button>
        </>
      )}
    </div>
  );
}

export default App;
