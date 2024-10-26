// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import HomeServerComponent from './components/server/homeServerComponent';
import FeedServerComponent from './components/server/feedServerComponent';

const App: React.FC = () => {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<HomeServerComponent />} />
                <Route path="/feed" element={<FeedServerComponent />} />
            </Routes>
        </Router>
    );
};

export default App;