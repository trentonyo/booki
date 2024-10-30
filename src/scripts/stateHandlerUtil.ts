
export class DraggingAverage {

}

export class DraggingConsensus<T> {
    public lastStable: T;
    private history: T[];

    private historyLimit: number;
    private lowNoiseLimit: number;
    private highStabilityLimit: number;

    constructor(firstStable: T, historyLimit: number = 15, lowNoiseLimit: number = 5, highStabilityLimit: number = 10)
    {
        this.lastStable = firstStable;
        this.history = [firstStable];

        this.historyLimit = historyLimit;
        this.lowNoiseLimit = lowNoiseLimit;
        this.highStabilityLimit = highStabilityLimit;
    }

    public consensus(nextValue: T) {
        // Keep the rolling history
        this.history.push(nextValue)

        if (this.history.length > this.historyLimit) {
            this.history.shift();
        }

        // Calculate the mode
        const frequency = new Map<string, number>();

        this.history.forEach((value) => {
            const hashed = JSON.stringify(value);

            frequency.set(hashed, (frequency.get(hashed) || 0) + 1)
        });

        let mode: T | null = null;
        let maxFrequency = 0;
        for (const [value, count] of frequency) {
            if (count > maxFrequency) {
                maxFrequency = count;
                mode = JSON.parse(value) as T;
            }
        }

        /// Update stable consensus
        if (maxFrequency > this.highStabilityLimit) {
            this.lastStable = mode as T;
        }

        /// Filter noisy history
        // Team consensus
        if (this.lastStable !== undefined && this.history.length > this.lowNoiseLimit && maxFrequency < this.lowNoiseLimit) {
            console.warn("Low noise detected, returning last stable value and flushing buffer");
            this.history.length = 0;
            this.history.push(nextValue);

            // Team consensus
            return {
                value: this.lastStable as T,
                frequency: maxFrequency
            }
        }

        let output = {
            value: nextValue,
            frequency: -1
        }

        if (mode) {
            output = {
                value: mode,
                frequency: maxFrequency
            }
        }
        return output;
    }
}
