// Assuming you're using React for this implementation

import React, { useState } from 'react';

const Bot = ({sendDataToParent}) => {
  const [userInput, setUserInput] = useState('');
  const [conversation, setConversation] = useState([]);

  const handleInputChange = (e) => {
    setUserInput(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    try {
      // Encode userInput for URL
      const encodedInput = encodeURIComponent(userInput);
      const response = await fetch(`http://localhost:8000/ai-response?query=${encodedInput}`);
      if (!response.ok) throw new Error('Network response was not ok.');

      const data = await response.json();
      const botReply = `Bot says: ${data.response}`; 

      // Send data to parent
      sendDataToParent(data.response);


      setConversation([...conversation, { type: 'user', text: userInput }, { type: 'bot', text: botReply }]);
    } catch (error) {
      console.error('There was a problem with the fetch operation:', error);
      // Handle the error (e.g., show an error message to the user)
    }
    setUserInput('');
  };

  return (
    <div style={{ width: 'calc(50% - 15px)', height: '100vh', border: '2px solid black' }} >
      <p><h3>Interactive AI Chatbot that will redact contents from the loaded document:</h3></p>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={userInput}
          onChange={handleInputChange}
          placeholder="Type your message here..."
          style={{ width: 'calc(100% - 70px)' }}
        />
        <button type="submit">Send</button>
      </form>
      <div style={{ marginTop: '20px', border: '1px solid #ccc', padding: '10px', height: '600px', overflowY: 'auto' }}>
        {conversation.map((msg, index) => (
          <div key={index} style={{ textAlign: msg.type === 'bot' ? 'left' : 'right' }}>
            {msg.text}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Bot;