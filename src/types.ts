import { ComponentData } from './system/Component.js';
import { Test, TestCustomized, TestResult, InitiatorData, SerializedTest } from './system/tests/Test.js';

// Export types for use in other modules
export { ComponentData, Test, TestCustomized, TestResult, InitiatorData, SerializedTest };

// Declare all interfaces globally so they're available without imports
declare global {

interface ResultApi {
    hasError: ()=>boolean,
    addChatComponent: (componentChatData:ComponentChatData)=>void,
    updateActorProperty:(key:string,value:any)=>void,
    updateComponent: (type: ComponentType, componentData: ComponentData, fn: (componentResult:ComponentResultData,quantity: number)=>void)=>void,
    deleteComponent: (type: ComponentType, componentData: ComponentData)=>void,
    payCurrency: (currency:Currency)=>void
}

interface ResultData {
    _actorUpdate:{
        [key:string]: string
    };
    _hasException:boolean;
    _components: {
        required: ComponentResultsData,
        consumed: ComponentResultsData,
        produced: ComponentResultsData
    }
    _tests?: {
        hits: number,
        fails: number,
        maxFails:number,
        maxHits: number
    }
    _currencyResult?: CurrencyResultData
    _chatAddition: {
        [key: string]:ComponentChatData
    }
    _recipe: RecipeData;
}

interface CraftingData {
    uuid?: string,
    name: string,
    img: string,
    startAt: number,
    lastAt: number,
    endAt: number,
    result: ResultData
    recipe: RecipeData
    isFinished?:boolean,
    restore: any[]
}

interface ComponentResultsData {
    _data: ComponentResultData[];
}

interface ComponentResultData {
    component: ComponentData,
    isProcessed: boolean,
    originalQuantity: number,
    userInteraction: UserInteraction
}

type UserInteraction =  "always" | "never" | "onSuccess";

type ComponentType = "consumed" | "required" | "produced";
type DataType = "required" | "input" | "output" | "failureOutput";

type ComponentStatus = "success"|"error"|"locked"|"undefined"|"unknown";


interface ComponentChatData {
    component: ComponentData,
    type: ComponentType,
    status: ComponentStatus,
    isProcessed: boolean,
}

interface ChatData {
    name: string;
    img: string;
    components:{
        required:ComponentChatData[],
        consumed:ComponentChatData[],
        produced:ComponentChatData[]
    }
    status: string;
    beaversTests:{
        maxHits:number,
        maxFails:number,
        hits:number,
        fails:number,
        hitPer:number,
        failPer:number
    }
}
interface PreCastData {
    input: {
        [key: string]: {
            [key: string]: ComponentStatus
        }
    }
    required: {
        [key: string]: {
            [key: string]: ComponentStatus
        }
    }
    currencies?: { status: ComponentStatus }
}

interface Currency {
    name: string;
    value: number;
}

interface CurrencyResultData extends Currency{
    hasError: boolean;
    isConsumed: boolean
}

interface MacroResult<t> {
    value: t,
    error?: Error
}

interface AnyOfStoreData {
    macro: string
}

interface BeaversCraftingTests extends BeaversTests{
    consume: boolean,
}

interface RecipeData {
    input: {
        [key: string]: {
            [key: string]: ComponentData
        }
    }
    output: {
        [key: string]: {
            [key: string]: ComponentData
        }
    }
    failureOutput?: {
        [key: string]: {
            [key: string]: ComponentData
        }
    }
    required: {
        [key: string]: {
            [key: string]: ComponentData
        }
    }
    ingredients?: {
        [key: string]: ComponentData
    }
    results?: {
        [key: string]: ComponentData
    }
    attendants?: {
        [key: string]: ComponentData
    },
    beaversTests?: BeaversCraftingTests
    tests?: Tests;
    currency?: Currency;
    tool?: string;
    macro?: string
    folder?: string
    instruction?: string
}


//legacy Test can be removed
type TestType = "skill" | "tool" | "ability" | "hit";

interface Tests {
    fails: number,
    consume: boolean,
    ands: {
        [key: number]: TestAnd,
    }
}

interface TestAnd {
    hits: number,
    ors: {
        [key: number]: TestOr,
    }
}

interface TestOr {
    check: number,
    type: TestType,
    uuid: string
}

// New test system types (replacing BSI types)
interface BeaversTests {
    ands: {
        [key: number]: BeaversTestAnd
    },
    fails: number
}

interface BeaversTestAnd {
    ors: {
        [key: number]: SerializedTest<any>
    },
    hits: number
}

interface SelectData {
    title?: string,
    choices: {
        [key: string]: {
            text: string,
            img?: string
        }
    }
}

// System definition for UI helpers
interface System {
    actorSheetAddTab?: (app: any, html: any, actor: Actor, tabConfig: any, content: any) => void,
    itemSheetReplaceContent?: (app: any, html: any, element: string | HTMLElement) => void
}

} // End declare global