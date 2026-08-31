import express from "express";
import http from "node:http";
import { WebSocketServer } from "ws";

import type { Request, Response } from "express";

import { Server, type IBus } from "@shinka-rpc/core";
import outscope from "@shinka-rpc/outscope/node-process";
import serializer from "@shinka-rpc/serializer-msgspec";
import { webSocketServer } from "@shinka-rpc/web-socket";
import limonOpportunistic from "@shinka-rpc/limon-opportunistic";
import { clientRegistry } from "@shinka-rpc/scenarios";

// import { webSocketServer } from "./lib/ws-server";
import { ServerWorkbook, createSheet, type Op } from "./lib/server-workbook";

const app = express();
const port = 8081; // The port your express server will be running on.

const httpServer = http.createServer(app);

// // Enable URL-encoded form data parsing
// app.use(express.urlencoded({ extended: true }));

// // Middleware to parse JSON bodies
// app.use(express.json());

// Basic route
app.get("/", (req: Request, res: Response) => {
  res.send("Hello, TypeScript + Express!");
});

const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

const server = new Server<any, any, any>({
  outscope,
  transport: webSocketServer(wss),
  serializer,
  limon: limonOpportunistic({}),
});

server.addEventListener("error", console.error);

const clients = clientRegistry(server);

const workbook = new ServerWorkbook([createSheet("default")]);

server.onRequest("get-data", () => workbook.state);

server.onDataEvent("op", (ops: Op[], bus) => {
  workbook.applyOps(ops);
  for (const client of clients) if (bus !== client) client.dataEvent("op", ops);
});

server.start();

httpServer.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
