export class DraggingAverage {
    private history: number[];
    private draggingHistoryLimit: number;
    private trendLimit: number;

    constructor(draggingHistoryLimit: number = 10, trendLimit: number = 5) {
        this.history = [];
        this.draggingHistoryLimit = draggingHistoryLimit;
        this.trendLimit = trendLimit;
    }

    public average(value: number): number {
        this.history.push(value);

        const recentHistory = this.history.slice(-this.draggingHistoryLimit);
        const sum = recentHistory.reduce((acc, val) => acc + val, 0);
        return recentHistory.length > 0 ? sum / recentHistory.length : 0;
    }
}

export class DraggingConsensus<T> {
    public stable: boolean = false;
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
            this.stable = true;
        }

        /// Filter noisy history
        // Team consensus
        if (this.lastStable !== undefined && this.history.length > this.lowNoiseLimit && maxFrequency < this.lowNoiseLimit) {
            console.warn("Low noise detected, returning last stable value and flushing buffer");
            this.history.length = 0;
            this.history.push(nextValue);
            this.stable = false;

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

    public flush() {
        this.history.length = 0;
    }

    public stableConsensus(nextValue: T) {
        const p = this.consensus(nextValue);
        return this.stable ? p : null;
    }
}

export class SuggestTimer {
    private stableSuggestions = 0;
    protected startedAt: number | null = null;

    constructor(protected duration: number, protected started: boolean = true, private suggestionThreshold: number = 10, private stableSuggestionMinimum: number = 1) {
        // Start the timer
        if (started) {
            this.start();
        }
    }

    public start() {
        this.started = true;
        this.startedAt = Math.round(Date.now() / 1000);
    }

    public get stable() {
        return this.stableSuggestions >= this.stableSuggestionMinimum;
    }

    public suggest(remainingSecondsSuggestion: number) {
        if (this.started && !this.stable) {
            const diff = remainingSecondsSuggestion - this.remaining!;

            // If the timer is dead on, increase stability
            if (diff === 0) {
                this.stableSuggestions++;
            }
            // Else, adjust timer to seconds
            else if (Math.abs(diff) < this.suggestionThreshold) {
                this.startedAt! += diff;
            }
        }
    }

    public get isStarted() {
        return this.started;
    }

    public get remaining() {
        // If the timer is stopped, the time remaining should be null
        if (this.startedAt! < 0) {
            return null;
        }

        return this.duration - (Math.round(Date.now() / 1000) - this.startedAt!);
    }

    public adjustStart(addend: number) {
        this.startedAt! += addend;
    }

    stop(resetStability = true) {
        this.startedAt = null;
        this.stableSuggestions = 0;
    }
}