import sharp, {Color, Region} from "sharp";
import {writeFileSync} from 'fs';
import {colorDistance, distanceAlgorithms, rgbToHex} from "./colorUtil";
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

type LandMarkCommon = {
    name: string;
    rect: Rectangle;
    step?: number; // Defines how many steps of processing must pass before this landmark is read (default 1)
};

// Define the LandMarkOCR type
export type LandMarkOCR = LandMarkCommon & {
    type: "ocr";
    useOriginal?: boolean; // if true, will not use any of the image processing for this landmark
    radians?: number; // rotation is optional AND NOT RECOMMENDED
    charMask?: string; // charMask is optional
    validRegex?: string; // validRegex is optional
    VALUE?: string; // VALUE should only be present when a gameState is returned from OCR  
};

// Define the LandMarkColor type
export type LandMarkColor = LandMarkCommon & {
    type: "color";
    distanceAlgorithm?: distanceAlgorithms;
    threshold?: number; // un-restricted number for use with specialized scripts
    VALUE?: string; // VALUE should only be present when a gameState is returned from OCR
};

// Define the LandMarkColorCount type
export type LandMarkColorCount = LandMarkCommon & {
    type: "colorCount";
    pollPixels: number;
    targetColor: string;
    distanceAlgorithm?: distanceAlgorithms;
    threshold: number;
    VALUE?: string; // VALUE should only be present when a gameState is returned from OCR
};

// Define the LandMarkColorCount type
export type ColorsAndThresholds = {
    [color: string]: number
};

export type LandMarkColorCountA = LandMarkCommon & {
    type: "colorCountA";
    pollPixels: number;
    distanceAlgorithm?: distanceAlgorithms;
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
    inputs?: { [key: string]: any };
    captureFrame?: boolean;
    sessionID?: string;
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
    let region: Region = { ...landMark.rect }; // Make a copy of the rect object
    region.left -= minX;
    region.top -= minY;
    const originalRegion = { ...region }; // Hold the original

    // Calculate new dimensions
    region.left = Math.ceil(region.left / landMark.pollPixels);
    region.top = Math.ceil(region.top / landMark.pollPixels);
    region.width = Math.ceil(region.width / landMark.pollPixels);
    region.height = Math.ceil(region.height / landMark.pollPixels);

    const resizedWidth = region.width;
    const resizedHeight = region.height;

    // Resize the entire image
    const resizedImageBuffer = await sharp(imageBuffer)
        .extract(originalRegion) // Extract the original region first
        .resize({ width: resizedWidth, height: resizedHeight }) // Resize to poll size
        .raw()
        .toBuffer();

    let colorCount = 0;

    // Process the resized image pixels
    for (let row = 0; row < resizedHeight; row++) {
        for (let col = 0; col < resizedWidth; col++) {
            const pixelIndex = (row * resizedWidth + col) * 3;
            const r = resizedImageBuffer[pixelIndex];
            const g = resizedImageBuffer[pixelIndex + 1];
            const b = resizedImageBuffer[pixelIndex + 2];

            const pixelColor = rgbToHex(r, g, b);
            if (colorDistance(pixelColor, landMark.targetColor, landMark.distanceAlgorithm) <= landMark.threshold) {
                colorCount++;
            }
        }
    }

    return {name: landMark.name, text: colorCount.toString()};
}

