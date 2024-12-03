import React from "react";

export default function GameStateView(dataFeed: any) {
    return (
        <div
            id="raw_data"
            className="flex flex-col gap-4"
        >
            <div id="game_timer">-:--</div>
            <div id="team_slots">Awaiting data...</div>
            <video id="video" width="640" height="480"></video>
        </div>
    )
}
