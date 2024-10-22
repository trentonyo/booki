'use client';

import React from "react";
import {StateModelMap} from "../../server";


interface HomeClientComponentProps {
    gameStateModels?: StateModelMap
}

export default function HomeClientComponent(gameStateModels: HomeClientComponentProps) {
    let modelOptions: React.JSX.Element[] = [];
    if (gameStateModels.gameStateModels) {
        const modelMap = gameStateModels.gameStateModels;
        for (const gameStateModel in modelMap) {
            const stateModelString = JSON.stringify(modelMap[gameStateModel]);
            const encodedStateModelString = encodeURIComponent(stateModelString);
            
            modelOptions.push(<li><a href={`/feed?stateModel=${encodedStateModelString}`}>{modelMap[gameStateModel].constraints.displayName}</a></li>)
        }
    }

    const modelList = (
        <ul>
            {modelOptions}
        </ul>
    )

    return (
        <div>
            <h1>booki</h1>
            {modelList}
        </div>
    )
}