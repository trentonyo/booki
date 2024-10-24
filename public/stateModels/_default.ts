import {StateModel} from "../../src/ocr";

export default function handleProcessedGameState(processedGameState: StateModel) {
    for (const landMark of processedGameState.gameState) {
        document.getElementById(landMark.name)!.innerHTML = landMark.VALUE || document.getElementById(landMark.name)!.innerHTML;
    }
}
