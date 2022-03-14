"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cluster = void 0;
const ClusterNode_1 = require("./ClusterNode");
const tiny_typed_emitter_1 = require("tiny-typed-emitter");
const Utils_1 = require("../Utils");
class Cluster extends tiny_typed_emitter_1.TypedEmitter {
    constructor(options) {
        super();
        this.sendGatewayPayload = options.sendGatewayPayload;
        this.userId = options.user && (0, Utils_1.getId)(options.user);
        this.nodes = new Map(options.nodes.map(n => [n.id, new ClusterNode_1.ClusterNode(this, n.id, n)]));
    }
    get rest() {
        return this.idealNodes[0]?.rest ?? null;
    }
    get idealNodes() {
        return [...this.nodes.values()]
            .filter(node => node.conn.active)
            .sort((a, b) => a.penalties - b.penalties);
    }
    connect(user = this.userId) {
        this.userId ??= user && (0, Utils_1.getId)(user);
        this.nodes.forEach(node => node.connect(this.userId));
    }
    createPlayer(guild, nodeId) {
        const node = nodeId ? this.nodes.get(nodeId) : this.idealNodes[0];
        if (!node)
            throw new Error("No available nodes.");
        return node.createPlayer(guild);
    }
    getPlayer(guild) {
        const guildId = (0, Utils_1.getId)(guild);
        return this.getNode(guildId)?.players?.get(guildId) ?? null;
    }
    destroyPlayer(guild) {
        return this.getNode(guild)?.destroyPlayer(guild) ?? false;
    }
    handleVoiceUpdate(update) {
        this.getNode(update.guild_id)?.handleVoiceUpdate(update);
    }
    getNode(guild) {
        const guildId = (0, Utils_1.getId)(guild);
        return [...this.nodes.values()].find(n => n.players.has(guildId)) ?? null;
    }
}
exports.Cluster = Cluster;
