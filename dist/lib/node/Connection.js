"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Connection = void 0;
const ws_1 = __importDefault(require("ws"));
const NodeState_1 = require("./NodeState");
const _socket = Symbol("Connection#_socket");
class Connection {
    constructor(node, info) {
        this.node = node;
        this.info = info;
        this.reconnectTry = 0;
        this.payloadQueue = [];
    }
    get active() {
        return !!this[_socket] && this[_socket]?.readyState === ws_1.default.OPEN;
    }
    get canReconnect() {
        const maxTries = this.info.reconnect?.tries === -1 ? Infinity : this.info.reconnect?.tries ?? 5;
        return !!this.info.reconnect && maxTries > this.reconnectTry;
    }
    get uptime() {
        if (!this.connectedAt)
            return -1;
        return Date.now() - this.connectedAt;
    }
    send(important, data) {
        return new Promise((resolve, reject) => {
            const payload = { resolve, reject, data };
            this.active
                ? this._send(payload)
                : this.payloadQueue[important ? "unshift" : "push"](payload);
        });
    }
    connect() {
        this.disconnect();
        const userId = this.node.userId;
        if (!userId) {
            throw new Error("No User-Id is present.");
        }
        const headers = {
            Authorization: this.info.password,
            "User-Id": userId,
            "Client-Name": Connection.CLIENT_NAME,
            "Num-Shards": "1"
        };
        if (this.info.resuming?.key) {
            headers["Resume-Key"] = this.info.resuming.key;
        }
        if (this.node.state !== NodeState_1.NodeState.Reconnecting) {
            this.node.state = NodeState_1.NodeState.Connecting;
            this.node.debug("connection", "creating websocket...");
        }
        this.connectedAt = Date.now();
        const socket = this[_socket] = new ws_1.default(`ws${this.info.secure ? "s" : ""}://${this.info.host}:${this.info.port}`, { headers });
        socket.onopen = this._onopen.bind(this);
        socket.onclose = this._onclose.bind(this);
        socket.onerror = this._onerror.bind(this);
        socket.onmessage = this._onmessage.bind(this);
    }
    disconnect(code = 1000, reason = "closing") {
        if (!this.active) {
            return;
        }
        this.node.state = NodeState_1.NodeState.Disconnecting;
        this.node.debug("connection", `disconnecting... code=${code}, reason=${reason}`);
        this[_socket]?.close(code, reason);
    }
    async configureResuming() {
        if (!this.info.resuming) {
            return;
        }
        await this.send(true, {
            op: "configureResuming",
            key: this.info.resuming.key,
            timeout: this.info.resuming.timeout ?? 60000
        });
    }
    flushQueue() {
        if (!this.active) {
            return;
        }
        this.payloadQueue.forEach(this._send.bind(this));
        this.payloadQueue = [];
    }
    reconnect() {
        this.node.state = NodeState_1.NodeState.Reconnecting;
        try {
            this.connect();
        }
        catch (e) {
            this.node.emit("error", e instanceof Error ? e : new Error(`${e}`));
            return false;
        }
        return true;
    }
    async _onopen() {
        await this.flushQueue();
        await this.configureResuming();
        this.node.emit("connect", { took: this.uptime, reconnect: this.node.state === NodeState_1.NodeState.Reconnecting });
        this.node.debug("connection", `connected in ${this.uptime}ms`);
        this.node.state = NodeState_1.NodeState.Connected;
    }
    async _onclose({ reason, code, wasClean }) {
        if (this.node.state === NodeState_1.NodeState.Reconnecting) {
            return;
        }
        const reconnecting = this.canReconnect && this.node.state !== NodeState_1.NodeState.Disconnecting;
        this.node.emit("disconnect", { code, reason, wasClean, reconnecting });
        if (!reconnecting) {
            this.node.state = NodeState_1.NodeState.Disconnected;
            return;
        }
        while (!this.reconnect()) {
            this.reconnectTry++;
            if (!this.canReconnect) {
                this.node.debug("connection", "ran out of reconnect tries.");
                this.node.emit("closed");
                return;
            }
            const duration = typeof this.info.reconnect?.delay === "function"
                ? await this.info.reconnect.delay(this.reconnectTry)
                : this.info.reconnect?.delay ?? 10000;
            this.node.debug("connection", `attempting to reconnect in ${duration}ms, try=${this.reconnectTry}`);
            await new Promise(res => setTimeout(res, duration));
        }
    }
    _onerror(event) {
        const error = event.error ? event.error : event.message;
        this.node.emit("error", new Error(error));
    }
    _onmessage({ data }) {
        if (data instanceof ArrayBuffer) {
            data = Buffer.from(data);
        }
        else if (Array.isArray(data)) {
            data = Buffer.concat(data);
        }
        let payload;
        try {
            payload = JSON.parse(data.toString());
        }
        catch (e) {
            this.node.emit("error", e instanceof Error ? e : new Error(`${e}`));
            return;
        }
        if (payload.op === "stats") {
            this.node.stats = payload;
        }
        else {
            const player = this.node.players.get(payload.guildId);
            if (player) {
                if (payload.op === "playerUpdate") {
                    player.position = payload.state.position ?? -1;
                    player.connected = payload.state.connected ?? player.connected;
                    player.lastUpdatedTimestamp = payload.state.time;
                }
                else {
                    player.handleEvent(payload);
                }
            }
        }
        this.node.debug("connection", `${Connection.CLIENT_NAME} <<< ${payload.op}: ${data}`);
        this.node.emit("raw", payload);
    }
    _send({ data, reject, resolve }) {
        const json = JSON.stringify(data);
        this.node.debug("connection", `${Connection.CLIENT_NAME} >>> ${data.op}: ${json}`);
        return this[_socket]?.send(json, e => e ? reject(e) : resolve());
    }
}
exports.Connection = Connection;
Connection.CLIENT_NAME = "lavaclient";
