// ChatUI.tsx
import React from 'react';

export function ChatUI({ messages, isBotTyping, chatHistoryRef, handleInputChange, handleSubmit, input }) {
  return (
    <div className="chat-container">
      <div ref={chatHistoryRef} className="chat-history">
        {messages.map((message) => (
          <div key={message.id} className={`chat-message ${message.isUser ? 'user' : 'bot'}`}>
            {message.content}
          </div>
        ))}
        {isBotTyping && <div className="chat-message bot typing-indicator">Typing...</div>}
      </div>
      <form onSubmit={handleSubmit} className="chat-input">
        <input type="text" value={input} onChange={handleInputChange} placeholder="Type your message..." />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
