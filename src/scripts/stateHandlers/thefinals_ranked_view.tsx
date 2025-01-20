import React from "react";

export default function GameStateView(dataFeed: any) {
    return (
        <div
            id="raw_data"
            className="flex flex-col gap-4"
        >
            <div id="game_timer">-:--</div>
            <form id="controls"  className="grid grid-cols-2 gap-4">
                {/*global controls*/}
                <div className="col-span-2 gap-4">
                    <label style={{display: "none"}} className="pill-checkbox">Add Overtime (60s)<input type="checkbox"
                                                                                                        id="add_overtime"></input></label>
                    <label className="pill-checkbox" style={{backgroundColor: "#F736C7"}}>Set Pink's Cash<input
                        type="number"
                        id="score_cash_F736C7" defaultValue={-1}></input></label>

                    <label className="pill-checkbox" style={{backgroundColor: "#FD8803"}}>Set Orange's Cash<input
                        type="number"
                        id="score_cash_FD8803" defaultValue={-1}></input></label>

                    <label className="pill-checkbox" style={{backgroundColor: "#AA41FD"}}>Set Purple's Cash<input
                        type="number"
                        id="score_cash_AA41FD" defaultValue={-1}></input></label>

                    <label className="pill-checkbox" style={{backgroundColor: "#02B9F1"}}>Set Our Cash<input
                        type="number"
                        id="score_cash_02B9F1" defaultValue={-1}></input></label>
                </div>

                {/*team_slots is populated by the stateHandler script*/}
                <div id="team_slots" className="w-1/3">Awaiting data...</div>

                {/*controls is driven by the stateHandler script*/}
                <div className="flex flex-col justify-around w-full">

                    <div className="flex row gap-2">
                        <label className="pill-checkbox" style={{backgroundColor: "#d67d7d"}}>Rollback #1 Deposit<input
                            type="checkbox"
                            id="rollback_deposit_1"></input></label>
                        <label className="pill-checkbox" style={{backgroundColor: "#7dd67f"}}>Complete #1 Deposit<input
                            type="checkbox"
                            id="complete_deposit_1"></input></label>
                    </div>
                    <div className="flex row gap-2">
                        <label className="pill-checkbox" style={{backgroundColor: "#d67d7d"}}>Rollback #2 Deposit<input
                            type="checkbox"
                            id="rollback_deposit_2"></input></label>
                        <label className="pill-checkbox" style={{backgroundColor: "#7dd67f"}}>Complete #2 Deposit<input
                            type="checkbox"
                            id="complete_deposit_2"></input></label>
                    </div>
                    <div className="flex row gap-2">
                        <label className="pill-checkbox" style={{backgroundColor: "#d67d7d"}}>Rollback #3 Deposit<input
                            type="checkbox"
                            id="rollback_deposit_3"></input></label>
                        <label className="pill-checkbox" style={{backgroundColor: "#7dd67f"}}>Complete #3 Deposit<input
                            type="checkbox"
                            id="complete_deposit_3"></input></label>
                    </div>
                    <div className="flex row gap-2">
                        <label className="pill-checkbox" style={{backgroundColor: "#d67d7d"}}>Rollback #4 Deposit<input
                            type="checkbox"
                            id="rollback_deposit_4"></input></label>
                        <label className="pill-checkbox" style={{backgroundColor: "#7dd67f"}}>Complete #4 Deposit<input
                            type="checkbox"
                            id="complete_deposit_4"></input></label>
                    </div>
                </div>
            </form>
            <video className="bg-sky-500" id="video" width="640" height="480"></video>
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
                <div className="font-bold">Time Remaining:</div><label>{props.datum["gameTimer.remaining"]} <input type="checkbox" name={`${props.frameID}_gameTimer.remaining`}/></label>
                <div className={`font-bold ${extractColor(props.datum["0"])}`}>First Place:</div><label>{props.datum["0"]} <input type="checkbox" name={`${props.frameID}_0`}/></label>
                <div className={`font-bold ${extractColor(props.datum["1"])}`}>Second Place:</div><label>{props.datum["1"]} <input type="checkbox" name={`${props.frameID}_1`}/></label>
                <div className={`font-bold ${extractColor(props.datum["2"])}`}>Third Place:</div><label>{props.datum["2"]} <input type="checkbox" name={`${props.frameID}_2`}/></label>
                <div className={`font-bold ${extractColor(props.datum["3"])}`}>Fourth Place:</div><label>{props.datum["3"]} <input type="checkbox" name={`${props.frameID}_3`}/></label>
            </div>
            {/*<label>Details <input type="checkbox" defaultChecked={true} name={`${props.frameID}_details`} /></label>*/}
            <details>
                <summary>Details</summary>
                <pre>{JSON.stringify(props.datum["details"], null, 2)}</pre>
            </details>
        </div>
    )
}
