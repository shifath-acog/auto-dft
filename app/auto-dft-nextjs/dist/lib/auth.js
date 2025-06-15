"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyJwt = verifyJwt;
const jose_1 = require("jose");
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
async function verifyJwt(token) {
    try {
        const { payload } = await (0, jose_1.jwtVerify)(token, new TextEncoder().encode(JWT_SECRET), { algorithms: ['HS256'] });
        return payload;
    }
    catch (error) {
        console.error('JWT verification error:', error);
        return null;
    }
}
