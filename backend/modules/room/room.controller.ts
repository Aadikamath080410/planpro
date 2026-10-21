import { Request, Response } from 'express';
import axios from 'axios';
import { roomStore } from '../../stores/roomStore';
import { adaptHorizonOutput } from '../../utils/layoutAdapter';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

export const createRoom = async (req: Request, res: Response) => {
    try {
        const { userId, imageUrl } = req.body;

        if (!userId || !imageUrl) {
            return res.status(400).json({ error: 'userId and imageUrl are required' });
        }

        logger.info(`Creating room for user: ${userId}`);

        // 1️⃣ Run HorizonNet inference
        // Calling the Python backend or AI service
        const horizonResponse = await axios.post(
            env.HORIZON_NET_URL,
            { imageUrl },
            { timeout: 60000 }
        );

        // 2️⃣ Adapt output
        const layout = adaptHorizonOutput(horizonResponse.data);

        // 3️⃣ Save to Supabase
        const savedRoom = await roomStore.createRoom(userId, layout);

        logger.info(`Room created successfully: ${savedRoom.id}`);
        res.status(201).json(savedRoom);
    } catch (error: any) {
        logger.error('Room creation failed', error.message);
        res.status(500).json({ error: 'Room creation failed', details: error.message });
    }
};

export const getRoom = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const room = await roomStore.getRoom(id);
        res.json(room);
    } catch (error: any) {
        logger.error(`Failed to fetch room ${req.params.id}`, error.message);
        res.status(500).json({ error: 'Failed to fetch room' });
    }
};

export const updateRoom = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const { layout } = req.body;
        const room = await roomStore.updateRoom(id, layout);
        res.json(room);
    } catch (error: any) {
        logger.error(`Failed to update room ${req.params.id}`, error.message);
        res.status(500).json({ error: 'Failed to update room' });
    }
};
