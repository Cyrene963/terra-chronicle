/* =========================================================
   Terra Chronicle — WebSocket Server
   支持单机/联机无缝切换的权威服务器
   ---------------------------------------------------------
   Features:
   1. Player authentication and session management
   2. World map state synchronization (public overworld)
   3. Private farm isolation (client-side authoritative)
   4. Neighbor discovery and interaction
   5. Real-time state updates (position, environment)
   ========================================================= */

'use strict';

const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

// ============= Configuration =============
const PORT = process.env.PORT || 8866;
const HEARTBEAT_INTERVAL = 30000; // 30s
const SESSION_TIMEOUT = 300000; // 5min idle timeout

// ============= State Management =============
class WorldState {
  constructor() {
    this.players = new Map(); // playerId → PlayerState
    this.hexMap = new Map();  // "q,r" → playerId (world map positions)
    this.sessions = new Map(); // sessionId → playerId
  }

  addPlayer(playerId, sessionId, data) {
    const playerState = {
      playerId,
      sessionId,
      name: data.name || `Player_${playerId.slice(0, 6)}`,
      level: data.level || 1,
      position: { q: data.q || 0, r: data.r || 0 },
      environment: {
        deforestation: 0,
        hasRain: false,
        hasPest: false,
        lastUpdate: Date.now()
      },
      lastSeen: Date.now(),
      online: true
    };

    this.players.set(playerId, playerState);
    this.sessions.set(sessionId, playerId);
    this.updateHexMap(playerId, playerState.position);

    return playerState;
  }

  removePlayer(playerId) {
    const player = this.players.get(playerId);
    if (player) {
      this.clearHexMap(playerId);
      this.sessions.delete(player.sessionId);
      this.players.delete(playerId);
    }
  }

  updatePlayerPosition(playerId, q, r) {
    const player = this.players.get(playerId);
    if (!player) return false;

    this.clearHexMap(playerId);
    player.position = { q, r };
    player.lastSeen = Date.now();
    this.updateHexMap(playerId, player.position);

    return true;
  }

  updatePlayerEnvironment(playerId, envData) {
    const player = this.players.get(playerId);
    if (!player) return false;

    player.environment = {
      ...player.environment,
      ...envData,
      lastUpdate: Date.now()
    };
    player.lastSeen = Date.now();

    return true;
  }

  updateHexMap(playerId, position) {
    const key = `${position.q},${position.r}`;
    this.hexMap.set(key, playerId);
  }

  clearHexMap(playerId) {
    for (const [key, pid] of this.hexMap.entries()) {
      if (pid === playerId) {
        this.hexMap.delete(key);
        break;
      }
    }
  }

  getNeighbors(playerId) {
    const player = this.players.get(playerId);
    if (!player) return [];

    const { q, r } = player.position;
    const directions = [
      { q: 1, r: 0 },   // East
      { q: 1, r: -1 },  // Northeast
      { q: 0, r: -1 },  // Northwest
      { q: -1, r: 0 },  // West
      { q: -1, r: 1 },  // Southwest
      { q: 0, r: 1 },   // Southeast
    ];

    const neighbors = [];
    for (const dir of directions) {
      const nq = q + dir.q;
      const nr = r + dir.r;
      const key = `${nq},${nr}`;
      const neighborId = this.hexMap.get(key);

      if (neighborId && neighborId !== playerId) {
        const neighbor = this.players.get(neighborId);
        if (neighbor && neighbor.online) {
          neighbors.push({
            playerId: neighbor.playerId,
            name: neighbor.name,
            level: neighbor.level,
            position: neighbor.position,
            environment: neighbor.environment
          });
        }
      }
    }

    return neighbors;
  }

  getOnlinePlayers() {
    return Array.from(this.players.values())
      .filter(p => p.online)
      .map(p => ({
        playerId: p.playerId,
        name: p.name,
        level: p.level,
        position: p.position
      }));
  }

  markOffline(playerId) {
    const player = this.players.get(playerId);
    if (player) {
      player.online = false;
      player.lastSeen = Date.now();
    }
  }

  serialize() {
    return {
      players: Array.from(this.players.entries()),
      hexMap: Array.from(this.hexMap.entries()),
      timestamp: Date.now()
    };
  }
}

