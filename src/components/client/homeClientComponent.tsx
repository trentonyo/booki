'use client';

import React from "react";
import {StateModelMap} from "../../server";
import {DataSetMap} from "../../server";


interface HomeClientComponentProps {
    gameStateModels?: StateModelMap
    dataSets?: DataSetMap
}

export default function HomeClientComponent(homeInfo: HomeClientComponentProps) {
    let modelOptions: React.JSX.Element[] = [];
    if (homeInfo.gameStateModels) {
        const modelMap = homeInfo.gameStateModels;
        for (const gameStateModel in modelMap) {
            const stateModelString = JSON.stringify(modelMap[gameStateModel]);
            const encodedStateModelString = encodeURIComponent(stateModelString);
            const encodedGameString = encodeURIComponent(gameStateModel);

            modelOptions.push(
                <a
                    key={gameStateModel.substring(0, 32)}
                    className="w-full"
                    href={`/feed?game=${encodedGameString}&stateModel=${encodedStateModelString}`}
                >
                    <div
                        className="text-xl bg-blue-900 text-blue-50 rounded-md p-10"
                    >
                        {modelMap[gameStateModel].constraints.displayName}
                    </div>
                </a>)
        }
    }

    const modelList = (
        <div
            className="flex flex-col justify-center items-center gap-10 w-1/2 mx-auto"
        >
            <h2
                className="text-2xl font-semibold italic p-6 text-blue-900"
            >
                Select a game state model to start:
            </h2>
            {modelOptions}
        </div>
    )

    /////////////////////

    let dataOptions: React.JSX.Element[] = [];
    if (homeInfo.dataSets) {
        const dataMap = homeInfo.dataSets;
        for (const dataSet in dataMap) {
            const encodedDataSet = dataMap[dataSet];

            dataOptions.push(
                <a
                    key={dataSet.substring(0, 32)}
                    className="w-full"
                    href={`/data?set=${dataSet.split('.')[0]}`}
                >
                    <div
                        className="text-xl bg-black text-white rounded-md p-10"
                    >
                        {dataSet}
                    </div>
                </a>)
        }
    }
    const dataList = (
        <div
            className="flex flex-col justify-center items-center gap-10 w-1/2 mx-auto"
        >
            <h2
                className="text-2xl font-semibold italic p-6 text-black"
            >
                Validate a data set:
            </h2>
            {dataOptions}
        </div>
    )

    return (
        <div>
            <h1 className="text-4xl font-bold p-14">booki</h1>
            {modelList}
            {dataList}
        </div>
    )
}
