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
            modelOptions.push(<li>{gameStateModel}</li>)
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
            <a href="feed"><h2>Feed</h2></a>
            {modelList}
        </div>
    )
}