// ============= Server Setup =============
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const worldState = new WorldState();

// Client connection tracking
const clients = new Map(); // ws → clientData

// ============= HTTP Routes =============
app.use(express.json());
app.use(express.static('public'));

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    players: worldState.players.size,
    online: Array.from(worldState.players.values()).filter(p => p.online).length,
    uptime: process.uptime()
  });
});

app.get('/api/world', (req, res) => {
  res.json({
    players: worldState.getOnlinePlayers(),
    timestamp: Date.now()
  });
});

// ============= WebSocket Handlers =============
wss.on('connection', (ws, req) => {
  const sessionId = uuidv4();
  const clientData = {
    sessionId,
    playerId: null,
    lastPing: Date.now(),
    authenticated: false
  };

  clients.set(ws, clientData);

  console.log(`[WebSocket] New connection: ${sessionId}`);

  // Send welcome message
  send(ws, {
    type: 'connected',
    sessionId,
    serverTime: Date.now()
  });

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      handleMessage(ws, message);
    } catch (err) {
      console.error('[WebSocket] Invalid message:', err);
      send(ws, { type: 'error', message: 'Invalid message format' });
    }
  });

  ws.on('pong', () => {
    clientData.lastPing = Date.now();
  });

  ws.on('close', () => {
    handleDisconnect(ws);
  });

  ws.on('error', (err) => {
    console.error('[WebSocket] Error:', err);
  });
});

// ============= Message Handlers =============
function handleMessage(ws, message) {
  const clientData = clients.get(ws);
  if (!clientData) return;

  const { type, data } = message;

  switch (type) {
    case 'auth':
      handleAuth(ws, data);
      break;

    case 'join':
      handleJoin(ws, data);
      break;

    case 'position_update':
      handlePositionUpdate(ws, data);
      break;

    case 'environment_update':
      handleEnvironmentUpdate(ws, data);
      break;

    case 'get_neighbors':
      handleGetNeighbors(ws);
      break;

    case 'send_resources':
      handleSendResources(ws, data);
      break;

    case 'request_aid':
      handleRequestAid(ws, data);
      break;

    case 'ping':
      clientData.lastPing = Date.now();
      send(ws, { type: 'pong', timestamp: Date.now() });
      break;

    default:
      send(ws, { type: 'error', message: `Unknown message type: ${type}` });
  }
}

function handleAuth(ws, data) {
  const clientData = clients.get(ws);
  if (!clientData) return;

  // Simple authentication (in production, use JWT + database)
  const playerId = data.playerId || uuidv4();

  clientData.playerId = playerId;
  clientData.authenticated = true;

  send(ws, {
    type: 'auth_success',
    playerId,
    sessionId: clientData.sessionId
  });

  console.log(`[Auth] Player authenticated: ${playerId}`);
}

function handleJoin(ws, data) {
  const clientData = clients.get(ws);
  if (!clientData || !clientData.authenticated) {
    send(ws, { type: 'error', message: 'Not authenticated' });
    return;
  }

  const { playerId, sessionId } = clientData;

  // Add or update player in world
  const playerState = worldState.addPlayer(playerId, sessionId, data);

  // Send initial world state
  send(ws, {
    type: 'join_success',
    player: playerState,
    world: {
      players: worldState.getOnlinePlayers(),
      neighbors: worldState.getNeighbors(playerId)
    }
  });

  // Broadcast to other players
  broadcast({
    type: 'player_joined',
    player: {
      playerId: playerState.playerId,
      name: playerState.name,
      level: playerState.level,
      position: playerState.position
    }
  }, ws);

  console.log(`[Join] Player joined: ${playerState.name} at (${playerState.position.q}, ${playerState.position.r})`);
}

function handlePositionUpdate(ws, data) {
  const clientData = clients.get(ws);
  if (!clientData || !clientData.playerId) return;

  const { q, r } = data;
  const { playerId } = clientData;

  const success = worldState.updatePlayerPosition(playerId, q, r);

  if (success) {
    // Send updated neighbors
    const neighbors = worldState.getNeighbors(playerId);
    send(ws, {
      type: 'neighbors_update',
      neighbors
    });

    // Broadcast to nearby players
    broadcast({
      type: 'player_moved',
      playerId,
      position: { q, r }
    }, ws);
  }
}

