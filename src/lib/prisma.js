import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  return new PrismaClient()
}

/** @type {PrismaClient} */
let prisma

if (process.env.NODE_ENV !== 'production') {
  if (!globalThis.prismaGlobal) {
    globalThis.prismaGlobal = prismaClientSingleton()
  }
  prisma = globalThis.prismaGlobal
} else {
  prisma = prismaClientSingleton()
}

export default prisma
