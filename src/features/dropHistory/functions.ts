import { CreatePCInfo, UpdateItemInfo } from "types";
import { log } from "utils/log";

const dropHistoryDBName = 'laoplusDropHistoryDB';
const dropHistoryDBVersion = 1;

export const initializeBattleState = ({
    MonsterList
} : {
    MonsterList: {
        MobGroupKeyString: string;
    }[];
}): void => {
    unsafeWindow.LAOPLUS.battleState.MobGroupKeys = [];
    // unique な wave name を追加。敵のいない wave があると崩壊する
    for (const mob of MonsterList) {
        if (unsafeWindow.LAOPLUS.battleState.MobGroupKeys.indexOf(mob.MobGroupKeyString) < 0)
            unsafeWindow.LAOPLUS.battleState.MobGroupKeys.push(mob.MobGroupKeyString);
    }
    unsafeWindow.LAOPLUS.battleState.waveStep = 0;
    unsafeWindow.LAOPLUS.battleState.dropPC = [];
    unsafeWindow.LAOPLUS.battleState.dropItem = [];
}

export const recordDropHistory = ({
    CreatePCInfos,
    UpdateItemInfos
} : {
    CreatePCInfos: CreatePCInfo[];
    UpdateItemInfos: {
        UpdateType: number;
        Info: UpdateItemInfo;
    }[];
}): void => {
    if (typeof unsafeWindow.LAOPLUS.battleState.waveStep !== 'number' || 
        unsafeWindow.LAOPLUS.battleState.waveStep >= unsafeWindow.LAOPLUS.battleState.MobGroupKeys.length){
        log.error('DropHistory', 'BattleState Error: Illegal WaveStep', unsafeWindow.LAOPLUS.battleState);
            return;
    }
    const MobGroupKey = unsafeWindow.LAOPLUS.battleState.MobGroupKeys[unsafeWindow.LAOPLUS.battleState.waveStep]
    if (!MobGroupKey) {
        log.error('DropHistory', 'BattleState Error: Illegal WaveStep', unsafeWindow.LAOPLUS.battleState);
        return;
    }
    unsafeWindow.LAOPLUS.battleState.waveStep += 1;
    
    // stagekeystring がわからないので unsafeWindow 以下の Array に仮置き
    CreatePCInfos.forEach((pc) => {
        unsafeWindow.LAOPLUS.battleState.dropPC.push({
            mobGroupKey: MobGroupKey,
            stageKeyString: undefined,
            pcInfo: {
                PCId: pc.PCId,
                Index: pc.Index,
                Grade: pc.Grade,
                Level: pc.Level,
            },
        })
    });
    UpdateItemInfos.forEach((item) => {
        if (item.UpdateType !== 0) return;
        const itemGrade = (/.*_T(\d)/).exec(item.Info.ItemKeyString);
        if (!itemGrade || !itemGrade[1]) return;

        unsafeWindow.LAOPLUS.battleState.dropItem.push({
            mobGroupKey: MobGroupKey,
            stageKeyString: undefined,
            itemInfo: {
                ItemKeyString: item.Info.ItemKeyString,
                StackCount: item.Info.StackCount,
                Grade: Number(itemGrade[1])
            }
        })
    })    
}

export const insertDropHistory = ({
    StageKeyString
} : {
    StageKeyString: string;
}): void => {
    log.debug('DropHistory', 'Insert:', StageKeyString, unsafeWindow.LAOPLUS.battleState)
    const createdAt = new Date();
    const dbOpenRequest = indexedDB.open(dropHistoryDBName, dropHistoryDBVersion);
    dbOpenRequest.onupgradeneeded = (event: IDBVersionChangeEvent):void => {
        const db: IDBDatabase = (<IDBRequest>event.target).result;
        const pcStore = db.createObjectStore('pcInfo', { keyPath: 'serialId', autoIncrement: true});
        pcStore.createIndex('mobGroupKey', 'mobGroupKey', {unique: false});
        pcStore.createIndex('stageKeyString', 'stageKeyString', {unique: false});
        pcStore.createIndex('createdAt', 'createdAt', {unique: false});
        pcStore.createIndex('pcIndex', 'pcInfo.Index', {unique: false});

        const itemStore = db.createObjectStore('itemInfo', { keyPath: 'serialId', autoIncrement: true});
        itemStore.createIndex('mobGroupKey', 'mobGroupKey', {unique: false});
        itemStore.createIndex('stageKeyString', 'stageKeyString', {unique: false});
        itemStore.createIndex('createdAt', 'createdAt', {unique: false});
        itemStore.createIndex('itemIndex', 'itemInfo.ItemKeyString', {unique: false});

        const stageClearCountStore = db.createObjectStore('stageClear', { keyPath: 'createdAt'});
        stageClearCountStore.createIndex('stageKeyString', 'stageKeyString', {unique: false});
        log.debug('DropHistory', 'IDB Created');
    };
    dbOpenRequest.onsuccess = (event):void => {
        const db: IDBDatabase = (<IDBRequest>event.target).result;
        const tx = db.transaction(['pcInfo', 'itemInfo', 'stageClear'], 'readwrite');
        tx.oncomplete = (): void => {
            log.debug('DropHistory', 'IDB Insert Succeeded')
        };
        tx.onerror = (ev): void => {
            log.error('DropHistory', 'IDB Insert Error!', ev);
        }
        const pcInfoStore = tx.objectStore('pcInfo');
        unsafeWindow.LAOPLUS.battleState.dropPC.forEach((pcInfo) => {
            const req = pcInfoStore.add({
                ...pcInfo,
                stageKeyString: StageKeyString,
                createdAt: createdAt
            });
            req.onerror = (ev) => {
                log.error('DropHistory', 'Insert into PCInfoStore was failed:', ev);
            }
        });

        const itemInfoStore = tx.objectStore('itemInfo');
        unsafeWindow.LAOPLUS.battleState.dropItem.forEach((itemInfo) => {
            const req = itemInfoStore.add({
                ...itemInfo,
                stageKeyString: StageKeyString,
                createdAt: createdAt
            });
            req.onerror = (ev) => {
                log.error('DropHistory', 'Insert into ItemInfoStore was failed:', ev);
            }
        });
        const stageClearCountStore = tx.objectStore('stageClear');
        const clearCountUpsertRequest = stageClearCountStore.add({
            stageKeyString: StageKeyString,
            createdAt: createdAt
        });
        clearCountUpsertRequest.onerror = (ev) => {
            log.error('DropHistory', 'Insert into ClearCountStore was failed:', ev);
        }

        db.close();
    }
    unsafeWindow.LAOPLUS.battleState.waveStep = null;
}