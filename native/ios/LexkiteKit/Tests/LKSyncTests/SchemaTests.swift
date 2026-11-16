import XCTest
import CoreData
import SwiftData
@testable import LKStore

/// SwiftData stores @Model classes through Core Data: a stored property named like an NSManagedObject/NSObject property or method
/// (e.g. `deleted` = isDeleted) makes Core Data abort on save – the app crashes on its first write (CI: crash in LKRepository.write).
final class SchemaTests: XCTestCase {
    func testNoReservedAttributeNames() {
        let schema = Schema(LKSchema.models)
        XCTAssertEqual(schema.entities.count, LKSchema.models.count)
        for e in schema.entities {
            for name in e.attributes.map(\.name) + e.relationships.map(\.name) {
                let clash = class_getProperty(NSManagedObject.self, name) != nil || NSManagedObject.instancesRespond(to: NSSelectorFromString(name))
                XCTAssertFalse(clash, "\(e.name).\(name) clashes with NSManagedObject – rename the stored property")
            }
        }
    }

    /// The first write of a fresh store (inserts the meta + settings rows and cards) saves and reads back.
    func testFirstWriteSaves() async throws {
        let repo = try LKRepository.inMemory()
        _ = try await repo.mutate { doc in doc.cards["a"] = ["word": "a"]; doc.deleted["b"] = 5; doc.settings = ["exam": "ielts"] }
        let doc = try await repo.snapshot()
        XCTAssertEqual(doc.cards["a"]?["word"]?.string, "a"); XCTAssertEqual(doc.deleted["b"], 5); XCTAssertEqual(doc.settings?["exam"]?.string, "ielts")
    }
}
