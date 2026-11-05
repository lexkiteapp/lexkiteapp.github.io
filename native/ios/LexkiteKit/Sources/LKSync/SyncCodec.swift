import Foundation
import CryptoKit

/// Wire helpers shared with web/js/sync.js + sync-drive.js: chunk buckets, document hashes, gzip+base64 bodies, the Drive envelope.
public enum SyncCodec {
    /// Fixed number of card chunks (`NB` in sync.js).
    public static let buckets = 32

    /// `bucketOf(k)`: FNV-1a over UTF-16 code units, mod 32.
    public static func bucketOf(_ key: String) -> Int {
        var x: UInt32 = 2_166_136_261
        for u in key.utf16 { x ^= UInt32(u); x = x &* 16_777_619 }
        return Int(x % UInt32(buckets))
    }

    /// `hash(str)`: `h = (h * 31 + code) | 0` over UTF-16 code units → `"<int32>:<utf16 length>"`.
    public static func hash(_ s: String) -> String {
        var h: Int32 = 0, n = 0
        for u in s.utf16 { h = h &* 31 &+ Int32(u); n += 1 }
        return "\(h):\(n)"
    }

    // MARK: gzip (CompressionStream('gzip') compatible, single member)
    public static func gzip(_ data: Data) -> Data? {
        guard let deflated = try? (data as NSData).compressed(using: .zlib) as Data else { return nil } // Apple "zlib" = raw DEFLATE (RFC 1951)
        var out = Data([0x1F, 0x8B, 0x08, 0x00, 0, 0, 0, 0, 0x00, 0x03])
        out.append(deflated)
        var crc = crc32(data).littleEndian, size = UInt32(truncatingIfNeeded: data.count).littleEndian
        withUnsafeBytes(of: &crc) { out.append(contentsOf: $0) }
        withUnsafeBytes(of: &size) { out.append(contentsOf: $0) }
        return out
    }

    public enum CodecError: Error, Equatable { case gzip, json, envelope, sha, shape, newer(Int) }

    public static func gunzip(_ data: Data) throws -> Data {
        let b = [UInt8](data)
        guard b.count >= 18, b[0] == 0x1F, b[1] == 0x8B, b[2] == 0x08 else { throw CodecError.gzip }
        let flg = b[3]
        var i = 10
        if flg & 0x04 != 0 { guard i + 2 <= b.count else { throw CodecError.gzip }; i += 2 + (Int(b[i]) | (Int(b[i + 1]) << 8)) }
        if flg & 0x08 != 0 { while i < b.count && b[i] != 0 { i += 1 }; i += 1 }
        if flg & 0x10 != 0 { while i < b.count && b[i] != 0 { i += 1 }; i += 1 }
        if flg & 0x02 != 0 { i += 2 }
        guard i < b.count - 8 else { throw CodecError.gzip }
        let body = Data(b[i..<(b.count - 8)])
        guard let raw = try? (body as NSData).decompressed(using: .zlib) as Data else { throw CodecError.gzip }
        let c0 = UInt32(b[b.count - 8]), c1 = UInt32(b[b.count - 7]) << 8, c2 = UInt32(b[b.count - 6]) << 16, c3 = UInt32(b[b.count - 5]) << 24
        let crc: UInt32 = c0 | c1 | c2 | c3
        guard crc == crc32(raw) else { throw CodecError.gzip }
        return raw
    }

    private static let crcTable: [UInt32] = (0..<256).map { n -> UInt32 in
        var c = UInt32(n)
        for _ in 0..<8 { c = c & 1 != 0 ? 0xEDB8_8320 ^ (c >> 1) : c >> 1 }
        return c
    }
    static func crc32(_ data: Data) -> UInt32 {
        var c: UInt32 = 0xFFFF_FFFF
        for byte in data { c = crcTable[Int((c ^ UInt32(byte)) & 0xFF)] ^ (c >> 8) }
        return c ^ 0xFFFF_FFFF
    }

    // MARK: D1 document bodies
    /// `docBody(json)`: `{ z: base64(gzip) }` when smaller, else `{ json }`.
    public static func docBody(_ json: String) -> JSON {
        if let z = gzip(Data(json.utf8))?.base64EncodedString(), z.count < json.utf16.count { return ["z": .string(z)] }
        return ["json": .string(json)]
    }
    /// `docText(d)`: the JSON text inside a D1 document body.
    public static func docText(_ d: JSON?) throws -> String {
        guard let d, d.truthy else { return "" }
        if let z = d["z"]?.string, !z.isEmpty {
            guard let bin = Data(base64Encoded: z) else { throw CodecError.gzip }
            guard let s = String(data: try gunzip(bin), encoding: .utf8) else { throw CodecError.gzip }
            return s
        }
        return d["json"]?.string ?? ""
    }

    // MARK: Drive envelope (sync-drive.js pack/unpack)
    public static let driveKind = "lexkite-sync", driveSchema = 2

    public static func sha256Hex(_ s: String) -> String { SHA256.hash(data: Data(s.utf8)).map { String(format: "%02x", $0) }.joined() }

    public static func drivePack(_ snap: JSON) -> Data {
        let data = snap.stableString
        let env: JSON = ["kind": .string(driveKind), "v": .number(Double(driveSchema)), "sha": .string(sha256Hex(data)), "data": .string(data)]
        let txt = Data(env.stableString.utf8)
        return gzip(txt) ?? txt
    }
    public static func driveUnpack(_ bytes: Data) throws -> JSON {
        let isGzip = bytes.count > 2 && bytes[bytes.startIndex] == 0x1F && bytes[bytes.startIndex + 1] == 0x8B
        let raw: Data
        if isGzip { raw = try gunzip(bytes) } else { raw = bytes }
        guard let env = try? JSON.parse(raw) else { throw CodecError.json }
        guard env["kind"]?.string == driveKind, let data = env["data"]?.string, JSON.num(env["v"]) >= 1 else { throw CodecError.envelope }
        let v = Int(JSON.num(env["v"]))
        if v > driveSchema { throw CodecError.newer(v) }
        guard sha256Hex(data) == env["sha"]?.string else { throw CodecError.sha }
        guard let snap = try? JSON.parse(data) else { throw CodecError.shape }
        guard snap.isObject, snap["cards"]?.isObject == true else { throw CodecError.shape }
        return snap   // schema v2 is the original; MIGRATE[3…] lands here when web adds one
    }
}

public extension SyncCodec {
    /// web `slim()` minus the library compaction (the native app does not bundle the word library yet – M3):
    /// drop fields that are re-derivable / empty, exactly as web does before upload.
    static func slim(_ c: JSON) -> JSON {
        guard var o = c.object else { return c }
        o["sentences"] = nil; o["ipaUS"] = nil
        if (o["contexts"]?.array ?? []).isEmpty { o["contexts"] = nil }
        for k in ["note", "image", "audio"] where !JSON.truthy(o[k]) { o[k] = nil }
        return .object(o)
    }
}
