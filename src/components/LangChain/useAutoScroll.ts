// useAutoScroll.ts
import { useEffect, useState } from 'react';
import { AIChatMessage } from '../../types';

const useAutoScroll = (
  messages: AIChatMessage[], // Adjust type accordingly
  chatHistoryRef: React.RefObject<HTMLDivElement>,
) => {
  const [hasUserScrolled, setHasUserScrolled] = useState(false);

  useEffect(() => {
    const chatHistoryEl = chatHistoryRef.current;

    const handleScroll = () => {
      if (chatHistoryEl) {
        // Check if user has scrolled away from the bottom
        const isScrolledFromBottom = chatHistoryEl.scrollTop + chatHistoryEl.offsetHeight < chatHistoryEl.scrollHeight;
        setHasUserScrolled(isScrolledFromBottom);
      }
    };

    // Set up the event listener on mount
    chatHistoryEl?.addEventListener('scroll', handleScroll);

    // If user has not scrolled, keep at bottom upon new messages
    if (chatHistoryEl && !hasUserScrolled) {
      chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
    }

    // Clean up event listener on unmount
    return () => {
      chatHistoryEl?.removeEventListener('scroll', handleScroll);
    };
  }, [messages, hasUserScrolled, chatHistoryRef]);

  return { hasUserScrolled };
};

export default useAutoScroll;
