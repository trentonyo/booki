import React, { useEffect, useState } from 'react';
import HomeClientComponent from '../client/homeClientComponent';
import { StateModelMap } from '../../server';
import FeedClientComponent from "../client/feedClientComponent";

export default function ServerServerComponent() {
    // const [gameStateModels, setGameStateModels] = useState<StateModelMap | undefined>(undefined);
    //
    // useEffect(() => {
    //     fetch('/api/game-state-models')
    //         .then(response => response.json())
    //         .then(data => setGameStateModels(data));
    // }, []);

    return <FeedClientComponent />
}