'use client';

import React, { useEffect, useState } from "react";
import { StateModelMap } from "../../server";
import {StateModel} from "../../ocr";

interface FeedClientComponentProps {
    gameStateModel?: StateModelMap;
}

const FeedClientComponent: React.FC<FeedClientComponentProps> = () => {
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

    if (!gameStateModel) {
        console.error("No gameStateModel provided");
        return <>Waiting for valid game state model...</>;
    }

    return (
        <>
            {/*<script defer>*/}
            {/*    feed.startCamera({gameStateModel.constraints.width}, {gameStateModel.constraints.height}, {gameStateModel.constraints.refreshEvery});*/}
            {/*</script>*/}
            <a href="/"><h1>Home</h1></a>
            <h2>{gameStateModel.constraints.displayName}</h2>
            <video id="video" width="640" height="480"></video>
            <div>Game time: <span id="game-time"></span></div>
            <table>
                <thead>
                <tr>
                    <th>Position</th>
                    <th>Cash</th>
                </tr>
                </thead>
                <tbody>
                <tr>
                    <td>First</td>
                    <td id="first-place"></td>
                </tr>
                <tr>
                    <td>Second</td>
                    <td id="second-place"></td>
                </tr>
                <tr>
                    <td>Third</td>
                    <td id="third-place"></td>
                </tr>
                <tr>
                    <td>Fourth</td>
                    <td id="fourth-place"></td>
                </tr>
                </tbody>
            </table>
        </>
    );
};

export default FeedClientComponent;
