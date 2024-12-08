import React, { useEffect, useState } from 'react';
import HomeClientComponent from '../client/homeClientComponent';
import {DataSetMap, StateModelMap} from '../../server';
import dataClientComponent from "../client/dataClientComponent";

interface HomeClientComponentProps {
    gameStateModels?: StateModelMap
    dataSets?: DataSetMap
}

export default function HomeServerComponent() {
    const [gameStateModels, setGameStateModels] = useState<StateModelMap | undefined>(undefined);
    const [dataSets, setDataSets] = useState<DataSetMap | undefined>(undefined);

    useEffect(() => {
        fetch('/api/game-state-models')
            .then(response => response.json())
            .then(data => setGameStateModels(data));
    }, []);

    useEffect(() => {
        fetch('/api/data-sets')
            .then(response => response.json())
            .then(data => setDataSets(data));
    }, []);

    return <HomeClientComponent gameStateModels={gameStateModels} dataSets={dataSets} />
}