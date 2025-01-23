import {ColorsAndThresholds, HandledGameState, LandMarkColorCountA, LandMarkOCR, StateModel} from "../processGameFrame";
import {colorDistance} from "../colorUtil";
import {DraggingAverage, DraggingConsensus, PredictorBayesianTimeBased, SuggestTimer} from "../stateHandlerUtil";

/**
 * Set up the page
 */
let teamSlots = document.getElementById("team_slots");

type Ranks = "first" | "second" | "third" | "fourth";
type DepositDenominations = 7000 | 10000 | 15000;
function r(rank: Ranks) {
    switch (rank) {
        case "first":
            return 0
        case "second":
            return 1
        case "third":
            return 2
        case "fourth":
            return 3
    }
}

let LOG_captureFrame = false;

const LOG_captureTimer = new SuggestTimer(15);
LOG_captureTimer.start()

const RULES = {
    depositAmounts: [7000, 10000, 15000, /* doubled up -> */ 14000, 17000, 20000, 22000, 25000, 30000],
    /*                     kill        3kills                 */
    /*                     |     cbox  |     DEPOSIT STARTED  */
    /*                     |     |     |     1st   2nd   3rd  */
    /*                     |     |     |     |     |     |    */
    accumulateCashAmounts: [500, 1000, 1500, 3000, 5000, 7000],
    teamKillPenalty: 0.9,
    lengthOfGame: 9 * 60,
    respawnTime: 28
}

const SETTINGS = {
    timerAdjustment: -1,
    rejectedCashStaleThreshold: 10
}

function commonPrefixLength(str1: string, str2: string): number {
    let i = 0;
    while (i < str1.length && i < str2.length && str1[i] === str2[i]) {
        i++;
    }
    return i;
}

/**
 * Takes "predictably wrong" values and coerces them into potentially correct values
 * @param ocrValue
 */
function correctOcrValue(ocrValue: string): string | null {
    // Simple replacements
    const replacements = [
        /8/g,
        /[45]{2,}/g
    ]

    const solutions = replacements.map(r => {
        ocrValue = ocrValue.replace(r, "+$");

        const [part1, part2] = ocrValue.split("+");

        if (!part1 || !part2) {
            return null;
        }

        const firstValue = parseInt(part1.slice(1), 10); // Remove the leading $
        const secondValue = parseInt(part2.slice(1), 10); // Remove the leading $
        const correctedSecondValue = parseDeposit(secondValue)

        return `$${firstValue}+$${correctedSecondValue}`;
    })

    let output = null;
    solutions.forEach(solution => {
        // Just takes the last solution, if applicable
        if (solution) {
            output = solution;
        }
    })

    return output;
}

function parseDeposit(potential: number) {
    const potentialStr = potential.toString();
    let output = RULES.depositAmounts[0]; // Default to first deposit amount (arbitrarily)
    let maxPrefixLength = 0;

    // Compare the leftmost digits of the deposit to valid deposits and choose that valid deposit which
    //  the potential deposit most closely matches
    for (const validDeposit of RULES.depositAmounts) {
        const currentPrefixLength = commonPrefixLength(potentialStr, validDeposit.toString());
        if (currentPrefixLength > maxPrefixLength) {
            maxPrefixLength = currentPrefixLength;
            output = validDeposit;
        }
    }

    return output;
}

class Team {
    private hasMoreThanZero = false;
    public cash: number = 0;
    protected respawnTimer: SuggestTimer | null = null;
    protected deposit: Deposit | null = null;

    private cashDraggingConsensus = new DraggingConsensus(0, 30, 5, 15);
    private rejectedCashUpdates = 0;

    public draggingCapture = new DraggingAverage();
    public mightBeDepositing = false;
    public inputCashConsensus = new DraggingConsensus(-1, 6, 2, 6);

    constructor(protected color: string, protected respawnColor: string, public name: string, public rank: Ranks) {

    }

    get toString() {
        return `${this.name} (${this.color}) $${this.cash}${this.respawnTimer && this.respawnTimer.remaining ? ` respawn ${this.respawnTimer.remaining}s` : ""}${this.deposit ? ` deposit $${this.deposit.value} ${this.deposit.remainingSeconds()}s` : ""}`
    }

    get getColor() {
        return this.color;
    }

    get getRespawnColor() {
        return this.respawnColor;
    }

