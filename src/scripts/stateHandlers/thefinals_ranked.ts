import {StateModel} from "../../ocr";
import sharp, {Color} from "sharp";

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

export default function handleProcessedGameState(processedGameState: StateModel) {
    const teams = [myTeam, pinkTeam, orangeTeam, purpleTeam];
    const sortedTeams: Team[] = [];
    const ranks = ["color_first", "color_second", "color_third"];

    let remainingTeams = teams;

    ranks.forEach(rank => {
        const referenceColor = processedGameState.gameState.find(landmark => landmark.name === rank)!.VALUE! as string;
        const { closestTeam, index } = findClosestTeam(remainingTeams, referenceColor);
        sortedTeams.push(closestTeam);
        remainingTeams = [...remainingTeams.slice(0, index), ...remainingTeams.slice(index + 1)];
    });

    sortedTeams.push(remainingTeams[0]);

    console.log(`FIRST: ${sortedTeams[0].name}    | SECOND: ${sortedTeams[1].name}    | THIRD: ${sortedTeams[2].name}    | LAST: ${sortedTeams[3].name}    | `);
}