function handleEnvironmentUpdate(ws, data) {
  const clientData = clients.get(ws);
  if (!clientData || !clientData.playerId) return;

  const { playerId } = clientData;
  const success = worldState.updatePlayerEnvironment(playerId, data);

  if (success) {
    // Notify neighbors of environmental changes
    const neighbors = worldState.getNeighbors(playerId);

    broadcast({
      type: 'neighbor_environment_changed',
      playerId,
      environment: data
    }, ws);
  }
}

function handleGetNeighbors(ws) {
  const clientData = clients.get(ws);
  if (!clientData || !clientData.playerId) return;

  const neighbors = worldState.getNeighbors(clientData.playerId);

  send(ws, {
    type: 'neighbors',
    neighbors
  });
}

function handleSendResources(ws, data) {
  const clientData = clients.get(ws);
  if (!clientData || !clientData.playerId) return;

  const { receiverId, resources } = data;
  const { playerId: senderId } = clientData;

  // Find receiver's connection
  const receiverWs = findPlayerConnection(receiverId);

  if (receiverWs) {
    send(receiverWs, {
      type: 'resources_received',
      senderId,
      resources,
      timestamp: Date.now()
    });

    send(ws, {
      type: 'resources_sent',
      receiverId,
      success: true
    });

    console.log(`[Resources] ${senderId} sent resources to ${receiverId}`);
  } else {
    send(ws, {
      type: 'resources_sent',
      receiverId,
      success: false,
      message: 'Receiver offline'
    });
  }
}

function handleRequestAid(ws, data) {
  const clientData = clients.get(ws);
  if (!clientData || !clientData.playerId) return;

  const { neighborId, aidType } = data;
  const { playerId: requesterId } = clientData;

  // Find neighbor's connection
  const neighborWs = findPlayerConnection(neighborId);

  if (neighborWs) {
    send(neighborWs, {
      type: 'aid_request',
      requesterId,
      aidType,
      timestamp: Date.now()
    });

    send(ws, {
      type: 'aid_requested',
      neighborId,
      success: true
    });

    console.log(`[Aid] ${requesterId} requested ${aidType} from ${neighborId}`);
  } else {
    send(ws, {
      type: 'aid_requested',
      neighborId,
      success: false,
      message: 'Neighbor offline'
    });
  }
}

function handleDisconnect(ws) {
  const clientData = clients.get(ws);
  if (!clientData) return;

  const { playerId } = clientData;

  if (playerId) {
    worldState.markOffline(playerId);

    broadcast({
      type: 'player_left',
      playerId
    }, ws);

    console.log(`[Disconnect] Player left: ${playerId}`);
  }

  clients.delete(ws);
}

// ============= Utility Functions =============
function send(ws, data) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function broadcast(data, excludeWs = null) {
  for (const [ws, clientData] of clients.entries()) {
    if (ws !== excludeWs && clientData.authenticated) {
      send(ws, data);
    }
  }
}

function findPlayerConnection(playerId) {
  for (const [ws, clientData] of clients.entries()) {
    if (clientData.playerId === playerId && ws.readyState === WebSocket.OPEN) {
      return ws;
    }
  }
  return null;
}

// ============= Heartbeat & Cleanup =============
const heartbeatInterval = setInterval(() => {
  const now = Date.now();

  for (const [ws, clientData] of clients.entries()) {
    // Check if client is still alive
    if (now - clientData.lastPing > SESSION_TIMEOUT) {
      console.log(`[Heartbeat] Closing stale connection: ${clientData.sessionId}`);
      ws.terminate();
      continue;
    }

    // Send ping
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  }
}, HEARTBEAT_INTERVAL);

// ============= Server Start =============
server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║   Terra Chronicle WebSocket Server        ║
║   Port: ${PORT}                              ║
║   Environment: ${process.env.NODE_ENV || 'development'}              ║
╚════════════════════════════════════════════╝

Server ready to accept connections.
WebSocket: ws://localhost:${PORT}
HTTP API: http://localhost:${PORT}
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] Shutting down gracefully...');
  clearInterval(heartbeatInterval);

  wss.close(() => {
    server.close(() => {
      console.log('[Server] Server closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('[Server] Received SIGINT, shutting down...');
  process.exit(0);
});

module.exports = { server, worldState, wss };