    public updateCash(amount: number, force = false) {
        const validDepositAcc = RULES.depositAmounts.some(accumulationAmount => amount % accumulationAmount === 0);
        const validAccumulation = RULES.accumulateCashAmounts.some(accumulationAmount => amount % accumulationAmount === 0);
        const validAccWithReduction = RULES.accumulateCashAmounts.some(accumulationAmount => amount % (accumulationAmount * RULES.teamKillPenalty) === 0);

        const reductionOnly = this.cash * RULES.teamKillPenalty;
        const validReduction = reductionOnly === amount;

        /**
         * First layer of protection:
         *   Only accept amounts greater than zero if an "approved" amount greater than zero has come through
         *   e.g. do not allow for the team's cash to be emptied at random
         *
         *   Allow values of zero if this team has not been found to have cash yet
         *
         * Second layer of protection:
         *   Check if the amount does any of:
         *   - increases cash by a deposit amount
         *   - increases cash by a factor of common deposit amounts (RULES.accumulateCashAmounts)
         *   - increases cash by a factor of common deposit amounts AND decreases by the possible decrement rate
         *   - decreases cash by the possible decrement rate
         *
         * Third layer of protection:
         *   If SETTINGS.rejectedCashStaleThreshold "bad" amounts have been suggested, assume we have lost the plot
         *   and fall back on the dragging consensus value made up of the most recent stretch of rejected amounts.
         */
        if (
            (amount > 0 || (amount === 0 && !this.hasMoreThanZero))  // Validate nonzero update OR persisting zero in early game
            && (validDepositAcc || validAccumulation || validAccWithReduction)  // Validate incremented by valid amount
            && (amount < this.cash ? validReduction : true)  // If the amount is a reduction, validate the reduction amount (ignoring if an increment)
            || (force)
        ) {
            /**
             * If this team's cash was successfully updated by this amount, return true
             */
            if (amount > 0) {
                this.hasMoreThanZero = true;
            }
            this.setCash(amount);
            return true;

        } else {
            // Rejected cash updates introduce uncertainty to this.cash
            this.rejectedCashUpdates++;

            // Strange updates suggest a deposit
            this.mightBeDepositing = true;

            // If the current count is stale, try a stable value from the dragging consensus
            const potentialStable = this.cashDraggingConsensus.stableConsensus(amount)
            if (this.rejectedCashUpdates > SETTINGS.rejectedCashStaleThreshold) {
                if (potentialStable) {
                    console.warn(`Stale cash value possible for [${this.name}], falling back on dragging consensus with frequency ${potentialStable.frequency}`);
                    this.setCash(potentialStable.value)
                }
            }
        }

        // If the cash was not updated specifically by the amount (either not updated at all or updated by something else e.g. draggingConsensus)
        return false;
    }

    private setCash(amount: number) {
        this.cash = amount
        this.cashDraggingConsensus.flush();
        this.rejectedCashUpdates = 0;
    }

    public updateCashAndDeposit(cash: number, deposit: number, OCRCorrected = false) {
        // These corrected and extracted strings tend to be pretty accurate, and can
        // correct a stale cash value. They are a rarer occurrence that typically coincides
        // with stale cash values. For this reason, we force an update.
        this.updateCash(cash, true);

        // This deposit handling is pretty accurate, and also is the only way to detect
        // doubled-up cashouts.
        // const parsedDeposit = parseDeposit(deposit)

        DepositPoolSingleton.suggestDeposit(this.rank, this, deposit, undefined, OCRCorrected);
    }

    public assignRespawnTimer(timer: SuggestTimer) {
        this.respawnTimer = timer;
    }

    public assignDeposit(deposit: Deposit) {
        if (this.deposit) {
            console.warn("== Attempted to assign a deposit when this team already has a deposit.")
            return false;
        }
        this.deposit = deposit;
        return true;
    }

    public mergeDeposit(amount: number) {
        if (!this.deposit) {
            console.warn("== Attempted to merge a deposit when this team does not have a deposit.")
            return
        }

        this.deposit.mergeAmount(amount);
    }

    public get isDepositing() {
        return this.deposit !== null;
    }

    public get getDeposit() {
        return this.deposit;
    }

    public generateElement() {
        // Respawn timer tasks
        let respawnStr = "--";

        if (this.respawnTimer) {
            if (this.respawnTimer.isStarted) {
                if (this.respawnTimer.remaining! <= 0) {
                    this.respawnTimer.stop();
                } else if (this.respawnTimer.stable && this.respawnTimer.remaining) {
                    respawnStr = `respawn: ${this.respawnTimer.remaining.toString()}s`;
                }
            }
        }

        let depositString = "--"
        if (this.deposit && this.deposit.remainingSeconds()) {
            depositString = `deposit: ${this.deposit.remainingSeconds()}s ($${this.deposit.value})`
        }

        const element = document.createElement("div");
        element.classList.add("team");
        element.style.backgroundColor = this.color;
        element.innerHTML = `
            <div class="team-name">${this.name}</div>
            <div class="team-cash">${this.cash}</div>
            <div class="team-deposit-timer">${depositString}</div>
            <div class="team-respawn-timer">${respawnStr}</div>
        `;

        return element;
    }

    stealDepositFrom(matchingOtherTeam: Team) {
        const deposit = matchingOtherTeam.deposit

        if (!deposit) {
            console.warn("== Attempted to steal a deposit from a team that does not have a deposit.")
            return;
        }

        if (this.deposit) {
            this.deposit.mergeAmount(deposit.value);
        } else {
            this.deposit = deposit;
        }

        matchingOtherTeam.deposit = null;
    }

