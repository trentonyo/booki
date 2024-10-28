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
                <a
                    className="w-full"
                    href={`/feed?game=${encodedGameString}&stateModel=${encodedStateModelString}`}
                >
                    <div
                        key={gameStateModel}
                        className="text-xl bg-blue-900 text-blue-50 rounded-md p-10"
                    >
                        {modelMap[gameStateModel].constraints.displayName}
                    </div>
                </a>)
        }
    }

    const modelList = (
        <div
            className="flex flex-col justify-center items-center gap-10 w-1/2 mx-auto"
        >
            <h2
                className="text-2xl font-semibold italic p-6 text-blue-900"
            >
                Select a game state model to start:
            </h2>
            {modelOptions}
        </div>
    )

    return (
        <div>
            <h1 className="text-4xl font-bold p-14">booki</h1>
            {modelList}
        </div>
    )
}
