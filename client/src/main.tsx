import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "swiper/swiper-bundle.css";
import "flatpickr/dist/flatpickr.css";
import App from "./App.tsx";
import { AppWrapper } from "./components/common/PageMeta.tsx";
import { ThemeProvider } from "./context/ThemeContext.tsx";
import { Provider } from 'react-redux';
import store from './store';
import ErrorBoundary from "./components/common/ErrorBoundary.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <Provider store={store}>
          <AppWrapper>
            <App />
          </AppWrapper>
        </Provider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
);
