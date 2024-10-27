import {StateModel} from "../../ocr";

export default function handleProcessedGameState(processedGameState: StateModel) {
    console.log("Hey, they're watching THE FINALS!")
    for (const landMark of processedGameState.gameState) {
        const element = document.getElementById(landMark.name)!;

        if (typeof landMark.VALUE === "string") {
            if (/^#[0-9A-F]{6}$/i.test(landMark.VALUE)) {
                const backgroundColor = landMark.VALUE;
                const isLight = (color: string) => {
                    const r = parseInt(color.substr(1, 2), 16);
                    const g = parseInt(color.substr(3, 2), 16);
                    const b = parseInt(color.substr(5, 2), 16);
                    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                    return brightness > 155;
                };
                const textColor = isLight(backgroundColor) ? "#000000" : "#FFFFFF";

                element.style.backgroundColor = backgroundColor;
                element.style.color = textColor;
            }
        }

        element.innerHTML = landMark.VALUE || element.innerHTML;
    }
}
