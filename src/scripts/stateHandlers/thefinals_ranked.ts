import {ColorsAndThresholds, LandMarkColor, LandMarkColorCountA, LandMarkOCR, StateModel} from "../processGameFrame";
import {colorDistance} from "../colorUtil";
import {DraggingAverage, DraggingConsensus, SuggestTimer} from "../stateHandlerUtil";

/**
 * Set up the page
 */
let teamSlots = document.getElementById("team_slots");

type Ranks = "first" | "second" | "third" | "fourth";
type DepositDenominations = 7000 | 10000 | 15000;

const RULES = {
    depositAmounts: [7000, 10000, 15000],
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

let remainingDepositAmounts = [15000, 15000, 10000, 10000, 7000, 7000]

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

    public updateCash(amount: number) {
        // TODO Can also introduce an "uncertainty" margin by which we allow values outside those parameters
        //  and a "staleness" parameter where we are likely to take a new value if we haven't had an approved one in a while
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
            (amount > 0 || (amount === 0 && !this.hasMoreThanZero))
            && (validDepositAcc || validReduction || validAccumulation || validAccWithReduction)
        ) {
            // console.warn(`Accepted cash value [${this.name}]: ${amount} (${validDepositAcc}, ${validReduction}, ${validAccumulation}, ${validAccWithReduction})`);
            this.setCash(amount);
            if (amount > 0) {
                this.hasMoreThanZero = true;
            }
        } else {
            // Rejected cash updates introduce uncertainty to this.cash
            this.rejectedCashUpdates++;

            // Strange updates suggest a deposit
            this.mightBeDepositing = true;

            if (amount > 0) {
                console.error(`Rejected cash value [${this.name}]: ${amount} (${validDepositAcc}, ${validReduction}, ${validAccumulation}, ${validAccWithReduction})`);
            } else {
                console.error(`Rejected cash value [${this.name}]: ${amount} (${this.cashDraggingConsensus.lastStable})`);
                this.hasMoreThanZero = false;
            }

            // If the current count is stale, try a stable value from the dragging consensus
            const potentialStable = this.cashDraggingConsensus.stableConsensus(amount)
            if (this.rejectedCashUpdates > SETTINGS.rejectedCashStaleThreshold) {
                if (potentialStable) {
                    this.setCash(potentialStable.value)

                    console.warn(`Stale cash value possible for [${this.name}], falling back on dragging consensus with frequency ${potentialStable.frequency}`);
                }
            }
        }
    }

    private setCash(amount: number) {
        this.cash = amount
        this.cashDraggingConsensus.flush();
        this.rejectedCashUpdates = 0;
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
            <div class="team-deposit-timer">${(this.deposit) ? `deposit: ${this.deposit.remainingSeconds(gameTimer.remaining!)}s` : "--"}</div>
            <div class="team-respawn-timer">${respawnStr}</div>
        `;

        return element;
    }
}

class Deposit {
    private readonly duration: number;
    constructor(public value: DepositDenominations, protected timeRemainingAtStart: number, controllingTeam: Team | null = null, protected progressAtStart: number = 0) {
        const t = timeRemainingAtStart;

        if (t < 1) {
            this.duration = 60;
        } else
        if (t <= 30) {
            this.duration = 90;
        } else
        if (t <= 60) {
            this.duration = 120;
        }
        else {
            this.duration = 130;
        }

        this.timeRemainingAtStart += Math.round(this.duration * progressAtStart)
    }

    public remainingSeconds(timeRemaining: number) {
        return this.duration - (this.timeRemainingAtStart - timeRemaining);
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
    return { closestTeam: teams[teamToPop], index: teamToPop };
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

export default function handleProcessedGameState(processedGameState: StateModel) {
    const ranks = ["first", "second", "third", "fourth"];
    const teams = [myTeam, pinkTeam, orangeTeam, purpleTeam];
    const sortedTeams: Team[] = [];
    const colorRanks = ["color_first", "color_second", "color_third"];

    /**
     * Sort out the ranks of the teams, check if any might be depositing
     */
    let remainingTeams = teams;

    colorRanks.forEach(rank => {
        const referenceColor = processedGameState.gameState.find(landmark => landmark.name === rank)!.VALUE! as string;

        const { closestTeam, index } = findClosestTeam(remainingTeams, referenceColor);
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

        if (team.mightBeDepositing) {
            teamMightBeDepositing[i] = true;
        }
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
            // const readOut = document.getElementById(`captureProgress1_${rank}`)!;

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

        } catch (e) {}
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
    // const gameTime = document.getElementById("game_timeRemaining")!;
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
        }
        else if (!overTimeApplied)
        {
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
            const nominal = cashLandMark.VALUE.substring(1);
            const cash = parseInt(nominal, 10);

            if (!isNaN(cash) && cash >= 0) {
                sortedTeams[index].updateCash(cash);
            } else {
                console.warn(`Invalid cash value [${cashLandMark.name}]: ${cashLandMark.VALUE}`);
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
