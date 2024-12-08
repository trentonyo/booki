// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import HomeServerComponent from './components/server/homeServerComponent';
import FeedServerComponent from './components/server/feedServerComponent';
import DataServerComponent from './components/server/dataServerComponent';
import './output.css'

const App: React.FC = () => {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<HomeServerComponent />} />
                <Route path="/feed" element={<FeedServerComponent />} />
                <Route path="/data" element={<DataServerComponent />} />
            </Routes>
        </Router>
    );
};

export default App;
