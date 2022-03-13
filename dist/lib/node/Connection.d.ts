import type * as Lavalink from "@lavaclient/types";
import type { Node } from "./Node";
export declare class Connection {
    readonly node: Node;
    readonly info: ConnectionInfo;
    static CLIENT_NAME: string;
    reconnectTry: number;
    payloadQueue: OutgoingPayload[];
    connectedAt?: number;
    private [_socket]?;
    constructor(node: Node, info: ConnectionInfo);
    get active(): boolean;
    get canReconnect(): boolean;
    get uptime(): number;
    send(important: boolean, data: Lavalink.OutgoingMessage): Promise<void>;
    connect(): void;
    disconnect(code?: number, reason?: string): void;
    configureResuming(): Promise<void>;
    flushQueue(): void;
    reconnect(): boolean;
    private _onopen;
    private _onclose;
    private _onerror;
    private _onmessage;
    private _send;
}
export declare type ReconnectDelay = (current: number) => number | Promise<number>;
export interface ConnectionInfo {
    host: string;
    port: number;
    password: string;
    secure?: boolean;
    resuming?: ResumingOptions;
    reconnect?: ReconnectOptions;
}
export interface ResumingOptions {
    key: string;
    timeout?: number;
}
export interface ReconnectOptions {
    delay?: number | ReconnectDelay;
    tries?: number;
}
export interface OutgoingPayload {
    resolve: () => void;
    reject: (error: Error) => void;
    data: Lavalink.OutgoingMessage;
}