    removeDeposit() {
        const amount = this.deposit?.value;
        this.deposit = null;
        return amount;
    }

    bumpDepositProgress(progressBar: number) {
        if (this.deposit) {
            const newTimeRemaining = this.deposit.durationS * progressBar;
            this.deposit.adjustRemaining(newTimeRemaining);
        }
    }
}

class Deposit {
    private readonly duration: number;
    private timer: SuggestTimer;

    constructor(public value: DepositDenominations, protected gameTimeRemainingAtStart: number, controllingTeam: Team | null = null, protected progressAtStart: number = 0) {
        const t = gameTimeRemainingAtStart;

        if (t < 1) {
            this.duration = 60;
        } else if (t <= 30) {
            this.duration = 90;
        } else if (t <= 60) {
            this.duration = 120;
        } else {
            this.duration = 130;
        }

        // Having parsed the duration, we can backdate the time that was remaining when this deposit started
        //  timeRemainingAtStart will not be used much further
        this.gameTimeRemainingAtStart += Math.round(this.duration * progressAtStart)

        // We track the progress of this deposit with a timer, backdated to the supposed start of this deposit (found above)
        this.timer = new SuggestTimer(this.duration)

        const startOfGameTime = gameTimer.startedAt!;
        const startPoint = startOfGameTime + (RULES.lengthOfGame - this.gameTimeRemainingAtStart);
        this.timer.start(startPoint)
    }

    public remainingSeconds() {
        if (this.timer.remaining) {
            if( this.timer.remaining > 0) {
                return this.timer.remaining;
            } else {
                this.timer.stop();
                return null;
            }
        }

        return null;
    }

    mergeAmount(amount: number) {
        this.value += amount;
    }

    public get durationS() {
        return this.duration;
    }

    public adjustRemaining(newTimeRemaining: number) {
        this.timer.adjustStart(newTimeRemaining);
    }
}

class DepositPool {
    private remainingDeposits: number[] = [15000, 15000, 10000, 10000, 7000, 7000];

    /**
     * [deposit amount, time started (literally when popped from remaining deposits, not game time)]
     * @private
     */
    private runningDeposits: [number, number][] = []

    private sortedTeams: Team[] = [];

    public peek() {
        return this.remainingDeposits[this.remainingDeposits.length - 1];
    }

    public pop() {
        if (this.runningDeposits.length === 2) {
            console.warn("== Attempted to pop a new deposit when two are already running.")
            return undefined;
        } else {
            const delayBetweenDeposits = 500;
            if (this.depositsRunning > 0 &&
                this.runningDeposits[this.runningDeposits.length - 1][1] + delayBetweenDeposits >= Date.now()) {
                console.warn("== Attempted to pop a new deposit too soon after the previous one was popped.")
                return undefined;
            }
        }

        const last = this.remainingDeposits.pop();
        if (last) {
            this.runningDeposits.push([last, Date.now()]);
        }
        return last;
    }

    public rollback(removeFromTeam: Team | null = null) {
        let removedAmount: DepositDenominations | undefined = undefined
        if (removeFromTeam) {
            removedAmount = removeFromTeam.removeDeposit();
            
            if (removedAmount === undefined) {
                console.warn("== Attempted to rollback a deposit when the team does not have a deposit.")
                return;
            }

            // Find and remove the element from this.runningDeposits where item[0] === removedAmount
            const indexToRemove = this.runningDeposits.findIndex(item => item[0] === removedAmount);
            if (indexToRemove !== -1) {
                this.runningDeposits.splice(indexToRemove, 1);
                this.remainingDeposits.push(removedAmount);
            } else {
                console.warn("== Rolled back a deposit which did not exist in this.runningDeposits. This should not happen.")
                return;
            }
            LOG_captureFrame = true;
            console.log(`Rolled back deposit of $${removedAmount} from team ${removeFromTeam?.name}`)
        } else {
            let last = this.runningDeposits.shift();

            if (last) {
                this.remainingDeposits.push(last[0]);
            }    
        }
    }

    public get depositsRemaining() {
        return this.remainingDeposits.length;
    }

    public get depositsRunning() {
        return this.runningDeposits.length;
    }

