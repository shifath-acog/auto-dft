"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const worker_1 = require("./lib/worker");
dotenv_1.default.config({ path: '.env.local' });
(0, worker_1.startWorker)();
// Start the Next.js server
require('./.next/standalone/server.js');
