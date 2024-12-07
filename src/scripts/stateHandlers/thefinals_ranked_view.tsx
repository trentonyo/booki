import React from "react";

export default function GameStateView(dataFeed: any) {
    return (
        <div
            id="raw_data"
            className="flex flex-col gap-4"
        >
            <form id="controls">
                <label>Rollback Last Deposit<input type="checkbox" id="rollback_deposit"></input></label>
                <label>Team 1 Cash<input type="number" id="team1_cash"></input></label>
            </form>
            <div id="game_timer">-:--</div>
            <div id="team_slots">Awaiting data...</div>
            <video id="video" width="640" height="480"></video>
        </div>
    )
}
