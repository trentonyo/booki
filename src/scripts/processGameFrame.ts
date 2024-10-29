import sharp, {Color, Region} from "sharp";
import {writeFileSync} from 'fs';
import {colorDistance, rgbToHex} from "./colorUtil";
import {getOCRWorkerPool} from "./workOCR";

async function extractColorFromImage(imageBuffer: Buffer, region: Region) {
    const extractedRegion = await sharp(imageBuffer)
        .extract(region)
        .resize({width: 1, height: 1}) // Resize to 1x1 to get average color
        .raw()
        .toBuffer({resolveWithObject: true});
    return extractedRegion.data;
}

// Define the Rectangle type
type Rectangle = {
    left: number;
    top: number;
    width: number;
    height: number;
};

// Define the LandMarkOCR type
export type LandMarkOCR = {
    type: "ocr";
    name: string;
    rect: Rectangle;
    radians?: number; // rotation is optional
    charMask?: string; // charMask is optional
    validRegex?: string; // validRegex is optional
    VALUE?: string; // VALUE should only be present when a gameState is returned from OCR  
};

// Define the LandMarkColor type
export type LandMarkColor = {
    type: "color";
    name: string;
    rect: Rectangle;
    threshold?: number; // un-restricted number for use with specialized scripts
    VALUE?: string; // VALUE should only be present when a gameState is returned from OCR
};

// Define the LandMarkColorCount type
export type LandMarkColorCount = {
    type: "colorCount";
    name: string;
    rect: Rectangle;
    pollPixels: number;
    targetColor: string;
    threshold: number;
    VALUE?: string; // VALUE should only be present when a gameState is returned from OCR
};

// Define the LandMarkColorCount type
export type ColorsAndThresholds = {
    [color: string]: number
};

export type LandMarkColorCountA = {
    type: "colorCountA";
    name: string;
    rect: Rectangle;
    pollPixels: number;
    colorsAndThresholds: ColorsAndThresholds;
    VALUE?: string; // VALUE should only be present when a gameState is returned from OCR
};

// Define the Constraints type
type Constraints = {
    displayName: string;
    width: number;
    height: number;
    refreshEvery: number;
    invert: boolean;
    tint?: {
        r: number
        g: number
        b: number
    };
};

// Define the StateModel type composing Constraints, an array of LandMark, and an optional game logic function
export type StateModel = {
    constraints: Constraints;
    gameState: (LandMarkOCR | LandMarkColor | LandMarkColorCount | LandMarkColorCountA)[];
};

/****************
 * RECOGNIZE JOBS
 */

async function recognizeOCR(landMark: LandMarkOCR, imageBuffer: Buffer, minX: number, minY: number) {
    const charMask = landMark.charMask || "";

    // Normalize rects minX/minY (for if frame has been cropped)
    let normalizedRect = {...landMark.rect}; // Make a copy of the rect object
    normalizedRect.left -= minX;
    normalizedRect.top -= minY;

    // If there is a rotation, apply it
    let options;
    if (landMark.radians) {
        options = {
            "rectangle": normalizedRect,
            "rotateRadians": landMark.radians
        };
    } else {
        options = {
            "rectangle": normalizedRect,
            "rotateAuto": true
        };
    }

    try {
        const result = await getOCRWorkerPool().addOCRJob(charMask, imageBuffer, options);
        return {name: landMark.name, text: result.data.text};
    } catch (error) {
        console.error(`Error processing ${landMark.name}:`, error);
        return {};
    }
}

async function recognizeColor(landMark: LandMarkColor, imageBuffer: Buffer, minX: number, minY: number) {
    // Normalize rects minX/minY (for if frame has been cropped)
    let region: Region = {...landMark.rect}; // Make a copy of the rect object
    region.left -= minX;
    region.top -= minY;

    const [r, g, b] = await extractColorFromImage(imageBuffer, region);

    let hexColor
    try {
        hexColor = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
    } catch (error) {
        console.error(`Error processing ${landMark.name}:`, error);
        return {name: landMark.name, text: "#FFFFFF"}
    }

    return {name: landMark.name, text: hexColor};
}

