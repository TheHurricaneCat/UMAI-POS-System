import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// refactored deprecated ReactDom.render to modern implementation
// from old code
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);