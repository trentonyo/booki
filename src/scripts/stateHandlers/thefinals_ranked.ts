import {ColorsAndThresholds, LandMarkColorCountA, LandMarkOCR, StateModel} from "../processGameFrame";
import {colorDistance} from "../colorUtil";
import {DraggingAverage, DraggingConsensus} from "../stateHandlerUtil";

const defaultColorElement = document.createElement("div")
defaultColorElement.id = "color_default"

type Ranks = "first" | "second" | "third" | "fourth";
type DepositDenominations = 7000 | 10000 | 15000;

const RULES = {
    depositAmounts: [7000, 10000, 15000],
    accumulateCashAmounts: [500, 3000, 5000, 7000],
    teamKillPenalty: 0.9,
    lengthOfGame: 9 * 60
}

let remainingDepositAmounts = [15000, 15000, 10000, 10000, 7000, 7000]

class Team {
    public cash: number = 0;

    constructor(protected color: string, public name: string, public rank: Ranks) {

    }

    get getColor() {
        return this.color;
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

const myTeam = new Team("#02b9f1", "Our Team", "first")
const pinkTeam = new Team("#f902df", "Pink Team", "second")
const orangeTeam = new Team("#ff930e", "Orange Team", "third")
const purpleTeam = new Team("#b551ff", "Purple Team", "fourth")

const TeamDraggingConsensus = new DraggingConsensus([] as Team[], 15, 5, 10)

const tmp_FirstDraggingCapture = new DraggingAverage();
const tmp_SecondDraggingCapture = new DraggingAverage();
const tmp_ThirdDraggingCapture = new DraggingAverage();
const tmp_FourthDraggingCapture = new DraggingAverage();

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

export default function handleProcessedGameState(processedGameState: StateModel) {
    const teams = [myTeam, pinkTeam, orangeTeam, purpleTeam];
    const sortedTeams: Team[] = [];
    const ranks = ["color_first", "color_second", "color_third"];

    // Sort out the ranks of the teams
    let remainingTeams = teams;

    ranks.forEach(rank => {
        const referenceColor = processedGameState.gameState.find(landmark => landmark.name === rank)!.VALUE! as string;
        // console.warn("=== " + rank + " ===")
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

        let target: HTMLElement | null = document.getElementById("color_default");
        switch (i) {
            case 0:
                target = document.getElementById("color_first")
                team.rank = "first";
                break;
            case 1:
                target = document.getElementById("color_second")
                team.rank = "second";
                break;
            case 2:
                target = document.getElementById("color_third")
                team.rank = "third";
                break;
            case 3:
                target = document.getElementById("color_fourth")
                team.rank = "fourth";
                break;
        }

        target!.innerText = team.name;
        target!.style.backgroundColor = team.getColor;
    }

    /**
     * Track the current deposits
     */
    const captureGroups = ["first", "second", "third", "fourth"];

    captureGroups.forEach(captureGroup => {
        try {
            let progress = 0;
            let remaining = 0;

            for (let i = 1; i <= 3; i++) {
                const progressStr = processedGameState.gameState.find(landmark => landmark.name === `captureProgress${i}_${captureGroup}`)! as LandMarkColorCountA;

                const response = JSON.parse(progressStr.VALUE!) as ColorsAndThresholds;

                progress += response["#CEC821"]
                remaining += response["#877E0A"]
            }
            const readOut = document.getElementById(`captureProgress1_${captureGroup}`)!;

            let tmpDA: DraggingAverage;
            switch (captureGroup) {
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
            } else {
                a = tmpDA!.average(0);
            }

            readOut.innerText = a.toFixed();

        } catch (e) {}
    })

    /**
     * Track the game timer
     */
    const gameTime = document.getElementById("game_timeRemaining")!;
    const gameTimeRemainingLandmark = processedGameState.gameState.find(landmark => landmark.name === "game_timeRemaining") as LandMarkOCR;

    if (gameTimeRemainingLandmark!.VALUE) {
        gameTime.innerText = gameTimeRemainingLandmark!.VALUE;
    }

    /**
     * Track teams' cash
     */
    const cashLandMarks = ["score_firstCash", "score_secondCash", "score_thirdCash", "score_fourthCash"]

    cashLandMarks.forEach(landmarkName => {
        const targetDOM = document.getElementById(landmarkName)!;
        const cashLandMark = processedGameState.gameState.find(landmark => landmark.name === landmarkName) as LandMarkOCR;

        targetDOM.innerHTML = cashLandMark.VALUE || targetDOM.innerHTML;
    })
}
