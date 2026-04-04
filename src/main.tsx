import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import { ThemeProvider } from './app/components/layout/ThemeContext';
import { SidePanelProvider } from './app/components/layout/SidePanelContext';
import { NotificationsProvider } from './app/components/layout/NotificationsContext';
import App from './app/App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <NotificationsProvider>
        <SidePanelProvider>
          <App />
        </SidePanelProvider>
      </NotificationsProvider>
    </ThemeProvider>
  </StrictMode>,
);
