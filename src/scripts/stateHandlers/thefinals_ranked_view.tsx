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
            <video className="bg-purple-700 bg-sky-500 bg-pink-600 bg-orange-600" id="video" width="640" height="480"></video>
        </div>
    )
}

export type Datum = {
    "sessionID": string,
    "gameTimer.remaining": string,
    "0": string,
    "1": string,
    "2": string,
    "3": string,
    "details": {
        "sortedTeams": [any],
        "depositsRemaining": number,
        "depositsRunning": number
    }
}

interface DataValidationFrameProps {
    datum: Datum;
    frameID: string;
}

export function DataValidationFrame(props: DataValidationFrameProps) {
    const extractColor = (text: string): string | null => {
        const match = text.match(/\(#([0-9A-Fa-f]{6})\)/);

        switch (match?.[1]) {
            case "AA41FD":
                return "bg-purple-700"
            case "02B9F1":
                return "bg-sky-500"
            case "F736C7":
                return "bg-pink-600"
            case "FD8803":
                return "bg-orange-600"
        }

        return "bg-neutral-400";
    }

    return (
        <div className="datum_frame flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="font-bold">Time Remaining:</div><label>{props.datum["gameTimer.remaining"]} <input type="checkbox" id={`${props.frameID}_gameTimer.remaining`}/></label>
                <div className={`font-bold ${extractColor(props.datum["0"])}`}>First Place:</div><label>{props.datum["0"]} <input type="checkbox" id={`${props.frameID}_0`}/></label>
                <div className={`font-bold ${extractColor(props.datum["1"])}`}>Second Place:</div><label>{props.datum["1"]} <input type="checkbox" id={`${props.frameID}_1`}/></label>
                <div className={`font-bold ${extractColor(props.datum["2"])}`}>Third Place:</div><label>{props.datum["2"]} <input type="checkbox" id={`${props.frameID}_2`}/></label>
                <div className={`font-bold ${extractColor(props.datum["3"])}`}>Fourth Place:</div><label>{props.datum["3"]} <input type="checkbox" id={`${props.frameID}_3`}/></label>
            </div>
            <label>Details <input type="checkbox" id="details" /></label>
            <details>
                <summary>Details</summary>
                <pre>{JSON.stringify(props.datum["details"], null, 2)}</pre>
            </details>
        </div>
    )
}
