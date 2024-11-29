import {ColorsAndThresholds, LandMarkColor, LandMarkColorCountA, LandMarkOCR, StateModel} from "../processGameFrame";
import {colorDistance} from "../colorUtil";
import {DraggingAverage, DraggingConsensus, SuggestTimer} from "../stateHandlerUtil";
import Color from "colorjs.io";
import set = Color.set;

/**
 * Set up the page
 */
let teamSlots = document.getElementById("team_slots");

type Ranks = "first" | "second" | "third" | "fourth";
type DepositDenominations = 7000 | 10000 | 15000;
let remainingDepositAmounts = [15000, 15000, 10000, 10000, 7000, 7000]

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
        // Just takes the last solution, if applicable TODO might choose more intelligently
        if (solution) {
            output = solution;
        }
    })

    return output;
}

function parseDeposit(potential: number) {
    const potentialStr = potential.toString();
    let output = RULES.depositAmounts[0]; // Default to first deposit amount arbitrarily
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

    public mightBeDepositing = false;

    constructor(protected color: string, protected respawnColor: string, public name: string, public rank: Ranks) {

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
            if (amount > 1.2 * this.cash) {
                // console.warn(`Significant increase: ${amount} (${validDepositAcc}, ${validReduction}, ${validAccumulation}, ${validAccWithReduction})`) // TODO Debug
            }

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

            // TODO I don't understand how this is useful, it seems like it defeats the purpose
            // if (amount <= 0)  {
            //     this.hasMoreThanZero = false;
            // }

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

    public updateCashAndDeposit(cash: number, deposit: number) {
        // These corrected and extracted strings tend to be pretty accurate, and can
        // correct a stale cash value. They are a rarer occurrence that typically coincides
        // with stale cash values. For this reason, we force an update.
        this.updateCash(cash, true);

        // This deposit handling is pretty accurate, and also is the only way to detect
        // doubled-up cashouts.
        const parsedDeposit = parseDeposit(deposit)

        // If this deposit matches the deposits that this team already has, then continue

        // If this deposit matches a deposit that ANOTHER TEAM already has, mark that deposit as
        //  having potentially been stolen by THIS team

        // If this deposit is a MULTIPLE and there is only one deposit started, start another and assign it to this team

        // If this deposit is invalid, ignore
        //  - a denomination that is invalid
        //  - a denomination that has no remaining instances left
    }

    public assignRespawnTimer(timer: SuggestTimer) {
        this.respawnTimer = timer;
    }

    public assignDeposit(deposit: Deposit) {
        this.deposit = deposit;
    }

    public get isDepositing() {
        return this.deposit !== null;
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

        const element = document.createElement("div");
        element.classList.add("team");
        element.style.backgroundColor = this.color;
        element.innerHTML = `
            <div class="team-name">${this.name}</div>
            <div class="team-cash">${this.cash}</div>
            <div class="team-deposit-timer">${(this.deposit && this.deposit.remainingSeconds()) ? `deposit: ${this.deposit.remainingSeconds()}s` : "--"}</div>
            <div class="team-respawn-timer">${respawnStr}</div>
        `;

        return element;
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
}

const myTeam = new Team("#02B9F1", "#76B9D1", "Our Team", "first")
const pinkTeam = new Team("#F736C7", "#DD8DC4", "Pink Team", "second")
const orangeTeam = new Team("#FD8803", "#DFAB7F", "Orange Team", "third")
const purpleTeam = new Team("#AA41FD", "#BD9CE4", "Purple Team", "fourth")

const TeamDraggingConsensus = new DraggingConsensus([] as Team[], 15, 5, 10)

const tmp_FirstDraggingCapture = new DraggingAverage();
const tmp_SecondDraggingCapture = new DraggingAverage();
const tmp_ThirdDraggingCapture = new DraggingAverage();
const tmp_FourthDraggingCapture = new DraggingAverage();

const RespawnTimers = [
    new SuggestTimer(RULES.respawnTime, false, 8, 2),
    new SuggestTimer(RULES.respawnTime, false, 8, 2),
    new SuggestTimer(RULES.respawnTime, false, 8, 2),
    new SuggestTimer(RULES.respawnTime, false, 8, 2)
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

export default function handleProcessedGameState(processedGameState: StateModel) {
    const ranks = ["first", "second", "third", "fourth"];
    const teams = [myTeam, pinkTeam, orangeTeam, purpleTeam];
    const sortedTeams: Team[] = [];
    const colorRanks = ["color_first", "color_second", "color_third"];

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

    /**
     * Track team respawns
     */
    ranks.forEach((rank, index) => {
        const respawnLandmark = processedGameState.gameState.find(landmark => landmark.name === `respawn_${rank}`)! as LandMarkOCR;

        const respawnTimer = RespawnTimers[index];
        const respawn = parseInt(respawnLandmark.VALUE!, 10);

        if (respawn > 0) {
            if (!respawnTimer.isStarted) {
                respawnTimer.start();
            }

            respawnTimer.suggest(respawn)

            if (respawnTimer.stable) {
                const currentRankTeam = sortedTeams[index];
                currentRankTeam.assignRespawnTimer(respawnTimer)
            }
        }
    })

    /**
     * Track the current deposits
     */
    const numTeamsDepositing = sortedTeams.filter(team => team.isDepositing).length;

    ranks.forEach(rank => {
        try {
            let progress = 0;
            let remaining = 0;

            for (let i = 1; i <= 3; i++) {
                const progressLandmark = processedGameState.gameState.find(landmark => landmark.name === `captureProgress${i}_${rank}`)! as LandMarkColorCountA;

                const response = JSON.parse(progressLandmark.VALUE!) as ColorsAndThresholds;

                progress += response["#CEC821"]
                remaining += response["#877E0A"]
            }

            let tmpDA: DraggingAverage;
            let index: number;
            switch (rank) {
                case "first":
                    tmpDA = tmp_FirstDraggingCapture;
                    index = 0;
                    break;
                case "second":
                    tmpDA = tmp_SecondDraggingCapture;
                    index = 1;
                    break;
                case "third":
                    tmpDA = tmp_ThirdDraggingCapture;
                    index = 2;
                    break;
                case "fourth":
                    tmpDA = tmp_FourthDraggingCapture;
                    index = 3;
                    break;
            }

            const percent = ((progress / (progress + remaining)) * 100);
            let a;

            // The sum is for filtering out noisy yellow backgrounds
            if (progress + remaining > 5 && !isNaN(percent)) {
                // Filtering out ~100% reads, they seem to be noise
                a = tmpDA!.average(percent >= 99 ? 0 : percent);
            } else {
                a = tmpDA!.average(0);
            }

            // If it's probable that the team in this position is capturing and there is significant evidence of a capture in progress
            const thisTeam = sortedTeams[index!];
            if (
                !thisTeam.isDepositing
                && numTeamsDepositing < 2
                && (a >= 10 && thisTeam.mightBeDepositing)
            ) {
                const denomination = remainingDepositAmounts.pop()

                if (denomination) {
                    // Since the dragging average tends to be lower than the true value, we adjust it here
                    const progress = (a) / 100;
                    const newDeposit = new Deposit(denomination as DepositDenominations, gameTimer.remaining!, thisTeam, progress);

                    console.log(`Started a deposit of ${denomination} for ${thisTeam.name} with ${gameTimer.remaining!}s remaining in the game! (a = ${progress}, ${numTeamsDepositing} teams depositing)`)

                    thisTeam.mightBeDepositing = false;
                    thisTeam.assignDeposit(newDeposit);
                } else {
                    console.error("No denomination left to make a deposit with!")
                }
            }

        } catch (e) {
        }
    })

    // If all two deposits are accounted for, then no other team might be depositing TODO this breaks if a team has both caps
    if (numTeamsDepositing === 2) {
        sortedTeams.forEach(team => {
            team.mightBeDepositing = false;
        })
    }

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
                    console.warn(`Detected deposit of ${extracted?.deposit} for ${rank.padStart(10, " ")} with ${extracted?.cash} cash [${cashLandMark.VALUE}]`)
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
                            console.log(`Corrected and extracted CASH: ${extracted.cash} | DEPOSIT: ${extracted.deposit} (${potential})`);
                            sortedTeams[index].updateCashAndDeposit(extracted.cash, extracted.deposit);
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
}