async function recognizeColorCountA(landMark: LandMarkColorCountA, imageBuffer: Buffer, minX: number, minY: number) {
    // Normalize rects minX/minY (for if frame has been cropped)
    let region: Region = { ...landMark.rect }; // Make a copy of the rect object
    region.left -= minX;
    region.top -= minY;
    const originalRegion = { ...region }; // Hold the original

    // Calculate new dimensions
    region.left = Math.ceil(region.left / landMark.pollPixels);
    region.top = Math.ceil(region.top / landMark.pollPixels);
    region.width = Math.ceil(region.width / landMark.pollPixels);
    region.height = Math.ceil(region.height / landMark.pollPixels);

    const resizedWidth = region.width;
    const resizedHeight = region.height;

    /**
     * TODO debug Save the resized image buffer to disk for debugging
     *
    const debug = await sharp(imageBuffer)
        .extract(originalRegion) // Extract the original region first
        .resize({ width: resizedWidth, height: resizedHeight }) // Resize to poll size
        .toBuffer();
    writeFileSync(`.debug/resized_${landMark.name}.png`, debug, {flag: 'w'});
    /**************************************************
     */

    // Resize the entire image
    const resizedImageBuffer = await sharp(imageBuffer)
        .extract(originalRegion) // Extract the original region first
        .resize({ width: resizedWidth, height: resizedHeight }) // Resize to poll size
        .raw()
        .toBuffer();

    let output: {
        [color: string]: number
    } = {...landMark.colorsAndThresholds}
    for (const color in output) {
        output[color] = 0;
    }

    // Process the resized image pixels
    for (let row = 0; row < resizedHeight; row++) {
        for (let col = 0; col < resizedWidth; col++) {
            const pixelIndex = (row * resizedWidth + col) * 3;
            const r = resizedImageBuffer[pixelIndex];
            const g = resizedImageBuffer[pixelIndex + 1];
            const b = resizedImageBuffer[pixelIndex + 2];

            const pixelColor = rgbToHex(r, g, b);

            for (const [targetColor, threshold] of Object.entries(landMark.colorsAndThresholds)) {
                if (colorDistance(pixelColor, targetColor, landMark.distanceAlgorithm) <= threshold) {
                    output[targetColor]++;
                }
            }
        }
    }

    return {name: landMark.name, text: JSON.stringify(output)};
}

function debugWriteImage(imageBuffer: Buffer, name: string, stateModel: StateModel) {
    const nameWords = stateModel.constraints.displayName.split(" ");
    const encodedName = nameWords.map(word => word.substring(0, 1)).join("")
        .toUpperCase()
        .replace(/[^A-Z]+/g, '');
    const imageName = `${encodedName}_${name}`
    const logName = `${encodedName}_${stateModel.sessionID}`
    writeFileSync(`.debug/${imageName}.png`, imageBuffer, {flag: 'w'});

    const log = `${imageName}\\${encodeURIComponent(JSON.stringify(stateModel.gameState))}\n`
    writeFileSync(`.debug/${logName}_log.txt`, log, {flag: 'a'});
}

// Step allows for spreading recognize jobs out per landmark
let step = 0;

export async function processGameFrame(dataURL: string, stateModel: StateModel, minX = 0, minY = 0) {
    const rawImageBuffer = Buffer.from(dataURL.split(',')[1], 'base64');
    const sharpProc = sharp(rawImageBuffer)
        .negate(stateModel.constraints.invert ? {alpha: false} : false);

    if (stateModel.constraints.tint) {
        sharpProc.tint(stateModel.constraints.tint as Color)
    }
    const imageBuffer = await sharpProc.toBuffer();

    // The output is a stateModel that potentially has VALUE defined for any number of landmarks
    let output = {...stateModel};

    const recognizePromises = stateModel.gameState.map(async (landMark) => {
        // If this landmark is sleeping (its step is not called yet), return a blank
        if (step % (landMark.step ? landMark.step : 1) !== 0) {
            return { name: landMark.name, text: ""};
        }

        switch (landMark.type) {
            case "ocr":
                const bufferToUse = landMark.useOriginal ? rawImageBuffer : imageBuffer;
                return recognizeOCR(landMark, bufferToUse, minX, minY);
            case "color":
                return recognizeColor(landMark, rawImageBuffer, minX, minY);
            case "colorCount":
                return recognizeColorCount(landMark, rawImageBuffer, minX, minY);
            case "colorCountA":
                return recognizeColorCountA(landMark, rawImageBuffer, minX, minY);
            default:
                console.error(`Unhandled landmark type!`);
                return { name: "ERROR", text: "ERROR" };
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

    if (stateModel.captureFrame) {
        const name = `${new Date().toLocaleString('en-CA', {hour12: false}).replace(/[^a-zA-Z0-9]/g, '_')}_raw`;
        debugWriteImage(rawImageBuffer, name, stateModel);
    }

    step++;
    return output;
}
