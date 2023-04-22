/**
 * Import third-party types
 */

import type { AnyAction } from 'redux';

/**
 * Initialization Events Type
 * These constants represent the events used for initializing the state.
 * `GET_INIT_STATE` is used to request the initial state from another tab.
 * `RECEIVE_INIT_STATE` is used to receive the initial state from another tab.
 */

export const GET_INIT_STATE = '&_GET_INIT_STATE';
export const RECEIVE_INIT_STATE = '&_RECEIVE_INIT_STATE';

/**
 * Synchronization configuration interface
 * This interface provides the options for configuring the synchronization of actions across multiple tabs.
 *
 * Note: When using multiple options (predicate, `blacklist`, and `whitelist`), only one of them will be effective.
 * The priority is `predicate` > `blacklist` > `whitelist`.
 */

export interface ConfigSyncInterface {
    /**
     * Name of the communication channel to use for action synchronization.
     */

    channelName?: string;

    /**
     * Flag indicating whether to copy the initial state from another tab (if available).
     */

    initState?: boolean;

    /**
     * Array of actions that will not be triggered in other tabs.
     */

    blacklist?: string[];

    /**
     * Array of actions that will be triggered in other tabs.
     */

    whitelist?: string[];

    /**
     * A function to filter the actions to be synchronized based on custom criteria.
     */

    predicate?: (action: AnyAction) => boolean;

    /**
     * A function to prepare the initial state for synchronization with other tabs.
     */

    prepareState?: (action: AnyAction) => any;
}

