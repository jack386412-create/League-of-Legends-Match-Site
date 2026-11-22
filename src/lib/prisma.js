// PrismaClient 단일 인스턴스 (nodemon 재시작/여러 require에도 하나만 생성)
const { PrismaClient } = require('@prisma/client');

const prisma = global.__prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.__prisma = prisma;

module.exports = prisma;
