import {createScheduler, createWorker, Scheduler} from "tesseract.js";

// Define the Rectangle type
type Rectangle = {
    left: number;
    top: number;
    width: number;
    height: number;
};

// Define the LandMark type
type LandMark = {
    name: string;
    rect: Rectangle;
    radians?: number; // rotation is optional
    charMask?: string; // charMask is optional
};

// Define the Constraints type
type Constraints = {
    width: number;
    height: number;
    refreshEvery: number;
};

// Define the StateModel type composing Constraints and an array of LandMark
export type StateModel = {
    constraints: Constraints;
    gameState: LandMark[];
};

export async function processGameFrame(dataURL: string, stateModel: StateModel) {
    const imageBuffer = Buffer.from(dataURL.split(',')[1], 'base64');

    const output = {
        text: true,
        blocks: false,
        layoutBlocks: false,
        hocr: false,
        tsv: false,
        box: true,
        unlv: false,
        osd: false,
        pdf: false,
        imageColor: false,
        imageGrey: false,
        imageBinary: false,
        debug: false
    }

    // Sort landMarks into batches of common charMasks
    const batches: { [charMask: string]: LandMark[] } = {};

    stateModel.gameState.forEach(landMark => {
        const charMask = landMark.charMask || "<NONE>";
        if (!batches[charMask]) {
            batches[charMask] = [];
        }
        batches[charMask].push(landMark);
    });

    // Define scheduler and workers for each different charMask (batch)
    const schedulers: { [charMask: string]: Scheduler } = {};
    for (const charMask in batches) {
        schedulers[charMask] = createScheduler();

        for (const _ of batches[charMask]) {
            const newWorker = await createWorker("eng", 1);
            await newWorker.setParameters({tessedit_char_whitelist: charMask});
            schedulers[charMask].addWorker(newWorker);
        }
    }

    // For each LandMark, recognize from the image
    const recognizePromises = stateModel.gameState.map(async (landMark) => {
        const options = landMark.radians ? {
            "rectangle": landMark.rect,
            "rotateRadians": landMark.radians
        } : {"rectangle": landMark.rect, "rotateAuto": true}

        const result = await schedulers[landMark.charMask || "<NONE>"].addJob("recognize", imageBuffer, options, output);
        return {name: landMark.name, text: result.data.text, box: result.data.box};
    });

    const result = await Promise.all(recognizePromises);

    for (let key in schedulers) {
        await schedulers[key].terminate();
    }

    return result;
}

export async function ocr_test(rectangles: Rectangle[]) {
    try {
        const scheduler = createScheduler();
        const worker1 = await createWorker("eng", 1);
        const worker2 = await createWorker("eng", 1);

        scheduler.addWorker(worker1);
        scheduler.addWorker(worker2);

        const response = await Promise.all(rectangles.map((rectangle: Rectangle) => (
            scheduler.addJob('recognize', 'https://tesseract.projectnaptha.com/img/eng_bw.png', {rectangle})
        )));

        await scheduler.terminate();
        return response;

    } catch (error) {
        console.error("Error running OCR:", error);
        return null;
    }
}
