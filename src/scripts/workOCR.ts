import { createScheduler, createWorker, Scheduler, Worker } from 'tesseract.js';

// Define the OCRWorkerPool class for handling OCR jobs
class OCRWorkerPool {
    private schedulers: { [charMask: string]: Scheduler } = {};
    private workers: { [charMask: string]: Worker[] } = {};

    constructor(charMasks: string[], numberOfWorkersPerMask: number) {
        const uniqueCharMasks = Array.from(new Set(charMasks));
        this.initOCRWorkers(uniqueCharMasks, numberOfWorkersPerMask).then(() => {
            console.log("Worker pools initialized for charMasks:", uniqueCharMasks);
        });
    }

    private async initOCRWorkers(charMasks: string[], numberOfWorkersPerMask: number) {
        for (let charMask of charMasks) {
            if (charMask === undefined) {
                charMask = ""
            }

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

    public addOCRJob(charMask: string, imageBuffer: Buffer, options: any) {
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

    public async terminateOCRWorkerPool() {
        for (const charMask in this.schedulers) {
            await this.schedulers[charMask].terminate();
        }
    }
}

let workerPoolOCR: OCRWorkerPool;
export function getOCRWorkerPool() {
    return workerPoolOCR;
}

export function initOCRWorkerPool(charMasks: string[], numberOfWorkersPerMask: number) {
    workerPoolOCR = new OCRWorkerPool(charMasks, numberOfWorkersPerMask); // Adjust the number of workers per char mask as needed
}
