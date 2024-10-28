'use client';

import React, { useEffect, useState } from "react";
import { StateModelMap } from "../../server";
import { StateModel } from "../../ocr";
import { startCamera } from "../../scripts/feed";

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
                gameStateModel
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

    return (
        <>
            <a href="/"><h1>Home</h1></a>
            <h2>{gameStateModel.constraints.displayName}</h2>
            <div style={{display: "flex"}}>
                <table>
                    <thead>
                    <tr>
                        <th>landMark</th>
                        <th>value</th>
                    </tr>
                    </thead>
                    <tbody>
                    {dataFeed}
                    </tbody>
                </table>
                <video id="video" width="640" height="480"></video>
            </div>
        </>
    );
};

export default FeedClientComponent;
