-- CreateTable
CREATE TABLE "CustomTag" (
    "uid" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomTag_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "CustomCategory" (
    "uid" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomCategory_pkey" PRIMARY KEY ("uid")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomTag_name_key" ON "CustomTag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CustomCategory_name_key" ON "CustomCategory"("name");
