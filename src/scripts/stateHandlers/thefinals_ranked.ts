import {ColorsAndThresholds, LandMarkColorCountA, LandMarkOCR, StateModel} from "../processGameFrame";
import {colorDistance} from "../colorUtil";
import {DraggingConsensus} from "../stateHandlerUtil";

const defaultColorElement = document.createElement("div")
defaultColorElement.id = "color_default"

const RULES = {
    depositAmounts: [7000, 10000, 15000],
    accumulateCashAmounts: [500, 3000, 5000, 7000],
    teamKillPenalty: 0.9
}

class Team {
    private cash: number = 0;
    private depositControlled: number = -1;

    constructor(protected color: string, public name: string) {}

    get getColor() {
        return this.color;
    }
}

const myTeam = new Team("#02b9f1", "Our Team")
const pinkTeam = new Team("#f902df", "Pink Team")
const orangeTeam = new Team("#ff930e", "Orange Team")
const purpleTeam = new Team("#b551ff", "Purple Team")

const TeamDraggingConsensus = new DraggingConsensus([] as Team[], 15, 5, 10)

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
                break;
            case 1:
                target = document.getElementById("color_second")
                break;
            case 2:
                target = document.getElementById("color_third")
                break;
            case 3:
                target = document.getElementById("color_fourth")
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
            const progressStr = processedGameState.gameState.find(landmark => landmark.name === `captureProgress_${captureGroup}`)! as LandMarkColorCountA;

            const response = JSON.parse(progressStr.VALUE!) as ColorsAndThresholds;

            const progress = response["#CEC821"]
            const remaining = response["#877E0A"]

            const readOut = document.getElementById(`captureProgress_${captureGroup}`)!;

            // Should filter out random pops of color
            if (progress + remaining > 5) {

                const percent = ((progress / (progress + remaining)) * 100);
                readOut.innerText = isNaN(percent) ? "--" : `${percent.toFixed()}%` // TODO replace with a dragging average
            } else {
                readOut.innerText = "--";
            }

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
