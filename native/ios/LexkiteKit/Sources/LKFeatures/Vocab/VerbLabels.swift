// Labels of #/verb in the order of web/js/verbs.js (GN, TN, USE, RULE, ED_WHY, S_WHY, MIS, FROM) mapped to generated L10n ids.
import LKStrings

/// Labels of #/verb that the web keeps in Vietnamese source keys; every one is an id of the generated L10n table.
enum VerbLabels {
    static func group(_ c: String) -> L10nKey? {
        switch c {
        case "present": return .verbPresent
        case "past": return .verbPast
        case "future": return .verbFuture
        case "modal": return .verbModalPerfect
        default: return nil
        }
    }
    static func tense(_ c: String) -> L10nKey? {
        switch c {
        case "ps": return .verbPresentSimple
        case "pc": return .verbPresentContinuous
        case "pp": return .verbPresentPerfect
        case "ppc": return .verbPresentPerfectContinuous
        case "pas": return .verbPastSimple
        case "pac": return .verbPastContinuous
        case "pap": return .verbPastPerfect
        case "papc": return .verbPastPerfectContinuous
        case "fs": return .verbFutureSimple
        case "gt": return .verbFutureWithGoingTo
        case "fc": return .verbFutureContinuous
        case "fp": return .verbFuturePerfect
        case "fpc": return .verbFuturePerfectContinuous
        case "fip": return .verbFutureInThePast
        case "fipg": return .verbPastIntention
        case "m-should": return .verbShouldHave
        case "m-could": return .verbCouldHave
        case "m-would": return .verbWouldHave
        case "m-might": return .verbMightHave
        case "m-may": return .verbMayHave
        case "m-must": return .verbMustHave
        default: return nil
        }
    }
    static func use(_ c: String) -> L10nKey? {
        switch c {
        case "ps": return .verbHabitsFactsAndTimetables
        case "pc": return .verbActionsHappeningNowOrNear
        case "pp": return .verbExperiencesPresentResultsAndThings
        case "ppc": return .verbActionsContinuingFromThePast
        case "pas": return .verbFinishedActionsAtASpecific
        case "pac": return .verbActionsInProgressAtA
        case "pap": return .verbAnActionThatHappenedBefore
        case "papc": return .verbAProcessThatContinuedUp
        case "fs": return .verbInstantDecisionsPredictionsAndPromises
        case "gt": return .verbExistingPlansAndPredictionsBased
        case "fc": return .verbActionsInProgressAtAMoment
        case "fp": return .verbActionsThatWillBeFinished
        case "fpc": return .verbAProcessThatWillContinue
        case "fip": return .verbTheFutureSeenFromThe
        case "fipg": return .verbAPastPlanThatOften
        case "m-should": return .verbRegretOrCriticismTheRight
        case "m-could": return .verbAPastPossibilityThatDid
        case "m-would": return .verbAnUnrealPastResultThird
        case "m-might": return .verbAnUncertainGuessAboutThe
        case "m-may": return .verbAPossibleGuessAboutThe
        case "m-must": return .verbAnAlmostCertainConclusionAbout
        default: return nil
        }
    }
    /// spelling rule code → (title id or nil when the title is a pure formula, explanation id)
    static func rule(_ c: String) -> (title: L10nKey?, body: L10nKey)? {
        switch c {
        case "double": return (.verbDoubleTheConsonant, .verbIfAVerbEndsIn)
        case "double-uk": return (.verbDoubleLUk, .verbBritishEnglishDoublesTheFinal)
        case "y": return (nil, .verbConsonantYChangeYTo)
        case "e": return (.verbDropTheSilentE, .verbDropTheSilentEBefore)
        case "keep-e": return (.verbKeepTheE, .verbVerbsEndingInEeOe)
        case "ie": return (nil, .verbChangeIeToYBefore)
        case "ic": return (nil, .verbAddKAfterIcBefore)
        case "es": return (.verbAddEs, .verbAddEsAfterSX)
        default: return nil
        }
    }
    static func ruleFormula(_ c: String) -> String? {
        switch c {
        case "y": return "-y → -i"
        case "ie": return "-ie → -y"
        case "ic": return "-ic → -ck"
        default: return nil
        }
    }
    static func edWhy(_ c: String) -> L10nKey? {
        switch c {
        case "td": return .verbTheFinalSoundIsT
        case "vl": return .verbTheFinalSoundIsVoiceless
        case "vd": return .verbTheFinalSoundIsA
        default: return nil
        }
    }
    static func sWhy(_ c: String) -> L10nKey? {
        switch c {
        case "sib": return .verbAfterAHissingSoundS
        case "vl": return .verbAfterAVoicelessSoundP
        case "vd": return .verbAfterAVowelOrVoiced
        case "irr": return .verbSpecialPronunciationLearnItSeparately
        default: return nil
        }
    }
    static func mistake(_ c: String) -> L10nKey? {
        switch c {
        case "overreg": return .verbIrregularVerbsDoNotTake
        case "did-v2": return .verbAfterDidDidnTUse
        case "have-v2": return .verbAfterHaveHasHadUse
        case "doesnt-s": return .verbAfterDoesDoesnTThe
        case "stative": return .verbStativeVerbsAreUsuallyNot
        case "sp": return .verbSpellingMistakeSeeTheSpelling
        case "agree": return .verbAgreeIsAVerbDo
        case "listen-to": return .verbListenNeedsToBeforeIts
        case "discuss": return .verbDiscussIsNotFollowedBy
        case "explain": return .verbExplainSomethingToSomeone
        case "ving": return .verbThisVerbIsFollowedBy
        case "marry": return .verbMarrySomeoneWithoutWith
        case "enter": return .verbEnterAPlaceWithoutInto
        case "arrive": return .verbArriveInACityOr
        case "depend": return .verbDependOnNotDependOf
        case "lie-lay": return .verbLieRestFlatLayLain
        case "rise-raise": return .verbRiseGoUpByItself
        case "born": return .verbBeBornIsAFixed
        case "want-to": return .verbWantToVerb
        case "let": return .verbLetMakeSomeoneBaseForm
        case "be-do": return .verbBeActsAsItsOwn
        case "sva": return .verbUseHasWithHeShe
        case "look-forward": return .verbLookForwardToIngTo
        case "suggest": return .verbSuggestRecommendThatSubjectVerb
        case "will-can": return .verbNeverUseTwoModalVerbs
        case "lend-borrow": return .verbLendGiveForATime
        case "say-tell": return .verbTellAPersonSaySomething
        case "gotten": return .verbBritishEnglishUsesHaveGot
        case "modal-base": return .verbAfterAModalVerbUse
        case "modal-to": return .verbNoToAfterCanMust
        case "modal-q": return .verbModalVerbsMoveToThe
        default: return nil
        }
    }
    static func from(_ c: String) -> L10nKey? {
        switch c {
        case "past": return .verbPastSimpleForm
        case "pp": return .verbPastParticiple
        case "ing": return .verbIngForm
        case "s": return .verbThirdPersonSingularForm
        case "present": return .verbPresentForm
        default: return nil
        }
    }
}
