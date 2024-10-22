import React from 'react';
import ReactDOM from 'react-dom';
import HomeServerComponent from "./components/server/homeServerComponent";

const App = () => (
    <HomeServerComponent />
);

ReactDOM.render(<App />, document.getElementById('root'));
