import React from "react";

export default function GameStateView(dataFeed: any) {
    return (
        <div
            id="raw_data"
            className="flex gap-4"
        >
            <table id="landmarks">
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
    )
}