    public suggestDeposit(rank: Ranks, team: Team, amount?: number, progressBar?: number, ocrCorrected?: boolean) {
        // If an amount was not given, we assume that there is non-numerical evidence of a deposit and will start to pop the next available
        if (amount === undefined) {
            amount = this.peek();
        }


        let uncaughtDeposit = true;

        let checkMultiple = true;
        // If this deposit matches the deposits that this team already has, then ignore/validate it
        if (team.getDeposit && amount === team.getDeposit.value) {
            checkMultiple = false;
            // Matching deposits may at some point be validated in some kind of consensus model, but as of now they are essentially ignored.
            console.log(`💰MATCHING EXISTING DEPOSIT: ${team.name} with ${amount}`)
            uncaughtDeposit = false
        }

        // If this deposit matches a deposit that ANOTHER TEAM already has, mark that deposit as
        //  having potentially been stolen by THIS team
        else {
            const otherTeams = this.sortedTeams.filter(t => t !== team);
            let matchingOtherTeam: Team | null = null;

            for (let i = 0; i < otherTeams.length; i++) {
                const otherTeam = otherTeams[i];
                if (otherTeam.getDeposit && otherTeam.getDeposit.value === amount) {  // TODO need to use more evidence rather than just taking the first one the matches value
                    matchingOtherTeam = otherTeams[i];
                    break;
                }
            }
            // If this amount matches another team's deposit
            //  AND there is not another available cashbox of this amount, then it's a steal
            if (matchingOtherTeam && !this.remainingDeposits.includes(amount)) {
                checkMultiple = false;
                console.log(`💰STOLEN FROM OTHER TEAM: ${team.name} stole  ${amount} from ${matchingOtherTeam.name}`)
                uncaughtDeposit = false
                team.stealDepositFrom(matchingOtherTeam)
                LOG_captureFrame = true;
            } else if (this.remainingDeposits.includes(amount)) {
                const toStart = this.pop();

                if (toStart) {
                    console.log(`💰NEW SIMILAR DEPOSIT OF THE AMOUNT: ${team.name} gets ${toStart}`)
                    uncaughtDeposit = false
                    const newDeposit = new Deposit(toStart! as DepositDenominations, gameTimer.remaining!, team);
                    team.assignDeposit(newDeposit);
                    LOG_captureFrame = true;
                }
            }
        }

        // If this deposit is a MULTIPLE and there is only one deposit started, start another and assign it to this team
        if (checkMultiple && this.depositsRunning === 1) {
            const startedDeposit = this.runningDeposits[0][0];
            const potentialDeposit = amount - startedDeposit;

            if (this.peek() && potentialDeposit === this.peek()) {
                if (team.getDeposit) {
                    const toMerge = this.pop();

                    if (toMerge) {
                        console.log(`💰MERGE A DEPOSIT OF THE AMOUNT: ${toMerge} for ${team.name}`)
                        uncaughtDeposit = false
                        team.mergeDeposit(toMerge!)
                        LOG_captureFrame = true;
                    }
                }
            }
        }

        // If this is a totally new deposit, add it
        if (
            this.depositsRunning < 2
            && this.peek()
            && amount === this.peek()
        ) {
            if (!team.getDeposit) {
                const toStart = this.pop();

                if (toStart) {
                    console.log(`💰NEW DEPOSIT OF THE AMOUNT: ${team.name} gets ${toStart}`)
                    uncaughtDeposit = false
                    const newDeposit = new Deposit(toStart! as DepositDenominations, gameTimer.remaining!, team);
                    team.assignDeposit(newDeposit);
                    LOG_captureFrame = true;
                }
            }
        }

        if (uncaughtDeposit) {
            const topTwoSum = this.remainingDeposits
                .slice(this.remainingDeposits.length - 2, this.remainingDeposits.length)
                .reduce((a, b) => a + b, 0);

            if (topTwoSum === amount) {
                // Check if there are two to deposit
                const first = this.pop()
                if (!first) {
                    console.warn("== Attempted to pop a new deposit when the remaining deposits array is empty.")
                    LOG_captureFrame = true;
                    return;
                }

                const second = this.pop()
                if (!second) {
                    console.warn("== Attempted to pop a new deposit when the remaining deposits array is empty.")
                    LOG_captureFrame = true;
                    this.rollback(undefined)
                    return;
                }

                const newDeposit = new Deposit(first as DepositDenominations, gameTimer.remaining!, team);
                team.assignDeposit(newDeposit);
                team.mergeDeposit(second as DepositDenominations);
                console.log(`💰NEW DOUBLE DEPOSIT OF THE AMOUNT: ${team.name} gets ${topTwoSum}`)
                LOG_captureFrame = true;
            } else {
                if (progressBar && amount) {
                    console.warn(`💰PROGRESS SUGGESTION SUGGESTION rank: ${rank} team: ${team.name} amount: ${amount} progressBar: ${progressBar}`);
                    team.bumpDepositProgress(progressBar);
                } else if (amount === (this.runningDeposits.reduce((sum, deposit) => sum + deposit[0], 0))) {
                    const otherTeams = this.sortedTeams.filter(t => t !== team);
                    const otherDeposit = this.runningDeposits[0][0] === this.runningDeposits[1][0] ? this.runningDeposits[0] : this.runningDeposits.filter(d => d[0] !== team.getDeposit!.value)[0];
                    const otherDepositAmount = otherDeposit[0]
                    let matchingOtherTeam: Team | null = null;

                    for (let i = 0; i < otherTeams.length; i++) {
                        const otherTeam = otherTeams[i];
                        if (otherTeam.getDeposit && otherTeam.getDeposit.value === otherDepositAmount) {
                            matchingOtherTeam = otherTeams[i];
                            break;
                        }
                    }

                    console.warn(`💰STOLEN DOUBLE: ${team.name} stole $${amount} from ${matchingOtherTeam!} to bring their total up to $${team.getDeposit?.value}`);
                    team.stealDepositFrom(matchingOtherTeam!);  // TODO need to use more evidence rather than just taking the first one the matches value
                    LOG_captureFrame = true;

                } else {
                    console.warn(`💰UNCAUGHT SUGGESTION rank: ${rank} team: ${team.name} amount: ${amount} progressBar: ${progressBar} ocrCorrected: ${ocrCorrected} topTwoSum: ${topTwoSum}`)
                    console.warn("remainingDeposits", this.remainingDeposits)
                    console.warn("runningDeposits", this.runningDeposits)
                    LOG_captureFrame = true;
                }
            }
        }

        /**
        - An OCR corrected string might be right (if such a deposit remains)
        - If an OCR corrected string reflects an increase from the initial deposit (~~~especially~~~ if by the amount of the next remaining cashbox)
            - IN OTHER WORDS we missed the entire deposit, so it needs to be retroactively added
        - Current method of seeing progress in the ColorCountA landmarks is not very reliable, needs to be combined with another metric
        - If a team's cash hasn't been updated in a few seconds, that is usually an indicator of a cashout in progress
         */
    }

