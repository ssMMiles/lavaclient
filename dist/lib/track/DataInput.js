"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataInput = void 0;
const util_1 = require("util");
class DataInput {
    constructor(data) {
        this.pos = 0;
        if (typeof data === "string")
            data = new Uint8Array(Buffer.from(data, "base64"));
        this.buf = data;
    }
    readByte() {
        return this.buf[this.advance()];
    }
    readBoolean() {
        return this.readByte() !== 0;
    }
    readUnsignedShort() {
        return this.readBytes(2);
    }
    readInt() {
        return this.readBytes(4);
    }
    readLong() {
        return BigInt(this.readBytes(4)) << 32n | BigInt(this.readBytes(4));
    }
    readUTF() {
        const length = this.readUnsignedShort(), start = this.advance(length);
        return new util_1.TextDecoder().decode(this.buf.slice(start, start + length));
    }
    readBytes(length = 1) {
        return Array.from({ length }, (_, i) => i * 8).reduceRight((r, i) => r | ((this.readByte() & 0xff) << i), 0);
    }
    advance(by = 1) {
        if (this.pos + by > this.buf.length) {
            throw new Error(`EOF: unable to read ${by} bytes.`);
        }
        const cpos = this.pos;
        this.pos += by;
        return cpos;
    }
}
exports.DataInput = DataInput;
