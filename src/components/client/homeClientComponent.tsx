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
            const encodedGameString = encodeURIComponent(gameStateModel);

            modelOptions.push(
                <div
                    key={gameStateModel}
                    className="model-option"
                >
                    <a href={`/feed?game=${encodedGameString}&stateModel=${encodedStateModelString}`}>
                        {modelMap[gameStateModel].constraints.displayName}
                    </a>
                </div>)
        }
    }

    const modelList = (
        <div>
            {modelOptions}
        </div>
    )

    return (
        <div>
            <h1>booki</h1>
            {modelList}
        </div>
    )
}
