-- CreateTable
CREATE TABLE "Player" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "summonerName" TEXT NOT NULL,
    "tagLine" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "division" INTEGER NOT NULL DEFAULT 4,
    "mainPosition" TEXT NOT NULL,
    "subPosition" TEXT,
    "scrimScore" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Match" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "playedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "winnerTeam" TEXT,
    "memo" TEXT
);

-- CreateTable
CREATE TABLE "MatchPlayer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "matchId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "team" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "champion" TEXT,
    "kills" INTEGER,
    "deaths" INTEGER,
    "assists" INTEGER,
    "scoreDelta" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "MatchPlayer_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MatchPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_summonerName_tagLine_key" ON "Player"("summonerName", "tagLine");

-- CreateIndex
CREATE INDEX "Match_playedAt_idx" ON "Match"("playedAt");

-- CreateIndex
CREATE INDEX "MatchPlayer_playerId_idx" ON "MatchPlayer"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchPlayer_matchId_playerId_key" ON "MatchPlayer"("matchId", "playerId");
