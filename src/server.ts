import express from 'express';
import { PrismaClient } from '@prisma/client';
import { createWorker, createScheduler } from 'tesseract.js';

const prisma = new PrismaClient();
const app = express();
const port = process.env.PORT || 3000;

type Rectangle = {
    "left": number,
    "top": number,
    "width": number,
    "height": number
}

app.use(express.json());

app.post('/run-ocr', async (req, res) => {
    try {
        const scheduler = createScheduler();
        const worker1 = await createWorker("eng", 1);
        const worker2 = await createWorker("eng", 1);

        const rectangles = req.body.rectangles;

        scheduler.addWorker(worker1);
        scheduler.addWorker(worker2);

        const results = await Promise.all(rectangles.map((rectangle: Rectangle) => (
            scheduler.addJob('recognize', 'https://tesseract.projectnaptha.com/img/eng_bw.png', { rectangle })
        )));

        const texts = results.map(r => r.data.text);
        await prisma.jobResult.createMany({
            data: texts.map(text => ({ text }))
        });

        await scheduler.terminate();

        res.json({ texts });

    } catch (error) {
        console.error("Error running OCR:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(port, () => {
    console.log(`OCR service listening at http://localhost:${port}`);
});
