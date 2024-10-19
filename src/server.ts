import express from 'express';
import {PrismaClient} from '@prisma/client';
import {ocr_test, processGameFrame, StateModel} from "./ocr";
import path from 'path';

const prisma = new PrismaClient();
const app = express();
const port = process.env.EXPRESS_INTERNAL_PORT || 3000;
const host = process.env.EXPRESS_DNS || "localhost";

app.use(express.json({ limit: '50mb' })); // Increase the limit for large image data
app.use(express.static(path.join(__dirname, '../public')));

const gameStateModels: { [game: string]: StateModel } = {
    "thefinals_ranked": require("../public/stateModels/thefinals_ranked.json")
}

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

app.post('/game/:model', async (req, res) => {
    const { image } = req.body;
    const {model} = req.params;
    
    if (!gameStateModels.hasOwnProperty(model)) {
        res.status(404).json({error: `GameState model "${model}" not found`});
        return;
    }
    
    const modelParsed = gameStateModels[model];
    
    const result = await processGameFrame(image, modelParsed);

    res.json(result);
})

app.get('/feed', async (req, res) => {
    res.sendFile(path.join(__dirname, '../public/pages/feed.html'));
})

app.listen(port, () => {
    console.log(`OCR service listening at http://${host}:${port}`);
});
