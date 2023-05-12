/**
 * Import third-party libraries
 */

import { NgRedux } from '@angular-redux2/store';

/**
 * Import third-party types
 */

import type { AnyAction } from 'redux';
import type { Middleware } from '@angular-redux2/store';
import type { NextMiddleware } from '@angular-redux2/store/interfaces/reducer.interface';

/**
 * angular-redux2/sync
 */

import { guid } from '../components/uid.component';
import type { ConfigSyncInterface } from '../interfaces/sync.interface';
import { GET_INIT_STATE, RECEIVE_INIT_STATE } from '../interfaces/sync.interface';

/**
 * The SyncComponent class allows synchronization of Redux state between different
 * tabs/windows in the same browser.
 */
export class SyncService {
    /**
     * The unique identifier of the current tab.
     * @private
     */

    private readonly windowID = guid();

    /**
     * The channel used for communication between tabs.
     * @private
     */

    private readonly channel: BroadcastChannel;

    /**
     * A function to check if a specific action is allowed.
     * @private
     */

    private readonly allowed: (action: AnyAction) => boolean;

    /**
     * The default settings for the SyncComponent.
     * @private
     */

    private readonly settings: any = {
        channelName: 'redux_state_sync',
        broadcastChannelOption: {},
        prepareState: (state: any) => state
    };

    /**
     * Creates a new instance of SyncService.
     *
     * @param {ConfigSyncInterface} [settings] - The optional settings for the SyncComponent.
     * @throws {Error} Throws an error if the browser doesn't support cross-tab communication.
     */

    constructor(settings?: ConfigSyncInterface) {
        if (settings) {
            this.settings = Object.assign(this.settings, settings);
        }

        try {
            this.channel = new BroadcastChannel(this.settings.channelName);
            this.allowed = this.isActionAllowed();
            this.channel.onmessage = this.handleOnMessage.bind(this);

            if (settings?.initState) {
                this.initializeState();
            }
        } catch (e) {
            throw new Error('Your browser doesn\'t support cross tab communication.');
        }
    }

    /**
     * Handle incoming messages from the broadcast channel and dispatch synced actions.
     * @param {MessageEvent} event - The message event object containing the action payload.
     * @returns {void}
     */

    handleOnMessage(event: MessageEvent): void {
        const stampedAction = event.data;

        if (!stampedAction) {
            return;
        }

        switch (stampedAction.type) {
            case RECEIVE_INIT_STATE:
                return;

            case GET_INIT_STATE:
                this.emitMessage({
                    type: RECEIVE_INIT_STATE,
                    payload: this.settings.prepareState(NgRedux.store.getState())
                });

                return;
        }

        if (this.allowed(stampedAction)) {
            NgRedux.store.dispatch(
                Object.assign(stampedAction, {
                    $isSync: true,
                }),
            );
        }
    }

    /**
     * Sends a stamped action through the broadcast channel.
     * @param {any} stampedAction - The stamped action to be sent.
     * @returns {void}
     * @throws {Error} If the browser doesn't support cross-tab communication.
     */

    emitMessage(stampedAction: any): void {
        stampedAction = this.generateUidForAction(stampedAction);

        try {
            if (
                this.allowed(stampedAction) ||
                stampedAction.type === GET_INIT_STATE ||
                stampedAction.type === RECEIVE_INIT_STATE
            ) {
                this.channel.postMessage(stampedAction);
            }
        } catch (e) {
            throw new Error('Your browser doesn\'t support cross tab communication.');
        }
    }

    /**
     * Initializes the state by dispatching an action to retrieve the initial state from other tabs.
     * @private
     * @returns {void}
     */

    private initializeState() {
        const initializeEvent = (event: MessageEvent): void => {
            if (event.data.type === RECEIVE_INIT_STATE) {
                NgRedux.store.dispatch(
                    Object.assign(event.data, {
                        $isSync: true,
                    }),
                );

                this.channel.removeEventListener('message', initializeEvent, false);
            }
        };

        this.channel.addEventListener('message', initializeEvent);
    }

    /**
     * Generates a unique identifier for the given action by adding a $wuid property with the current window ID.
     * @param {any} action - The action to be stamped with a unique identifier.
     * @returns {AnyAction} - The stamped action object.
     */

    private generateUidForAction(action: any): AnyAction {
        const stampedAction = action;
        stampedAction.$wuid = this.windowID;

        return stampedAction;
    }

    /**
     * Checks whether the action is allowed based on the settings.
     * @returns A function that takes an action and returns a boolean value indicating whether the action is allowed.
     */

    private isActionAllowed(): (action: AnyAction) => boolean {
        const settings = this.settings;
        let allowed = (action: AnyAction) => true;

        if (settings.predicate && typeof settings.predicate === 'function') {
            allowed = settings.predicate;
        } else if (Array.isArray(settings.blacklist)) {
            allowed = (action) => settings.blacklist.indexOf(action.type) < 0;
        } else if (Array.isArray(settings.whitelist)) {
            allowed = (action) => settings.whitelist.indexOf(action.type) >= 0;
        }

        return allowed;
    }
}

/**
 * Sync redux state across browser tabs
 * A lightweight middleware to sync your redux state across browser tabs.
 * It will listen to the Broadcast Channel and dispatch the same actions dispatched in other tabs to keep the redux state in sync.
 *
 * @example
 * ```typescript
 * constructor(ngRedux: NgRedux<IAppState>, devTools: DevToolsExtension) {
 *     let enhancer: Array<any> = [];
 *
 *     if (devTools.enhancer() && isDevMode())
 *         enhancer = [ devTools.enhancer() ];
 *
 *     ngRedux.configureStore(<any> rootReducer, INITIAL_STATE, [
 *         reduxSyncMiddleware({ initState: true })
 *     ], enhancer);
 * }
 * ```
 *
 * `Before you use`
 * >Please take note that BroadcastChannel can only send data that is supported by the structured clone algorithm (`Strings`, `Objects`, `Arrays`, `Blobs`, `ArrayBuffer`, `Map`),
 * so you need to make sure that the actions that you want to send to other tabs don't include any functions in the payload.`
 */

export function reduxSyncMiddleware(settings?: ConfigSyncInterface): Middleware {
    const sync = new SyncService(settings);

    if (settings?.initState) {
        sync.emitMessage({ type: GET_INIT_STATE });
    }

    return (state: any, action: any, next: NextMiddleware<any>): void => {
        if (action && !action.$wuid)
            sync.emitMessage(action);

        if (action.type === RECEIVE_INIT_STATE) {
            return action['payload'];
        }

        return next(state,
            Object.assign(action, {
                $isSync: typeof action.$isSync === 'undefined' ? false : action.$isSync
            })
        );
    };
}
