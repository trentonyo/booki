'use client';

import React, { useEffect, useState } from "react";
import { StateModelMap } from "../../server";
import { StateModel } from "../../scripts/processGameFrame";
import { startCamera } from "../../scripts/feed";

import DefaultGameStateView from "../../scripts/stateHandlers/default_view";
import TheFinalsRankedGameStateView from "../../scripts/stateHandlers/thefinals_ranked_view";

function gameStateView(gameStateModelName: string) {
    switch (gameStateModelName) {
        case "thefinals_ranked":
            return TheFinalsRankedGameStateView;
        default:
            return DefaultGameStateView;
    }
}

const FeedClientComponent: React.FC = () => {
    const [gameStateModel, setGameStateModel] = useState<StateModel | null>(null);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const stateModelString = urlParams.get('stateModel');

        if (stateModelString) {
            const decodedString = decodeURIComponent(stateModelString);
            try {
                const parsedModel = JSON.parse(decodedString);
                setGameStateModel(parsedModel);
            } catch (error) {
                console.error("Failed to parse gameStateModel", error);
            }
        }
    }, []);

    const [modelName, setModelName] = useState<string | null>(null);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const gameString = urlParams.get('game');

        if (gameString) {
            const decodedString = decodeURIComponent(gameString);
            try {
                setModelName(decodedString);
            } catch (error) {
                console.error("Failed to parse game", error);
            }
        }
    }, []);

    useEffect(() => {
        if (gameStateModel) {
            startCamera(
                modelName!,
                gameStateModel,
                false
            );
        }
    }, [gameStateModel]);

    if (!gameStateModel) {
        console.error("No gameStateModel provided");
        return <>Waiting for valid game state model...</>;
    }

    let dataFeed: React.JSX.Element[] = [];
    for (const landMark of gameStateModel.gameState) {
        dataFeed.push((
            <tr key={landMark.name}>
                <td>{landMark.name}</td>
                <td id={landMark.name}></td>
            </tr>
        ))
    }

    const view = gameStateView(modelName!)

    return (
        <>
            <a href="/"><h1 className="text-xl underline pl-6 pt-6 italic">🏠Return Home</h1></a>
            <h2
                className="text-3xl font-bold pt-6 pl-14  text-blue-900 italic"
            >
                {gameStateModel.constraints.displayName}
            </h2>
            {view(dataFeed)}
        </>
    );
};

export default FeedClientComponent;
