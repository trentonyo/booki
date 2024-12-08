import React, { useEffect, useState } from "react";

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
            {fetchedData ? <div>{fetchedData}</div> : <div>No data found.</div>}
        </div>
    );
};

export default DataClientComponent;
