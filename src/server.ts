import express from 'express';
import {PrismaClient} from '@prisma/client';
import {ocr_test} from "./ocr";

const prisma = new PrismaClient();
const app = express();
const port = process.env.EXPRESS_INTERNAL_PORT || 3000;
const host = process.env.EXPRESS_DNS || "localhost";

app.use(express.json());

app.post('/run-ocr', async (req, res) => {
    const texts = await ocr_test([req.body.rectangle]);

    if (texts) {
        await prisma.game.create({
            data: {createdAt: new Date()}
        });

        res.json({texts});

    } else {
        res.status(500).json({error: 'Internal Server Error'});
    }
});

app.listen(port, () => {
    console.log(`OCR service listening at http://${host}:${port}`);
});
