"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.REST = void 0;
const centra_1 = __importDefault(require("centra"));
class REST {
    constructor(node) {
        this.node = node;
    }
    get info() {
        return this.node.conn.info;
    }
    get baseUrl() {
        return `http${this.info.secure ? "s" : ""}://${this.info.host}:${this.info.port}`;
    }
    loadTracks(identifier) {
        return this.do(`/loadtracks?identifier=${encodeURIComponent(identifier)}`);
    }
    decodeTracks(...tracks) {
        return this.do("/decodetracks", { method: "post", data: JSON.stringify(tracks) });
    }
    decodeTrack(track) {
        return this.do(`/decodetrack?track=${track}`);
    }
    do(endpoint, options = {}) {
        endpoint = /^\/.+/.test(endpoint) ? endpoint : `/${endpoint}`;
        const req = (0, centra_1.default)(`${this.baseUrl}${endpoint}`, options.method ?? "GET")
            .header("Authorization", this.info.password);
        if (options.data) {
            req.body(options.data, "json");
        }
        return req.send()
            .then(r => r.json())
            .finally(() => this.node.debug("rest", `${options.method?.toUpperCase() ?? "GET"} ${endpoint}`));
    }
}
exports.REST = REST;
