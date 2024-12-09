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
    public startedAt: number | null = null;
    private stoppedSuggestions: number[] = [];

    constructor(protected duration: number, protected started: boolean = true, private suggestionThreshold: number = 10, private stableSuggestionMinimum: number = 1) {
        // Start the timer
        if (started) {
            this.start();
        }
    }

    public start(startedAt: number | null = null) {
        this.started = true;
        this.startedAt = startedAt ? startedAt : Math.round(Date.now() / 1000);
    }

    public stop(resetStability = true) {
        this.started = false;
        this.startedAt = null;

        if (resetStability) {
            this.stableSuggestions = 0;
        }
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
        } else if (!this.started) {
            this.stoppedSuggestions.push(remainingSecondsSuggestion);
            
            if (this.stoppedSuggestions.length >= this.stableSuggestionMinimum) {
                if (this.stoppedSuggestions.every((val, i, arr) => !i || val < arr[i - 1])) {
                    this.start();
                    this.stoppedSuggestions.length = 0;
                } else {
                    this.stoppedSuggestions.pop()
                }
            }
        }
    }

    public get isStarted() {
        return this.started;
    }

    public get remaining() {
        // If the timer is stopped, the time remaining should be null
        if (this.startedAt! < 0 || !this.isStarted) {
            return null;
        }

        return this.duration - (Math.round(Date.now() / 1000) - this.startedAt!);
    }

    public adjustStart(addend: number) {
        this.startedAt! += addend;
    }

}

export class PredictorBayesianTimeBased {
    private readonly numberOfTeams: number;
    private prior: number[];

    constructor(teamAdvantages: number[], protected readonly gameDuration: number, private scoringRateMean: number, private scoringRateStd: number) {
        this.prior = normalizeArray(teamAdvantages);
        this.numberOfTeams = teamAdvantages.length;
    }

    private calculateTimeRemainingFactor(currentTime: number): number {
        /**
         * Calculate the impact of remaining time on win probability
         * Returns a factor that increases certainty as time decreases
         */
        const timeRemaining = this.gameDuration - currentTime;
        return 1 + Math.pow(1 - timeRemaining / this.gameDuration, 2);
    }

    private calculateScoreLikelihood(scores: number[], currentTime: number): number[] {
        /**
         * Calculate likelihood of current scores given team strength
         * Uses a normal distribution based on expected scoring rates
         */
        const expectedScores = this.scoringRateMean * currentTime;

        return scores.map(() => {
            // Approximate normal distribution PDF
            const x = (expectedScores - expectedScores) / (this.scoringRateStd * currentTime);
            return Math.exp(-0.5 * x * x) / (this.scoringRateStd * currentTime * Math.sqrt(2 * Math.PI));
        });
    }

    private updatePriors(newPriors: number[]): void {
        /**
         * Update prior probabilities based on new information
         */
        if (newPriors.length !== this.numberOfTeams) {
            throw new Error(`New priors must contain exactly ${this.numberOfTeams} values`);
        }
        this.prior = [...newPriors];
    }

    private calculateWinProbabilities(
        scores: number[],
        currentTime: number,
        momentumFactors?: number[]
    ): number[] {
        /**
         * Calculate win probabilities for each team given current game state
         */

            // Calculate score-based likelihoods
        let scoreLikelihoods = this.calculateScoreLikelihood(scores, currentTime);

        // Apply momentum factors if provided
        if (momentumFactors) {
            scoreLikelihoods = scoreLikelihoods.map((likelihood, i) =>
                likelihood * momentumFactors[i]
            );
        }

        // Calculate time remaining impact
        const timeFactor = this.calculateTimeRemainingFactor(currentTime);

        // Calculate current score advantages
        const meanScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        const scoreAdvantages = scores.map(score =>
            Math.exp((score - meanScore) * timeFactor * 0.1)
        );

        // Combine all factors using Bayes' theorem
        const posteriorNominal = this.prior.map((prior, i) =>
            prior * scoreLikelihoods[i] * scoreAdvantages[i]
        );

        // Normalize to get probabilities
        return normalizeArray(posteriorNominal);
    }

    public calculateNewPriors(
        scores: number[],
        currentTime: number,
        momentumFactors?: number[]
    ): number[] {
        const newPrior = this.calculateWinProbabilities(scores, currentTime, momentumFactors);
        this.updatePriors(newPrior);
        return newPrior;
    }
}

// Utility function to normalize an array of numbers
export function normalizeArray(arr: number[], method: ("linear" | "sigmoid") = "linear"): number[] {
    const min = Math.min(...arr);
    const max = Math.max(...arr);

    if (method === "linear") {
        return arr.map(value => (value - min) / (max - min));
    } else if (method === "sigmoid") {
        return arr.map(value => 1 / (1 + Math.exp(-value)));
    } else {
        throw new Error(`Unknown normalization method: ${method}`);
    }
}
