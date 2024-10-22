import express from 'express';
import {PrismaClient} from '@prisma/client';
import {initWorkerPool, processGameFrame, StateModel} from "./ocr";
import path from 'path';

const prisma = new PrismaClient();
const app = express();
const port = process.env.EXPRESS_INTERNAL_PORT || 3000;
const host = process.env.EXPRESS_DNS || "localhost";

app.use(express.json({ limit: '50mb' })); // Increase the limit for large image data
app.use(express.static(path.join(__dirname, '../public')));

// Add this line to serve React's static files
app.use(express.static(path.join(__dirname, '../dist')));

// Load in all gamestate models and their char masks to the OCR
const gameStateModels: { [game: string]: StateModel } = {
    "thefinals_ranked": require("../public/stateModels/thefinals_ranked.json")
}

function initGameStateModels(workers: number) {
    let allCharMasks: any[] = [];
    for (const gameStateModelsKey in gameStateModels) {
        const gameStateModel = gameStateModels[gameStateModelsKey];

        for (const landMark of gameStateModel.gameState) {
            allCharMasks.push(landMark.charMask);
        }
    }

    initWorkerPool(allCharMasks, workers);
}

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

// Serve the React app for any unmatched routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});


app.listen(port, () => {
    initGameStateModels(6)
    console.log(`OCR service listening at http://${host}:${port}`);
});
