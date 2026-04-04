import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import { SidePanelProvider } from './app/components/layout/SidePanelContext';
import App from './app/App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SidePanelProvider>
      <App />
    </SidePanelProvider>
  </StrictMode>,
);
