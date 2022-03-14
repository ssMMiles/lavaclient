"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClusterNode = void 0;
const Node_1 = require("../node/Node");
class ClusterNode extends Node_1.Node {
    constructor(cluster, id, info) {
        super({ sendGatewayPayload: cluster.sendGatewayPayload, connection: info });
        this.cluster = cluster;
        this.id = id;
    }
    emit(event, ...args) {
        const _event = `node${event.replace(/(\b\w)/, i => i.toUpperCase())}`;
        if (this.cluster.listenerCount(_event)) {
            this.cluster.emit(_event, this, ...args);
        }
        return super.emit(event, ...args);
    }
}
exports.ClusterNode = ClusterNode;
