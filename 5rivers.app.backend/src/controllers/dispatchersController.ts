import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const getDispatchers = async (req: Request, res: Response) => {
  try {
    const dispatchers = await prisma.dispatcher.findMany({
      include: { jobs: true },
    });
    res.json(dispatchers);
  } catch {
    res.status(500).json({ error: "Failed to fetch dispatchers" });
  }
};

export const getDispatcherById = async (req: Request, res: Response) => {
  try {
    const dispatcher = await prisma.dispatcher.findUnique({
      where: { dispatcherId: req.params.id },
      include: { jobs: true },
    });
    res.json(dispatcher);
  } catch {
    res.status(500).json({ error: "Failed to fetch dispatcher" });
  }
};

export const createDispatcher = async (req: Request, res: Response) => {
  try {
    const { name, description, email, phone, commissionPercent } = req.body;
    const dispatcher = await prisma.dispatcher.create({
      data: { name, description, email, phone, commissionPercent },
    });
    res.status(201).json(dispatcher);
  } catch {
    res.status(400).json({ error: "Failed to create dispatcher" });
  }
};

export const updateDispatcher = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const dispatcher = await prisma.dispatcher.update({
      where: { dispatcherId: id },
      data: req.body,
    });
    res.json(dispatcher);
  } catch {
    res.status(400).json({ error: "Failed to update dispatcher" });
  }
};

export const deleteDispatcher = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.dispatcher.delete({ where: { dispatcherId: id } });
    res.json({ message: "Dispatcher deleted" });
  } catch {
    res.status(400).json({ error: "Failed to delete dispatcher" });
  }
};
