import React, { useEffect, useState } from 'react';
import HomeClientComponent from '../client/homeClientComponent';
import { StateModelMap } from '../../server';

export default function HomeServerComponent() {
    const [gameStateModels, setGameStateModels] = useState<StateModelMap | undefined>(undefined);

    useEffect(() => {
        fetch('/api/game-state-models')
            .then(response => response.json())
            .then(data => setGameStateModels(data));
    }, []);

    return <HomeClientComponent gameStateModels={gameStateModels} />
}