import { createScheduler, createWorker, Scheduler, Worker } from 'tesseract.js';
import sharp, {Color} from "sharp";
import {writeFileSync} from 'fs';

// Define the Rectangle type
type Rectangle = {
    left: number;
    top: number;
    width: number;
    height: number;
};

// Define the LandMark type
export type LandMark = {
    name: string;
    rect: Rectangle;
    radians?: number; // rotation is optional
    charMask?: string; // charMask is optional
    validRegex?: string; // validRegex is optional
    VALUE?: string; // VALUE should only be present when a gameState is returned from OCR  
};

// Define the Constraints type
type Constraints = {
    displayName: string;
    width: number;
    height: number;
    refreshEvery: number;
    invert: boolean;
    tint: {
        r: number
        g: number
        b: number
    };
};

// Define the StateModel type composing Constraints and an array of LandMark
export type StateModel = {
    constraints: Constraints;
    gameState: LandMark[];
};

// Define the WorkerPool class for handling OCR jobs
class WorkerPool {
    private schedulers: { [charMask: string]: Scheduler } = {};
    private workers: { [charMask: string]: Worker[] } = {};

    constructor(charMasks: string[], numberOfWorkersPerMask: number) {
        const uniqueCharMasks = Array.from(new Set(charMasks));
        this.initWorkers(uniqueCharMasks, numberOfWorkersPerMask).then(() => {
            console.log("Worker pools initialized for charMasks:", uniqueCharMasks);
        });
    }

    private async initWorkers(charMasks: string[], numberOfWorkersPerMask: number) {
        for (const charMask of charMasks) {
            const scheduler = createScheduler();
            this.schedulers[charMask] = scheduler;
            this.workers[charMask] = [];

            for (let i = 0; i < numberOfWorkersPerMask; i++) {
                const worker = await createWorker("eng", 1);
                await worker.setParameters({ tessedit_char_whitelist: charMask });
                scheduler.addWorker(worker);
                this.workers[charMask].push(worker);
            }
        }
    }

    public addJob(charMask: string, imageBuffer: Buffer, options: any) {
        const output = {
            text: true,
            blocks: false,
            layoutBlocks: false,
            hocr: false,
            tsv: false,
            box: false,
            unlv: false,
            osd: false,
            pdf: false,
            imageColor: false,
            imageGrey: false,
            imageBinary: false,
            debug: false
        }

        const scheduler = this.schedulers[charMask];
        if (!scheduler) {
            throw new Error(`No scheduler available for charMask: ${charMask}`);
        }
        return scheduler.addJob("recognize", imageBuffer, options, output);
    }

    public async terminate() {
        for (const charMask in this.schedulers) {
            await this.schedulers[charMask].terminate();
        }
    }
}

let workerPool: WorkerPool;
export function getWorkerPool() {
    return workerPool;
}

export function initWorkerPool(charMasks: string[], numberOfWorkersPerMask: number) {
    workerPool = new WorkerPool(charMasks, numberOfWorkersPerMask); // Adjust the number of workers per char mask as needed
}

export async function processGameFrame(dataURL: string, stateModel: StateModel, minX = 0, minY = 0) {
    const rawImageBuffer = Buffer.from(dataURL.split(',')[1], 'base64');
    const imageBuffer = await sharp(rawImageBuffer)
        .tint(stateModel.constraints.tint as Color)
        .negate(stateModel.constraints.invert ? { alpha: false } : false)
        .toBuffer();

    // Save the image buffer to disk TODO Debug
    /*
    const encodedName = stateModel.constraints.displayName
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z]+/g, '');
    writeFileSync(`.debug/${encodedName}.png`, imageBuffer, {flag: 'w'});
    // */
    
    // The output is a stateModel that potentially has VALUE defined for any number of landmarks
    let output = {...stateModel};

    const recognizePromises = stateModel.gameState.map(async (landMark) => {
        const charMask = landMark.charMask || "<NONE>";

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
            const result = await workerPool.addJob(charMask, imageBuffer, options);
            return {name: landMark.name, text: result.data.text};
        } catch (error) {
            console.error(`Error processing ${landMark.name}:`, error);
            return {};
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
