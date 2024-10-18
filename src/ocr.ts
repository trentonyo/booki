import {createScheduler, createWorker} from "tesseract.js";

type Rectangle = {
    "left": number,
    "top": number,
    "width": number,
    "height": number
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
