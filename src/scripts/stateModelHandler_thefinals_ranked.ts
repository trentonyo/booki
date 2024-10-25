import {StateModel} from "../ocr";

export default function handleProcessedGameState(processedGameState: StateModel) {
    console.log("Hey, they're watching The Finals!")
    for (const landMark of processedGameState.gameState) {
        document.getElementById(landMark.name)!.innerHTML = landMark.VALUE || document.getElementById(landMark.name)!.innerHTML;
    }
}
