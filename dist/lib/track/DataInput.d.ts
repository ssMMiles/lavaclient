export declare class DataInput {
    private readonly buf;
    private pos;
    constructor(data: Uint8Array | string);
    readByte(): number;
    readBoolean(): boolean;
    readUnsignedShort(): number;
    readInt(): number;
    readLong(): BigInt;
    readUTF(): string;
    private readBytes;
    private advance;
}
