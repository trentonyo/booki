// server.ts
import express from 'express';
import { PrismaClient } from '@prisma/client';
import {LandMarkOCR, processGameFrame, StateModel} from "./scripts/processGameFrame";
import path from 'path';
import {initOCRWorkerPool} from "./scripts/workOCR";

const prisma = new PrismaClient();
const app = express();
const port = process.env.EXPRESS_INTERNAL_PORT || 3000;
const host = process.env.EXPRESS_DNS || "localhost";

app.use(express.json({ limit: '50mb' })); // Increase the limit for large image data
app.use(express.static(path.join(__dirname, '../dist')));

export type StateModelMap = { [game: string]: StateModel };

// Load in all gamestate models and their char masks to the OCR
//  IMPORTANT! See /scripts/feed.ts for specialty scripts
export const gameStateModels: StateModelMap = {
    "thefinals_ranked": require("../public/stateModels/thefinals_ranked.json") as StateModel,
    "thefinals_quickcash": require("../public/stateModels/thefinals_quickcash.json") as StateModel,
    "test": require("../public/stateModels/test.json") as StateModel
}

function isLandmark(landmark: any): landmark is LandMarkOCR {
    return landmark.hasOwnProperty('charMask');
}

function initGameStateModels(workers: number) {
    let allCharMasks: any[] = [];
    for (const gameStateModelsKey in gameStateModels) {
        const gameStateModel = gameStateModels[gameStateModelsKey];

        for (const landMark of gameStateModel.gameState) {
            if (isLandmark(landMark)) {
                allCharMasks.push(landMark.charMask);
            }
        }
    }

    initOCRWorkerPool(allCharMasks, workers);
}

app.get('/api/game-state-models', (req, res) => {
    res.json(gameStateModels);
});

app.post('/game/:model', async (req, res) => {
    const { image, minX, minY } = req.body;
    const { model } = req.params;

    if (!gameStateModels.hasOwnProperty(model)) {
        res.status(404).json({ error: `GameState model "${model}" not found` });
        return;
    }

    const modelParsed = gameStateModels[model];

    const result = await processGameFrame(image, modelParsed, minX, minY);

    res.json(result);
});

// Serve the React app for pages in public (make sure to update webpack)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.get('/feed', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/feed.html'));
});

app.listen(port, () => {
    initGameStateModels(10);
    console.log(`OCR service listening at http://${host}:${port}`);
});
