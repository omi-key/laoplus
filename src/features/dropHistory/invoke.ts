import { initializeBattleState, recordDropHistory, insertDropHistory } from "./functions";
import { InvokeProps } from "../types";

// TODO: 型を用意してanyをキャストする
export const invoke = ({ res, url }: InvokeProps) => {
    switch (url.pathname) {
        case "/battleserver_enter":
            initializeBattleState(res as any);
            return;
        case "/wave_clear":
            recordDropHistory(res as any);
            return;
        case "/stage_clear":
            insertDropHistory(res as any);
            return;
    }
};
