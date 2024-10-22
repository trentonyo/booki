'use client';

import React from "react";
import {StateModelMap} from "../../server";


interface HomeClientComponentProps {
    gameStateModels?: StateModelMap
}

export default function ServerClientComponent() {

    return (
        <><a href="/"><h1>Home</h1></a>
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
)
}