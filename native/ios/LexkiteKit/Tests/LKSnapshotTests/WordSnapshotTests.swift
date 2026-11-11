import XCTest
import SwiftUI
import SnapshotTesting
@testable import LKFeatures
import LKStore
import LKSync

/// M3 word screens at 390 pt: dictionary input, word card, verb, usage, letters, ideas, paraphrase, phrases, models, model –
/// 10 states × 4 variants (en-light, vi-light, ar-light, de-dark) at 1.5× = 40 images (PR image budget). Fixed data, no clock, no network.
/// References live in __Snapshots__; CI records missing ones (SNAPSHOT_RECORD=missing, all with =1) and verifies after.
@MainActor
final class WordSnapshotTests: XCTestCase {
    override func invokeTest() {
        withSnapshotTesting(record: snapshotRecordMode()) { super.invokeTest() }
    }

    static let variants: [(String, ColorScheme)] = [("en", .light), ("vi", .light), ("ar", .light), ("de", .dark)]

    func shoot<V: View>(_ make: (String) -> V, testName: String = #function) {
        for (lang, scheme) in Self.variants {
            assertSnapshot(of: SnapshotFixtures.host(NavigationStack { make(lang) }, lang: lang, scheme: scheme),
                           as: .image(on: .iPhone13, precision: 0.99, perceptualPrecision: 0.98, traits: UITraitCollection(displayScale: 1.5)),
                           named: SnapshotFixtures.name(lang, scheme), testName: testName)
        }
    }
    static func json(_ s: String) -> JSON { try! JSON.parse(s) }

    // MARK: fixtures
    static let consider = json("""
    {"word":"consider","found":true,"ipa":"/kənˈsɪdər/","ipaUS":"/kənˈsɪdɚ/","pos":"verb","vi":"cân nhắc, xem xét","def":"think carefully about something before making a decision","ex":"We must consider all options before making a final decision.",
     "level":"B1","col":["consider carefully","seriously consider"],"syn":["contemplate","weigh"],"image":"","senses":[{"pos":"verb","terms":["cân nhắc","xem xét","coi là"]}],
     "oxford":[{"pos":"verb","defs":[{"def":"think carefully about something, typically before making a decision","ex":"Have you considered studying abroad next year?"},{"def":"believe someone or something to be","ex":"He is considered to be one of the leading experts."}]}],
     "meanings":[],"sentences":[{"en":"We must consider all options before making a final decision.","vi":"Chúng ta phải cân nhắc mọi phương án trước khi đưa ra quyết định cuối cùng.","auto":false},
                  {"en":"You should consider how your words affect others.","vi":"Bạn nên cân nhắc lời nói của mình ảnh hưởng đến người khác thế nào.","auto":false}]}
    """)

    static func dictModel(_ lang: String, _ phase: DictModel.Phase, recent: [String] = [], related: DictRelated.Result? = nil, phrases: [JSON] = []) -> DictModel {
        DictModel.fixture(uiLang: lang, phase: phase, recent: recent, related: related, phrases: phrases)
    }

