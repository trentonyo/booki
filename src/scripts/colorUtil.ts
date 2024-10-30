import { Region } from "sharp";
import Color from "colorjs.io";

// New function to divide region into smaller sub-regions
export function divideIntoRegions(region: Region, pollPixels: number): Region[] {
    const squareSize = pollPixels;
    const rows = Math.ceil(region.height / squareSize);
    const cols = Math.ceil(region.width / squareSize);

    let regions: Region[] = [];
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            let squareRegion: Region = {
                left: region.left + col * squareSize,
                top: region.top + row * squareSize,
                width: squareSize,
                height: squareSize
            };

            // Ensure the region doesn't go out of the image bounds
            if (squareRegion.left + squareRegion.width > region.left + region.width) {
                squareRegion.width = region.left + region.width - squareRegion.left;
            }
            if (squareRegion.top + squareRegion.height > region.top + region.height) {
                squareRegion.height = region.top + region.height - squareRegion.top;
            }

            regions.push(squareRegion);
        }
    }
    return regions;
}

export function hexToRgb(hex: string): { r: number, g: number, b: number } {
    try {
        const color = new Color(hex);
        return { r: color.r, g: color.g, b: color.b };
    } catch (error) {
        throw new Error(`Invalid hex color input: ${hex}`);
    }
}

export function rgbToHex(r: number, g: number, b: number): string {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

export type distanceAlgorithms = "76" | "CMC" | "2000";
export function colorDistance(color1: string, color2: string, alg: distanceAlgorithms = "76"): number {
    const c1 = new Color(color1);
    const c2 = new Color(color2);
    return c1.deltaE(c2, alg);
}
