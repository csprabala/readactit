// Assuming you're using React for this implementation

import React, { useState } from 'react';

const Bot = () => {
  const [userInput, setUserInput] = useState('');
  const [conversation, setConversation] = useState([]);

  const handleInputChange = (e) => {
    setUserInput(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    // Simulate a bot response
    const botReply = `Bot says: I received your message - "${userInput}"`;

    setConversation([...conversation, { type: 'user', text: userInput }, { type: 'bot', text: botReply }]);
    setUserInput('');
  };

  return (
    <div style={{ width: 'calc(50% - 15px)', height: '100vh', border: '2px solid black' }} >
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
      <div style={{ marginTop: '20px', border: '1px solid #ccc', padding: '10px', height: '300px', overflowY: 'auto' }}>
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