    static let letters: [JSON] = [
        json("""
        {"id":"gt1","tone":"formal","topic":"complaint","titleVi":"Khiếu nại máy giặt mua online bị lỗi","to":"the customer service manager","situation":"You bought a washing machine online two weeks ago but it stopped working after three days. Write a letter to the company.","bullets":["explain what happened","say what you want the company to do","say when you need a reply"],"open":"Dear Sir or Madam,","close":"Yours faithfully,"}
        """),
        json("""
        {"id":"gt2","tone":"semi-formal","topic":"neighbour","titleVi":"Thư cho hàng xóm về tiếng ồn","to":"your neighbour","situation":"Your neighbour has been playing loud music late at night. Write a letter to politely ask him to stop.","bullets":["describe the problem","say how it affects you","suggest a solution"],"open":"Dear Mr Lee,","close":"Kind regards,"}
        """),
        json("""
        {"id":"gt3","tone":"informal","topic":"holiday","titleVi":"Mời bạn đi nghỉ cùng","to":"a friend","situation":"A friend has invited you on holiday but you cannot go. Write a letter to your friend.","bullets":["thank your friend","explain why you cannot go","suggest another time"],"open":"Dear Sam,","close":"Best wishes,"}
        """),
    ]
    static let ideas: [JSON] = json("""
    [{"topic":"education","title":"Giáo dục","emoji":"🎓","issues":[
     {"q":"Should university education be free for all students?","for":[{"idea":"Equal opportunity","vi":"Học phí miễn phí giúp sinh viên nghèo có cơ hội học đại học như sinh viên khá giả.","ex":"If tuition were free, a talented teenager from a poor family could attend university.","chunks":["tuition fees|học phí","equal access to|cơ hội tiếp cận bình đẳng"]}],
      "against":[{"idea":"Heavy burden on taxpayers","vi":"Chi phí khổng lồ có thể làm giảm ngân sách cho y tế và hạ tầng.","ex":"Free universities would cost billions that could fund hospitals and roads.","chunks":["place a burden on|tạo gánh nặng cho"]}]},
     {"q":"Is homework necessary for primary school children?","for":[],"against":[]}],
     "vocab":[["tuition","học phí"],["scholarship","học bổng"],["curriculum","chương trình học"]]},
    {"topic":"environment","title":"Môi trường","emoji":"🌍","issues":[],"vocab":[]}]
    """).array ?? []
    static let prompts: [JSON] = [json("""
    {"id":"p17","type":"Agree/Disagree","topic":"education","text":"With so much information available online, schools will soon become unnecessary. To what extent do you agree or disagree?"}
    """)]

    static let pairs: [JSON] = [
        ["many farm crops", "a single crop that blooms intensely"], ["in ten years", "within a decade"], ["more than three times their earlier level", "more than tripled"],
        ["reduce the number of cars", "cut traffic volumes"], ["a lack of funding", "insufficient financial resources"], ["people who live alone", "single-person households"],
        ["rapid increase", "sharp upward trend"], ["old buildings", "historic structures"], ["become more expensive", "rise in price"], ["students who work part-time", "learners with jobs"],
        ["heavily polluted", "badly contaminated by waste"], ["a growing number of tourists", "rising visitor arrivals"],
    ].map { JSON.array([.string($0[0]), .string($0[1])]) }

    static let phraseCards: [JSON] = [
        ["take into account", "xem xét, tính đến", 5], ["a growing body of evidence", "ngày càng nhiều bằng chứng", 4], ["play a crucial role in", "đóng vai trò then chốt trong", 3],
        ["on the other hand", "mặt khác", 2], ["to a large extent", "ở mức độ lớn", 1],
    ].map { r -> JSON in
        JSON.obj([("word", .string(r[0] as! String)), ("vi", .string(r[1] as! String)), ("pos", "phrase"), ("topic", "phrases"), ("added", .number(Double(r[2] as! Int))),
                  ("contexts", .array([.obj([("text", .string("Governments must " + (r[0] as! String) + " the needs of future generations."))])])),
                  ("srs", .obj([("reps", 2), ("interval", 6), ("S", 12), ("D", 4), ("last", 1_767_000_000_000), ("due", 1_768_000_000_000)]))])
    }

