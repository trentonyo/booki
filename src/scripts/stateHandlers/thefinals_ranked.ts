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
    /*                     kill  cashbox                */
    /*                     |     |     DEPOSIT STARTED  */
    /*                     |     |     1st   2nd   3rd  */
    /*                     |     |     |     |     |    */
    accumulateCashAmounts: [500, 1000, 3000, 5000, 7000],
    teamKillPenalty: 0.9,
    lengthOfGame: 9 * 60,
    respawnTime: 28
}

const SETTINGS = {
    timerAdjustment: -1
}

let remainingDepositAmounts = [15000, 15000, 10000, 10000, 7000, 7000]

class Team {
    public cash: number = 0;
    protected respawnTimer: SuggestTimer | null = null;
    protected deposit: Deposit | null = null;

    constructor(protected color: string, protected respawnColor: string, public name: string, public rank: Ranks) {

    }

    get getColor() {
        return this.color;
    }

    get getRespawnColor() {
        return this.respawnColor;
    }

    public updateCash(amount: number) {
        // TODO validate new cash amount
        //  should be a factor of RULES.accumulateCashAmounts
        //  or reduced by RULES.teamKillPenalty
        //
        // Can also introduce an "uncertainty" margin by which we allow values outside those parameters


        if (true /* validate here */) {
            this.cash = amount;
        }
    }

    public assignRespawnTimer(timer: SuggestTimer) {
        this.respawnTimer = timer;
    }

    public assignDeposit(deposit: Deposit) {
        this.deposit = deposit;
    }

    public generateElement() {
        const element = document.createElement("div");
        element.classList.add("team");
        element.style.backgroundColor = this.color;
        element.innerHTML = `
            <div class="team-name">${this.name}</div>
            <div class="team-cash">${this.cash}</div>
            <div class="team-respawn-timer">${(this.respawnTimer && this.respawnTimer!.isStarted) ? this.respawnTimer!.remaining : "--"}</div>
        `;

        return element;
    }
}

class Deposit {
    private readonly duration: number;
    constructor(public value: DepositDenominations, protected timeRemainingAtStart: number, controllingTeam: Team | null = null) {
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
    }

    public remainingSeconds() {
        return this.timeRemainingAtStart - this.duration;
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

const newCashOutStarted = new DraggingConsensus(false, 10, 2, 6);
const gameTimer = new SuggestTimer(RULES.lengthOfGame, true, 60);
let gameTimerSynchronized = false;

const overTimeConsensus = new DraggingConsensus(0, 20, 1, 6)
let overTimeApplied = false;

export default function handleProcessedGameState(processedGameState: StateModel) {
    const ranks = ["first", "second", "third", "fourth"];
    const teams = [myTeam, pinkTeam, orangeTeam, purpleTeam];
    const sortedTeams: Team[] = [];
    const colorRanks = ["color_first", "color_second", "color_third"];

    /**
     * Sort out the ranks of the teams
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

        // let target: HTMLElement | null = document.getElementById("color_default");
        switch (i) {
            case 0:
                // target = document.getElementById("color_first")
                team.rank = "first";
                break;
            case 1:
                // target = document.getElementById("color_second")
                team.rank = "second";
                break;
            case 2:
                // target = document.getElementById("color_third")
                team.rank = "third";
                break;
            case 3:
                // target = document.getElementById("color_fourth")
                team.rank = "fourth";
                break;
        }

        // target!.innerText = team.name;
        // target!.style.backgroundColor = team.getColor;
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
        }
    })

    RespawnTimers.forEach((timer, index) => {
        // const readOut = document.getElementById(`respawn_${ranks[index]}`)!;
        if (timer.isStarted) {
            if (timer.remaining! <= 0) {
                timer.stop();
            } else if (timer.stable && timer.remaining) {
                // readOut.innerText = `${timer.remaining.toString()}s`;
            } else {
                // readOut.innerText = "";
            }
        }
    })

    /*
    sortedTeams.forEach((team) => {
        // Check if a respawn is likely for this team
        const rankLandmark = processedGameState.gameState.find(landmark => landmark.name === `color_${team.rank}`)! as LandMarkColor;

        const colorTeamDiff = colorDistance(team.getColor, rankLandmark.VALUE!, "2000");
        const colorRespawnDiff = colorDistance(team.getRespawnColor, rankLandmark.VALUE!, "2000");

        if (colorRespawnDiff < colorTeamDiff) {
            // console.log(`${team.name} respawn favor: ${colorRespawnDiff - colorTeamDiff} (${colorRespawnDiff} < ${colorTeamDiff})`);
            // TODO these color diffs are not appearing very helpful
        }
    })
     */


    /**
     * Track the current deposits
     */
    let teamsCapturing: string[] = []

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
            switch (rank) {
                case "first":
                    tmpDA = tmp_FirstDraggingCapture;
                    break;
                case "second":
                    tmpDA = tmp_SecondDraggingCapture;
                    break;
                case "third":
                    tmpDA = tmp_ThirdDraggingCapture;
                    break;
                case "fourth":
                    tmpDA = tmp_FourthDraggingCapture;
                    break;
            }

            const percent = ((progress / (progress + remaining)) * 100);
            let a;

            // The sum is for filtering out noisy yellow backgrounds
            if (progress + remaining > 5 && !isNaN(percent)) {
                // Filtering out ~100% reads, they seem to be noise
                a = tmpDA!.average(percent >= 99 ? 0 : percent);

                teamsCapturing.push(rank);
            } else {
                a = tmpDA!.average(0);
            }

            // readOut.innerText = `~${a.toFixed()}%`;

        } catch (e) {}
    })

    if (newCashOutStarted.consensus(teamsCapturing.length > 0)) {
        // console.log("New cashout started! By...", teamsCapturing)
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

    const t = gameTimer.remaining!
    // gameTime.innerText = `${Math.floor(t / 60)}:${t % 60 < 10 ? '0' : ''}${t % 60}`;

    if (gameTimer.stable && !gameTimerSynchronized) {
        gameTimerSynchronized = true;
        gameTimer.adjustStart(SETTINGS.timerAdjustment)
        console.log("Game Time synchronized")
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
