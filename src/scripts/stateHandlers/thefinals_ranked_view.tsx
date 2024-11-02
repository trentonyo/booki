import React from "react";

export default function GameStateView(dataFeed: any) {
    return (
        <div
            id="raw_data"
            className="flex flex-col gap-4"
        >
            {/*<div id="land_mark_wrapper" className="hidden">*/}
            {/*    <table id="landmarks" className="hidden">*/}
            {/*        <thead>*/}
            {/*        <tr>*/}
            {/*            <th>landMark</th>*/}
            {/*            <th>value</th>*/}
            {/*        </tr>*/}
            {/*        </thead>*/}
            {/*        <tbody>*/}
            {/*        {dataFeed}*/}
            {/*        </tbody>*/}
            {/*    </table>*/}
            {/*</div>*/}
            <div id="team_slots">Awaiting data...</div>
            <video id="video" width="640" height="480"></video>
        </div>
    )
}
