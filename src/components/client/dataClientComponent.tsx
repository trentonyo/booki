'use client';

import React, { useEffect, useState } from "react";
import { StateModelMap } from "../../server";
import { StateModel } from "../../scripts/processGameFrame";
import { startCamera } from "../../scripts/feed";

import DefaultGameStateView from "../../scripts/stateHandlers/default_view";
import TheFinalsRankedGameStateView from "../../scripts/stateHandlers/thefinals_ranked_view";

const DataClientComponent: React.FC = () => {
    const [dataSetName, setDataSetName] = useState<string | null>(null);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const setString = urlParams.get('set');

        if (setString) {
            const decodedString = decodeURIComponent(setString);
            try {
                setDataSetName(decodedString);
            } catch (error) {
                console.error("Failed to parse dataset", error);
            }
        }
    }, []);

    return (
        <>
            <a href="/"><h1 className="text-xl underline pl-6 pt-6 italic">🏠Return Home</h1></a>
            <h2
                className="text-3xl font-bold pt-6 pl-14  text-blue-900 italic"
            >
                Data Validation
            </h2>
            Let's see if we can validate {dataSetName}...
        </>
    );
};

export default DataClientComponent;
