import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/styles/tokens.css';
import '@/styles/index.css';
import App from '@/app/App';
import { startBoardEvents } from '@/features/servo/boardEvents';

startBoardEvents();   // every board's own log (drops, restarts, guard trips) into the Servos page's Debug Log

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);