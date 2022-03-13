"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const Connection_1 = require("./Connection");
const Utils_1 = require("../Utils");
const NodeState_1 = require("./NodeState");
const Player_1 = require("../Player");
const REST_1 = require("./REST");
const tiny_typed_emitter_1 = require("tiny-typed-emitter");
class Node extends tiny_typed_emitter_1.TypedEmitter {
    constructor(options) {
        super();
        this.players = new Map();
        this.rest = new REST_1.REST(this);
        this.state = NodeState_1.NodeState.Idle;
        this.stats = Node.DEFAULT_STATS;
        this.sendGatewayPayload = options.sendGatewayPayload;
        this.userId = options.user && (0, Utils_1.getId)(options.user);
        this.conn = new Connection_1.Connection(this, options.connection);
    }
    get penalties() {
        const cpu = Math.pow(1.05, 100 * this.stats.cpu.systemLoad) * 10 - 10;
        let deficit = 0, nulled = 0;
        if (this.stats.frameStats?.deficit !== -1) {
            deficit = Math.pow(1.03, 500 * ((this.stats.frameStats?.deficit ?? 0) / 3000)) * 600 - 600;
            nulled = (Math.pow(1.03, 500 * ((this.stats.frameStats?.nulled ?? 0) / 3000)) * 600 - 600) * 2;
            nulled *= 2;
        }
        return cpu + deficit + nulled;
    }
    connect(user = this.userId) {
        this.userId ??= user && (0, Utils_1.getId)(user);
        if (!this.userId) {
            throw new Error("No User-Id is present.");
        }
        return this.conn.connect();
    }
    createPlayer(guild) {
        let player = this.players.get((0, Utils_1.getId)(guild));
        if (!player) {
            player = new Player_1.Player(this, guild);
            this.players.set((0, Utils_1.getId)(guild), player);
        }
        return player;
    }
    destroyPlayer(guild) {
        const player = this.players.get((0, Utils_1.getId)(guild));
        if (player) {
            player.destroy();
            this.players.delete(player.guildId);
        }
        return !!player;
    }
    handleVoiceUpdate(update) {
        const player = this.players.get(update.guild_id);
        player?.handleVoiceUpdate(update);
    }
    debug(topic, message, player) {
        return void this.emit("debug", (player ? Node.DEBUG_FORMAT_PLAYER : Node.DEBUG_FORMAT)
            .replace("{topic}", topic)
            .replace("{message}", message)
            .replace("{player}", player?.guildId ?? "N/A"));
    }
}
exports.Node = Node;
Node.DEBUG_FORMAT = "{topic}: {message}";
Node.DEBUG_FORMAT_PLAYER = "[player {player}] {topic}: {message}";
Node.DEFAULT_STATS = {
    cpu: {
        cores: 0,
        lavalinkLoad: 0,
        systemLoad: 0
    },
    frameStats: {
        deficit: 0,
        nulled: 0,
        sent: 0
    },
    memory: {
        allocated: 0,
        free: 0,
        reservable: 0,
        used: 0
    },
    players: 0,
    playingPlayers: 0,
    uptime: 0
};
