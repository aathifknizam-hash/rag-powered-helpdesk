import React, { useState } from 'react';

export default function AICopilotPrompt({ onSubmit, disabled = false }) {
  const [question, setQuestion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(question);
      setQuestion('');
    } catch (error) {
      console.error('Error submitting question:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="ai-copilot-prompt">
      <form className="ai-prompt-form" onSubmit={handleSubmit}>
        <div className="ai-prompt-input-wrapper">
          <input
            type="text"
            className="ai-prompt-input"
            placeholder="Ask Copilot a specific question..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={disabled || isSubmitting}
          />
          <button
            type="submit"
            className="ai-prompt-send-button"
            disabled={disabled || isSubmitting || !question.trim()}
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              send
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
