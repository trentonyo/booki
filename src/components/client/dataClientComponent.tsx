import React, {useEffect, useState} from "react";
import {DataValidationFrame, Datum} from "../../scripts/stateHandlers/thefinals_ranked_view";

interface DataSetFrameProps {
    rawData: string;
}

const DataSetFrame: React.FC<DataSetFrameProps> = ({rawData}) => {
    const dataLines = rawData.split("\n");

    return (
        <form onSubmit={(e) => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            const formData = new FormData(form);
            const numberOfInputs = form.querySelectorAll('input').length;
            const formEntries = formData.entries();
            let checked = 0;
            for (const _ of formEntries) {
                checked++;
            }

            const checkedPercent = numberOfInputs > 0 ? `${(checked / numberOfInputs * 100).toFixed(2)}%` : '--';

            console.log(`(${checkedPercent} accuracy) Submitted ${checked} of ${numberOfInputs} inputs`);
        }}>
            <label htmlFor="dataSetName">Data Set Name:</label>
            <div className="flex flex-col gap-4">
                {dataLines.map((line, index) => {
                    return <div key={index}><DatumFrame datum={line}/></div>
                })}
            </div>
            <input type="submit" value="Submit"/>
        </form>
    );
}

interface DatumFrameProps {
    datum: string;
}

const DatumFrame: React.FC<DatumFrameProps> = ({datum}) => {
    let [imageURI, gameState] = datum.split("\\", 2)
    imageURI = `api/data/${imageURI}.png`
    const parsedGameState = gameState ? JSON.parse(decodeURIComponent(gameState)) : undefined

    return parsedGameState === undefined ? null : (
        <div className="flex flex-col gap-4 h-full">
            <img src={imageURI} alt={imageURI} className="h-2/3"/>
            <DataValidationFrame frameID={imageURI} datum={parsedGameState as Datum} />
        </div>
    )
}

const DataClientComponent: React.FC = () => {
    const [dataSetName, setDataSetName] = useState<string | null>(null);
    const [fetchedData, setFetchedData] = useState<any>(null);

    // First effect to set the dataSetName
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const setString = urlParams.get('set');

        if (setString) {
            try {
                setDataSetName(decodeURIComponent(setString));
            } catch (error) {
                console.error("Failed to parse dataset", error);
            }
        }
    }, []);

    // Second effect that depends on dataSetName
    useEffect(() => {
        if (dataSetName) {
            fetch(`api/data/${dataSetName}.txt`)
                .then(response => response.text())
                .then(data => {
                    setFetchedData(data);
                })
                .catch(error => {
                    console.error("Failed to fetch data:", error);
                });
        }
    }, [dataSetName]); // Dependency on dataSetName

    return (
        <div>
            <h1>Data Validation</h1>
            {fetchedData ? <div>Data fetched successfully.</div> : <div>Loading data...</div>}
            {fetchedData ? <DataSetFrame rawData={fetchedData}/> : <div>No data found.</div>}
        </div>
    );
};

export default DataClientComponent;