    static let modelText = """
    <<Mở bài>> [[It is often claimed that|Người ta thường cho rằng]] modern technology has made life more stressful. [[To a large extent|Ở mức độ lớn]], I agree with this view.

    <<Thân bài 1>> {{Firstly}}, constant notifications [[place a burden on|tạo gánh nặng cho]] our attention. {{As a result}}, people struggle to relax.

    <<Kết bài>> {{In conclusion}}, technology brings convenience, but it must be used wisely.
    """
    static let models: [JSON] = [
        .obj([("id", "t2-fx"), ("task", 2), ("ref", "p17"), ("band", "8.0"), ("words", 279), ("text", .string(modelText)),
              ("outline", .array(["Introduce the debate", "Give reasons for stress", "Conclude with advice"])), ("vocab", .array([.array(["notification", "thông báo"])])), ("pitfalls", .array(["Do not copy the question"]))]),
        .obj([("id", "t2-fx2"), ("task", 2), ("ref", "p17"), ("band", "8.5"), ("words", 301), ("text", "<<Mở bài>> [[Some people argue that|Một số người cho rằng]] schools matter.")]),
        .obj([("id", "t1-energy"), ("task", 1), ("ref", "energy"), ("band", "8.0"), ("words", 164), ("text", "<<Mở bài>> The line graph [[illustrates|minh họa]] energy use.")]),
        .obj([("id", "gt-gt1"), ("task", "gt"), ("ref", "gt1"), ("band", "8.0"), ("words", 190), ("text", "<<Mở bài>> Dear Sir or Madam, I am writing to complain.")]),
    ]
    static var modelIndex: WritingModelIndex {
        WritingModelIndex(models: models, prompts: prompts, task1: [.obj([("id", "energy"), ("type", "line"), ("title", "The line graph shows energy used for heating.")])], letters: letters)
    }

    static var usageStore: UsageStore {
        let dsl = """
        @v depend
        + on | phụ thuộc vào | be decided or affected by | Our plans depend [on] the weather.
        x You can depend [on] me.
        ! It depends of the situation. => It depends on the situation. | depend luôn đi với on | depend always takes on
        # Câu trả lời an toàn khi phân vân: It depends on… | A safe answer: It depends on…
        = depend heavily on, depend largely on
        > dependent-prepositions
        & dependent, dependence
        @v rely
        + on | dựa vào | trust | Many families rely [on] a single income.
        @v insist
        + on | khăng khăng | demand | She insisted [on] paying the bill.
        @a interested
        + in | quan tâm đến | wanting to know | He is interested [in] history.
        """
        return UsageStore(sources: ["p": dsl], indexJSON: "{\"w\":{\"depend\":\"p\",\"rely\":\"p\",\"insist\":\"p\",\"interested\":\"p\"},\"id\":{}}", verbs: WritingVerbs.shared)
    }

    // MARK: states
    func testDictInput() {
        shoot { lang in
            DictView(route: AppRoute("dict"), model: Self.dictModel(lang, .input, recent: ["ambiguous", "feasible", "mitigate", "diligent", "coherent"]))
        }
    }
    func testWordCard() {
        shoot { lang in
            let related = DictRelated.Result(jjb: ["serious", "careful"], jja: ["carefully"], ant: ["ignore"], syn: ["contemplate", "weigh"], down: false)
            let phrases = [Self.json("{\"word\":\"consider carefully\",\"vi\":\"cân nhắc kỹ\",\"ex\":\"Please consider carefully before you decide.\"}")]
            return DictView(route: AppRoute("dict", arg: "consider"), model: Self.dictModel(lang, .full(Self.consider), related: related, phrases: phrases))
        }
    }
    func testVerb() { shoot { _ in VerbView(route: AppRoute("verb", arg: "went"), live: false) } }
    func testUsage() { shoot { _ in UsageView(route: AppRoute("usage", arg: "depend"), store: Self.usageStore, seed: 7) } }
    func testLetters() { shoot { _ in WritingLettersView(route: AppRoute("letters"), letters: Self.letters, drafts: ["gt2": "Dear Mr Lee, I am writing about the noise from your flat at night."]) } }
    func testIdeas() { shoot { _ in WritingIdeasView(route: AppRoute("ideas", arg: "education"), ideas: Self.ideas, prompts: Self.prompts) } }
    func testParaphrase() { shoot { _ in WritingParaphraseView(data: Self.pairs, seed: 5, step: 0) } }
    func testPhrases() { shoot { _ in WritingPhrasesView(cards: Self.phraseCards, models: Self.models) } }
    func testModels() { shoot { _ in WritingModelsView(route: AppRoute("models", query: ["t": "2"]), index: Self.modelIndex) } }
    func testModel() { shoot { _ in WritingModelView(route: AppRoute("model", arg: "t2-fx"), index: Self.modelIndex, seed: 3, cards: [Self.phraseCards[4]]) } }
}
