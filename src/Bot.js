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
    <label>Click a checkbox to redact specified information: </label>
    <br/>
    <form onSubmit={handleSubmit}>
      <div className="flex items-center space-x-4">
        
        <label className="flex items-center space-x-2">
          <input type="checkbox" className="form-checkbox h-5 w-5 text-blue-600" />
          <span>PII-Data</span>
        </label>
        <label className="flex items-center space-x-2">
          <input type="checkbox" className="form-checkbox h-5 w-5 text-blue-600" />
          <span>Financial-Data</span>
        </label>
        <label className="flex items-center space-x-2">
          <input type="checkbox" className="form-checkbox h-5 w-5 text-blue-600" />
          <span>contractual-clauses</span>
        </label>
        <label className="flex items-center space-x-2">
          <input type="checkbox" className="form-checkbox h-5 w-5 text-blue-600" />
          <span>classified-information</span>
        </label>
        <label className="flex items-center space-x-2">
          <input type="checkbox" className="form-checkbox h-5 w-5 text-blue-600" />
          <span>Legal -information</span>
        </label>
    </div>
    <br/> 
        <div className="flex items-center space-x-4">
          <textarea
            value={userInput}
            onChange={handleInputChange}
            placeholder="Type your prompt to redact here. Interactive AI Chatbot that will redact contents from the loaded document"
            className="border border-gray-300 rounded p-4"
            style={{ width: 'calc(100% - 150px)', height: '80px' }}
          />
          <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            Send
          </button>
        </div>
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