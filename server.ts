import { createServer } from 'node:http';
import next from 'next';
import { Server } from 'socket.io';
import { getToken } from 'next-auth/jwt';
import { PrismaClient } from '@prisma/client';
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const port = Number(process.env.PORT || 3000);
async function main() {
  await app.prepare();
  const http = createServer(app.getRequestHandler());
  const origin = new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000').origin;
  const io = new Server(http, {
    cors: { origin, credentials: true },
    maxHttpBufferSize: 100000,
    // CORS doesn't apply to WebSocket upgrades, so reject cross-site origins explicitly.
    // Same-origin polling requests may omit Origin; browsers always send it cross-site.
    allowRequest: (req, callback) =>
      callback(null, !req.headers.origin || req.headers.origin === origin),
  });
  const db = new PrismaClient();
  io.use(async (socket, next) => {
    try {
      const token = await getToken({
        req: socket.request as any,
        secret: process.env.NEXTAUTH_SECRET,
        secureCookie: process.env.NEXTAUTH_URL?.startsWith('https://'),
      });
      if (!token?.userId) throw new Error('Unauthorized');
      const user = await db.user.findUnique({ where: { id: String(token.userId) } });
      if (!user?.active || user.deletedAt || user.sessionVersion !== token.sessionVersion)
        throw new Error('Unauthorized');
      socket.data.userId = user.id;
      socket.data.version = user.sessionVersion;
      socket.data.expires = Number(token.exp) * 1000;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });
  io.on('connection', (socket) => {
    socket.join(`user:${socket.data.userId}`);
    const timer = setInterval(async () => {
      const user = await db.user.findUnique({ where: { id: socket.data.userId } });
      if (
        !user?.active ||
        user.deletedAt ||
        user.sessionVersion !== socket.data.version ||
        Date.now() > socket.data.expires
      )
        socket.disconnect(true);
    }, 30000);
    socket.on('disconnect', () => clearInterval(timer));
  });
  (globalThis as any).relayIO = io;
  http.listen(port, '0.0.0.0', () => console.log(`Relay listening at http://localhost:${port}`));
  const close = () => {
    io.close();
    http.close();
    void db.$disconnect();
  };
  process.on('SIGTERM', close);
  process.on('SIGINT', close);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