    updateSortedTeams(sortedTeams: Team[]) {
        this.sortedTeams = sortedTeams;
    }

    public finishDeposit(completedAmount: number | undefined) {
        if (completedAmount) {
            // Pop until we've cleared all completed deposits (for doubled up deposits)
            while (completedAmount > 0) {
                const d = this.runningDeposits.pop()

                if (!d) {
                    console.error("== Attempted to finish a deposit when the running deposits array is empty.");
                    return;
                }

                completedAmount -= d[0];
            }
        } else {
            this.runningDeposits.pop()
        }
    }

    public finishAllDeposits = false;
    public markFinishAllDeposits() {
        this.finishAllDeposits = true;
    }

    public finishTeamDeposit(team: Team) {
        const teamDeposit = team.getDeposit;
        if (teamDeposit) {
            team.removeDeposit();
            this.finishDeposit(teamDeposit.value);
            LOG_captureFrame = true;
            console.log(`Finished deposit of $${teamDeposit.value} from team ${team.name}`)
        }
    }
}

const DepositPoolSingleton = new DepositPool();
export function rollbackTeamDeposit(team: Team) {
    DepositPoolSingleton.rollback(team)
}
export function finishDeposits() {
    DepositPoolSingleton.markFinishAllDeposits()
}
export function finishTeamDeposit(team: Team) {
    DepositPoolSingleton.finishTeamDeposit(team)
}

const myTeam = new Team("#02B9F1", "#76B9D1", "Our Team", "first")
const pinkTeam = new Team("#F736C7", "#DD8DC4", "Pink Team", "second")
const orangeTeam = new Team("#FD8803", "#DFAB7F", "Orange Team", "third")
const purpleTeam = new Team("#AA41FD", "#BD9CE4", "Purple Team", "fourth")

const TeamDraggingConsensus = new DraggingConsensus([] as Team[], 15, 5, 10)

const GamePredictor = new PredictorBayesianTimeBased([1, 1, 1, 1], RULES.lengthOfGame, 34792, 9691.360777)

// Increased stable suggestion minimum 2 -> 4
const RespawnTimers = [
    new SuggestTimer(RULES.respawnTime, false, 8, 4),
    new SuggestTimer(RULES.respawnTime, false, 8, 4),
    new SuggestTimer(RULES.respawnTime, false, 8, 4),
    new SuggestTimer(RULES.respawnTime, false, 8, 4)
]

function findClosestTeam(teams: Team[], referenceColor: string): { closestTeam: Team, index: number } {
    let teamToPop = 0;
    let closestDistance = 256;

    for (let i = 0; i < teams.length; i++) {
        const distanceToReference = colorDistance(referenceColor, teams[i].getColor);

        if (distanceToReference < closestDistance) {
            closestDistance = distanceToReference;
            teamToPop = i;
        }
    }
    return {closestTeam: teams[teamToPop], index: teamToPop};
}

const gameTimer = new SuggestTimer(RULES.lengthOfGame, true, 60);
let gameTimerSynchronized = false;

const overTimeConsensus = new DraggingConsensus(0, 20, 1, 6)
let overTimeApplied = false;

const teamMightBeDepositing = [
    false,
    false,
    false,
    false
]

function cashAndDeposit(str: string) {
    // Validate string
    const validateRegex = new RegExp(/^\$[0-9]+\+\$[0-9]+$/)
    if (!validateRegex.test(str)) {
        return null;
    }

    const [cashStr, depositStr] = str.split("+");

    const cash = parseInt(cashStr.substring(1), 10)
    const depositP = parseInt(depositStr.substring(1), 10)

    // Correct deposit
    const deposit = parseDeposit(depositP);

    return {cash: cash, deposit: deposit};
}