async function recognizeColorCount(landMark: LandMarkColorCount, imageBuffer: Buffer, minX: number, minY: number) {
    // Normalize rects minX/minY (for if frame has been cropped)
    let region: Region = {...landMark.rect}; // Make a copy of the rect object
    region.left -= minX;
    region.top -= minY;

    const squareSize = landMark.pollPixels;
    const rows = Math.ceil(region.height / squareSize);
    const cols = Math.ceil(region.width / squareSize);

    let colorCount = 0;

    let jobs = []
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

            // const [r, g, b] = await extractColorFromImage(imageBuffer, squareRegion);
            jobs.push(extractColorFromImage(imageBuffer, squareRegion));

        }
    }

    const results = await Promise.all(jobs);
    results.forEach(result => {
        const [r, g, b] = result;

        if (landMark.targetColor === undefined) {
            throw new Error(`Malformed LandMarkColorCount: ${JSON.stringify(landMark, null, 2)}`);
        }

        if (colorDistance(landMark.targetColor, rgbToHex(r,g,b)) <= landMark.threshold) {
            colorCount++;
        }
    })

    return {name: landMark.name, text: colorCount.toString()};
}

async function recognizeColorCountA(landMark: LandMarkColorCountA, imageBuffer: Buffer, minX: number, minY: number) {
    // Normalize rects minX/minY (for if frame has been cropped)
    let region: Region = {...landMark.rect}; // Make a copy of the rect object
    region.left -= minX;
    region.top -= minY;

    const squareSize = landMark.pollPixels;
    const rows = Math.ceil(region.height / squareSize);
    const cols = Math.ceil(region.width / squareSize);

    let jobs = []
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

            // const [r, g, b] = await extractColorFromImage(imageBuffer, squareRegion);
            jobs.push(extractColorFromImage(imageBuffer, squareRegion));

        }
    }

    // Prepare the output dict
    let output: {
        [color: string]: number
    } = {...landMark.colorsAndThresholds}
    for (const color in output) {
        output[color] = 0;
    }

    const results = await Promise.all(jobs);

    results.forEach(result => {
        const [r, g, b] = result;

        for (const color in landMark.colorsAndThresholds) {
            const threshold = landMark.colorsAndThresholds[color];

            if (colorDistance(color, rgbToHex(r,g,b)) <= threshold) {
                output[color]++;
            }
        }
    })

    return {name: landMark.name, text: JSON.stringify(output)};
}

export async function processGameFrame(dataURL: string, stateModel: StateModel, minX = 0, minY = 0) {
    const rawImageBuffer = Buffer.from(dataURL.split(',')[1], 'base64');
    const sharpProc = sharp(rawImageBuffer)
        .negate(stateModel.constraints.invert ? {alpha: false} : false);

    if (stateModel.constraints.tint) {
        sharpProc.tint(stateModel.constraints.tint as Color)
    }
    const imageBuffer = await sharpProc.toBuffer();

    // Save the image buffer to disk TODO Debug
    // /*
    const encodedName = stateModel.constraints.displayName
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z]+/g, '');
    writeFileSync(`.debug/${encodedName}.png`, imageBuffer, {flag: 'w'});
    // */
    
    // The output is a stateModel that potentially has VALUE defined for any number of landmarks
    let output = {...stateModel};

    const recognizePromises = stateModel.gameState.map(async (landMark) => {
        switch (landMark.type) {
            case "ocr":
                return recognizeOCR(landMark, imageBuffer, minX, minY);
            case "color":
                return recognizeColor(landMark, rawImageBuffer, minX, minY);
            case "colorCount":
                return recognizeColorCount(landMark, rawImageBuffer, minX, minY);
            case "colorCountA":
                return recognizeColorCountA(landMark, rawImageBuffer, minX, minY);
        }

    });

    const landMarkNameTextPairs = await Promise.all(recognizePromises);
    
    for (const landMarkNameTextPair of landMarkNameTextPairs) {
        if (landMarkNameTextPair.name && landMarkNameTextPair.text) {
            const matchingLandMark = output.gameState.find(landMark => landMark.name === landMarkNameTextPair.name);
            if (matchingLandMark) {
                matchingLandMark.VALUE = landMarkNameTextPair.text;
            }
        }
    }

    return output;
}
