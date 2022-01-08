// https://stackoverflow.com/questions/61132262/typescript-deep-partial
export type DeepPartial<T> = {
    [P in keyof T]?: DeepPartial<T[P]>;
};
export interface TacticsManualUnit {
    uid: string;
    id: number;
    rarity: number;
    group: string;
    type: number;
    role: number;
    body: number;
    craft: number | false;
    // buffs: any[][];
    // skills: Skills;
    promo: number[];
}

export interface ExplorationSquad {
    EndTime: number;
    // EnterTime: number;
    SquadIndex: number;
    StageKeyString: string;
    // Status: number;
    timeoutID: number | undefined;
}

export interface CreatePCInfo {
    PCId: string;
    Index: number;
    Grade: number;
    Level: number;
}

export interface UpdateItemInfo {
    ItemKeyString: string;
    StackCount: number;
    Grade: number;
}