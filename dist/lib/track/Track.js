"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decode = exports.decoders = exports.TRACK_INFO_VERSION = exports.TRACK_INFO_VERSIONED = void 0;
const DataInput_1 = require("./DataInput");
exports.TRACK_INFO_VERSIONED = 1, exports.TRACK_INFO_VERSION = 2;
exports.decoders = {
    2: (input) => {
        const track = {
            title: input.readUTF(),
            author: input.readUTF(),
            length: Number(input.readLong()),
            identifier: input.readUTF(),
            isStream: input.readBoolean(),
            uri: input.readBoolean() ? input.readUTF() : "",
            sourceName: input.readUTF(),
            version: 2
        };
        track.isSeekable = !track.isStream;
        return track;
    },
};
function decode(data) {
    const input = new DataInput_1.DataInput(data);
    return exports.decoders[readVersion(input)]?.(input);
}
exports.decode = decode;
function readVersion(input) {
    const flags = input.readInt() >> 30;
    return flags & exports.TRACK_INFO_VERSIONED ? input.readByte() : 1;
}
