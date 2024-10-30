import { Region } from "sharp";

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
    if (!/^#[0-9A-F]{6}$/i.test(hex)) {
        throw new Error(`Invalid hex color input: ${hex}`);
    }

    const bigint = parseInt(hex.slice(1), 16);
    return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255
    };
}

export function rgbToHex(r: number, g: number, b: number): string {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

export function colorDistance(color1: string, color2: string): number {
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);
    const rDiff = rgb1.r - rgb2.r;
    const gDiff = rgb1.g - rgb2.g;
    const bDiff = rgb1.b - rgb2.b;
    return Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
}

