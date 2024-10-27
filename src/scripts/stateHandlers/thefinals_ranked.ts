import {StateModel} from "../../ocr";
import sharp, {Color} from "sharp";

const defaultColorElement = document.createElement("div")
defaultColorElement.id = "color_default"

function hexToRgb(hex: string): { r: number, g: number, b: number } {
    const bigint = parseInt(hex.slice(1), 16);
    return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255
    };
}

function colorDistance(color1: string, color2: string): number {
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);
    const rDiff = rgb1.r - rgb2.r;
    const gDiff = rgb1.g - rgb2.g;
    const bDiff = rgb1.b - rgb2.b;
    return Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
}

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

let consensus_lastStableStandings: Team[];
/**
 * Computes a consensus value based on a rolling history of inputs.
 * Maintains a history of previous values up to a specified limit, computes the mode
 * of the history, and handles noise by checking frequency thresholds.
 *
 * @param nextValue - The next input value to consider in the consensus calculation
 * @param history - An array holding the history of values for rolling consensus calculation
 * @param historyLimit - The maximum number of historical values to maintain
 * @param lowNoiseLimit - The maxFrequency threshold below which historical noise is considered high, a highly stable historical value should be returned in this case
 * @param highStabilityLimit - The maxFrequency threshold above which a mode is considered highly stable
 * @return The consensus value based on historical frequency analysis or the next input value if no mode is found
 */
function consensus<T>(nextValue: T, history: T[], historyLimit: number, lowNoiseLimit: number, highStabilityLimit: number): {value: T, frequency: number} {
    // Keep the rolling history
    history.push(nextValue)
    
    if (history.length > historyLimit) {
        history.shift();
    }
    
    // Calculate the mode
    const frequency = new Map<string, number>();

    history.forEach((value) => {
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
    if (maxFrequency > highStabilityLimit) {
        // Team consensus
        if ((nextValue as any) instanceof Array && (nextValue as any)[0] instanceof Team) {
            consensus_lastStableStandings = mode as Team[];
        }
    }

    /// Filter noisy history
    // Team consensus
    if (consensus_lastStableStandings !== undefined && history.length > lowNoiseLimit && maxFrequency < lowNoiseLimit) {
        console.warn("Low noise detected, returning last stable value and flushing buffer");
        history.length = 0;
        history.push(nextValue);

        // Team consensus
        if ((nextValue as any) instanceof Array && (nextValue as any)[0] instanceof Team) {
            return {
                value: consensus_lastStableStandings as T,
                frequency: maxFrequency
            }
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

let history_sortedTeams: Team[][] = []
export default function handleProcessedGameState(processedGameState: StateModel) {
    const teams = [myTeam, pinkTeam, orangeTeam, purpleTeam];
    const sortedTeams: Team[] = [];
    const ranks = ["color_first", "color_second", "color_third"];

    // Sort out the ranks of the teams
    let remainingTeams = teams;

    ranks.forEach(rank => {
        const referenceColor = processedGameState.gameState.find(landmark => landmark.name === rank)!.VALUE! as string;
        const { closestTeam, index } = findClosestTeam(remainingTeams, referenceColor);
        sortedTeams.push(closestTeam);
        remainingTeams = [...remainingTeams.slice(0, index), ...remainingTeams.slice(index + 1)];
    });
    sortedTeams.push(remainingTeams[0]);

    const consensusTeams = consensus(sortedTeams, history_sortedTeams, 15, 5, 10)
    const c = consensusTeams.value || sortedTeams

    // console.log(`[${consensusTeams.frequency || -100}] FIRST: ${c[0].name}    | SECOND: ${c[1].name}    | THIRD: ${c[2].name}    | LAST: ${c[3].name}`);

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
}