let sortedTeams: Team[] = [];
export default function handleProcessedGameState(processedGameState: StateModel): HandledGameState {
    const ranks: ["first", "second", "third", "fourth"] = ["first", "second", "third", "fourth"];
    const teams = [myTeam, pinkTeam, orangeTeam, purpleTeam];
    const colorRanks = ["color_first", "color_second", "color_third"];


    /**
     * Input handling
     */
    function teamIndex(query: string) {
        const teamNumber = query.substring(query.length - 1) as "1" | "2" | "3" | "4";
        return parseInt(teamNumber, 10) - 1;
    }

    function teamColorIndex(query: string) {
        return query.substring(query.length - 6) as string;
    }

    for (const input in processedGameState.inputs) {
        switch (input) {
            case "rollback_deposit_1":
            case "rollback_deposit_2":
            case "rollback_deposit_3":
            case "rollback_deposit_4":
                if (processedGameState.inputs[input]) {
                    const b = document.querySelector(`#${input}`)! as HTMLInputElement;
                    const team = sortedTeams[teamIndex(input)];
                    rollbackTeamDeposit(team)
                    b.checked = false;
                    LOG_captureFrame = true;
                }
                break;
            case "complete_deposit_1":
            case "complete_deposit_2":
            case "complete_deposit_3":
            case "complete_deposit_4":
                if (processedGameState.inputs[input]) {
                    const b = document.querySelector(`#${input}`)! as HTMLInputElement;
                    const team = sortedTeams[teamIndex(input)];
                    finishTeamDeposit(team);
                    b.checked = false;
                    LOG_captureFrame = true;
                }
                break;
            case "score_cash_F736C7":
            case "score_cash_FD8803":
            case "score_cash_AA41FD":
            case "score_cash_02B9F1":
                const inputCash = parseInt(processedGameState.inputs[input], 10)
                if (!isNaN(inputCash) && inputCash !== -1) {
                    // Track this input through a consensus, just an easy way to make sure we don't take the value until the user is done typing
                    const thisColor = teamColorIndex(input)
                    const team = sortedTeams.find(t => t.getColor === `#${thisColor}`)!;
                    const thisConsensus = team.inputCashConsensus.certain(inputCash);

                    if (thisConsensus !== -1 && thisConsensus !== null) {
                        const b = document.querySelector(`#${input}`)! as HTMLInputElement;

                        team.updateCash(thisConsensus, true);
                        console.log(`Updated cash of team ${team.name} to ${thisConsensus}`)

                        b.value = "-1";
                        LOG_captureFrame = true;
                    }
                }
                break;
            case "add_overtime":
                const b = document.querySelector("#add_overtime")! as HTMLInputElement;
                if (overTimeApplied || (gameTimer.remaining && gameTimer.remaining > 100)) {
                    // If overtime has already been applied or there's still lots of time left in the game, hide the button
                    b.parentElement!.style.display = "none";
                } else {
                    // If there hasn't been overtime added, and it's nearing the end of the round, show the button
                    b.parentElement!.style.display = "inline";
                }

                if (processedGameState.inputs[input]) {
                    gameTimer.adjustStart(60);
                    overTimeApplied = true;
                    b.checked = false;
                    LOG_captureFrame = true;
                }
                break;
        }
    }

    /**
     * Sort out the ranks of the teams, update teamMightBeDepositing list
     */
    let remainingTeams = teams;

    colorRanks.forEach(rank => {
        const referenceColor = processedGameState.gameState.find(landmark => landmark.name === rank)!.VALUE! as string;

        const {closestTeam, index} = findClosestTeam(remainingTeams, referenceColor);
        sortedTeams.push(closestTeam);

        try {
            remainingTeams = [...remainingTeams.slice(0, index), ...remainingTeams.slice(index + 1)];
        } catch (e) {
            console.error(e);
        }

    });
    sortedTeams.push(remainingTeams[0]);

    // sortedTeams rolls over from the last call, this keeps it down to only four records (four teams)
    if (sortedTeams.length > 4) {
        sortedTeams = sortedTeams.slice(sortedTeams.length - 4);
    }

    const consensusTeams = TeamDraggingConsensus.consensus(sortedTeams)
    const c = consensusTeams.value || sortedTeams

    for (let i = 0; i < c.length; i++) {
        const team = c[i];

        switch (i) {
            case 0:
                team.rank = "first";
                break;
            case 1:
                team.rank = "second";
                break;
            case 2:
                team.rank = "third";
                break;
            case 3:
                team.rank = "fourth";
                break;
        }

        teamMightBeDepositing[i] = team.mightBeDepositing;
    }
    DepositPoolSingleton.updateSortedTeams(sortedTeams);

    /**
     * Track team respawns
     */
    ranks.forEach((rank, index) => {
        const respawnLandmark = processedGameState.gameState.find(landmark => landmark.name === `respawn_${rank}`)! as LandMarkOCR;

        const respawnTimer = RespawnTimers[index];
        const respawn = parseInt(respawnLandmark.VALUE!, 10);

        if (respawn > 0) {
            // if (!respawnTimer.isStarted) {
            //     respawnTimer.start();
            // }

            respawnTimer.suggest(respawn)

            if (respawnTimer.stable) {
                const currentRankTeam = sortedTeams[index];
                currentRankTeam.assignRespawnTimer(respawnTimer)
            }
        }
    })

    /************************************
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     * DEPOSIT LOGIC
     *
    * Track the current deposits
     *
     *
     */
    const numTeamsDepositing = sortedTeams.filter(team => team.isDepositing).length;

    ranks.forEach(rank => {
        try {
            /**
             * Collect this team
             */
            let index: number;
            switch (rank) {
                case "first":
                    index = 0;
                    break;
                case "second":
                    index = 1;
                    break;
                case "third":
                    index = 2;
                    break;
                case "fourth":
                    index = 3;
                    break;
            }
            const thisTeam = sortedTeams[index!];
            let teamDraggingAverageForCapture: DraggingAverage = thisTeam.draggingCapture;

            /**
             * Collect the ColorCountA landmarks (there are three) for this team
             */
            let progress = 0;
            let remaining = 0;

            for (let i = 1; i <= 3; i++) {
                const progressLandmark = processedGameState.gameState.find(landmark => landmark.name === `captureProgress${i}_${rank}`)! as LandMarkColorCountA;

                const response = JSON.parse(progressLandmark.VALUE!) as ColorsAndThresholds;

                progress += response["#CEC821"]
                remaining += response["#877E0A"]
            }

            const percent = ((progress / (progress + remaining)) * 100);
            let filteredPercent;

            // The sum is for filtering out noisy yellow backgrounds, i.e. there aren't very many "hits" so the reading is not useful
            if (progress + remaining > 5 && !isNaN(percent)) {
                // Filtering out ~100% reads, they seem to be noise
                filteredPercent = teamDraggingAverageForCapture!.average(percent >= 99 ? 0 : percent);
            } else {
                filteredPercent = teamDraggingAverageForCapture!.average(0);
            }

            /**
             * SUSS OUT DEPOSITS
             *
             * If it's probable that the team in this position is capturing and there is significant evidence of a capture in progress
             */
            if (
                !thisTeam.isDepositing
                && numTeamsDepositing < 2
                && (filteredPercent >= 10 && thisTeam.mightBeDepositing)
            ) {
                // Get the value of the next available deposit
                const denomination = DepositPoolSingleton.peek()

                if (denomination) {
                    // Since the dragging average tends to be lower than the true value, we adjust it here
                    const progress = (filteredPercent) / 100;
                    DepositPoolSingleton.suggestDeposit(rank, thisTeam, denomination, progress);
                    // const newDeposit = new Deposit(denomination as DepositDenominations, gameTimer.remaining!, thisTeam, progress);
                    //
                    // console.log(`Started a deposit of ${denomination} for ${thisTeam.name} with ${gameTimer.remaining!}s remaining in the game! (a = ${progress}, ${numTeamsDepositing} teams depositing)`)

                    thisTeam.mightBeDepositing = false;
                    // thisTeam.assignDeposit(newDeposit);
                } else {
                    console.error("No denomination left to make a deposit with!")
                }
            }

            /// Update Team logic, OR finish all deposits
            if ((thisTeam.getDeposit &&
                !thisTeam.getDeposit.remainingSeconds()
            ) || (DepositPoolSingleton.finishAllDeposits)) {
                DepositPoolSingleton.finishTeamDeposit(thisTeam);
            }

            // if (DepositPoolSingleton.finishAllDeposits && DepositPoolSingleton.depositsRunning === 0) {
            //     DepositPoolSingleton.finishAllDeposits = false;
            //     console.log("Finished all deposits")
            // }

        } catch (e) {
        }

    })

    // If all two deposits are accounted for, then no other team might be depositing
    // TODO try removing this, it should not be necessary once DepositPool is finished
    if (numTeamsDepositing === 2) {
        sortedTeams.forEach(team => {
            team.mightBeDepositing = false;
        })
    }

    /***********************************
     * END DEPOSIT LOGIC
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     */

    /**
     * Track the game timer
     */
    const gameTimeRemainingLandmark = processedGameState.gameState.find(landmark => landmark.name === "game_timeRemaining") as LandMarkOCR;

    if (gameTimeRemainingLandmark!.VALUE) {
        if (!gameTimerSynchronized) {
            const [minS, secS] = gameTimeRemainingLandmark!.VALUE.split(":", 2);
            const minutes = parseInt(minS, 10);
            const seconds = parseInt(secS, 10);
            const totalSeconds = minutes * 60 + seconds;
            const remainingTime = totalSeconds > RULES.lengthOfGame ? RULES.lengthOfGame : totalSeconds;

            // Use TimerSuggest
            gameTimer.suggest(remainingTime)
        } else if (!overTimeApplied) {
            const overTimeStrings = gameTimeRemainingLandmark!.VALUE.split("+", 2);

            if (overTimeStrings.length === 2) {
                const [minS, secS] = overTimeStrings[1].split(":", 2);
                const minutes = parseInt(minS, 10);
                const seconds = parseInt(secS, 10);
                const overTimeSeconds = minutes * 60 + seconds;

                const addendOverTime = overTimeConsensus.stableConsensus(overTimeSeconds)

                if (addendOverTime) {
                    console.log(`Detected overtime, adding ${addendOverTime.value}s`)
                    overTimeApplied = true;
                    gameTimer.adjustStart(addendOverTime.value);
                }
            }
        }
    }

    if (gameTimer.stable) {
        if (!gameTimerSynchronized) {
            gameTimerSynchronized = true;
            gameTimer.adjustStart(SETTINGS.timerAdjustment)
            console.log("Game Time synchronized")
        }

        const remainingMinutes = Math.floor(gameTimer.remaining! / 60);
        const remainingSeconds = gameTimer.remaining! % 60;
        document.getElementById("game_timer")!.innerText = `${remainingMinutes}:${remainingSeconds.toFixed(0).padStart(2, "0")}`;
    }

    /**
     * Track teams' cash
     */
    ranks.forEach((rank, index) => {
        const landmarkName = `score_${rank}Cash`;
        const cashLandMark = processedGameState.gameState.find(landmark => landmark.name === landmarkName) as LandMarkOCR;

        if (cashLandMark.VALUE) {
            // Value includes a deposit
            if (cashLandMark.VALUE.includes("+")) {
                const extracted = cashAndDeposit(cashLandMark.VALUE)
                if (extracted) {
                    // console.warn(`Detected deposit of ${extracted?.deposit} for ${rank.padStart(10, " ")} with ${extracted?.cash} cash [${cashLandMark.VALUE}]`)
                    sortedTeams[index].updateCashAndDeposit(extracted.cash, extracted.deposit);
                }
            }
            // Value is cash only MAY BE A CORRECTABLE OCR VALUE
            else if (cashLandMark.VALUE.includes("$")) {
                const nominal = cashLandMark.VALUE.substring(1);
                let cash = parseInt(nominal, 10);

                let success = false;
                if (!isNaN(cash) && cash >= 0) {
                    success = sortedTeams[index].updateCash(cash);
                }

                if (!success) {
                    const potential = correctOcrValue(cashLandMark.VALUE);

                    if (potential) {
                        const extracted = cashAndDeposit(potential);

                        if (extracted) {
                            // console.log(`Corrected and extracted CASH: ${extracted.cash} | DEPOSIT: ${extracted.deposit} (${potential})`);
                            sortedTeams[index].updateCashAndDeposit(extracted.cash, extracted.deposit, true);
                        }
                    }

                }
            } else {
                console.error(`Unrecognized value for ${landmarkName}: ${cashLandMark.VALUE}`)
            }
        }
    })

    /**
     * Update readout
     */
    if (teamSlots) {
        teamSlots.innerHTML = ""

        for (let i = 0; i < sortedTeams.length; i++) {
            const team = sortedTeams[i];
            const teamHTML = team.generateElement()

            teamSlots.appendChild(teamHTML);
        }
    } else {
        console.warn("'#team_slots' not found, looking again")
        teamSlots = document.getElementById("team_slots");
    }

    // Predictor readout
    const consistentTeams = [
        myTeam.cash != 0 ? myTeam.cash : 1,
        orangeTeam.cash != 0 ? orangeTeam.cash : 1,
        pinkTeam.cash != 0 ? pinkTeam.cash : 1,
        purpleTeam.cash != 0 ? purpleTeam.cash : 1
    ]
    const newPriors = GamePredictor.calculateNewPriors(consistentTeams, gameTimer.remaining!);
    // TODO need to prevent zeroes from leeching in
    console.log(newPriors)

    if (!LOG_captureTimer.remaining || LOG_captureTimer.remaining <= 0) {
        LOG_captureFrame = true;
        LOG_captureTimer.stop();
        LOG_captureTimer.start();
    }

    if (LOG_captureFrame) {
        LOG_captureFrame = false
        return {
            "sessionID": processedGameState.sessionID!,
            "gameTimer.remaining": `${Math.floor(gameTimer.remaining! / 60)}:${(gameTimer.remaining! % 60).toFixed(0).padStart(2, "0")} (${gameTimer.remaining}s)`,
            ...sortedTeams.map(team => team.toString),
            "details": {
                "sortedTeams": sortedTeams,
                "depositsRemaining": DepositPoolSingleton.depositsRemaining,
                "depositsRunning": DepositPoolSingleton.depositsRunning
            }
        };
    }

    return null;
}
